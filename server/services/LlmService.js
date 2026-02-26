// server/services/LlmService.js
// Handles communication with the local Ollama API

class LlmService {
    static async checkCollectionIntent(messageText) {
        try {
            // Remove special characters, keep only alphanumerics and basic punctuation
            const cleanMessage = messageText.replace(/[^\w\s.,?!]/gi, '').trim();

            if (!cleanMessage) return false;

            const prompt = `Você é um assistente de triagem da empresa Cat Óleo (que recolhe óleo de cozinha usado).
O cliente está enviando mensagem para o número da empresa. Por causa desse contexto, ele muitas vezes NÃO VAI escrever a palavra "óleo" ou "bombona". Ele pode apenas dizer "pode vir buscar" ou "passa aqui".
Sua função é identificar se a mensagem é um pedido de coleta. Considere também erros de português e gírias.

Exemplos de SIM (mesmo com erros ou sem citar óleo):
"pode vir buscar o óleo" -> SIM
"pode buscar hj?" -> SIM
"passa aki q ta cheio" -> SIM
"minha bombona tá cheia" -> SIM
"tem como passar aqui hoje pra recolher" -> SIM
"venha esvaziar o tambor" -> SIM
"preciso de coleta" -> SIM
"pode vim pegar" -> SIM

Exemplos de NAO:
"bom dia" -> NAO
"qual o valor do óleo?" -> NAO
"vocês vendem bombona?" -> NAO
"obrigado" -> NAO
"ok, fico no aguardo" -> NAO

Mensagem do cliente: "${cleanMessage}"
Responda APENAS com a palavra SIM ou NAO. Nenhuma pontuação, justificativa ou explicação extra.`;

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

            const prompt = `Você é um assistente que analisa mensagens de coletadores de óleo.
A sua função é classificar se a mensagem informa que o coletador concluiu a sua rota.

Exemplos de classificação TODOS (coletou todos os pontos):
"coletei todos" -> TODOS
"terminei tudo" -> TODOS
"fiz todos os pontos" -> TODOS
"finalizei a rota" -> TODOS
"ok todos" -> TODOS

Exemplos de classificação ATÉ N (parou no meio da rota, no ponto N):
"coletei ate o 4" -> ATÉ 4
"fiz até o cliente 3" -> ATÉ 3
"parei no 5" -> ATÉ 5
"so consegui ate o 2" -> ATÉ 2

Exemplos de classificação NAO (mensagem comum, não é encerramento da rota):
"bom dia" -> NAO
"onde é a próxima parada?" -> NAO
"furou o pneu" -> NAO
"ok" -> NAO
"estou indo pro primeiro" -> NAO

Mensagem do coletador: "${cleanMessage}"
Responda APENAS com a palavra TODOS, ATÉ N (onde N é o número), ou NAO. Nenhuma pontuação ou texto extra.`;

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
