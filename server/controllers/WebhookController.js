const { Client } = require('../models');
const { Op } = require('sequelize');
const QueueService = require('../services/QueueService');

exports.handleEvolutionWebhook = async (req, res) => {
    try {
        // Log payload for debugging during development
        console.log('--- Webhook Received ---');
        console.log(JSON.stringify(req.body, null, 2));

        // Evolution API standard payload check
        // Assuming the webhook event is "messages.upsert"
        const event = req.body.event;
        if (event !== 'messages.upsert') {
            return res.status(200).json({ message: 'Event ignored' });
        }

        const messages = req.body.data?.messages || [];

        for (const msg of messages) {
            // Ignore fromMe messages (messages sent by the bot/system itself)
            if (msg.key.fromMe) continue;

            const remoteJid = msg.key.remoteJid;
            // Example: 5588999999999@s.whatsapp.net
            // We need to extract the raw number
            if (!remoteJid || !remoteJid.includes('@s.whatsapp.net')) continue;

            const rawNumber = remoteJid.split('@')[0];

            // Text content (can be conversation or extendedTextMessage depending on the message type)
            const textContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

            // Try to find a matching client in the database.
            // Because phones in the DB might be formatted (e.g. "(79) 99838-9263") or raw ("79998389263"),
            // a simple LIKE query is unreliable. We will fetch clients and compare cleaned numbers.
            const lastEight = rawNumber.slice(-8);

            // Fetch all clients (if list is huge this could be optimized, but fine for now)
            const allClients = await Client.findAll({
                attributes: ['id', 'phone']
            });

            let client = null;
            for (const c of allClients) {
                if (!c.phone) continue;
                const cleanedDbPhone = c.phone.replace(/\D/g, ''); // Remove everything except numbers
                if (cleanedDbPhone.endsWith(lastEight)) {
                    client = c;
                    break;
                }
            }

            if (client) {
                // Instantly add to our in-memory queue to be processed by the LLM in background
                QueueService.add(client.id, textContent);
            } else {
                console.log(`[Webhook] Unregistered phone number: ${rawNumber}`);
            }
        }

        // Always return 200 OK so the Evolution API knows we received it
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        // We still return 200 to typical webhooks to prevent retries of bad data,
        // or 500 if we want Evolution to retry later.
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
