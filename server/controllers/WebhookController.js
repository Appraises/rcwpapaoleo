const { Client, User, ClientPhone } = require('../models');
const { Op } = require('sequelize');
const QueueService = require('../services/QueueService');
const CollectorQueueService = require('../services/CollectorQueueService');
const EvolutionService = require('../services/EvolutionService');

exports.handleEvolutionWebhook = async (req, res) => {
    try {
        console.log('==========================================================');
        console.log('[Webhook] 🟢 WEBHOOK HIT! Received at', new Date().toISOString());
        console.log('[Webhook] Method:', req.method);
        console.log('[Webhook] Headers:', JSON.stringify(req.headers, null, 2));
        console.log('[Webhook] Body (raw):', JSON.stringify(req.body, null, 2));
        console.log('==========================================================');

        const event = req.body.event;
        console.log(`[Webhook] Event type received: "${event}"`);

        // Accept both lowercase and uppercase event names for compatibility
        const validEvents = ['messages.upsert', 'MESSAGES_UPSERT'];
        if (!validEvents.includes(event)) {
            console.log(`[Webhook] ⚠️ Event "${event}" is NOT a message event. Ignoring.`);
            return res.status(200).json({ message: 'Event ignored', receivedEvent: event });
        }

        console.log('[Webhook] ✅ Event is a valid message event! Processing...');

        // Try multiple payload shapes from different Evolution API versions
        // v1: data.messages is an array | v2: data IS the message object directly
        let messages = [];
        if (Array.isArray(req.body.data?.messages)) {
            messages = req.body.data.messages;
        } else if (Array.isArray(req.body.data)) {
            messages = req.body.data;
        } else if (req.body.data && typeof req.body.data === 'object' && req.body.data.key) {
            // Single message object — wrap it in an array
            messages = [req.body.data];
        }
        console.log(`[Webhook] Extracted ${messages.length} message(s) to process`);

        for (const msg of messages) {
            console.log('[Webhook] Processing message:', JSON.stringify(msg, null, 2).substring(0, 500));

            if (!msg.key) {
                console.log('[Webhook] ⚠️ Message has no .key property, skipping');
                continue;
            }

            if (msg.key.fromMe) {
                console.log('[Webhook] ⏩ Skipping fromMe message');
                continue;
            }

            let remoteJid = msg.key.remoteJid;

            // Workaround for Meta's @lid privacy identifier
            // If the message is masked as a @lid, we must extract the real sender's phone number
            if (remoteJid && remoteJid.includes('@lid')) {
                // Try the community method first: message.key.senderPn
                if (msg.key.senderPn) {
                    const realSender = `${msg.key.senderPn}@s.whatsapp.net`;
                    console.log(`[Webhook] 👁️ @lid masked number detected! Swapping ${remoteJid} for senderPn ${realSender}`);
                    remoteJid = realSender;
                } else if (req.body.data?.key?.participant) {
                    // Fallback for group/broadcast-like lids
                    const participant = req.body.data.key.participant;
                    console.log(`[Webhook] 👁️ @lid masked number detected! Swapping ${remoteJid} for participant ${participant}`);
                    remoteJid = participant;
                } else {
                    console.log(`[Webhook] ⚠️ Received @lid (${remoteJid}) but could not find senderPn or participant in payload to discover the real number!`);
                }
            }

            console.log(`[Webhook] remoteJid: ${remoteJid}`);

            if (!remoteJid || (!remoteJid.includes('@s.whatsapp.net') && !remoteJid.includes('@lid'))) {
                console.log('[Webhook] ⏩ Skipping non-individual chat (group or broadcast)');
                continue;
            }

            const rawNumber = remoteJid.split('@')[0];
            console.log(`[Webhook] Raw phone number extracted: ${rawNumber}`);

            const textContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            console.log(`[Webhook] Text content: "${textContent}"`);

            const lastEight = rawNumber.slice(-8);
            console.log(`[Webhook] Last 8 digits for matching: ${lastEight}`);

            // ── Try matching as a COLLECTOR (User with isCollector flag) first ──────────────
            const collector = await User.findOne({
                where: {
                    isCollector: true,
                    phone: {
                        [Op.like]: `%${lastEight}%`
                    }
                },
                attributes: ['id', 'name', 'phone']
            });

            if (collector) {
                console.log(`[Webhook] 🚛 MATCHED COLLECTOR: ${collector.name} (id=${collector.id}). Routing to CollectorQueueService...`);
                const messageId = msg.key?.id;
                // Add to queue instead of processing directly to prevent parallel EVOLUTION API requests
                CollectorQueueService.add(collector.id, textContent, remoteJid, messageId);
                continue;
            }

            // ── Try matching as a CLIENT ──────────────────────────────
            // Search both main phone and additional phones using SQL LIKE queries
            const client = await Client.findOne({
                where: {
                    [Op.or]: [
                        { phone: { [Op.like]: `%${lastEight}%` } },
                        { '$additionalPhones.phone$': { [Op.like]: `%${lastEight}%` } }
                    ]
                },
                attributes: ['id', 'name', 'phone'],
                include: [{
                    model: ClientPhone,
                    as: 'additionalPhones',
                    attributes: ['phone']
                }],
                subQuery: false
            });

            if (client) {
                console.log(`[Webhook] ✅ MATCHED client id=${client.id}. Adding to queue...`);
                QueueService.add(client.id, textContent, remoteJid, msg.key.id);
            } else {
                console.log(`[Webhook] ❌ No matching client or collector found for number: ${rawNumber}`);

                // Envia uma mensagem amigável para qualquer número não cadastrado
                const fallbackMessage = `Olá! ♻️ Bem-vindo(a) à *CatÓleo*!\n\nRecebemos sua mensagem, mas este número de telefone ainda não foi localizado em nosso sistema de coletas.\n\nSe você já é nosso parceiro, verifique se está falando do mesmo número cadastrado. Caso contrário, aguarde um momento e nossa equipe de atendimento falará com você! 🌱`;

                try {
                    console.log(`[Webhook] ℹ️ Sending unregistered fallback message to ${remoteJid}`);
                    await EvolutionService.sendTextMessage(remoteJid, fallbackMessage);
                } catch (replyErr) {
                    console.error(`[Webhook] ❌ Failed to send unregistered fallback message:`, replyErr.message);
                }
            }
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[Webhook] ❌ CRITICAL ERROR:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Simple test GET endpoint to check if the webhook route is reachable
exports.testWebhook = (req, res) => {
    console.log('[Webhook] 🧪 Test endpoint hit!');
    res.json({ status: 'ok', message: 'Webhook route is reachable!', timestamp: new Date().toISOString() });
};
