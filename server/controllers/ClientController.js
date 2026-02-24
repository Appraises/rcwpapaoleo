const { Client } = require('../models');
const { Op } = require('sequelize');

exports.createClient = async (req, res) => {
    try {
        const {
            name, tradeName, document, phone,
            street, number, district, city, state, zip, reference, latitude, longitude,
            pricePerLiter, averageOilLiters, observations
        } = req.body;

        const fullAddressLegacy = `${street}, ${number} - ${district}, ${city} - ${state}`;

        const client = await Client.create({
            name, tradeName, document, phone,
            address: fullAddressLegacy,
            pricePerLiter, averageOilLiters, observations
        });

        await Address.create({
            clientId: client.id,
            street, number, district, city, state, zip, reference,
            latitude, longitude
        });

        // Fetch with address to return full object
        const clientWithAddress = await Client.findByPk(client.id, { include: Address });

        res.status(201).json(clientWithAddress);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getAllClients = async (req, res) => {
    try {
        const { search, sort } = req.query;
        let where = {};
        let order = [['createdAt', 'DESC']];

        if (search) {
            where = {
                [Op.or]: [
                    { name: { [Op.like]: `%${search}%` } },
                    { document: { [Op.like]: `%${search}%` } }
                ]
            };
        }

        if (sort === 'name_asc') order = [['name', 'ASC']];
        if (sort === 'name_desc') order = [['name', 'DESC']];

        const clients = await Client.findAll({ where, order });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getClientById = async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id, { include: Address });
        if (!client) return res.status(404).json({ error: 'Client not found' });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateClient = async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (!client) return res.status(404).json({ error: 'Client not found' });

        const { name, tradeName, document, phone, address, street, number, district, city, state, zip, reference, pricePerLiter, averageOilLiters, latitude, longitude, observations } = req.body;

        const fullAddress = address || (street ? `${street}, ${number} - ${district}, ${city} - ${state}` : client.address);

        await client.update({ name, tradeName, document, phone, address: fullAddress, street, number, district, city, state, zip, reference, pricePerLiter, averageOilLiters, latitude, longitude, observations });
        res.json(client);
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
