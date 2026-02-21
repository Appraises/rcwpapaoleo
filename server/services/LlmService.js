// server/services/LlmService.js
// Handles communication with the local Ollama API

class LlmService {
    static async checkCollectionIntent(messageText) {
        try {
            // Remove special characters, keep only alphanumerics and basic punctuation
            const cleanMessage = messageText.replace(/[^\w\s.,?!]/gi, '').trim();

            if (!cleanMessage) return false;

            const prompt = `Você é um assistente de triagem da empresa Cat Óleo. Um cliente enviou a seguinte mensagem no WhatsApp pedindo algo: "${cleanMessage}".
Ele está pedindo para coletar o óleo usado (como esvaziar a bombona, tambor cheio, etc)? 
Responda APENAS com a palavra SIM ou NAO. Nada mais.`;

            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama3.2:3b', // We will assume llama3.2 3b for the lightweight VPS
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.1, // Keep it deterministic
                        num_ctx: 1024 // Small context to save memory
                    }
                })
            });

            if (!response.ok) {
                console.error(`Ollama Error: ${response.status} ${response.statusText}`);
                return false;
            }

            const data = await response.json();
            const reply = data.response ? data.response.trim().toUpperCase() : '';

            console.log(`[LlmService] Prompt: "${cleanMessage}" -> Ollama: ${reply}`);

            // Allow forms like "SIM." or "SIM"
            return reply.includes('SIM');

        } catch (error) {
            console.error('[LlmService] Erro ao conectar no Ollama:', error.message);
            // Default to false if AI is down, or we could fallback to keyword matching here
            return false;
        }
    }
}

module.exports = LlmService;
