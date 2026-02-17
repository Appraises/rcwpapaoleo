const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/CollectionController');

// Routes for direct collection management
router.post('/', collectionController.createCollection);
router.get('/', collectionController.getAllCollections);
router.delete('/:id', collectionController.deleteCollection);

// Routes for collections by client (this might be handled in clientRoutes too, but here for separation)
// actually /api/clients/:id/collections is better suited in clientRoutes or here if we pass the param.
// simpler to have /collections handle creation and deletion, 
// and /clients/:id/collections handle listing?

module.exports = router;
