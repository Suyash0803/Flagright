const express = require('express');
const router = express.Router();
const relationshipController = require('../controllers/relationshipController');

// GET /api/relationships/user/:id - Get user relationships
router.get('/user/:id', relationshipController.getUserRelationships);

// GET /api/relationships/transaction/:id - Get transaction relationships
router.get('/transaction/:id', relationshipController.getTransactionRelationships);

// POST /api/relationships/detect - Detect and create relationships
router.post('/detect', relationshipController.detectAndCreateRelationships);

// BONUS FEATURES: Graph Analytics
// GET /api/relationships/shortest-path/:user1Id/:user2Id - Find shortest path between users
router.get('/shortest-path/:user1Id/:user2Id', relationshipController.findShortestPath);

// GET /api/relationships/clusters - Get transaction clusters analysis
router.get('/clusters', relationshipController.getTransactionClusters);

// BONUS FEATURES: Export functionality
// GET /api/relationships/export/json - Export graph as JSON
router.get('/export/json', relationshipController.exportGraphJSON);

// GET /api/relationships/export/csv - Export graph as CSV
router.get('/export/csv', relationshipController.exportGraphCSV);

// GET /api/relationships/fraud-analysis - Get comprehensive fraud analysis
router.get('/fraud-analysis', relationshipController.getFraudAnalysis);

module.exports = router;
