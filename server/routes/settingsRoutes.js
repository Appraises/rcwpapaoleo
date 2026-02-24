const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { SystemSetting } = require('../models');

// GET /api/settings — retrieve all settings (or specific keys)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { keys } = req.query;
        const where = keys ? { key: keys.split(',') } : {};
        const settings = await SystemSetting.findAll({ where });
        // Return as key-value object
        const result = {};
        settings.forEach(s => { result[s.key] = s.value; });
        res.json(result);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/settings — bulk upsert settings { key: value, key: value, ... }
router.put('/', authMiddleware, async (req, res) => {
    try {
        const entries = req.body;
        for (const [key, value] of Object.entries(entries)) {
            const existing = await SystemSetting.findByPk(key);
            if (existing) {
                await existing.update({ value: String(value) });
            } else {
                await SystemSetting.create({ key, value: String(value) });
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
