// server/services/EvolutionService.js
require('dotenv').config();

class EvolutionService {
    static async sendTextMessage(phone, message) {
        try {
            const apiUrl = process.env.EVOLUTION_API_URL;
            const apiKey = process.env.EVOLUTION_API_KEY;
            const instanceName = process.env.EVOLUTION_INSTANCE_NAME;

            if (!apiUrl || !apiKey || !instanceName) {
                console.warn('[EvolutionService] Missing Evolution API credentials in .env. Cannot send WhatsApp reply.');
                return false;
            }

            // Clean the phone number (Evolution usually expects the raw international format without +)
            // Assuming the `phone` variable from DB is just digits like 88991234567
            // Usually we prepend 55 if it's missing, but let's assume the DB has it or adds it.
            let formattedPhone = phone.replace(/[^0-9]/g, '');
            if (formattedPhone.length === 11 || formattedPhone.length === 10) {
                formattedPhone = `55${formattedPhone}`;
                // Evolution API requires the suffix @s.whatsapp.net usually in some versions, but the
                // /message/sendText endpoint often handles raw numbers if well-formatted.
                // Documentation states standard international format without '+' is OK.
            }

            const body = {
                number: formattedPhone,
                textMessage: {
                    text: message
                },
                options: {
                    delay: 1200, // Make it look a bit natural
                    presence: 'composing' // Shows "typing..." before sending
                }
            };

            console.log(`[EvolutionService] Sending reply to ${formattedPhone}...`);

            const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': apiKey
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errData = await response.text();
                console.error(`[EvolutionService] Failed to send message: ${response.status} ${errData}`);
                return false;
            }

            console.log(`[EvolutionService] ✅ Message successfully sent to ${formattedPhone}`);
            return true;
        } catch (error) {
            console.error('[EvolutionService] Network error sending WhatsApp message:', error.message);
            return false;
        }
    }
}

module.exports = EvolutionService;
