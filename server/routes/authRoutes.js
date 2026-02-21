const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const userController = require('../controllers/UserController');
const auth = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/users', authController.getAllUsers);

// User Management Routes (admin only)
router.post('/users', auth, requireAdmin, userController.createUser);
router.put('/users/:id', auth, requireAdmin, userController.updateUser);
router.delete('/users/:id', auth, requireAdmin, userController.deleteUser);

module.exports = router;

