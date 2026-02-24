const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/WebhookController');

// Evolution API Webhook POST route
router.post('/evolution', webhookController.handleEvolutionWebhook);

// Test GET route to check if webhook is reachable
router.get('/evolution', webhookController.testWebhook);

module.exports = router;
