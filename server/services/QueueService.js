// server/services/QueueService.js
// In-Memory Queue for processing WhatsApp messages 1-by-1 to prevent CPU overload

const LlmService = require('./LlmService');
const { CollectionRequest } = require('../models');

class QueueService {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }

    // Add a new message to the queue to be processed
    add(clientId, messageText) {
        this.queue.push({ clientId, messageText });
        console.log(`[QueueService] Added message to queue. Current size: ${this.queue.length}`);

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
