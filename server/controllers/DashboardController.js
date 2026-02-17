const { Client, Collection } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Total collected this month
        const totalMonth = await Collection.sum('quantity', {
            where: {
                date: {
                    [Op.gte]: firstDayOfMonth
                }
            }
        }) || 0;

        // Total collected overall
        const totalGeneral = await Collection.sum('quantity') || 0;

        // Ranking of clients (Top 5)
        // SQLite syntax for sum might need literal, or sequelize fn
        const ranking = await Collection.findAll({
            attributes: [
                'clientId',
                [fn('sum', col('quantity')), 'totalQuantity']
            ],
            include: [{
                model: Client,
                attributes: ['name']
            }],
            group: ['clientId'],
            order: [[literal('totalQuantity'), 'DESC']],
            limit: 5
        });

        // Monthly history (Last 6 months)
        // This is bit tricky with SQLite and GroupBy month. 
        // Simplified approach: Get all collections from last 6 months and aggregate in JS to avoid DB dialect issues
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const historyData = await Collection.findAll({
            where: {
                date: {
                    [Op.gte]: sixMonthsAgo
                }
            },
            attributes: ['date', 'quantity'],
            order: [['date', 'ASC']]
        });

        // Aggregate by month in JS
        const monthlyData = {};
        // Initialize last 6 months
        for (let i = 0; i < 6; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[key] = 0;
        }

        historyData.forEach(item => {
            const d = new Date(item.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyData[key] !== undefined) {
                monthlyData[key] += item.quantity;
            }
        });

        const chartData = Object.entries(monthlyData)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => a.name.localeCompare(b.name));

        res.json({
            totalMonth,
            totalGeneral,
            ranking,
            chartData
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
