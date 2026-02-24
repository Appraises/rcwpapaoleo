const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/DashboardController');
const financialController = require('../controllers/FinancialController');
const auth = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authMiddleware');

router.get('/stats', auth, dashboardController.getDashboardStats);
router.get('/financial', auth, requireAdmin, financialController.getFinancialStats);
router.post('/financial/price', auth, requireAdmin, financialController.updateSellingPrice);
router.get('/logs', auth, requireAdmin, dashboardController.getServerLogs);

module.exports = router;
