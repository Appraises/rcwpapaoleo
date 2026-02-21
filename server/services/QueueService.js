// server/services/QueueService.js
// In-Memory Queue for processing WhatsApp messages 1-by-1 to prevent CPU overload

const LlmService = require('./LlmService');
const EvolutionService = require('./EvolutionService');
const { CollectionRequest, Client } = require('../models');

class QueueService {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.buffers = new Map(); // To group multiple messages from the same client
    }

    // Add a new message to the queue to be processed
    add(clientId, messageText) {
        const BUFF_TIME_MS = 3 * 60 * 1000; // 3 minutes configurable buffer

        // If a buffer already exists for this client, append to it and reset the timer
        if (this.buffers.has(clientId)) {
            const buffer = this.buffers.get(clientId);
            clearTimeout(buffer.timer);
            buffer.text += '\n' + messageText; // Concatenate messages

            // Set new timer
            buffer.timer = setTimeout(() => this.flushBuffer(clientId), BUFF_TIME_MS);
            console.log(`[QueueService] Appended message from client ${clientId}. Timer reset to ${BUFF_TIME_MS / 1000}s.`);
        } else {
            // Create a new buffer
            const timer = setTimeout(() => this.flushBuffer(clientId), BUFF_TIME_MS);
            this.buffers.set(clientId, { text: messageText, timer });
            console.log(`[QueueService] Started ${BUFF_TIME_MS / 1000}s buffer for client ${clientId}.`);
        }
    }

    // Move from the wait buffer to the actual execution queue
    flushBuffer(clientId) {
        const buffer = this.buffers.get(clientId);
        if (!buffer) return;

        this.buffers.delete(clientId);
        this.queue.push({ clientId, messageText: buffer.text });
        console.log(`[QueueService] Timer reached! Flushed buffer for client ${clientId} to the main processing queue. Current size: ${this.queue.length}`);

        // Start processing if it's currently idle
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
        // Dequeue the oldest item (FIFO)
        const task = this.queue.shift();

        try {
            console.log(`[QueueService] Processing message from client ${task.clientId}...`);

            // 1. Send it to the local LLM
            const isCollectionRequest = await LlmService.checkCollectionIntent(task.messageText);

            if (isCollectionRequest) {
                // 2. If it's a collection request, save to DB
                await CollectionRequest.create({
                    clientId: task.clientId,
                    message: task.messageText,
                    status: 'PENDING'
                });
                console.log(`[QueueService] ✅ Intention understood: COLLECTION. Request created for client ${task.clientId}`);

                // 3. Send automatic WhatsApp confirmation
                const client = await Client.findByPk(task.clientId);
                if (client && client.phone) {
                    const message = `Olá, ${client.name}! ♻️\n\nSeu pedido de coleta foi registrado pelo nosso assistente virtual.\nNossos coletadores já foram avisados e o seu óleo será recolhido o mais breve possível!\n\nA equipe Cat Óleo agradece a sua colaboração.`;
                    await EvolutionService.sendTextMessage(client.phone, message);
                }
            } else {
                console.log(`[QueueService] ℹ️ Intention understood: NON-COLLECTION (or error). Ignored message from client ${task.clientId}`);
            }

        } catch (error) {
            console.error(`[QueueService] ❌ Failed to process task for client ${task.clientId}:`, error);
        } finally {
            // Process next item continuously until empty
            // Use setTimeout to avoid blocking the event loop entirely between calls
            setTimeout(() => this.processQueue(), 500);
        }
    }
}

// Export a singleton instance
module.exports = new QueueService();
