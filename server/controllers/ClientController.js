const { Client, Address, ClientPhone } = require('../models');
const { Op } = require('sequelize');
const GeocodingService = require('../services/GeocodingService');

exports.createClient = async (req, res) => {
    try {
        const {
            name, tradeName, document, phone, additionalPhones,
            street, number, district, city, state, zip, reference, latitude, longitude,
            pricePerLiter, averageOilLiters, observations
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

        const client = await Client.create({
            name, tradeName, document, phone,
            address: fullAddressLegacy,
            pricePerLiter, averageOilLiters, observations
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
        const { search, sort, city } = req.query;
        let where = {};
        let order = [['createdAt', 'DESC']];
        let addressWhere = {};

        if (search) {
            where = {
                [Op.or]: [
                    { name: { [Op.like]: `%${search}%` } },
                    { document: { [Op.like]: `%${search}%` } }
                ]
            };
        }

        if (city) {
            addressWhere.city = city;
        }

        if (sort === 'name_asc') order = [['name', 'ASC']];
        if (sort === 'name_desc') order = [['name', 'DESC']];

        const clients = await Client.findAll({
            where,
            order,
            include: [
                {
                    model: Address,
                    where: city ? addressWhere : undefined,
                    required: !!city  // INNER JOIN when filtering by city, LEFT JOIN otherwise
                },
                { model: ClientPhone, as: 'additionalPhones' }
            ]
        });
        res.json(clients);
    } catch (error) {
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
        res.status(500).json({ error: error.message });
    }
};

exports.getClientById = async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id, {
            include: [Address, { model: ClientPhone, as: 'additionalPhones' }]
        });
        if (!client) return res.status(404).json({ error: 'Client not found' });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateClient = async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id, { include: Address });
        if (!client) return res.status(404).json({ error: 'Client not found' });

        const { name, tradeName, document, phone, additionalPhones, address, street, number, district, city, state, zip, reference, pricePerLiter, averageOilLiters, latitude, longitude, observations } = req.body;

        // Server-side geocoding if coordinates not provided OR if address data changed
        let finalLat = latitude;
        let finalLng = longitude;

        const addressChanged =
            street !== client.Address?.street ||
            number !== client.Address?.number ||
            district !== client.Address?.district ||
            city !== client.Address?.city ||
            zip !== client.Address?.zip;

        if (!finalLat || !finalLng || addressChanged) {
            const coords = await GeocodingService.geocode({ street, number, district, city, state, zip });
            if (coords) {
                finalLat = coords.lat;
                finalLng = coords.lng;
                console.log(`[ClientController] 🌍 Re-geocoded "${name}" → (${finalLat}, ${finalLng})`);
            }
        }

        const fullAddress = address || (street ? `${street}, ${number} - ${district}, ${city} - ${state}` : client.address);

        await client.update({ name, tradeName, document, phone, address: fullAddress, pricePerLiter, averageOilLiters, observations });

        // Update or create Address
        if (client.Address) {
            await client.Address.update({
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

        if (additionalPhones && Array.isArray(additionalPhones)) {
            // Drop existing additional phones and recreate to keep it simple
            await ClientPhone.destroy({ where: { clientId: client.id } });

            const extraPhones = additionalPhones
                .filter(p => !!p)
                .map(p => ({ clientId: client.id, phone: p }));

            if (extraPhones.length > 0) {
                await ClientPhone.bulkCreate(extraPhones);
            }
        }

        const updatedClient = await Client.findByPk(client.id, {
            include: [Address, { model: ClientPhone, as: 'additionalPhones' }]
        });
        res.json(updatedClient);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteClient = async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (!client) return res.status(404).json({ error: 'Client not found' });

        await client.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
