const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');

const userController = require('../controllers/UserController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/users', authController.getAllUsers);

// User Management Routes
router.post('/users', userController.createUser);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);

module.exports = router;
