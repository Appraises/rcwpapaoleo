const express = require('express');
const router = express.Router();
const SaleController = require('../controllers/SaleController');

router.get('/', SaleController.getAllSales);
router.post('/', SaleController.createSale);
router.get('/buyer/:buyerId', SaleController.getSalesByBuyer);
router.put('/:id', SaleController.updateSale);
router.delete('/:id', SaleController.deleteSale);

module.exports = router;
