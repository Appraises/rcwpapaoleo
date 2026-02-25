// server/services/QueueService.js
// In-Memory Queue for processing WhatsApp messages 1-by-1 to prevent CPU overload
// Includes anti-ban countermeasures: delayed read receipts, typing simulation, message humanization

const LlmService = require('./LlmService');
const EvolutionService = require('./EvolutionService');
const { CollectionRequest, Client } = require('../models');
const { Op } = require('sequelize');

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
                const client = await Client.findByPk(task.clientId);
                if (!client) {
                    console.error(`[QueueService] ❌ Client ${task.clientId} not found in DB`);
                    return;
                }

                // 2. Check for existing PENDING or DISPATCHED requests for this client
                const existingRequest = await CollectionRequest.findOne({
                    where: {
                        clientId: task.clientId,
                        status: {
                            [Op.in]: ['PENDING', 'DISPATCHED']
                        }
                    }
                });

                if (existingRequest) {
                    console.log(`[QueueService] ⚠️ Duplicate collection request ignored for client ${task.clientId} (Status: ${existingRequest.status})`);

                    if (client.phone) {
                        const duplicateMessage = `Olá, ${client.name}! ♻️\n\nNós já recebemos o seu pedido de coleta recentemente e nossa equipe passará em breve para recolher o seu óleo.\n\nAgradecemos o aviso!`;
                        const humanizedDuplicate = EvolutionService.humanizeMessage(duplicateMessage);
                        console.log(`[QueueService] 🔄 Humanized (Duplicate): "${humanizedDuplicate.substring(0, 80)}..."`);

                        await EvolutionService.simulateRead(task.remoteJid, task.messageId);
                        await EvolutionService.simulateTypingAndSend(client.phone, humanizedDuplicate, task.remoteJid);
                    }
                } else {
                    // 3. Save new request to DB
                    await CollectionRequest.create({
                        clientId: task.clientId,
                        message: task.messageText,
                        status: 'PENDING'
                    });
                    console.log(`[QueueService] ✅ COLLECTION request created for client ${task.clientId}`);

                    // 4. Build and humanize the reply
                    if (client.phone) {
                        const baseMessage = `Olá, ${client.name}! ♻️\n\nSeu pedido de coleta foi registrado pelo nosso assistente virtual.\nNossos coletadores já foram avisados e o seu óleo será recolhido o mais breve possível!\n\nA equipe Cat Óleo agradece a sua colaboração.`;
                        const humanized = EvolutionService.humanizeMessage(baseMessage);
                        console.log(`[QueueService] 🔄 Humanized: "${humanized.substring(0, 80)}..."`);

                        // ─── ANTI-BAN: Natural reply sequence ─────────────────
                        // Step A+B+C: Pickup, Mark as Read, Read delay
                        await EvolutionService.simulateRead(task.remoteJid, task.messageId);

                        // Step D: Typing → Pause → Send
                        await EvolutionService.simulateTypingAndSend(client.phone, humanized, task.remoteJid);
                        // ──────────────────────────────────────────────────────
                    }
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
