// server/services/TranscriptionService.js
// Sequential queue for audio transcription via self-hosted Whisper server.
// Downloads audio from Evolution API, sends to Whisper, and feeds the
// transcribed text back into QueueService / CollectorQueueService.

const fs = require('fs');
const path = require('path');
const os = require('os');
const FormData = require('form-data');

const QueueService = require('./QueueService');
const CollectorQueueService = require('./CollectorQueueService');

require('dotenv').config();

const WHISPER_URL = process.env.WHISPER_URL || 'http://localhost:5555';

class TranscriptionService {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }

    /**
     * Enqueue an audio message for transcription.
     * @param {object} params
     * @param {number} params.entityId - Client ID or Collector ID
     * @param {string} params.messageId - WhatsApp message ID (msg.key.id)
     * @param {string} params.remoteJid - Sender's JID
     * @param {boolean} params.isCollector - true if from a collector, false if from a client
     * @param {object} params.messageKey - Full msg.key object for getBase64 call
     */
    add({ entityId, messageId, remoteJid, isCollector, messageKey }) {
        this.queue.push({ entityId, messageId, remoteJid, isCollector, messageKey });
        console.log(`[TranscriptionService] 📥 Queued audio from ${isCollector ? 'collector' : 'client'} ${entityId}. Queue size: ${this.queue.length}`);

        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    async processQueue() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            console.log('[TranscriptionService] Queue empty. Idling...');
            return;
        }

        this.isProcessing = true;
        const task = this.queue.shift();
        let tmpFilePath = null;

        try {
            const entityLabel = task.isCollector ? 'collector' : 'client';
            console.log(`[TranscriptionService] ⚙️ Processing audio from ${entityLabel} ${task.entityId}...`);

            // 1. Download audio as base64 from Evolution API
            const base64Data = await this._downloadAudioBase64(task.messageKey);
            if (!base64Data) {
                console.error(`[TranscriptionService] ❌ Could not download audio for ${entityLabel} ${task.entityId}. Skipping.`);
                return;
            }

            // 2. Save base64 to temp .ogg file
            tmpFilePath = path.join(os.tmpdir(), `whisper_${Date.now()}_${task.entityId}.ogg`);
            const audioBuffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(tmpFilePath, audioBuffer);
            console.log(`[TranscriptionService] 💾 Saved temp audio (${audioBuffer.length} bytes) to ${tmpFilePath}`);

            // 3. Send to Whisper server for transcription
            const transcribedText = await this._transcribe(tmpFilePath);
            if (!transcribedText) {
                console.error(`[TranscriptionService] ❌ Transcription returned empty for ${entityLabel} ${task.entityId}. Skipping.`);
                return;
            }

            console.log(`[TranscriptionService] ✅ Transcription for ${entityLabel} ${task.entityId}: "${transcribedText.substring(0, 120)}..."`);

            // 4. Feed transcribed text into the appropriate queue service
            if (task.isCollector) {
                CollectorQueueService.add(task.entityId, transcribedText, task.remoteJid, task.messageId);
            } else {
                QueueService.add(task.entityId, transcribedText, task.remoteJid, task.messageId);
            }

        } catch (error) {
            console.error(`[TranscriptionService] ❌ Error processing audio for entity ${task.entityId}:`, error.message);
        } finally {
            // Clean up temp file
            if (tmpFilePath && fs.existsSync(tmpFilePath)) {
                try { fs.unlinkSync(tmpFilePath); } catch (e) { /* ignore */ }
            }

            // Process next item after a small delay
            setTimeout(() => this.processQueue(), 500);
        }
    }

    /**
     * Download audio from Evolution API using getBase64FromMediaMessage.
     * @param {object} messageKey - The full msg.key object
     * @returns {string|null} Base64-encoded audio data or null on failure
     */
    async _downloadAudioBase64(messageKey) {
        try {
            const apiUrl = process.env.EVOLUTION_API_URL;
            const apiKey = process.env.EVOLUTION_API_KEY;
            const instanceName = process.env.EVOLUTION_INSTANCE_NAME;

            if (!apiUrl || !apiKey || !instanceName) {
                console.error('[TranscriptionService] Missing Evolution API credentials in .env');
                return null;
            }

            const url = `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`;
            console.log(`[TranscriptionService] 📥 Downloading audio via ${url}...`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': apiKey
                },
                body: JSON.stringify({
                    message: {
                        key: messageKey
                    },
                    convertToMp4: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[TranscriptionService] ❌ getBase64 failed (${response.status}): ${errorText.substring(0, 300)}`);
                return null;
            }

            const data = await response.json();
            // Evolution API returns { base64: "..." } or { mediaMessage: { base64: "..." } }
            const base64 = data.base64 || data.mediaMessage?.base64 || null;

            if (!base64) {
                console.error('[TranscriptionService] ❌ No base64 data in response:', JSON.stringify(data).substring(0, 300));
                return null;
            }

            console.log(`[TranscriptionService] ✅ Downloaded audio (${base64.length} chars base64)`);
            return base64;

        } catch (error) {
            console.error('[TranscriptionService] ❌ Error downloading audio:', error.message);
            return null;
        }
    }

    /**
     * Send an audio file to the local Whisper server for transcription.
     * @param {string} filePath - Path to the audio file
     * @returns {string|null} Transcribed text or null on failure
     */
    async _transcribe(filePath) {
        try {
            const form = new FormData();
            form.append('file', fs.createReadStream(filePath));

            const url = `${WHISPER_URL}/transcribe`;
            console.log(`[TranscriptionService] 🎙️ Sending audio to Whisper at ${url}...`);

            const response = await fetch(url, {
                method: 'POST',
                body: form,
                headers: form.getHeaders()
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[TranscriptionService] ❌ Whisper server error (${response.status}): ${errorText.substring(0, 300)}`);
                return null;
            }

            const data = await response.json();
            const text = data.text?.trim();

            if (!text) {
                console.warn('[TranscriptionService] ⚠️ Whisper returned empty text');
                return null;
            }

            return text;

        } catch (error) {
            console.error('[TranscriptionService] ❌ Error calling Whisper server:', error.message);
            return null;
        }
    }
}

// Export a singleton instance
module.exports = new TranscriptionService();
