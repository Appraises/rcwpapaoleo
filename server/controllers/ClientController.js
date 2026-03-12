const { Client, Address, ClientPhone } = require('../models');
const { Op } = require('sequelize');
const GeocodingService = require('../services/GeocodingService');

exports.createClient = async (req, res) => {
    try {
        const {
            name, tradeName, document, phone, additionalPhones,
            street, number, district, city, state, zip, reference, latitude, longitude,
            pricePerLiter, averageOilLiters, observations,
            has20L, has50L, has70L, has100L, has150L, recurrenceDays
        } = req.body;

        // Server-side geocoding if frontend didn't provide coordinates
        let finalLat = latitude;
        let finalLng = longitude;
        if (!finalLat || !finalLng) {
            const coords = await GeocodingService.geocode({ street, number, district, city, state, zip });
            if (coords) {
                finalLat = coords.lat;
                finalLng = coords.lng;
                console.log(`[ClientController] 🌍 Geocoded "${name}" → (${finalLat}, ${finalLng})`);
            }
        }

        const fullAddressLegacy = `${street}, ${number} - ${district}, ${city} - ${state}`;

        const cleanDocument = (document || '').toString().trim() || null;

        const client = await Client.create({
            name, tradeName, document: cleanDocument, phone,
            address: fullAddressLegacy,
            pricePerLiter, averageOilLiters, observations,
            has20L, has50L, has70L, has100L, has150L, recurrenceDays
        });

        await Address.create({
            clientId: client.id,
            street, number, district, city, state, zip, reference,
            latitude: finalLat, longitude: finalLng
        });

        if (additionalPhones && Array.isArray(additionalPhones)) {
            const extraPhones = additionalPhones
                .filter(p => !!p)
                .map(p => ({ clientId: client.id, phone: p }));
            if (extraPhones.length > 0) {
                await ClientPhone.bulkCreate(extraPhones);
            }
        }

        const clientWithAddress = await Client.findByPk(client.id, {
            include: [Address, { model: ClientPhone, as: 'additionalPhones' }]
        });
        res.status(201).json(clientWithAddress);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Já existe um cliente cadastrado com este CPF/CNPJ.' });
        }
        res.status(400).json({ error: error.message });
    }
};

exports.getAllClients = async (req, res) => {
    try {
        const { search, sort, city, district } = req.query;
        let where = {};
        let order = [['createdAt', 'DESC']];
        let addressWhere = {};

        if (search) {
            where = {
                [Op.or]: [
                    { name: { [Op.like]: `%${search}%` } },
                    { tradeName: { [Op.like]: `%${search}%` } },
                    { document: { [Op.like]: `%${search}%` } }
                ]
            };
        }

        if (city) {
            addressWhere.city = city;
        }

        if (district) {
            addressWhere.district = district;
        }

        if (sort === 'name_asc') order = [['name', 'ASC']];
        if (sort === 'name_desc') order = [['name', 'DESC']];

        const hasAddressFilter = !!(city || district);
        try {
            const clients = await Client.findAll({
                where,
                order,
                include: [
                    {
                        model: Address,
                        where: hasAddressFilter ? addressWhere : undefined,
                        required: hasAddressFilter
                    },
                    { model: ClientPhone, as: 'additionalPhones' }
                ]
            });
            return res.json(clients);
        } catch (includeError) {
            // If include fails (e.g. table schema mismatch), fallback without associations
            console.error('[ClientController] ⚠️ Query with includes failed, trying fallback:', includeError.message);
            const clients = await Client.findAll({ where, order });
            return res.json(clients);
        }
    } catch (error) {
        console.error('[ClientController] ❌ getAllClients error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getDistinctCities = async (req, res) => {
    try {
        const addresses = await Address.findAll({
            attributes: ['city'],
            group: ['city'],
            order: [['city', 'ASC']],
            raw: true
        });
        const cities = addresses.map(a => a.city).filter(Boolean);
        res.json(cities);
    } catch (error) {
        console.error('[ClientController] ⚠️ getDistinctCities fallback:', error.message);
        try {
            const sequelize = require('../config/database');
            const [results] = await sequelize.query('SELECT DISTINCT city FROM Addresses WHERE city IS NOT NULL ORDER BY city ASC');
            res.json(results.map(r => r.city).filter(Boolean));
        } catch (e2) {
            res.json([]);
        }
    }
};

exports.getDistinctDistricts = async (req, res) => {
    try {
        const { city } = req.query;
        const where = { district: { [Op.ne]: null } };
        if (city) where.city = city;

        const addresses = await Address.findAll({
            attributes: ['district'],
            where,
            group: ['district'],
            order: [['district', 'ASC']],
            raw: true
        });
        const districts = addresses.map(a => a.district).filter(Boolean);
        res.json(districts);
    } catch (error) {
        console.error('[ClientController] ⚠️ getDistinctDistricts error:', error.message);
        try {
            const sequelize = require('../config/database');
            const cityClause = req.query.city ? 'AND city = ?' : '';
            const replacements = req.query.city ? [req.query.city] : [];
            const [results] = await sequelize.query(
                `SELECT DISTINCT district FROM Addresses WHERE district IS NOT NULL ${cityClause} ORDER BY district ASC`,
                { replacements }
            );
            res.json(results.map(r => r.district).filter(Boolean));
        } catch (e2) {
            res.json([]);
        }
    }
};

exports.getClientById = async (req, res) => {
    try {
        try {
            const client = await Client.findByPk(req.params.id, {
                include: [Address, { model: ClientPhone, as: 'additionalPhones' }]
            });
            if (!client) return res.status(404).json({ error: 'Client not found' });
            return res.json(client);
        } catch (includeError) {
            console.error('[ClientController] ⚠️ getClientById includes failed, trying fallback:', includeError.message);
            const client = await Client.findByPk(req.params.id);
            if (!client) return res.status(404).json({ error: 'Client not found' });
            return res.json(client);
        }
    } catch (error) {
        console.error('[ClientController] ❌ getClientById error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateClient = async (req, res) => {
    try {
        let client;
        try {
            client = await Client.findByPk(req.params.id, { include: Address });
        } catch (e) {
            console.error('[ClientController] ⚠️ updateClient include failed, trying without:', e.message);
            client = await Client.findByPk(req.params.id);
        }
        if (!client) return res.status(404).json({ error: 'Client not found' });

        const { name, tradeName, document, phone, additionalPhones, address, street, number, district, city, state, zip, reference, pricePerLiter, averageOilLiters, latitude, longitude, observations, has20L, has50L, has70L, has100L, has150L, recurrenceDays } = req.body;

        // Resilient Address Lookup (in case the 'include' above failed)
        let clientAddress = client.Address;
        if (!clientAddress) {
            clientAddress = await Address.findOne({ where: { clientId: client.id } });
        }

        // Server-side geocoding if coordinates not provided OR if address data changed
        let finalLat = latitude || clientAddress?.latitude || client.latitude;
        let finalLng = longitude || clientAddress?.longitude || client.longitude;

        const normalize = (val) => (val || '').toString().trim();

        const addressChanged =
            normalize(street) !== normalize(clientAddress?.street) ||
            normalize(number) !== normalize(clientAddress?.number) ||
            normalize(district) !== normalize(clientAddress?.district) ||
            normalize(city) !== normalize(clientAddress?.city) ||
            normalize(zip) !== normalize(clientAddress?.zip);

        if (!finalLat || !finalLng || addressChanged) {
            const coords = await GeocodingService.geocode({ street, number, district, city, state, zip });
            if (coords) {
                finalLat = coords.lat;
                finalLng = coords.lng;
                console.log(`[ClientController] 🌍 Re-geocoded "${name}" → (${finalLat}, ${finalLng})`);
            }
        }

        const fullAddress = address || (street ? `${street}, ${number} - ${district}, ${city} - ${state}` : client.address);

        const cleanDocument = (document || '').toString().trim() || null;

        await client.update({ name, tradeName, document: cleanDocument, phone, address: fullAddress, pricePerLiter, averageOilLiters, observations, has20L, has50L, has70L, has100L, has150L, recurrenceDays });

        // Update or create Address safely (to prevent duplicate rows if include failed)
        try {
            const existingAddress = await Address.findOne({ where: { clientId: client.id } });
            if (existingAddress) {
                await existingAddress.update({
                    street, number, district, city, state, zip, reference,
                    latitude: finalLat, longitude: finalLng
                });
            } else {
                await Address.create({
                    clientId: client.id,
                    street, number, district, city, state, zip, reference,
                    latitude: finalLat, longitude: finalLng
                });
            }
        } catch (addrError) {
            console.error('[ClientController] ⚠️ Address ORM failed, using raw SQL:', addrError.message);
            const sequelize = require('../config/database');
            await sequelize.query('DELETE FROM Addresses WHERE clientId = ?', { replacements: [client.id] });
            await sequelize.query(
                'INSERT INTO Addresses (clientId, street, number, district, city, state, zip, reference, latitude, longitude, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
                { replacements: [client.id, street, number, district, city, state, zip, reference, finalLat, finalLng] }
            );
        }

        // Handle additional phones
        try {
            if (additionalPhones && Array.isArray(additionalPhones)) {
                await ClientPhone.destroy({ where: { clientId: client.id } });
                const extraPhones = additionalPhones
                    .filter(p => !!p)
                    .map(p => ({ clientId: client.id, phone: p }));
                if (extraPhones.length > 0) {
                    await ClientPhone.bulkCreate(extraPhones);
                }
            }
        } catch (phoneError) {
            console.error('[ClientController] ⚠️ ClientPhone ORM failed:', phoneError.message);
        }

        // Return updated client
        try {
            const updatedClient = await Client.findByPk(client.id, {
                include: [Address, { model: ClientPhone, as: 'additionalPhones' }]
            });
            res.json(updatedClient);
        } catch (e) {
            const updatedClient = await Client.findByPk(client.id);
            res.json(updatedClient);
        }
    } catch (error) {
        console.error('[ClientController] ❌ updateClient error:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.deleteClient = async (req, res) => {
    try {
        const sequelize = require('../config/database');
        const clientId = req.params.id;

        // Delete each associated table individually - skip if table doesn't exist
        const tables = ['Addresses', 'ClientPhones', 'CollectionRequests', 'Collections'];
        for (const table of tables) {
            try {
                await sequelize.query(`DELETE FROM "${table}" WHERE clientId = ?`, { replacements: [clientId] });
            } catch (e) {
                console.log(`[ClientController] ⚠️ Skipped ${table}: ${e.message}`);
            }
        }

        // Delete the client itself
        await sequelize.query('DELETE FROM Clients WHERE id = ?', { replacements: [clientId] });

        console.log(`[ClientController] 🗑️ Client ${clientId} deleted (raw SQL)`);
        res.status(204).send();
    } catch (error) {
        console.error('[ClientController] ❌ deleteClient error:', error);
        res.status(500).json({ error: error.message });
    }
};
