// server/services/GeocodingService.js
// Server-side geocoding using Google Maps Geocoding API.
// Used as a fallback when clients don't have lat/lng from the frontend geocoding.

class GeocodingService {
    /**
     * Geocode an address string to { lat, lng } using Google Maps Geocoding API.
     * Returns null if unable to geocode.
     *
     * @param {object} params
     * @param {string} params.street
     * @param {string} params.number
     * @param {string} params.district
     * @param {string} params.city
     * @param {string} params.state
     * @param {string} params.zip
     * @returns {Promise<{lat: number, lng: number}|null>}
     */
    static async geocode({ street, number, district, city, state, zip }) {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.error('[GeocodingService] ❌ GOOGLE_MAPS_API_KEY not set in environment');
            return null;
        }

        // Build multiple query variations — try most specific first, then broader
        const queries = [];

        if (zip) {
            const cleanZip = zip.replace(/\D/g, '');
            if (cleanZip.length === 8) {
                const formattedZip = `${cleanZip.substring(0, 5)}-${cleanZip.substring(5)}`;
                if (street && number && district) queries.push(`${street}, ${number}, ${district}, ${formattedZip}, Brasil`);
                if (street && number && city) queries.push(`${street}, ${number}, ${city}, ${formattedZip}, Brasil`);
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
                const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&language=pt-BR&region=br`;

                const response = await fetch(url);

                if (!response.ok) {
                    console.warn(`[GeocodingService] Google API returned ${response.status} for "${query}"`);
                    continue;
                }

                const data = await response.json();

                if (data.status === 'OK' && data.results && data.results.length > 0) {
                    const location = data.results[0].geometry.location;
                    const lat = location.lat;
                    const lng = location.lng;
                    console.log(`[GeocodingService] ✅ Geocoded "${query}" → (${lat}, ${lng})`);
                    return { lat, lng };
                }

                if (data.status === 'ZERO_RESULTS') {
                    console.log(`[GeocodingService] ⚠️ No results for "${query}", trying next variation...`);
                    continue;
                }

                // Handle API errors (OVER_QUERY_LIMIT, REQUEST_DENIED, INVALID_REQUEST, etc.)
                console.warn(`[GeocodingService] ⚠️ Google API status: ${data.status} for "${query}" — ${data.error_message || ''}`);

            } catch (error) {
                console.error(`[GeocodingService] ❌ Error geocoding "${query}":`, error.message);
            }
        }

        console.warn(`[GeocodingService] ❌ Could not geocode with any query variation`);
        return null;
    }

    /**
     * Simple geocode from a free-text address string.
     * Used by the frontend proxy route.
     *
     * @param {string} address - Full address string
     * @returns {Promise<{lat: number, lng: number}|null>}
     */
    static async geocodeAddress(address) {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.error('[GeocodingService] ❌ GOOGLE_MAPS_API_KEY not set in environment');
            return null;
        }

        try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=pt-BR&region=br`;
            const response = await fetch(url);

            if (!response.ok) {
                console.warn(`[GeocodingService] Google API returned ${response.status} for "${address}"`);
                return null;
            }

            const data = await response.json();

            if (data.status === 'OK' && data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                console.log(`[GeocodingService] ✅ Geocoded "${address}" → (${location.lat}, ${location.lng})`);
                return { lat: location.lat, lng: location.lng };
            }

            console.warn(`[GeocodingService] ⚠️ Google API status: ${data.status} for "${address}"`);
            return null;
        } catch (error) {
            console.error(`[GeocodingService] ❌ Error geocoding "${address}":`, error.message);
            return null;
        }
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
