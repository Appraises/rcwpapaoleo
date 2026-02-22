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
                headers: {
                    'apikey': API_KEY
                }
            });

            if (!response.ok) {
                throw new Error(`Evolution API returned ${response.status}`);
            }

            const data = await response.json();
            return res.json(data); // Returns { instance: { state: "open" } } etc.
        } catch (error) {
            console.error('[EvolutionController] Error fetching connectionState:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }

    // 2. Request QR Code (Base64)
    async connect(req, res) {
        try {
            const V2_EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
            const API_KEY = process.env.EVOLUTION_API_KEY;
            const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME;

            if (!V2_EVOLUTION_API_URL || !API_KEY || !INSTANCE_NAME) {
                return res.status(500).json({ error: 'Evolution API credentials not configured in backend.' });
            }

            const response = await fetch(`${V2_EVOLUTION_API_URL}/instance/connect/${INSTANCE_NAME}`, {
                method: 'GET',
                headers: {
                    'apikey': API_KEY
                }
            });

            if (!response.ok) {
                throw new Error(`Evolution API returned ${response.status}`);
            }

            const data = await response.json();

            // The Evolution API usually returns { base64: "...", code: "..." }
            return res.json(data);

        } catch (error) {
            console.error('[EvolutionController] Error generating QR code:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new EvolutionController();
