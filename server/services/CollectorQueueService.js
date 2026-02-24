// server/services/CollectorQueueService.js
// A simple FIFO async queue to process collector completion messages sequentially.
// Prevents race conditions and Evolution API bans from overlapping typing/reading delays.

const { processCompletionMessage } = require('./CompletionService');

class CollectorQueueService {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }

    /**
     * Add a collector webhook event to the queue.
     */
    add(collectorId, messageText, remoteJid, messageId) {
        this.queue.push({ collectorId, messageText, remoteJid, messageId });
        console.log(`[CollectorQueue] 📥 Task added for collector ${collectorId}. Queue size: ${this.queue.length}`);

        if (!this.isProcessing) {
            this.processNext();
        }
    }

    async processNext() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;
        const task = this.queue.shift();

        try {
            console.log(`[CollectorQueue] ⚙️ Processing task for collector ${task.collectorId}...`);
            await processCompletionMessage(task.collectorId, task.messageText, task.remoteJid, task.messageId);
        } catch (error) {
            console.error(`[CollectorQueue] ❌ Error processing task for collector ${task.collectorId}:`, error);
        }

        // Add a small delay between tasks to let the API breathe
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Loop to next task
        this.processNext();
    }
}

// Export a singleton instance
module.exports = new CollectorQueueService();
