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

    /**
     * Parse a collector's message to determine completion intent.
     * Returns { type: 'ALL' } | { type: 'PARTIAL', upTo: N } | { type: 'UNKNOWN' }
     */
    static async checkCompletionIntent(messageText) {
        try {
            const cleanMessage = messageText.replace(/[^\w\s.,?!áéíóúàãõçê0-9]/gi, '').trim();
            if (!cleanMessage) return { type: 'UNKNOWN' };

            const prompt = `Você é um assistente que analisa mensagens de coletadores de óleo. O coletador enviou: "${cleanMessage}".

O coletador pode estar dizendo que:
1) Coletou TODOS os pontos da rota (ex: "coletei todos", "terminei tudo", "fiz todos", "finalizei", "rota completa")
2) Coletou até um certo ponto N (ex: "coletei até o 4", "fiz até o 3", "parei no 5", "só consegui até o 2")
3) Não está falando sobre conclusão de coleta

Responda APENAS com:
- TODOS (se coletou tudo)
- ATÉ N (onde N é o número, ex: ATÉ 4)
- NAO (se não é sobre conclusão de coleta)

Responda apenas uma dessas opções. Nada mais.`;

            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2:3b',
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.1,
                        num_ctx: 1024
                    }
                })
            });

            if (!response.ok) {
                console.error(`[LlmService] Ollama Error: ${response.status}`);
                return { type: 'UNKNOWN' };
            }

            const data = await response.json();
            const reply = data.response ? data.response.trim().toUpperCase() : '';
            console.log(`[LlmService] Completion intent: "${cleanMessage}" -> Ollama: "${reply}"`);

            if (reply.includes('TODOS')) {
                return { type: 'ALL' };
            }

            // Match "ATÉ N" or "ATE N"
            const match = reply.match(/AT[ÉE]\s*(\d+)/);
            if (match) {
                return { type: 'PARTIAL', upTo: parseInt(match[1], 10) };
            }

            return { type: 'UNKNOWN' };

        } catch (error) {
            console.error('[LlmService] Erro no checkCompletionIntent:', error.message);
            return { type: 'UNKNOWN' };
        }
    }
}

module.exports = LlmService;
