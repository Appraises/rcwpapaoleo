const ReportService = require('../services/ReportService');
const { Report } = require('../models');

exports.listReports = async (req, res) => {
    try {
        const reports = await Report.findAll({
            order: [['generatedAt', 'DESC']]
        });
        res.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.forceGenerate = async (req, res) => {
    try {
        const { type } = req.body; // 'weekly' or 'monthly'

        const now = new Date();
        let startDate, endDate;

        if (type === 'weekly') {
            // Last week (Sunday to Saturday)
            const today = now.getDay(); // 0 is Sunday
            endDate = new Date(now);
            endDate.setDate(now.getDate() - today - 1); // Last Saturday

            startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - 6); // Prev Sunday
        } else if (type === 'monthly') {
            // Last month
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of prev month
        } else {
            return res.status(400).json({ error: "Invalid type. Must be 'weekly' or 'monthly'." });
        }

        // Set hours to cover full days
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const report = await ReportService.generateReport(type, startDate, endDate);
        res.json({ message: 'Report generated manually', report });
    } catch (error) {
        console.error('Error forcefully generating report:', error);
        res.status(500).json({ error: error.message });
    }
};
