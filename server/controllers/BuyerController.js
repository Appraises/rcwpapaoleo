const { Buyer, Sale } = require('../models');

exports.createBuyer = async (req, res) => {
    try {
        const { name, type, document, phone, email, address, observations } = req.body;
        const buyer = await Buyer.create({ name, type, document, phone, email, address, observations });
        res.status(201).json(buyer);
    } catch (error) {
        console.error('Error creating buyer:', error);
        res.status(500).json({ error: 'Failed to create buyer' });
    }
};

exports.getAllBuyers = async (req, res) => {
    try {
        const buyers = await Buyer.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(buyers);
    } catch (error) {
        console.error('Error fetching buyers:', error);
        res.status(500).json({ error: 'Failed to fetch buyers' });
    }
};

exports.getBuyerById = async (req, res) => {
    try {
        const { id } = req.params;
        const buyer = await Buyer.findByPk(id, {
            include: [{
                model: Sale,
                order: [['date', 'DESC']]
            }]
        });

        if (!buyer) {
            return res.status(404).json({ error: 'Buyer not found' });
        }
        res.json(buyer);
    } catch (error) {
        console.error('Error fetching buyer:', error);
        res.status(500).json({ error: 'Failed to fetch buyer' });
    }
};

exports.updateBuyer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, document, phone, email, address, observations } = req.body;

        const buyer = await Buyer.findByPk(id);
        if (!buyer) {
            return res.status(404).json({ error: 'Buyer not found' });
        }

        await buyer.update({ name, type, document, phone, email, address, observations });
        res.json(buyer);
    } catch (error) {
        console.error('Error updating buyer:', error);
        res.status(500).json({ error: 'Failed to update buyer' });
    }
};

exports.deleteBuyer = async (req, res) => {
    try {
        const { id } = req.params;
        const buyer = await Buyer.findByPk(id);
        if (!buyer) {
            return res.status(404).json({ error: 'Buyer not found' });
        }
        await buyer.destroy();
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting buyer:', error);
        res.status(500).json({ error: 'Failed to delete buyer' });
    }
};
