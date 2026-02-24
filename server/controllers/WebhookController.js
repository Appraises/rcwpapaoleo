const { Client } = require('../models');
const { Op } = require('sequelize');
const QueueService = require('../services/QueueService');

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

            const remoteJid = msg.key.remoteJid;
            console.log(`[Webhook] remoteJid: ${remoteJid}`);

            if (!remoteJid || !remoteJid.includes('@s.whatsapp.net')) {
                console.log('[Webhook] ⏩ Skipping non-individual chat (group or broadcast)');
                continue;
            }

            const rawNumber = remoteJid.split('@')[0];
            console.log(`[Webhook] Raw phone number extracted: ${rawNumber}`);

            const textContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            console.log(`[Webhook] Text content: "${textContent}"`);

            const lastEight = rawNumber.slice(-8);
            console.log(`[Webhook] Last 8 digits for matching: ${lastEight}`);

            const allClients = await Client.findAll({
                attributes: ['id', 'phone']
            });
            console.log(`[Webhook] Total clients in DB: ${allClients.length}`);

            let client = null;
            for (const c of allClients) {
                if (!c.phone) continue;
                const cleanedDbPhone = c.phone.replace(/\D/g, '');
                console.log(`[Webhook]   Comparing DB phone "${c.phone}" (cleaned: "${cleanedDbPhone}") with last8: "${lastEight}" => endsWith: ${cleanedDbPhone.endsWith(lastEight)}`);
                if (cleanedDbPhone.endsWith(lastEight)) {
                    client = c;
                    break;
                }
            }

            if (client) {
                console.log(`[Webhook] ✅ MATCHED client id=${client.id}. Adding to queue...`);
                QueueService.add(client.id, textContent, remoteJid, msg.key.id);
            } else {
                console.log(`[Webhook] ❌ No matching client found for number: ${rawNumber}`);
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
