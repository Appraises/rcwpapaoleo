const { Client, Collection, CollectionRequest, Sale, Buyer } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { exec } = require('child_process');

exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        // Construct YYYY-MM-DD string to ensure SQLite DATEONLY string-match works perfectly
        const firstDayOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

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
        const sixMonthsAgoDate = new Date();
        sixMonthsAgoDate.setMonth(sixMonthsAgoDate.getMonth() - 5);
        const sixMonthsAgo = `${sixMonthsAgoDate.getFullYear()}-${String(sixMonthsAgoDate.getMonth() + 1).padStart(2, '0')}-01`;

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

        // Pending / Dispatched collection requests
        const pendingRequestsCount = await CollectionRequest.count({
            where: { status: 'PENDING' }
        });
        const dispatchedRequestsCount = await CollectionRequest.count({
            where: { status: 'DISPATCHED' }
        });

        // Top 5 Districts by collection volume (with fuzzy name matching)
        const allCollectionsWithClient = await Collection.findAll({
            attributes: ['quantity'],
            include: [{
                model: Client,
                attributes: ['district', 'address']
            }],
            raw: true
        });

        // Normalize district name: lowercase, remove accents, trim, remove extra punctuation
        const normalizeDistrict = (name) => {
            if (!name) return null;
            return name
                .trim()
                .toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
                .replace(/[,.\-;:\/\\]/g, ' ')   // replace punctuation with spaces
                .replace(/\s+/g, ' ')             // collapse multiple spaces
                .trim();
        };

        // Aggregate volumes by normalized district name, keeping track of the best original name
        const districtMap = {};       // normalizedName -> { volume, originalName, nameCount }
        const districtOriginals = {}; // normalizedName -> { name: count } to pick most common spelling

        allCollectionsWithClient.forEach(row => {
            const rawDistrict = row['Client.district'] || row['Client.address'] || null;
            if (!rawDistrict) return;

            const normalized = normalizeDistrict(rawDistrict);
            if (!normalized) return;

            if (!districtMap[normalized]) {
                districtMap[normalized] = { volume: 0 };
                districtOriginals[normalized] = {};
            }
            districtMap[normalized].volume += (row.quantity || 0);
            districtOriginals[normalized][rawDistrict] = (districtOriginals[normalized][rawDistrict] || 0) + 1;
        });

        // Pick the most frequently used original spelling for each normalized district
        const topDistricts = Object.entries(districtMap)
            .map(([normalized, data]) => {
                const originals = districtOriginals[normalized];
                // Pick the spelling that appeared the most
                const bestName = Object.entries(originals).sort((a, b) => b[1] - a[1])[0][0];
                return { name: bestName, value: data.volume };
            })
            .filter(d => d.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // Top Buyers by sales volume
        const topBuyersRaw = await Sale.findAll({
            attributes: [
                [col('Buyer.name'), 'buyerName'],
                [fn('sum', col('quantityLiters')), 'totalVolume']
            ],
            include: [{
                model: Buyer,
                attributes: []
            }],
            group: ['Buyer.name'],
            order: [[literal('totalVolume'), 'DESC']],
            limit: 5,
            raw: true
        });

        const topBuyers = topBuyersRaw.map(item => ({
            name: item.buyerName || 'Desconhecido',
            value: item.totalVolume || 0
        })).filter(b => b.value > 0);

        res.json({
            totalMonth,
            totalGeneral,
            ranking,
            chartData,
            pendingRequestsCount,
            dispatchedRequestsCount,
            topDistricts,
            topBuyers
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.getServerLogs = async (req, res) => {
    try {
        // Quick debugging route to view PM2 logs on the frontend.
        // It runs tail -n 100 on the pm2 logs.
        exec('pm2 logs rcwpapaoleo --lines 100 --nostream', (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ error: 'Failed to fetch logs', details: stderr || error.message });
            }
            res.json({ logs: stdout });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
