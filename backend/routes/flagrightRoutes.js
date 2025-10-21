const express = require('express');
const router = express.Router();
const {
  syncUsers,
  syncTransactions,
  syncLinkedEntities
} = require('../scripts/syncFlagrightData');

/**
 * Manual sync endpoint for Flagright data
 * POST /api/flagright/sync
 * Body: { userIds: [], transactionIds: [], detectRelationships: true }
 */
router.post('/sync', async (req, res) => {
  try {
    const { userIds = [], transactionIds = [], detectRelationships = true } = req.body;

    console.log('\n🔄 Manual sync initiated...');
    console.log(`Users to sync: ${userIds.length}`);
    console.log(`Transactions to sync: ${transactionIds.length}`);

    const results = {
      users: { syncedCount: 0, errorCount: 0 },
      transactions: { syncedCount: 0, errorCount: 0 },
      relationships: 0
    };

    // Sync users
    if (userIds.length > 0) {
      results.users = await syncUsers(userIds);
    }

    // Sync transactions
    if (transactionIds.length > 0) {
      results.transactions = await syncTransactions(transactionIds);
    }

    // Detect relationships
    if (detectRelationships && userIds.length > 0) {
      for (const userId of userIds) {
        const count = await syncLinkedEntities(userId);
        results.relationships += count;
      }
    }

    console.log('\n✅ Manual sync completed\n');

    res.status(200).json({
      success: true,
      message: 'Flagright data synced successfully',
      results
    });

  } catch (error) {
    console.error('❌ Manual sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get sync status
 * GET /api/flagright/status
 */
router.get('/status', async (req, res) => {
  try {
    const apiKey = process.env.FLAGRIGHT_API_KEY;
    const apiUrl = process.env.FLAGRIGHT_API_URL;

    res.status(200).json({
      success: true,
      configured: !!(apiKey && apiUrl),
      apiUrl: apiUrl || 'Not configured',
      apiKeyPresent: !!apiKey
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
