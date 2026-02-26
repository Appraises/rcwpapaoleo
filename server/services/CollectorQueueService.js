// server/services/CollectorQueueService.js
// A simple FIFO async queue to process collector completion messages sequentially.
// Prevents race conditions and Evolution API bans from overlapping typing/reading delays.

const { processCompletionMessage } = require('./CompletionService');

class CollectorQueueService {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.buffers = new Map();
    }

    /**
     * Add a collector webhook event to the buffer.
     */
    add(collectorId, messageText, remoteJid, messageId) {
        const BUFF_TIME_MS = 1 * 60 * 1000; // 1 minutes

        if (this.buffers.has(collectorId)) {
            const buffer = this.buffers.get(collectorId);
            clearTimeout(buffer.timer);
            buffer.text += '\n' + messageText;
            buffer.remoteJid = remoteJid;
            buffer.messageId = messageId;  // keep latest messageId
            buffer.timer = setTimeout(() => this.flushBuffer(collectorId), BUFF_TIME_MS);
            console.log(`[CollectorQueue] 📥 Appended message from collector ${collectorId}. Timer reset to ${BUFF_TIME_MS / 1000}s.`);
        } else {
            const timer = setTimeout(() => this.flushBuffer(collectorId), BUFF_TIME_MS);
            this.buffers.set(collectorId, { text: messageText, timer, remoteJid, messageId });
            console.log(`[CollectorQueue] 📥 Started ${BUFF_TIME_MS / 1000}s buffer for collector ${collectorId}.`);
        }
    }

    flushBuffer(collectorId) {
        const buffer = this.buffers.get(collectorId);
        if (!buffer) return;

        this.buffers.delete(collectorId);
        this.queue.push({
            collectorId,
            messageText: buffer.text,
            remoteJid: buffer.remoteJid,
            messageId: buffer.messageId
        });
        console.log(`[CollectorQueue] ⏱️ Timer reached! Flushed buffer for collector ${collectorId}. Queue size: ${this.queue.length}`);

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
