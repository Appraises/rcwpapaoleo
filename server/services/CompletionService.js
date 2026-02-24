// server/services/CompletionService.js
// Processes collector WhatsApp messages reporting completion of their daily route.
// "coletei todos" → marks all DISPATCHED as COMPLETED
// "coletei até o 4" → marks stops 1-4 as COMPLETED, rest back to PENDING with priority++
// After processing, sends a daily summary report to the owner via WhatsApp.

const { CollectionRequest, Collection, Client, User, SystemSetting, Address } = require('../models');
const { Op } = require('sequelize');
const LlmService = require('./LlmService');
const EvolutionService = require('./EvolutionService');
const msg = require('../utils/MessageVariation');
const { format } = require('date-fns');

/**
 * Get a SystemSetting value by key.
 */
async function getSetting(key, defaultValue = null) {
    const setting = await SystemSetting.findByPk(key);
    return setting ? setting.value : defaultValue;
}

/**
 * Process a collector's WhatsApp message reporting route completion.
 *
 * @param {number} collectorUserId - The User.id of the collector
 * @param {string} messageText - The raw message text
 * @param {string} remoteJid - WhatsApp remoteJid for replies
 */
async function processCompletionMessage(collectorUserId, messageText, remoteJid, messageId) {
    console.log(`[CompletionService] 📝 Processing completion message from collector ${collectorUserId}: "${messageText}"`);

    try {
        const collector = await User.findByPk(collectorUserId);
        if (!collector) {
            console.error(`[CompletionService] ❌ Collector ${collectorUserId} not found`);
            return;
        }

        // ─── ANTI-BAN: Natural reading sequence before replying ───────
        if (remoteJid && messageId) {
            await EvolutionService.simulateRead(remoteJid, messageId);
        }

        // 1. Ask LLM to parse the completion intent
        const intent = await LlmService.checkCompletionIntent(messageText);
        console.log(`[CompletionService] 🤖 LLM parsed intent:`, intent);

        if (intent.type === 'UNKNOWN') {
            console.log(`[CompletionService] ℹ️ Message not recognized as completion report. Ignoring.`);
            const reply = msg.completion.unknownMessage(collector.name);
            await EvolutionService.simulateTypingAndSend(collector.phone, reply, remoteJid);
            return;
        }

        // 2. Fetch all DISPATCHED requests with Client data
        const dispatchedRequests = await CollectionRequest.findAll({
            where: { status: 'DISPATCHED' },
            include: [{
                model: Client,
                attributes: ['name', 'street', 'number', 'district', 'averageOilLiters'],
                include: [{
                    model: Address,
                    attributes: ['street', 'number', 'district']
                }]
            }],
            order: [['dispatchOrder', 'ASC']]
        });

        if (dispatchedRequests.length === 0) {
            console.log(`[CompletionService] ℹ️ No dispatched requests to close.`);
            await EvolutionService.sendTextMessage(collector.phone,
                `Não encontrei solicitações despachadas pra hoje, ${collector.name}. Pode ser que já tenham sido encerradas. 👍`);
            return;
        }

        console.log(`[CompletionService] 📋 Found ${dispatchedRequests.length} dispatched request(s)`);

        let completedCount = 0;
        let returnedCount = 0;
        const completedLocations = [];
        const pendingLocations = [];

        if (intent.type === 'ALL') {
            for (const req of dispatchedRequests) {
                completedLocations.push(buildLocationName(req));
                await req.update({ status: 'COMPLETED', dispatchOrder: null });
                // Auto-create Collection record
                const qty = req.Client?.averageOilLiters || 0;
                if (qty > 0) {
                    await Collection.create({
                        clientId: req.clientId,
                        userId: collector.id,
                        date: new Date(),
                        quantity: qty,
                        observation: 'Coleta registrada automaticamente via WhatsApp'
                    });
                }
            }
            completedCount = dispatchedRequests.length;
            console.log(`[CompletionService] ✅ Marked ALL ${completedCount} requests as COMPLETED + created Collection records`);

        } else if (intent.type === 'PARTIAL') {
            const upTo = intent.upTo;
            console.log(`[CompletionService] 🔢 Partial completion up to stop #${upTo}`);

            for (const req of dispatchedRequests) {
                if (req.dispatchOrder && req.dispatchOrder <= upTo) {
                    completedLocations.push(buildLocationName(req));
                    await req.update({ status: 'COMPLETED', dispatchOrder: null });
                    // Auto-create Collection record
                    const qty = req.Client?.averageOilLiters || 0;
                    if (qty > 0) {
                        await Collection.create({
                            clientId: req.clientId,
                            userId: collector.id,
                            date: new Date(),
                            quantity: qty,
                            observation: 'Coleta registrada automaticamente via WhatsApp'
                        });
                    }
                    completedCount++;
                } else {
                    pendingLocations.push(buildLocationName(req));
                    await req.update({
                        status: 'PENDING',
                        priority: req.priority + 1,
                        dispatchOrder: null
                    });
                    returnedCount++;
                }
            }
            console.log(`[CompletionService] ✅ ${completedCount} COMPLETED, ${returnedCount} returned to PENDING`);
        }

        // 3. Send confirmation to collector
        let confirmMsg;
        if (returnedCount === 0) {
            confirmMsg = msg.completion.allDone(collector.name, completedCount);
        } else {
            confirmMsg = msg.completion.partial(collector.name, completedCount, returnedCount);
        }

        await EvolutionService.simulateTypingAndSend(collector.phone, confirmMsg, remoteJid);
        console.log(`[CompletionService] 📤 Confirmation sent to ${collector.name}`);

        // 4. Send daily report to the owner
        await sendOwnerReport(collector.name, completedLocations, pendingLocations);

    } catch (error) {
        console.error(`[CompletionService] ❌ Error processing completion:`, error);
    }
}

/**
 * Build a human-readable location name from a CollectionRequest with Client.
 */
function buildLocationName(req) {
    const client = req.Client;
    if (!client) return `Solicitação #${req.id}`;

    const addr = client.Address;
    const street = addr?.street || client.street || '';
    const number = addr?.number || client.number || '';
    const district = addr?.district || client.district || '';
    const addressStr = [street, number].filter(Boolean).join(', ');
    const districtStr = district ? ` — ${district}` : '';

    return `${client.name} (${addressStr}${districtStr})`;
}

/**
 * Send a daily summary report to the owner via WhatsApp.
 */
async function sendOwnerReport(collectorName, completedLocations, pendingLocations) {
    try {
        const ownerPhone = await getSetting('dispatch_owner_phone', null);

        if (!ownerPhone) {
            console.log('[CompletionService] ℹ️ No owner phone configured (dispatch_owner_phone). Skipping report.');
            return;
        }

        const today = format(new Date(), 'dd/MM/yyyy');
        const lines = [];

        lines.push(msg.ownerReport.header(today));
        lines.push('');
        lines.push(msg.ownerReport.collectorLabel(collectorName));
        lines.push('');

        if (completedLocations.length > 0) {
            lines.push(msg.ownerReport.completedLabel(completedLocations.length));
            completedLocations.forEach((loc, i) => {
                lines.push(`  ${i + 1}. ${loc}`);
            });
        }

        if (pendingLocations.length > 0) {
            lines.push('');
            lines.push(msg.ownerReport.pendingLabel(pendingLocations.length));
            pendingLocations.forEach((loc, i) => {
                lines.push(`  ${i + 1}. ${loc}`);
            });
        }

        lines.push('');
        if (pendingLocations.length === 0) {
            lines.push(msg.ownerReport.allDone());
        } else {
            lines.push(msg.ownerReport.pendingWarning(pendingLocations.length));
        }

        const reportMsg = lines.join('\n');
        const ownerRemoteJid = `${EvolutionService._formatPhone(ownerPhone)}@s.whatsapp.net`;
        await EvolutionService.simulateTypingAndSend(ownerPhone, reportMsg, ownerRemoteJid);
        console.log(`[CompletionService] 📤 Owner report sent to ${ownerPhone}`);

    } catch (error) {
        console.error(`[CompletionService] ❌ Error sending owner report:`, error);
    }
}

module.exports = { processCompletionMessage };
