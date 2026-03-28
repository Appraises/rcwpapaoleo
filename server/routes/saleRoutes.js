const express = require('express');
const router = express.Router();
const SaleController = require('../controllers/SaleController');
const { requireAdmin } = require('../middlewares/authMiddleware');

router.get('/', requireAdmin, SaleController.getAllSales);
router.post('/', requireAdmin, SaleController.createSale);
router.get('/buyer/:buyerId', requireAdmin, SaleController.getSalesByBuyer);
router.put('/:id', requireAdmin, SaleController.updateSale);
router.delete('/:id', requireAdmin, SaleController.deleteSale);

module.exports = router;
