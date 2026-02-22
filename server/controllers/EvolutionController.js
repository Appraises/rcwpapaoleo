// server/controllers/EvolutionController.js
// Proxy controller connecting the React frontend to the safe Evolution API backend

class EvolutionController {
    // 1. Get current instance connection status
    async getConnectionState(req, res) {
        try {
            const V2_EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
            const API_KEY = process.env.EVOLUTION_API_KEY;
            const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME;

            if (!V2_EVOLUTION_API_URL || !API_KEY || !INSTANCE_NAME) {
                return res.status(500).json({ error: 'Evolution API credentials not configured in backend.' });
            }

            const response = await fetch(`${V2_EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`, {
                method: 'GET',
                headers: { 'apikey': API_KEY }
            });

            if (response.status === 404) {
                // Instance not created yet
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
            return res.status(500).json({ error: error.message });
        }
    }

    // 2. Request QR Code (Base64) - Auto Creates Instance if it doesn't exist
    async connect(req, res) {
        try {
            const V2_EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
            const API_KEY = process.env.EVOLUTION_API_KEY;
            const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME;

            if (!V2_EVOLUTION_API_URL || !API_KEY || !INSTANCE_NAME) {
                return res.status(500).json({ error: 'Evolution API credentials not configured in backend.' });
            }

            // Attempt to connect and get QR
            let response = await fetch(`${V2_EVOLUTION_API_URL}/instance/connect/${INSTANCE_NAME}`, {
                method: 'GET',
                headers: { 'apikey': API_KEY }
            });

            // If it returns 404, the instance doesn't exist. We must create it first!
            if (response.status === 404) {
                console.log(`[EvolutionController] Instance ${INSTANCE_NAME} not found. Auto-creating...`);

                const createResponse = await fetch(`${V2_EVOLUTION_API_URL}/instance/create`, {
                    method: 'POST',
                    headers: {
                        'apikey': API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        instanceName: INSTANCE_NAME,
                        qrcode: true,
                        integration: "WHATSAPP-BAILEYS"
                    })
                });

                if (!createResponse.ok) {
                    const errText = await createResponse.text();
                    throw new Error(`Failed to create instance. Evolution API returned ${createResponse.status}: ${errText}`);
                }

                const createData = await createResponse.json();

                // The create endpoint returns the QR code directly inside its payload
                if (createData.qrcode && createData.qrcode.base64) {
                    return res.json({ base64: createData.qrcode.base64 });
                }

                // If not, we try to connect again now that it exists
                response = await fetch(`${V2_EVOLUTION_API_URL}/instance/connect/${INSTANCE_NAME}`, {
                    method: 'GET',
                    headers: { 'apikey': API_KEY }
                });
            }

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Evolution API returned ${response.status}: ${errText}`);
            }

            const data = await response.json();
            return res.json(data);

        } catch (error) {
            console.error('[EvolutionController] Error generating QR code:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new EvolutionController();
