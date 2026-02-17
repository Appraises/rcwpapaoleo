const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/DashboardController');
const financialController = require('../controllers/FinancialController');

router.get('/stats', dashboardController.getDashboardStats);
router.get('/financial', financialController.getFinancialStats);
router.post('/financial/price', financialController.updateSellingPrice);

module.exports = router;
