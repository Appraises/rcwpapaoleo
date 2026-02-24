// server/services/QueueService.js
// In-Memory Queue for processing WhatsApp messages 1-by-1 to prevent CPU overload
// Includes anti-ban countermeasures: delayed read receipts, typing simulation, message humanization

const LlmService = require('./LlmService');
const EvolutionService = require('./EvolutionService');
const { CollectionRequest, Client } = require('../models');

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

class QueueService {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.buffers = new Map();
    }

    // Add a new message to the queue
    // NOTE: We do NOT mark as read here — that happens later in processQueue()
    //       to simulate a natural "I wasn't looking at my phone" delay
    add(clientId, messageText, remoteJid, messageId) {
        const BUFF_TIME_MS = 2 * 60 * 1000; // 2 minutes

        if (this.buffers.has(clientId)) {
            const buffer = this.buffers.get(clientId);
            clearTimeout(buffer.timer);
            buffer.text += '\n' + messageText;
            buffer.remoteJid = remoteJid;
            buffer.messageId = messageId;  // keep latest messageId
            buffer.timer = setTimeout(() => this.flushBuffer(clientId), BUFF_TIME_MS);
            console.log(`[QueueService] Appended message from client ${clientId}. Timer reset to ${BUFF_TIME_MS / 1000}s.`);
        } else {
            const timer = setTimeout(() => this.flushBuffer(clientId), BUFF_TIME_MS);
            this.buffers.set(clientId, { text: messageText, timer, remoteJid, messageId });
            console.log(`[QueueService] Started ${BUFF_TIME_MS / 1000}s buffer for client ${clientId}.`);
        }
    }

    flushBuffer(clientId) {
        const buffer = this.buffers.get(clientId);
        if (!buffer) return;

        this.buffers.delete(clientId);
        this.queue.push({
            clientId,
            messageText: buffer.text,
            remoteJid: buffer.remoteJid,
            messageId: buffer.messageId
        });
        console.log(`[QueueService] Timer reached! Flushed buffer for client ${clientId}. Queue size: ${this.queue.length}`);

        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    async processQueue() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            console.log(`[QueueService] Queue empty. Idling...`);
            return;
        }

        this.isProcessing = true;
        const task = this.queue.shift();

        try {
            console.log(`[QueueService] Processing message from client ${task.clientId}...`);

            // 1. LLM intent check
            const isCollectionRequest = await LlmService.checkCollectionIntent(task.messageText);

            if (isCollectionRequest) {
                // 2. Save to DB
                await CollectionRequest.create({
                    clientId: task.clientId,
                    message: task.messageText,
                    status: 'PENDING'
                });
                console.log(`[QueueService] ✅ COLLECTION request created for client ${task.clientId}`);

                // 3. Build and humanize the reply
                const client = await Client.findByPk(task.clientId);
                if (client && client.phone) {
                    const baseMessage = `Olá, ${client.name}! ♻️\n\nSeu pedido de coleta foi registrado pelo nosso assistente virtual.\nNossos coletadores já foram avisados e o seu óleo será recolhido o mais breve possível!\n\nA equipe Cat Óleo agradece a sua colaboração.`;
                    const humanized = EvolutionService.humanizeMessage(baseMessage);
                    console.log(`[QueueService] 🔄 Humanized: "${humanized.substring(0, 80)}..."`);

                    // ─── ANTI-BAN: Natural reply sequence ─────────────────
                    // Step A: Wait a random "I just picked up my phone" delay (5-25s)
                    const pickupDelay = randomInt(5000, 25000);
                    console.log(`[QueueService] 📱 Simulating phone pickup delay: ${(pickupDelay / 1000).toFixed(1)}s...`);
                    await delay(pickupDelay);

                    // Step B: Mark as read (blue ticks) — "I just opened the chat"
                    if (task.remoteJid && task.messageId) {
                        await EvolutionService.markAsRead(task.remoteJid, task.messageId);
                    }

                    // Step C: Simulate "reading the incoming message" (2-6s)
                    const readingDelay = randomInt(2000, 6000);
                    console.log(`[QueueService] 👀 Reading incoming message: ${(readingDelay / 1000).toFixed(1)}s...`);
                    await delay(readingDelay);

                    // Step D: Typing → Pause → Send (handled by EvolutionService)
                    await EvolutionService.simulateTypingAndSend(client.phone, humanized, task.remoteJid);
                    // ──────────────────────────────────────────────────────
                }
            } else {
                console.log(`[QueueService] ℹ️ NON-COLLECTION. Ignored message from client ${task.clientId}`);
            }

        } catch (error) {
            console.error(`[QueueService] ❌ Failed to process task for client ${task.clientId}:`, error);
        } finally {
            setTimeout(() => this.processQueue(), 500);
        }
    }
}

module.exports = new QueueService();
