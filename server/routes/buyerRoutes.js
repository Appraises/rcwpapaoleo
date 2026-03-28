const express = require('express');
const router = express.Router();
const BuyerController = require('../controllers/BuyerController');
const { requireAdmin } = require('../middlewares/authMiddleware');

router.post('/', requireAdmin, BuyerController.createBuyer);
router.get('/', requireAdmin, BuyerController.getAllBuyers);
router.get('/:id', requireAdmin, BuyerController.getBuyerById);
router.put('/:id', requireAdmin, BuyerController.updateBuyer);
router.delete('/:id', requireAdmin, BuyerController.deleteBuyer);

module.exports = router;
