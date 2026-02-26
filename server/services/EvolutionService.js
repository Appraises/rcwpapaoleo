// server/services/EvolutionService.js
// Handles communication with the Evolution API for WhatsApp messaging
// Includes anti-ban countermeasures: read receipts, typing simulation, message humanization

require('dotenv').config();

// ─── Helpers ─────────────────────────────────────────────────────────
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ─── Synonym dictionary for message humanization ─────────────────────
const SYNONYMS = {
    'Olá': ['Oi'],
    'registrado': ['anotado', 'salvo', 'cadastrado'],
    'assistente virtual': ['sistema automático', 'robô', 'bot'],
    'avisados': ['notificados', 'informados', 'alertados'],
    'o mais breve possível': ['em breve', 'o quanto antes', 'logo logo', 'rapidinho'],
    'agradece': ['agradece muito', 'é grata por', 'agradece de coração'],
    'colaboração': ['parceria', 'contribuição', 'ajuda'],
    'pedido de coleta': ['solicitação de coleta', 'pedido de retirada', 'solicitação de recolhimento'],
    'recolhido': ['coletado', 'retirado', 'buscado'],
    'coletadores': ['coletores', 'motoristas', 'equipe de campo'],
};

const EMOJI_VARIATIONS = ['♻️', '🌱', '🛢️', '💚', '🌿', '✅'];
const ZERO_WIDTH_SPACE = '\u200B';

class EvolutionService {
    // ─── Core: get credentials ───────────────────────────────────────
    static _getCredentials() {
        const apiUrl = process.env.EVOLUTION_API_URL;
        const apiKey = process.env.EVOLUTION_API_KEY;
        const instanceName = process.env.EVOLUTION_INSTANCE_NAME;
        if (!apiUrl || !apiKey || !instanceName) {
            console.warn('[EvolutionService] Missing Evolution API credentials in .env.');
            return null;
        }
        return { apiUrl, apiKey, instanceName };
    }

    // ─── Format phone number ─────────────────────────────────────────
    static _formatPhone(phone) {
        let domain = '';
        if (phone.includes('@')) {
            const parts = phone.split('@');
            phone = parts[0];
            domain = '@' + parts[1];
        }

        let formatted = phone.replace(/[^0-9]/g, '');
        if (formatted.length === 11 || formatted.length === 10) {
            formatted = `55${formatted}`;
        }
        return formatted + domain;
    }

    // ─── 1. Mark message as read (blue ticks) ────────────────────────
    static async markAsRead(remoteJid, messageId) {
        try {
            const creds = this._getCredentials();
            if (!creds) return false;

            console.log(`[EvolutionService] 👁️ Marking message ${messageId} as read...`);

            const response = await fetch(`${creds.apiUrl}/chat/markMessageAsRead/${creds.instanceName}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'apikey': creds.apiKey },
                body: JSON.stringify({
                    readMessages: [{
                        remoteJid: remoteJid,
                        id: messageId,
                        fromMe: false
                    }]
                })
            });

            const text = await response.text();
            if (!response.ok) {
                console.error(`[EvolutionService] ❌ markAsRead failed (${response.status}): ${text}`);
                return false;
            }

            console.log(`[EvolutionService] ✅ Marked as read: ${messageId}`);
            return true;
        } catch (error) {
            console.error('[EvolutionService] ❌ markAsRead error:', error.message);
            return false;
        }
    }

    // ─── 1.5 Simulate natural reading and mark as read ───────────────
    static async simulateRead(remoteJid, messageId) {
        if (!remoteJid || !messageId) return false;

        // Step A: "I just picked up my phone" delay (5-25s)
        const pickupDelay = randomInt(5000, 25000);
        console.log(`[EvolutionService] 📱 Simulating phone pickup delay: ${(pickupDelay / 1000).toFixed(1)}s...`);
        await delay(pickupDelay);

        // Step B: Mark as read
        await this.markAsRead(remoteJid, messageId);

        // Step C: Simulate "reading time" (2-6s)
        const readingDelay = randomInt(2000, 6000);
        console.log(`[EvolutionService] 👀 Reading incoming message: ${(readingDelay / 1000).toFixed(1)}s...`);
        await delay(readingDelay);

        return true;
    }

    // ─── 2. Send typing presence ─────────────────────────────────────
    static async sendPresence(remoteJid, presence = 'composing') {
        try {
            const creds = this._getCredentials();
            if (!creds) return false;

            const emoji = presence === 'composing' ? '📝' : '⏸️';
            console.log(`[EvolutionService] ${emoji} Presence: ${presence} -> ${remoteJid}`);

            const response = await fetch(`${creds.apiUrl}/chat/sendPresence/${creds.instanceName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': creds.apiKey },
                body: JSON.stringify({
                    number: remoteJid,
                    presence: presence  // "composing" | "paused" | "available" | "unavailable"
                })
            });

            const text = await response.text();
            if (!response.ok) {
                console.error(`[EvolutionService] ❌ sendPresence failed (${response.status}): ${text}`);
                return false;
            }

            console.log(`[EvolutionService] ✅ Presence set: ${presence}`);
            return true;
        } catch (error) {
            console.error('[EvolutionService] ❌ sendPresence error:', error.message);
            return false;
        }
    }

    // ─── 3. Humanize message text ────────────────────────────────────
    static humanizeMessage(text) {
        let result = text;

        // Replace synonyms randomly
        for (const [original, alternatives] of Object.entries(SYNONYMS)) {
            if (result.includes(original) && Math.random() > 0.4) {
                const replacement = alternatives[randomInt(0, alternatives.length - 1)];
                result = result.replace(original, replacement);
            }
        }

        // Swap the main emoji randomly
        const mainEmoji = EMOJI_VARIATIONS[randomInt(0, EMOJI_VARIATIONS.length - 1)];
        result = result.replace(/[♻️🌱🛢️💚🌿✅]/, mainEmoji);

        // Insert zero-width spaces at 2-4 random positions to make the hash unique
        const chars = result.split('');
        const insertCount = randomInt(2, 4);
        for (let i = 0; i < insertCount; i++) {
            const pos = randomInt(5, chars.length - 5);
            chars.splice(pos, 0, ZERO_WIDTH_SPACE);
        }
        result = chars.join('');

        return result;
    }

    // ─── 4. Full human-like send flow ────────────────────────────────
    // Called AFTER markAsRead + reading pause have already happened in QueueService
    static async simulateTypingAndSend(phone, message, remoteJid) {
        try {
            // Step 1: Start "typing..."
            await this.sendPresence(remoteJid, 'composing');

            // Step 2: Calculate typing time proportional to message length
            // Tuned for: ~3-7s (short), ~13-33s (medium), ~33-42s (long)
            const charCount = message.length;
            const charsPerSec = randomInt(6, 15);
            const rawTypingMs = (charCount / charsPerSec) * 1000;
            const typingMs = Math.max(3000, Math.min(rawTypingMs, 42000));
            console.log(`[EvolutionService] ⏱️ Typing for ${(typingMs / 1000).toFixed(1)}s (${charCount} chars at ~${charsPerSec} c/s)...`);
            await delay(typingMs);

            // Step 3: Stop typing
            await this.sendPresence(remoteJid, 'paused');

            // Step 4: Small natural pause before "hitting send" (reviewing the message)
            const pauseMs = randomInt(800, 2500);
            console.log(`[EvolutionService] ⏱️ Review pause ${pauseMs}ms before sending...`);
            await delay(pauseMs);

            // Step 5: Send the message
            return await this.sendTextMessage(phone, message);
        } catch (error) {
            console.error('[EvolutionService] ❌ simulateTypingAndSend error:', error.message);
            return false;
        }
    }

    // ─── 5. Send text message (core) ─────────────────────────────────
    static async sendTextMessage(phone, message) {
        try {
            const creds = this._getCredentials();
            if (!creds) return false;

            const formattedPhone = this._formatPhone(phone);

            const body = {
                number: formattedPhone,
                text: message
            };

            console.log(`[EvolutionService] 📤 Sending reply to ${formattedPhone}...`);

            const response = await fetch(`${creds.apiUrl}/message/sendText/${creds.instanceName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': creds.apiKey },
                body: JSON.stringify(body)
            });

            const responseText = await response.text();
            console.log(`[EvolutionService] Response status: ${response.status}`);
            console.log(`[EvolutionService] Response body: ${responseText.substring(0, 500)}`);

            if (!response.ok) {
                console.error(`[EvolutionService] ❌ Failed to send message: ${response.status} ${responseText}`);
                return false;
            }

            console.log(`[EvolutionService] ✅ Message successfully sent to ${formattedPhone}`);
            return true;
        } catch (error) {
            console.error('[EvolutionService] ❌ Network error sending WhatsApp message:', error.message);
            return false;
        }
    }
}

module.exports = EvolutionService;
