// server/services/LlmService.js
// Handles communication with LLMs: Gemini (primary) + Ollama (fallback)

require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';
const OLLAMA_MODEL = 'qwen3.5:2b';

class LlmService {

    /**
     * Call Gemini REST API
     * @param {string} prompt
     * @returns {string|null} uppercased reply or null on failure
     */
    static async _callGemini(prompt) {
        try {
            if (!GEMINI_API_KEY) {
                console.warn('[LlmService] ⚠️ GEMINI_API_KEY not set, skipping Gemini');
                return null;
            }

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 20
                    }
                })
            });

            if (!response.ok) {
                console.error(`[LlmService] ⚠️ Gemini HTTP ${response.status}: ${response.statusText}`);
                return null;
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                console.error('[LlmService] ⚠️ Gemini returned empty response');
                return null;
            }

            return text.trim().toUpperCase();
        } catch (error) {
            console.error('[LlmService] ⚠️ Gemini error:', error.message);
            return null;
        }
    }

    /**
     * Call local Ollama API
     * @param {string} prompt
     * @returns {string|null} uppercased reply or null on failure
     */
    static async _callOllama(prompt) {
        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.1,
                        num_ctx: 1024
                    }
                })
            });

            if (!response.ok) {
                console.error(`[LlmService] ❌ Ollama HTTP ${response.status}: ${response.statusText}`);
                return null;
            }

            const data = await response.json();
            const text = data.response;

            if (!text) {
                console.error('[LlmService] ❌ Ollama returned empty response');
                return null;
            }

            return text.trim().toUpperCase();
        } catch (error) {
            console.error('[LlmService] ❌ Ollama error:', error.message);
            return null;
        }
    }

    /**
     * Classify using Gemini first, fallback to Ollama
     * @param {string} prompt
     * @returns {string|null} uppercased reply or null if both fail
     */
    static async _classify(prompt) {
        // Try Gemini first
        const geminiReply = await LlmService._callGemini(prompt);
        if (geminiReply !== null) {
            console.log(`[LlmService] 🌐 Gemini reply: "${geminiReply}"`);
            return geminiReply;
        }

        // Fallback to Ollama
        console.warn('[LlmService] ⚠️ Gemini unavailable, falling back to Ollama');
        const ollamaReply = await LlmService._callOllama(prompt);
        if (ollamaReply !== null) {
            console.log(`[LlmService] 🔄 Ollama reply: "${ollamaReply}"`);
            return ollamaReply;
        }

        // Both failed
        console.error('[LlmService] ❌ Both Gemini and Ollama failed!');
        return null;
    }

    static async checkCollectionIntent(messageText, isReplyingToChurn = false) {
        try {
            // Remove special characters, keep only alphanumerics and basic punctuation
            const cleanMessage = messageText.replace(/[^\w\s.,?!]/gi, '').trim();

            if (!cleanMessage) return false;

            let prompt = `Você é um assistente de triagem da empresa RCW Papa Óleo (que recolhe óleo de cozinha usado).
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
"recipiente cheio" -> SIM
"vaso cheio" -> SIM
"ta cheio" -> SIM
"venha pegar" -> SIM
"tem oleo" -> SIM
"programe pra recolher" -> SIM
"vem quando" -> SIM
"pode vir" -> SIM
"vaso tá cheio" -> SIM
"nao tem onde colocar" -> SIM
"traga um vaso" -> SIM

Exemplos de NAO:
"bom dia" -> NAO
"qual o valor do óleo?" -> NAO
"vocês vendem bombona?" -> NAO
"obrigado" -> NAO
"ok, fico no aguardo" -> NAO`;

            if (isReplyingToChurn) {
                prompt += `\n\nATENÇÃO OBRIGATÓRIA: O cliente ACABOU DE RECEBER uma mensagem do robô perguntando: "Percebemos que faz tempo da última coleta, querem agendar? Responda SIM".
Portanto, as seguintes respostas curtas TAMBÉM SÃO um pedido de coleta válido:
"sim" -> SIM
"s" -> SIM
"quero" -> SIM
"pode mandar" -> SIM
"ok" -> SIM
"pode" -> SIM`;
            } else {
                prompt += `\n\nATENÇÃO OBRIGATÓRIA: Respostas curtas soltas como "sim", "s", "ok", "quero", "pode" SEM contexto NÃO DEVEM ser consideradas pedido de coleta, a menos que especifiquem a coleta.
"sim" -> NAO
"ok" -> NAO
"quero" -> NAO`;
            }

            prompt += `\n\nMensagem do cliente: "${cleanMessage}"
Responda APENAS com a palavra SIM ou NAO. Nenhuma pontuação, justificativa ou explicação extra.`;

            const reply = await LlmService._classify(prompt);

            if (reply === null) {
                return false;
            }

            console.log(`[LlmService] checkCollectionIntent: "${cleanMessage}" -> ${reply}`);

            // Allow forms like "SIM." or "SIM"
            return reply.includes('SIM');

        } catch (error) {
            console.error('[LlmService] Erro no checkCollectionIntent:', error.message);
            return false;
        }
    }

    /**
     * Parse a collector's message to determine completion intent.
     * Returns { type: 'ALL' } | { type: 'PARTIAL', upTo: N } | { type: 'LITERS_REPORT', entries: [{stop: N, liters: Y}] } | { type: 'UNKNOWN' }
     */
    static async checkCompletionIntent(messageText) {
        try {
            const cleanMessage = messageText.replace(/[^\w\s.,?!áéíóúàãõçê0-9:\n-]/gi, '').trim();
            if (!cleanMessage) return { type: 'UNKNOWN' };

            const prompt = `Você é um assistente que analisa mensagens de coletadores de óleo.
A sua função é classificar se a mensagem informa que o coletador concluiu a sua rota e quantos litros recolheu.

Exemplos de classificação LITROS (lista com litros coletados, com a opção de registrar que foi troca por produtos. Mapeie na forma X:Y ou X:Y:TROCA, espaço como separador):
"1. 15\n2. 20 TROCA\n3. 0" -> LITROS 1:15 2:20:TROCA 3:0
"parada 1: 10\nparada 2: 25L (troca)" -> LITROS 1:10 2:25:TROCA

Exemplos de classificação TODOS (coletou todos os pontos, mas não especificou litros):
"coletei todos" -> TODOS
"terminei tudo" -> TODOS
"fiz todos os pontos" -> TODOS
"finalizei a rota" -> TODOS
"ok todos" -> TODOS

Exemplos de classificação ATÉ N (parou no meio da rota, no ponto N, mas não especificou litros):
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
Responda APENAS com a palavra TODOS, ATÉ N (onde N é o número), LITROS X:Y ou LITROS X:Y:TROCA (onde X é o número da parada e Y a quantidade), ou NAO. Nenhuma pontuação ou texto extra.`;

            const reply = await LlmService._classify(prompt);

            if (reply === null) {
                return { type: 'UNKNOWN' };
            }

            console.log(`[LlmService] checkCompletionIntent: "${cleanMessage}" -> "${reply}"`);

            if (reply.includes('TODOS')) {
                return { type: 'ALL' };
            }

            // Match "LITROS 1:15 2:20:TROCA"
            if (reply.includes('LITROS')) {
                const entries = [];
                // Look for pairs of numbers separated by a colon, e.g., "1:15", "2:20:TROCA"
                const regex = /(\d+):(\d+)(?::(TROCA))?/g;
                let match;
                while ((match = regex.exec(reply)) !== null) {
                    entries.push({
                        stop: parseInt(match[1], 10),
                        liters: parseInt(match[2], 10),
                        isTroca: match[3] === 'TROCA'
                    });
                }
                if (entries.length > 0) {
                    return { type: 'LITERS_REPORT', entries };
                }
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
