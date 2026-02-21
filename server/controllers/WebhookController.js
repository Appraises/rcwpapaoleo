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
            // Brazilian phones are tricky because of the '9' digit. 
            // So we'll try to match using LIKE, searching for the last 8-10 digits.
            // Let's grab the last 8 digits as a safe fallback for local numbers
            const lastEight = rawNumber.slice(-8);

            const client = await Client.findOne({
                where: {
                    phone: {
                        [Op.like]: `%${lastEight}%`
                    }
                }
            });

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
