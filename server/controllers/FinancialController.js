const { Collection, Client, SystemSetting } = require('../models');
const { Op } = require('sequelize');

const SELLING_PRICE_KEY = 'oil_selling_price';

exports.getFinancialStats = async (req, res) => {
    try {
        // Get global selling price
        let sellingPriceSetting = await SystemSetting.findByPk(SELLING_PRICE_KEY);
        let sellingPrice = sellingPriceSetting ? parseFloat(sellingPriceSetting.value) : 0;

        // Get all collections with their associated client's price
        const collections = await Collection.findAll({
            include: [{
                model: Client,
                attributes: ['pricePerLiter']
            }]
        });

        let totalVolume = 0;
        let totalCost = 0;

        collections.forEach(col => {
            const quantity = col.quantity || 0;
            const price = col.Client ? (col.Client.pricePerLiter || 0) : 0;

            totalVolume += quantity;
            totalCost += quantity * price;
        });

        const totalRevenue = totalVolume * sellingPrice;
        const totalProfit = totalRevenue - totalCost;

        res.json({
            sellingPrice,
            totalVolume,
            totalRevenue,
            totalCost,
            totalProfit
        });

    } catch (error) {
        console.error('Error fetching financial stats:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateSellingPrice = async (req, res) => {
    try {
        const { price } = req.body;

        let setting = await SystemSetting.findByPk(SELLING_PRICE_KEY);
        if (setting) {
            setting.value = String(price);
            await setting.save();
        } else {
            await SystemSetting.create({
                key: SELLING_PRICE_KEY,
                value: String(price)
            });
        }

        res.json({ success: true, price });

    } catch (error) {
        console.error('Error updating selling price:', error);
        res.status(500).json({ error: error.message });
    }
};
