const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const userController = require('../controllers/UserController');
const auth = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authMiddleware');

// Public — only login
router.post('/login', authController.login);

// Protected — requires authentication
router.get('/users', auth, authController.getAllUsers);

// Admin only — register new users and user management
router.post('/register', auth, requireAdmin, authController.register);
router.post('/users', auth, requireAdmin, userController.createUser);
router.put('/users/:id', auth, requireAdmin, userController.updateUser);
router.delete('/users/:id', auth, requireAdmin, userController.deleteUser);

module.exports = router;

