const express = require('express');
const router = express.Router();
const SaleController = require('../controllers/SaleController');

router.post('/', SaleController.createSale);
router.get('/buyer/:buyerId', SaleController.getSalesByBuyer);
router.put('/:id', SaleController.updateSale);
router.delete('/:id', SaleController.deleteSale);

module.exports = router;
