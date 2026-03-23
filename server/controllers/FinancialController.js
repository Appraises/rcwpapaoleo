const { Collection, Client, SystemSetting, Sale } = require('../models');
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

        let totalCollectedVolume = 0;
        let totalCost = 0;

        collections.forEach(col => {
            const quantity = col.quantity || 0;
            const price = col.Client ? (col.Client.pricePerLiter || 0) : 0;

            totalCollectedVolume += quantity;
            
            // Ignore cost if the collection was a trade for products (troca)
            if (!(col.observation && col.observation.toLowerCase().includes('troca'))) {
                totalCost += quantity * price;
            }
        });

        // Get all realized sales
        const sales = await Sale.findAll();
        let totalSoldVolume = 0;
        let totalRealizedRevenue = 0;

        sales.forEach(sale => {
            totalSoldVolume += (sale.quantityLiters || 0);
            totalRealizedRevenue += (sale.totalValue || 0);
        });

        const currentInventory = Math.max(0, totalCollectedVolume - totalSoldVolume);
        const pendingRevenue = currentInventory * sellingPrice;
        const totalProjectedRevenue = totalRealizedRevenue + pendingRevenue; // Value of what's sold + what is in stock
        const overallProfit = totalProjectedRevenue - totalCost;

        res.json({
            sellingPrice,
            totalCollectedVolume,
            totalSoldVolume,
            currentInventory,
            totalRealizedRevenue,
            pendingRevenue,
            totalCost,
            overallProfit
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
