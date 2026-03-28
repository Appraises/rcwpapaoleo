const express = require('express');
const router = express.Router();
const reportController = require('../controllers/ReportController');
const authenticate = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authMiddleware');

router.get('/', authenticate, requireAdmin, reportController.listReports);
router.post('/generate', authenticate, requireAdmin, reportController.forceGenerate);

module.exports = router;
