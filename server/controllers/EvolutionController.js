// server/controllers/EvolutionController.js
// Proxy controller connecting the React frontend to the safe Evolution API backend

// Helper: fetch with a timeout (Node 18+ AbortController)
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timer);
    }
}

// Helper: small delay
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

class EvolutionController {
    // 1. Get current instance connection status
    async getConnectionState(req, res) {
        try {
            const API_URL = process.env.EVOLUTION_API_URL;
            const API_KEY = process.env.EVOLUTION_API_KEY;
            const INSTANCE = process.env.EVOLUTION_INSTANCE_NAME;

            if (!API_URL || !API_KEY || !INSTANCE) {
                return res.status(500).json({ error: 'Evolution API credentials not configured in backend.' });
            }

            console.log(`[EvolutionController] Fetching connectionState from ${API_URL}/instance/connectionState/${INSTANCE}`);

            const response = await fetchWithTimeout(
                `${API_URL}/instance/connectionState/${INSTANCE}`,
                { method: 'GET', headers: { 'apikey': API_KEY } }
            );

            if (response.status === 404) {
                return res.json({ instance: { state: "not_connected" } });
            }

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Evolution API returned ${response.status}: ${errText}`);
            }

            const data = await response.json();
            return res.json(data);
        } catch (error) {
            console.error('[EvolutionController] Error fetching connectionState:', error.message);
            if (error.cause) console.error('[EvolutionController] Cause:', error.cause);
            return res.status(500).json({ error: error.message });
        }
    }

    // 2. Request QR Code (Base64) - Auto Creates Instance if it doesn't exist
    async connect(req, res) {
        try {
            const API_URL = process.env.EVOLUTION_API_URL;
            const API_KEY = process.env.EVOLUTION_API_KEY;
            const INSTANCE = process.env.EVOLUTION_INSTANCE_NAME;

            if (!API_URL || !API_KEY || !INSTANCE) {
                return res.status(500).json({ error: 'Evolution API credentials not configured in backend.' });
            }

            console.log(`[EvolutionController] Requesting QR for instance "${INSTANCE}" at ${API_URL}`);

            // Step 1: Try to connect and get QR
            let response = await fetchWithTimeout(
                `${API_URL}/instance/connect/${INSTANCE}`,
                { method: 'GET', headers: { 'apikey': API_KEY } }
            );

            // Step 2: If 404, the instance doesn't exist yet — create it
            if (response.status === 404) {
                console.log(`[EvolutionController] Instance "${INSTANCE}" not found (404). Auto-creating...`);

                const createRes = await fetchWithTimeout(
                    `${API_URL}/instance/create`,
                    {
                        method: 'POST',
                        headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            instanceName: INSTANCE,
                            qrcode: true,
                            integration: "WHATSAPP-BAILEYS"
                        })
                    }
                );

                if (!createRes.ok) {
                    const errText = await createRes.text();
                    throw new Error(`Failed to create instance (${createRes.status}): ${errText}`);
                }

                const createData = await createRes.json();
                console.log('[EvolutionController] Instance created:', JSON.stringify(createData).substring(0, 200));

                // The create endpoint with qrcode:true may return the QR inline
                if (createData.qrcode && createData.qrcode.base64) {
                    return res.json({ base64: createData.qrcode.base64 });
                }

                // Wait a moment for Baileys to initialize and generate QR
                console.log('[EvolutionController] Waiting 3s for Baileys to generate QR...');
                await delay(3000);

                // Retry connect
                response = await fetchWithTimeout(
                    `${API_URL}/instance/connect/${INSTANCE}`,
                    { method: 'GET', headers: { 'apikey': API_KEY } }
                );
            }

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Evolution API returned ${response.status}: ${errText}`);
            }

            const data = await response.json();
            console.log('[EvolutionController] Connect response:', JSON.stringify(data).substring(0, 300));

            // The connect endpoint returns { base64: "data:image/...", code: "2@...", count: N }
            // If count is 0, there's no QR yet — Baileys is still booting
            if (data.base64) {
                return res.json({ base64: data.base64 });
            }

            // count: 0 means no QR available — retry once more after a delay
            if (data.count === 0 || !data.base64) {
                console.log('[EvolutionController] No QR yet (count=0). Retrying in 5s...');
                await delay(5000);

                const retryRes = await fetchWithTimeout(
                    `${API_URL}/instance/connect/${INSTANCE}`,
                    { method: 'GET', headers: { 'apikey': API_KEY } }
                );

                if (retryRes.ok) {
                    const retryData = await retryRes.json();
                    console.log('[EvolutionController] Retry response:', JSON.stringify(retryData).substring(0, 300));
                    if (retryData.base64) {
                        return res.json({ base64: retryData.base64 });
                    }
                }

                return res.status(202).json({
                    error: 'QR Code ainda não está pronto. Tente novamente em alguns segundos.',
                    hint: 'O motor do WhatsApp está inicializando.'
                });
            }

            return res.json(data);

        } catch (error) {
            console.error('[EvolutionController] Error generating QR code:', error.message);
            if (error.cause) console.error('[EvolutionController] Cause:', error.cause);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new EvolutionController();

