// server/services/GeocodingService.js
// Server-side geocoding using Nominatim (OpenStreetMap) — free, no API key needed.
// Used as a fallback when clients don't have lat/lng from the frontend geocoding.

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

class GeocodingService {
    /**
     * Geocode an address string to { lat, lng } using Nominatim.
     * Returns null if unable to geocode.
     *
     * @param {object} params
     * @param {string} params.street
     * @param {string} params.number
     * @param {string} params.district
     * @param {string} params.city
     * @param {string} params.state
     * @returns {Promise<{lat: number, lng: number}|null>}
     */
    static async geocode({ street, number, district, city, state, zip }) {
        // Build multiple query variations — try most specific first, then broader
        const queries = [];

        if (zip) {
            const cleanZip = zip.replace(/\D/g, '');
            if (cleanZip.length === 8) {
                const formattedZip = `${cleanZip.substring(0, 5)}-${cleanZip.substring(5)}`;
                if (street && number && district) queries.push(`${street}, ${number}, ${district}, ${formattedZip}, Brasil`);
                if (street && number) queries.push(`${street}, ${number}, ${formattedZip}, Brasil`);
                if (street && district) queries.push(`${street}, ${district}, ${formattedZip}, Brasil`);
                if (street) queries.push(`${street}, ${formattedZip}, Brasil`);
            }
        }

        // 1. Street + Number + District + City
        if (street && number && district && city && state) {
            queries.push(`${street}, ${number}, ${district}, ${city} - ${state}, Brasil`);
        }
        // 2. Street + Number + City (no district)
        if (street && number && city && state && !district) {
            queries.push(`${street}, ${number}, ${city} - ${state}, Brasil`);
        }
        // 3. Street + District + City (no number)
        if (street && district && city && state) {
            queries.push(`${street}, ${district}, ${city} - ${state}, Brasil`);
        }
        // 4. Street + City (broadest street search)
        if (street && city && state) {
            queries.push(`${street}, ${city} - ${state}, Brasil`);
        }
        // 5. District + City
        if (district && city && state) {
            queries.push(`${district}, ${city} - ${state}, Brasil`);
        }

        if (queries.length === 0) {
            return null;
        }

        for (const query of queries) {
            try {
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`;

                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'CatOleo-DispatchService/1.0'
                    }
                });

                if (!response.ok) {
                    console.warn(`[GeocodingService] Nominatim returned ${response.status} for "${query}"`);
                    continue;
                }

                const data = await response.json();

                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    console.log(`[GeocodingService] ✅ Geocoded "${query}" → (${lat}, ${lng})`);
                    return { lat, lng };
                }

                console.log(`[GeocodingService] ⚠️ No results for "${query}", trying next variation...`);

                // Nominatim rate limit: 1 req/sec
                await delay(1100);

            } catch (error) {
                console.error(`[GeocodingService] ❌ Error geocoding "${query}":`, error.message);
            }
        }

        console.warn(`[GeocodingService] ❌ Could not geocode with any query variation`);
        return null;
    }

    /**
     * Geocode a Client model instance if it's missing coordinates.
     * Saves the result back to the Address (or Client) model.
     *
     * @param {object} client - Sequelize Client instance with Address include
     * @returns {Promise<boolean>} - true if coordinates are now available
     */
    static async ensureGeocodedClient(client) {
        const addr = client.Address;
        const lat = addr?.latitude || client.latitude;
        const lng = addr?.longitude || client.longitude;

        // Already has coordinates
        if (lat && lng) return true;

        // Build address info from the best available source
        const street = addr?.street || client.street;
        const number = addr?.number || client.number;
        const district = addr?.district || client.district;
        const city = addr?.city || client.city;
        const state = addr?.state || client.state;
        const zip = addr?.zip || client.zip;

        if (!street && !city) {
            console.warn(`[GeocodingService] Client "${client.name}" has no address to geocode`);
            return false;
        }

        console.log(`[GeocodingService] 🔍 Geocoding client "${client.name}" (${street}, ${number}, ${city})...`);

        const result = await this.geocode({ street, number, district, city, state, zip });

        if (!result) return false;

        // Save back to the Address model if it exists, otherwise to Client
        try {
            if (addr) {
                await addr.update({ latitude: result.lat, longitude: result.lng });
            } else {
                await client.update({ latitude: result.lat, longitude: result.lng });
            }
            console.log(`[GeocodingService] 💾 Saved coordinates for "${client.name}"`);
            return true;
        } catch (error) {
            console.error(`[GeocodingService] ❌ Failed to save coordinates for "${client.name}":`, error.message);
            return false;
        }
    }
}

module.exports = GeocodingService;
