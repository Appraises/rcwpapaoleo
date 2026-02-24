const express = require('express');
const router = express.Router();
const clientController = require('../controllers/ClientController');
const collectionController = require('../controllers/CollectionController');

router.post('/', clientController.createClient);
router.get('/', clientController.getAllClients);
router.get('/cities', clientController.getDistinctCities);
router.get('/:id', clientController.getClientById);
router.put('/:id', clientController.updateClient);
router.delete('/:id', clientController.deleteClient);

router.get('/:clientId/collections', collectionController.getCollectionsByClient);

module.exports = router;
