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
            where: { status: 'DISPATCHED', assignedTo: collector.id },
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
        const skippedClients = [];

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

                    // Armazena cliente devolvido para o chunking depois do relatório do dono
                    if (req.Client && req.Client.phone) {
                        skippedClients.push(req.Client);
                    }
                }
            }
            console.log(`[CompletionService] ✅ ${completedCount} COMPLETED, ${returnedCount} returned to PENDING`);
        } else if (intent.type === 'LITERS_REPORT') {
            const entries = intent.entries;
            let totalLiters = 0;

            console.log(`[CompletionService] 📊 Liters report mode:`, entries);

            for (const req of dispatchedRequests) {
                // Find if this request's dispatchOrder was reported
                const entry = entries.find(e => e.stop === req.dispatchOrder);

                if (entry) {
                    completedLocations.push(buildLocationName(req, entry.liters));
                    await req.update({ status: 'COMPLETED', dispatchOrder: null });
                    
                    const qty = entry.liters;
                    totalLiters += qty;

                    if (qty > 0) {
                        await Collection.create({
                            clientId: req.clientId,
                            userId: collector.id,
                            date: new Date(),
                            quantity: qty,
                            observation: 'Coleta registrada com litros reais via WhatsApp'
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
            console.log(`[CompletionService] ✅ ${completedCount} COMPLETED (${totalLiters}L total), ${returnedCount} returned to PENDING`);

            // Store total to use in confirmation
            intent.totalLiters = totalLiters;
        }

        // 3. Send confirmation to collector
        let confirmMsg;
        if (intent.type === 'LITERS_REPORT') {
            confirmMsg = msg.completion.litersReport(collector.name, completedCount, returnedCount, intent.totalLiters);
        } else if (returnedCount === 0) {
            confirmMsg = msg.completion.allDone(collector.name, completedCount);
        } else {
            confirmMsg = msg.completion.partial(collector.name, completedCount, returnedCount);
        }

        await EvolutionService.simulateTypingAndSend(collector.phone, confirmMsg, remoteJid);
        console.log(`[CompletionService] 📤 Confirmation sent to ${collector.name}`);

        // 4. Send daily report to the owner
        await sendOwnerReport(collector.name, completedLocations, pendingLocations);

        // 5. Trigger progressive delay notifications via chunking for skipped clients
        if (skippedClients.length > 0) {
            startUnfinishedRouteNotificationQueue(skippedClients);
        }

    } catch (error) {
        console.error(`[CompletionService] ❌ Error processing completion:`, error);
    }
}

/**
 * Build a human-readable location name from a CollectionRequest with Client.
 */
function buildLocationName(req, realLiters = null) {
    const client = req.Client;
    if (!client) return `Solicitação #${req.id}`;

    const addr = client.Address;
    const street = addr?.street || client.street || '';
    const number = addr?.number || client.number || '';
    const district = addr?.district || client.district || '';
    const addressStr = [street, number].filter(Boolean).join(', ');
    const districtStr = district ? ` — ${district}` : '';
    
    let mediaStr = '';
    if (realLiters !== null) {
        mediaStr = ` [Coletado: ${realLiters}L]`;
    } else if (client.averageOilLiters) {
        mediaStr = ` [Média: ${client.averageOilLiters}L]`;
    }

    return `${client.name} (${addressStr}${districtStr})${mediaStr}`;
}

/**
 * Send a daily summary report to the owner via WhatsApp.
 */
async function sendOwnerReport(collectorName, completedLocations, pendingLocations) {
    try {
        const ownerPhoneRaw = await getSetting('dispatch_owner_phone', null);

        if (!ownerPhoneRaw) {
            console.log('[CompletionService] ℹ️ No owner phone configured (dispatch_owner_phone). Skipping report.');
            return;
        }

        // Support multiple phone numbers separated by commas
        const phones = ownerPhoneRaw
            .split(',')
            .map(p => p.replace(/\D/g, '').trim())
            .filter(p => p.length >= 10);

        if (phones.length === 0) {
            console.log('[CompletionService] ℹ️ No valid phone numbers found in dispatch_owner_phone. Skipping report.');
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

        // Send to all configured phones
        for (const phone of phones) {
            const remoteJid = `${EvolutionService._formatPhone(phone)}@s.whatsapp.net`;
            await EvolutionService.simulateTypingAndSend(phone, reportMsg, remoteJid);
            console.log(`[CompletionService] 📤 Owner report sent to ${phone}`);
        }

        console.log(`[CompletionService] ✅ Report sent to ${phones.length} recipient(s)`);

    } catch (error) {
        console.error(`[CompletionService] ❌ Error sending owner report:`, error);
    }
}

/**
 * Starts a chunked notification queue for clients that were skipped.
 */
function startUnfinishedRouteNotificationQueue(clients) {
    if (!clients || clients.length === 0) return;

    console.log(`[CompletionService] 📡 Starting progressive apology queue for ${clients.length} undone clients.`);

    const chunkSize = 5;
    const delayMs = 40 * 60 * 1000; // 40 minutos

    let chunks = [];
    for (let i = 0; i < clients.length; i += chunkSize) {
        chunks.push(clients.slice(i, i + chunkSize));
    }

    console.log(`[CompletionService] 📦 Apology queue split into ${chunks.length} chunks de até ${chunkSize} clientes.`);

    if (chunks.length > 0) {
        notifyUnfinishedChunk(chunks[0], 1, chunks.length);
    }

    for (let idx = 1; idx < chunks.length; idx++) {
        const timeToWait = idx * delayMs;
        setTimeout(() => {
            notifyUnfinishedChunk(chunks[idx], idx + 1, chunks.length);
        }, timeToWait);
        console.log(`[CompletionService] ⏱️ Scheduled apology chunk ${idx + 1}/${chunks.length} in ${timeToWait / 60000} mins.`);
    }
}

/**
 * Notifica um lote de clientes aplicando o anti-spam (25s + randomico).
 */
async function notifyUnfinishedChunk(chunk, currentChunkNum, totalChunks) {
    console.log(`[CompletionService] 📤 Processing apology chunk ${currentChunkNum}/${totalChunks} (${chunk.length} clients)`);
    
    let clientIndex = 0;
    for (const client of chunk) {
        const cleanPhone = EvolutionService._formatPhone(client.phone);
        if (cleanPhone) {
            const firstName = client.name.split(' ')[0];
            const unfinishedMsg = msg.completion.unfinishedRoute(firstName);
            const humanizedMsg = EvolutionService.humanizeMessage(unfinishedMsg);
            const remoteJid = `${cleanPhone}@s.whatsapp.net`;
            
            try {
                if (clientIndex > 0) {
                    const tempoBase = 25000;
                    const delayFinal = tempoBase + Math.floor(Math.random() * 5000) + 2000;
                    console.log(`[CompletionService] ⏳ Anti-spam: Esperando ${delayFinal / 1000}s antes de enviar desculpas para ${firstName}...`);
                    await new Promise(resolve => setTimeout(resolve, delayFinal));
                } else {
                    const randomDelay = Math.floor(Math.random() * 3000) + 1000;
                    await new Promise(resolve => setTimeout(resolve, randomDelay));
                }

                await EvolutionService.simulateTypingAndSend(cleanPhone, humanizedMsg, remoteJid);
                console.log(`[CompletionService] 📤 Sent unfinished route notification to ${firstName}`);
            } catch (e) {
                console.error(`[CompletionService] ❌ Failed to send unfinished notification to ${firstName}:`, e.message);
            }
        }
        clientIndex++;
    }
}

module.exports = { processCompletionMessage };
