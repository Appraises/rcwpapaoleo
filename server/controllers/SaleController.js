const { Sale, Buyer } = require('../models');

exports.createSale = async (req, res) => {
    try {
        const { buyerId, date, quantityLiters, pricePerLiter, totalValue, observations } = req.body;

        const buyer = await Buyer.findByPk(buyerId);
        if (!buyer) {
            return res.status(404).json({ error: 'Buyer not found' });
        }

        const sale = await Sale.create({
            buyerId,
            date,
            quantityLiters,
            pricePerLiter,
            totalValue,
            observations
        });

        res.status(201).json(sale);
    } catch (error) {
        console.error('Error creating sale:', error);
        res.status(500).json({ error: 'Failed to create sale' });
    }
};

exports.getSalesByBuyer = async (req, res) => {
    try {
        const { buyerId } = req.params;
        const sales = await Sale.findAll({
            where: { buyerId },
            order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });
        res.json(sales);
    } catch (error) {
        console.error('Error fetching sales for buyer:', error);
        res.status(500).json({ error: 'Failed to fetch sales' });
    }
};

exports.updateSale = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, quantityLiters, pricePerLiter, totalValue, observations } = req.body;

        const sale = await Sale.findByPk(id);
        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        await sale.update({
            date,
            quantityLiters,
            pricePerLiter,
            totalValue,
            observations
        });

        res.json(sale);
    } catch (error) {
        console.error('Error updating sale:', error);
        res.status(500).json({ error: 'Failed to update sale' });
    }
};

exports.deleteSale = async (req, res) => {
    try {
        const { id } = req.params;
        const sale = await Sale.findByPk(id);
        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }
        await sale.destroy();
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting sale:', error);
        res.status(500).json({ error: 'Failed to delete sale' });
    }
};
