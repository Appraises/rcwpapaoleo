const authMiddleware = require('../middlewares/authMiddleware');
const EvolutionController = require('../controllers/EvolutionController');
const router = require('express').Router();

// Both routes are protected by authMiddleware so only logged admin can access
router.get('/status', authMiddleware, EvolutionController.getConnectionState);
router.get('/qr', authMiddleware, EvolutionController.connect);

module.exports = router;
