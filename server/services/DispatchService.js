// server/services/DispatchService.js
// Daily route dispatch — collects PENDING requests, optimizes routes, sends to collectors via WhatsApp

const { CollectionRequest, Client, User, SystemSetting, Address } = require('../models');
const { Op } = require('sequelize');
const RouteService = require('./RouteService');
const EvolutionService = require('./EvolutionService');
const GeocodingService = require('./GeocodingService');
const msg = require('../utils/MessageVariation');
const { format } = require('date-fns');

// ─── Helpers ──────────────────────────────────────────────────────────

async function getSetting(key, defaultValue = null) {
    const setting = await SystemSetting.findByPk(key);
    return setting ? setting.value : defaultValue;
}

function buildGoogleMapsUrl(base, orderedClients) {
    const origin = `${base.lat},${base.lng}`;
    const destination = origin;
    const waypoints = orderedClients.map(c => `${c.lat},${c.lng}`).join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
}

function buildWazeUrl(firstClient) {
    return `https://waze.com/ul?ll=${firstClient.lat},${firstClient.lng}&navigate=yes`;
}

function formatDispatchMessage(collectorName, orderedClients, clientDetails, totalDistanceKm, googleMapsUrl, wazeUrl) {
    const today = format(new Date(), 'dd/MM/yyyy');
    const lines = [];

    lines.push(msg.dispatch.header(today));
    lines.push('');
    lines.push(msg.dispatch.greeting(collectorName));
    lines.push('');

    orderedClients.forEach((_, idx) => {
        const detail = clientDetails[idx];
        const num = idx + 1;
        const addressParts = [detail.street, detail.number].filter(Boolean).join(', ');
        const district = detail.district ? ` — ${detail.district}` : '';
        const reference = detail.reference ? `\n   📌 Ref: ${detail.reference}` : '';

        lines.push(`*${num}.* ${detail.name}`);
        lines.push(`   📍 ${addressParts}${district}`);
        if (reference) lines.push(reference);
    });

    lines.push('');
    lines.push(msg.dispatch.distance(totalDistanceKm.toFixed(1)));
    lines.push('');
    lines.push(msg.dispatch.googleLabel());
    lines.push(googleMapsUrl);
    lines.push('');
    lines.push(msg.dispatch.wazeLabel());
    lines.push(wazeUrl);
    lines.push('');
    lines.push(msg.dispatch.closing());

    return lines.join('\n');
}

// ─── Main Dispatch Logic ──────────────────────────────────────────────

async function dispatchDailyRoutes() {
    console.log('[DispatchService] ═══════════════════════════════════════');
    console.log('[DispatchService] 🚀 Starting daily route dispatch...');
    console.log('[DispatchService] ═══════════════════════════════════════');

    try {
        // 1. Fetch all PENDING collection requests with client data
        const pendingRequests = await CollectionRequest.findAll({
            where: { status: 'PENDING' },
            include: [{
                model: Client,
                attributes: ['id', 'name', 'phone', 'street', 'number', 'district', 'city', 'state', 'reference', 'latitude', 'longitude'],
                include: [{
                    model: Address,
                    attributes: ['id', 'street', 'number', 'district', 'city', 'state', 'reference', 'latitude', 'longitude']
                }]
            }],
            order: [['priority', 'DESC'], ['requestedAt', 'ASC']]
        });

        if (pendingRequests.length === 0) {
            console.log('[DispatchService] ℹ️ No pending requests found. Nothing to dispatch.');
            return { dispatched: false, reason: 'No pending requests' };
        }

        console.log(`[DispatchService] 📋 Found ${pendingRequests.length} pending request(s)`);

        // 2. Geocode clients missing coordinates (server-side fallback)
        let geocodedCount = 0;
        for (const req of pendingRequests) {
            const client = req.Client;
            if (!client) continue;
            const lat = client.Address?.latitude || client.latitude;
            const lng = client.Address?.longitude || client.longitude;
            if (!lat || !lng) {
                const success = await GeocodingService.ensureGeocodedClient(client);
                if (success) geocodedCount++;
            }
        }
        if (geocodedCount > 0) {
            console.log(`[DispatchService] 🌍 Geocoded ${geocodedCount} client(s) that were missing coordinates`);
            // Reload to get fresh coordinates
            for (const req of pendingRequests) {
                if (req.Client) {
                    await req.Client.reload({ include: [{ model: Address }] });
                }
            }
        }

        // 3. Filter clients with valid coordinates
        const validRequests = pendingRequests.filter(req => {
            const client = req.Client;
            if (!client) return false;
            const lat = client.Address?.latitude || client.latitude;
            const lng = client.Address?.longitude || client.longitude;
            return lat && lng;
        });

        if (validRequests.length === 0) {
            console.log('[DispatchService] ⚠️ No requests with geocoded clients. Aborting.');
            return { dispatched: false, reason: 'No geocoded clients' };
        }

        const skipped = pendingRequests.length - validRequests.length;
        if (skipped > 0) {
            console.warn(`[DispatchService] ⚠️ ${skipped} request(s) skipped (no coordinates even after geocoding attempt)`);
        }

        console.log(`[DispatchService] 📍 ${validRequests.length} request(s) have geocoded clients`);

        // 4. Read settings
        const baseLat = parseFloat(await getSetting('base_lat', '-10.9472'));
        const baseLng = parseFloat(await getSetting('base_lng', '-37.0731'));
        const baseName = await getSetting('base_name', 'Base da Empresa');
        const primaryCollectorId = await getSetting('dispatch_primary_collector_id', null);
        const secondaryCollectorId = await getSetting('dispatch_secondary_collector_id', null);
        const splitThreshold = parseInt(await getSetting('dispatch_split_threshold', '15'), 10);

        const base = { lat: baseLat, lng: baseLng };
        console.log(`[DispatchService] 🏠 Base: ${baseName} (${baseLat}, ${baseLng})`);
        console.log(`[DispatchService] 📊 Split threshold: ${splitThreshold}`);

        // 5. Get collector(s)
        const primaryCollector = primaryCollectorId
            ? await User.findByPk(primaryCollectorId)
            : await User.findOne({ where: { isCollector: true, phone: { [Op.ne]: null } } });

        if (!primaryCollector || !primaryCollector.phone) {
            console.error('[DispatchService] ❌ No primary collector with phone number found. Aborting.');
            return { dispatched: false, reason: 'No collector with phone' };
        }

        console.log(`[DispatchService] 👤 Primary collector: ${primaryCollector.name} (${primaryCollector.phone})`);

        // 6. Build client coordinate arrays
        const allClientCoords = validRequests.map(req => {
            const client = req.Client;
            return {
                lat: client.Address?.latitude || client.latitude,
                lng: client.Address?.longitude || client.longitude
            };
        });

        const allClientDetails = validRequests.map(req => {
            const client = req.Client;
            const addr = client.Address;
            return {
                name: client.name,
                street: addr?.street || client.street || '',
                number: addr?.number || client.number || '',
                district: addr?.district || client.district || '',
                city: addr?.city || client.city || '',
                reference: addr?.reference || client.reference || ''
            };
        });

        // 7. Decide single or dual dispatch
        const needsSplit = validRequests.length > splitThreshold && secondaryCollectorId;

        if (needsSplit) {
            // ── DUAL COLLECTOR MODE ──────────────────────────────────
            console.log(`[DispatchService] 🔀 Splitting ${validRequests.length} requests into 2 groups (threshold: ${splitThreshold})`);

            const secondaryCollector = await User.findByPk(secondaryCollectorId);
            if (!secondaryCollector || !secondaryCollector.phone) {
                console.warn('[DispatchService] ⚠️ Secondary collector not found or has no phone. Falling back to single dispatch.');
            } else {
                console.log(`[DispatchService] 👤 Secondary collector: ${secondaryCollector.name} (${secondaryCollector.phone})`);

                const [groupAIndices, groupBIndices] = RouteService.splitIntoTwoGroups(allClientCoords);

                // Route A (Primary)
                const routeA = RouteService.optimizeRoute(base, groupAIndices.map(i => allClientCoords[i]));
                const orderedCoordsA = routeA.orderedIndices.map(i => allClientCoords[groupAIndices[i]]);
                const orderedDetailsA = routeA.orderedIndices.map(i => allClientDetails[groupAIndices[i]]);
                const mapsUrlA = buildGoogleMapsUrl(base, orderedCoordsA);
                const wazeUrlA = buildWazeUrl(orderedCoordsA[0]);
                const msgA = formatDispatchMessage(primaryCollector.name, orderedCoordsA, orderedDetailsA, routeA.totalDistanceKm, mapsUrlA, wazeUrlA);

                console.log(`[DispatchService] 📤 Sending Route A (${groupAIndices.length} stops, ${routeA.totalDistanceKm.toFixed(1)}km) to ${primaryCollector.name}...`);
                const remoteJidA = `${EvolutionService._formatPhone(primaryCollector.phone)}@s.whatsapp.net`;
                await EvolutionService.simulateTypingAndSend(primaryCollector.phone, msgA, remoteJidA);

                // Route B (Secondary)
                const routeB = RouteService.optimizeRoute(base, groupBIndices.map(i => allClientCoords[i]));
                const orderedCoordsB = routeB.orderedIndices.map(i => allClientCoords[groupBIndices[i]]);
                const orderedDetailsB = routeB.orderedIndices.map(i => allClientDetails[groupBIndices[i]]);
                const mapsUrlB = buildGoogleMapsUrl(base, orderedCoordsB);
                const wazeUrlB = buildWazeUrl(orderedCoordsB[0]);
                const msgB = formatDispatchMessage(secondaryCollector.name, orderedCoordsB, orderedDetailsB, routeB.totalDistanceKm, mapsUrlB, wazeUrlB);

                console.log(`[DispatchService] 📤 Sending Route B (${groupBIndices.length} stops, ${routeB.totalDistanceKm.toFixed(1)}km) to ${secondaryCollector.name}...`);
                const remoteJidB = `${EvolutionService._formatPhone(secondaryCollector.phone)}@s.whatsapp.net`;
                await EvolutionService.simulateTypingAndSend(secondaryCollector.phone, msgB, remoteJidB);

                // Save dispatchOrder and mark as DISPATCHED for both groups
                await markDispatchedWithOrder(validRequests, groupAIndices, routeA.orderedIndices);
                await markDispatchedWithOrder(validRequests, groupBIndices, routeB.orderedIndices);

                console.log('[DispatchService] ✅ Dual dispatch completed successfully!');
                return {
                    dispatched: true,
                    mode: 'dual',
                    routeA: { collector: primaryCollector.name, stops: groupAIndices.length, distanceKm: routeA.totalDistanceKm },
                    routeB: { collector: secondaryCollector.name, stops: groupBIndices.length, distanceKm: routeB.totalDistanceKm }
                };
            }
        }

        // ── SINGLE COLLECTOR MODE ────────────────────────────────
        const route = RouteService.optimizeRoute(base, allClientCoords);
        const orderedCoords = route.orderedIndices.map(i => allClientCoords[i]);
        const orderedDetails = route.orderedIndices.map(i => allClientDetails[i]);
        const mapsUrl = buildGoogleMapsUrl(base, orderedCoords);
        const wazeUrl = buildWazeUrl(orderedCoords[0]);
        const msg = formatDispatchMessage(primaryCollector.name, orderedCoords, orderedDetails, route.totalDistanceKm, mapsUrl, wazeUrl);

        console.log(`[DispatchService] 📤 Sending single route (${validRequests.length} stops, ${route.totalDistanceKm.toFixed(1)}km) to ${primaryCollector.name}...`);
        const remoteJid = `${EvolutionService._formatPhone(primaryCollector.phone)}@s.whatsapp.net`;
        await EvolutionService.simulateTypingAndSend(primaryCollector.phone, msg, remoteJid);

        // Save dispatchOrder and mark as DISPATCHED
        await markDispatchedWithOrder(validRequests, null, route.orderedIndices);

        console.log('[DispatchService] ✅ Single dispatch completed successfully!');
        return {
            dispatched: true,
            mode: 'single',
            route: { collector: primaryCollector.name, stops: validRequests.length, distanceKm: route.totalDistanceKm }
        };

    } catch (error) {
        console.error('[DispatchService] ❌ CRITICAL ERROR during dispatch:', error);
        return { dispatched: false, reason: error.message };
    }
}

/**
 * Marks collection requests as DISPATCHED and saves the dispatchOrder.
 */
async function markDispatchedWithOrder(allRequests, groupIndices, orderedIndices) {
    for (let i = 0; i < orderedIndices.length; i++) {
        const originalIndex = groupIndices
            ? groupIndices[orderedIndices[i]]
            : orderedIndices[i];
        await allRequests[originalIndex].update({
            status: 'DISPATCHED',
            dispatchOrder: i + 1
        });
    }
    const count = orderedIndices.length;
    console.log(`[DispatchService] 📝 Marked ${count} request(s) as DISPATCHED with dispatchOrder`);
}

module.exports = { dispatchDailyRoutes };
