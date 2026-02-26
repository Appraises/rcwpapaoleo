require('dotenv').config();
const { Client, Address } = require('./models');
const GeocodingService = require('./services/GeocodingService');

async function migrateAddresses() {
    console.log('--- Starting Address Migration ---');
    try {
        const clients = await Client.findAll({
            include: [{ model: Address, required: false }]
        });

        console.log(`Found ${clients.length} total clients.`);

        let migratedCount = 0;
        let geocodedCount = 0;

        for (const client of clients) {
            if (!client.Address) {
                console.log(`\nClient ID ${client.id} (${client.name}) has no Address record. Migrating...`);

                let lat = client.latitude;
                let lng = client.longitude;

                // If coordinates are missing on the Client, try to geocode
                if (!lat || !lng) {
                    let coords = null;
                    if (client.street && client.city) {
                        coords = await GeocodingService.geocode({
                            street: client.street,
                            number: client.number,
                            district: client.district,
                            city: client.city,
                            state: client.state,
                            zip: client.zip
                        });
                    } else if (client.address) {
                        coords = await GeocodingService.geocodeAddress(client.address);
                    }

                    if (coords) {
                        lat = coords.lat;
                        lng = coords.lng;
                        geocodedCount++;
                    } else {
                        console.log(`  -> Warning: Could not geocode address for client ${client.name}`);
                    }
                }

                // Create the missing Address record
                await Address.create({
                    clientId: client.id,
                    street: client.street || 'Não informado',
                    number: client.number || 'S/N',
                    district: client.district || 'Não informado',
                    city: client.city || 'Não informado',
                    state: client.state || 'SE',
                    zip: client.zip || '',
                    reference: client.reference || '',
                    latitude: lat,
                    longitude: lng
                });

                migratedCount++;
                console.log(`  -> Address created for ${client.name} (lat: ${lat}, lng: ${lng})`);
            }
        }

        console.log(`\n--- Migration Complete ---`);
        console.log(`Migrated ${migratedCount} clients to the new Address table.`);
        console.log(`Geocoded ${geocodedCount} missing coordinates.`);
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateAddresses();
