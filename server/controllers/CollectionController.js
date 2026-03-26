const { Collection, Client, User } = require('../models');

exports.createCollection = async (req, res) => {
    try {
        const { clientId, userId } = req.body;

        // Validate client
        const client = await Client.findByPk(clientId);
        if (!client) return res.status(404).json({ error: 'Client not found' });

        // Validate user if provided
        if (userId) {
            const user = await User.findByPk(userId);
            if (!user) return res.status(404).json({ error: 'User not found' });
        }

        const collection = await Collection.create(req.body);
        res.status(201).json(collection);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteCollection = async (req, res) => {
    try {
        const collection = await Collection.findByPk(req.params.id);
        if (!collection) return res.status(404).json({ error: 'Collection not found' });

        await collection.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCollectionsByClient = async (req, res) => {
    try {
        const { clientId } = req.params;
        const collections = await Collection.findAll({
            where: { clientId },
            include: [{
                model: User,
                attributes: ['name', 'email']
            }],
            order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });
        res.json(collections);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllCollections = async (req, res) => {
    try {
        const collections = await Collection.findAll({
            include: [
                {
                    model: Client,
                    attributes: ['id', 'name']
                },
                {
                    model: User,
                    attributes: ['name', 'email']
                }
            ],
            order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });
        res.json(collections);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
