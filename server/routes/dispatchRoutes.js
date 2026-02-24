const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { dispatchDailyRoutes } = require('../services/DispatchService');

// POST /api/dispatch/run — manually trigger the daily route dispatch (admin only)
router.post('/run', authMiddleware, async (req, res) => {
    try {
        const result = await dispatchDailyRoutes();
        res.json(result);
    } catch (error) {
        console.error('[DispatchRoute] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
