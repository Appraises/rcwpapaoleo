// server/services/DispatchNotifierService.js
const EvolutionService = require('./EvolutionService');
const msg = require('../utils/MessageVariation');

class DispatchNotifierService {
    /**
     * Starts the progressive notification queue for the day's route.
     * @param {Array} orderedDetails - Array of client details ordered by route
     */
    static startNotificationQueue(orderedDetails) {
        if (!orderedDetails || orderedDetails.length === 0) return;

        console.log(`[DispatchNotifier] 📡 Starting notification queue for ${orderedDetails.length} clients.`);

        const chunkSize = 5;
        const delayMs = 40 * 60 * 1000; // 40 minutes in milliseconds

        let chunks = [];
        for (let i = 0; i < orderedDetails.length; i += chunkSize) {
            chunks.push(orderedDetails.slice(i, i + chunkSize));
        }

        console.log(`[DispatchNotifier] 📦 Split into ${chunks.length} chunks of up to ${chunkSize} clients.`);

        // Process first chunk immediately
        if (chunks.length > 0) {
            this.notifyChunk(chunks[0], 1, chunks.length);
        }

        // Schedule the subsequent chunks
        for (let idx = 1; idx < chunks.length; idx++) {
            const timeToWait = idx * delayMs;
            setTimeout(() => {
                this.notifyChunk(chunks[idx], idx + 1, chunks.length);
            }, timeToWait);
            console.log(`[DispatchNotifier] ⏱️ Scheduled chunk ${idx + 1}/${chunks.length} in ${timeToWait / 60000} mins.`);
        }
    }

    /**
     * Iterates over a chunk of clients and sends the notification message.
     */
    static async notifyChunk(chunk, currentChunkNum, totalChunks) {
        console.log(`[DispatchNotifier] 📤 Processing chunk ${currentChunkNum}/${totalChunks} (${chunk.length} clients)`);
        
        let clientIndex = 0;
        for (const client of chunk) {
            if (!client.phone) {
                console.log(`[DispatchNotifier] ⏭️ Skipped "${client.name}" (No phone number)`);
                continue;
            }

            const cleanPhone = EvolutionService._formatPhone(client.phone);
            
            if (cleanPhone) {
                const firstName = client.name.split(' ')[0];
                const baseMessage = msg.dispatchReminder.notification(firstName);
                const humanizedMessage = EvolutionService.humanizeMessage(baseMessage);
                const remoteJid = `${cleanPhone}@s.whatsapp.net`;

                try {
                    // Regra 1 e 2: Atraso Base Progressivo (25s) com Fator Randômico (2s a 7s)
                    if (clientIndex > 0) {
                        const tempoBase = 25000;
                        const delayFinal = tempoBase + Math.floor(Math.random() * 5000) + 2000;
                        console.log(`[DispatchNotifier] ⏳ Anti-spam: Esperando ${delayFinal / 1000}s antes de notificar ${firstName}...`);
                        await new Promise(resolve => setTimeout(resolve, delayFinal));
                    } else {
                        // Pequeno delay apenas pro primeiro elemento do chunk para não ser instantâneo puro
                        const randomDelay = Math.floor(Math.random() * 3000) + 1000;
                        await new Promise(resolve => setTimeout(resolve, randomDelay));
                    }

                    await EvolutionService.simulateTypingAndSend(cleanPhone, humanizedMessage, remoteJid);
                    console.log(`[DispatchNotifier] ✅ Sent reminder to ${firstName} (${cleanPhone})`);
                } catch (sendError) {
                    console.error(`[DispatchNotifier] ❌ Failed to send reminder to ${client.name} (${cleanPhone}):`, sendError.message);
                }
            }
            clientIndex++;
        }
    }

    /**
     * Queues an ad-hoc list of clients for notification (when added dynamically mid-day)
     * Follows the base 25s anti-spam progressive delay without splitting them into 40-min chunks.
     * @param {Array} adHocClients - Array of Client models
     */
    static startAdHocClientNotificationQueue(adHocClients) {
        if (!adHocClients || adHocClients.length === 0) return;

        console.log(`[DispatchNotifier] 📡 Starting Ad-Hoc notification queue for ${adHocClients.length} clients.`);
        
        // Execute immediately (it handles the delays internally)
        this.notifyAdHocChunk(adHocClients);
    }

    /**
     * Similar to notifyChunk, but sends the specific Ad-Hoc message variants
     */
    static async notifyAdHocChunk(chunk) {
        let clientIndex = 0;
        for (const client of chunk) {
            if (!client.phone) {
                console.log(`[DispatchNotifier] ⏭️ Ad-Hoc Skipped "${client.name}" (No phone number)`);
                continue;
            }

            const cleanPhone = EvolutionService._formatPhone(client.phone);
            
            if (cleanPhone) {
                const firstName = client.name.split(' ')[0];
                const baseMessage = msg.dispatchAdHoc.clientAlert(firstName);
                const humanizedMessage = EvolutionService.humanizeMessage(baseMessage);
                const remoteJid = `${cleanPhone}@s.whatsapp.net`;

                try {
                    if (clientIndex > 0) {
                        const tempoBase = 25000;
                        const delayFinal = tempoBase + Math.floor(Math.random() * 5000) + 2000;
                        console.log(`[DispatchNotifier] ⏳ Anti-spam (AdHoc): Esperando ${delayFinal / 1000}s antes de avisar ${firstName}...`);
                        await new Promise(resolve => setTimeout(resolve, delayFinal));
                    } else {
                        const randomDelay = Math.floor(Math.random() * 3000) + 1000;
                        await new Promise(resolve => setTimeout(resolve, randomDelay));
                    }

                    await EvolutionService.simulateTypingAndSend(cleanPhone, humanizedMessage, remoteJid);
                    console.log(`[DispatchNotifier] ✅ Sent Ad-Hoc reminder to ${firstName} (${cleanPhone})`);
                } catch (sendError) {
                    console.error(`[DispatchNotifier] ❌ Failed to send Ad-Hoc reminder to ${client.name} (${cleanPhone}):`, sendError.message);
                }
            }
            clientIndex++;
        }
    }
}

module.exports = DispatchNotifierService;
