const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// POST /api/users - Create or update user
router.post('/', userController.createOrUpdateUser);

// GET /api/users - Get all users with pagination, search, filters
router.get('/', userController.getAllUsers);

// GET /api/users/search - Search users
router.get('/search', userController.searchUsers);

// GET /api/users/export/csv - Export to CSV
router.get('/export/csv', userController.exportUsersCSV);

// GET /api/users/export/json - Export to JSON
router.get('/export/json', userController.exportUsersJSON);

// GET /api/users/:id - Get user by ID
router.get('/:id', userController.getUserById);

// DELETE /api/users/:id - Delete user
router.delete('/:id', userController.deleteUser);

module.exports = router;
