const express = require('express');
const router = express.Router();
const collectionRequestController = require('../controllers/CollectionRequestController');
const authenticate = require('../middlewares/authMiddleware');

router.get('/pending', authenticate, collectionRequestController.getPendingRequests);
router.put('/:id/status', authenticate, collectionRequestController.updateRequestStatus);

module.exports = router;
