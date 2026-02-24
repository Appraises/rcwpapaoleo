// server/services/CompletionService.js
// Processes collector WhatsApp messages reporting completion of their daily route.
// "coletei todos" → marks all DISPATCHED as COMPLETED
// "coletei até o 4" → marks stops 1-4 as COMPLETED, rest back to PENDING with priority++
// After processing, sends a daily summary report to the owner via WhatsApp.

const { CollectionRequest, Collection, Client, User, SystemSetting, Address } = require('../models');
const { Op } = require('sequelize');
const LlmService = require('./LlmService');
const EvolutionService = require('./EvolutionService');
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
async function processCompletionMessage(collectorUserId, messageText, remoteJid) {
    console.log(`[CompletionService] 📝 Processing completion message from collector ${collectorUserId}: "${messageText}"`);

    try {
        const collector = await User.findByPk(collectorUserId);
        if (!collector) {
            console.error(`[CompletionService] ❌ Collector ${collectorUserId} not found`);
            return;
        }

        // 1. Ask LLM to parse the completion intent
        const intent = await LlmService.checkCompletionIntent(messageText);
        console.log(`[CompletionService] 🤖 LLM parsed intent:`, intent);

        if (intent.type === 'UNKNOWN') {
            console.log(`[CompletionService] ℹ️ Message not recognized as completion report. Ignoring.`);
            const reply = `Oi, ${collector.name}! Não entendi a mensagem. Para informar as coletas do dia, envie:\n\n• "coletei todos" — se completou toda a rota\n• "coletei até o 4" — se coletou até o ponto 4\n\nOu fale com o admin pelo sistema. 🛢️`;
            await EvolutionService.sendTextMessage(collector.phone, reply);
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
            confirmMsg = `✅ Perfeito, ${collector.name}! Todas as ${completedCount} coletas foram registradas como concluídas.\n\nBom descanso! 💚♻️`;
        } else {
            confirmMsg = `✅ Registrado, ${collector.name}!\n\n` +
                `• *${completedCount}* coleta(s) concluída(s)\n` +
                `• *${returnedCount}* coleta(s) ficaram para o próximo dia (com prioridade)\n\n` +
                `Bom descanso! 💚♻️`;
        }

        await EvolutionService.sendTextMessage(collector.phone, confirmMsg);
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

        lines.push(`📊 *Relatório de Coleta — ${today}*`);
        lines.push('');
        lines.push(`Coletador: *${collectorName}*`);
        lines.push('');

        if (completedLocations.length > 0) {
            lines.push(`✅ *Coletados (${completedLocations.length}):*`);
            completedLocations.forEach((loc, i) => {
                lines.push(`  ${i + 1}. ${loc}`);
            });
        }

        if (pendingLocations.length > 0) {
            lines.push('');
            lines.push(`⏳ *Não coletados — ficaram pro próximo dia (${pendingLocations.length}):*`);
            pendingLocations.forEach((loc, i) => {
                lines.push(`  ${i + 1}. ${loc}`);
            });
        }

        lines.push('');
        if (pendingLocations.length === 0) {
            lines.push('🎉 Todas as coletas do dia foram concluídas!');
        } else {
            lines.push(`⚠️ ${pendingLocations.length} coleta(s) pendente(s) com prioridade para amanhã.`);
        }

        const reportMsg = lines.join('\n');
        await EvolutionService.sendTextMessage(ownerPhone, reportMsg);
        console.log(`[CompletionService] 📤 Owner report sent to ${ownerPhone}`);

    } catch (error) {
        console.error(`[CompletionService] ❌ Error sending owner report:`, error);
    }
}

module.exports = { processCompletionMessage };
