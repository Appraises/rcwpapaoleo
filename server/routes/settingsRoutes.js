const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { SystemSetting } = require('../models');
const GeocodingService = require('../services/GeocodingService');

// GET /api/settings/geocode?address=... — proxy geocoding via Google Maps (protects API key)
router.get('/geocode', authMiddleware, async (req, res) => {
    try {
        const { address } = req.query;
        if (!address) {
            return res.status(400).json({ error: 'Missing address parameter' });
        }
        const result = await GeocodingService.geocodeAddress(address);
        if (result) {
            res.json(result);
        } else {
            res.json({ lat: null, lng: null });
        }
    } catch (error) {
        console.error('[Geocode Proxy] Error:', error.message);
        res.status(500).json({ error: 'Geocoding failed' });
    }
});

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

// GET /api/settings/maps-key - securely expose maps api key to authenticated frontend
router.get('/maps-key', authMiddleware, (req, res) => {
    res.json({ key: process.env.GOOGLE_MAPS_API_KEY || '' });
});

module.exports = router;
