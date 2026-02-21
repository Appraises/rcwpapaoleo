const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/WebhookController');

// Evolution API Webhook POST route
router.post('/evolution', webhookController.handleEvolutionWebhook);

module.exports = router;
