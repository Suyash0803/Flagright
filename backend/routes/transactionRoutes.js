const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// POST /api/transactions - Create or update transaction
router.post('/', transactionController.createOrUpdateTransaction);

// GET /api/transactions - Get all transactions with pagination, search, filters
router.get('/', transactionController.getAllTransactions);

// GET /api/transactions/types - Get available transaction types and counts
router.get('/types', transactionController.getTransactionTypes);

// GET /api/transactions/statuses - Get available transaction statuses and counts
router.get('/statuses', transactionController.getTransactionStatuses);

// GET /api/transactions/analytics - Get transaction analytics and statistics
router.get('/analytics', transactionController.getTransactionAnalytics);

// GET /api/transactions/by-type/:type - Get transactions by specific type
router.get('/by-type/:type', transactionController.getTransactionsByType);

// GET /api/transactions/by-status/:status - Get transactions by specific status
router.get('/by-status/:status', transactionController.getTransactionsByStatus);

// GET /api/transactions/pending - Get all pending transactions
router.get('/pending', transactionController.getPendingTransactions);

// GET /api/transactions/completed - Get all completed transactions
router.get('/completed', transactionController.getCompletedTransactions);

// GET /api/transactions/failed - Get all failed transactions
router.get('/failed', transactionController.getFailedTransactions);

// GET /api/transactions/search - Search transactions
router.get('/search', transactionController.searchTransactions);

// GET /api/transactions/export/csv - Export to CSV
router.get('/export/csv', transactionController.exportTransactionsCSV);

// GET /api/transactions/export/json - Export to JSON
router.get('/export/json', transactionController.exportTransactionsJSON);

// GET /api/transactions/:id - Get transaction by ID
router.get('/:id', transactionController.getTransactionById);

// DELETE /api/transactions/:id - Delete transaction
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;
