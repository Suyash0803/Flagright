const { driver } = require('../config/database');

// Transaction types and statuses
const TRANSACTION_TYPES = ['withdrawal', 'purchase', 'deposit', 'payment', 'transfer'];
const TRANSACTION_STATUSES = ['pending', 'completed', 'failed', 'cancelled'];

// Create or update transaction
const createOrUpdateTransaction = async (req, res) => {
  const session = driver.session();
  try {
    const transactionData = req.body;
    
    const result = await session.run(
      `
      MERGE (t:Transaction {id: $id})
      SET t += $props, t.timestamp = datetime()
      RETURN t
      `,
      { 
        id: transactionData.id || `txn-${Date.now()}`,
        props: transactionData 
      }
    );

    const transaction = result.records[0].get('t').properties;
    res.json(transaction);
  } catch (error) {
    console.error('Error creating/updating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await session.close();
  }
};

// Get all transactions with pagination
const getAllTransactions = async (req, res) => {
  const session = driver.session();
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Cap at 100
    const skip = (page - 1) * limit;

    // Get total count first
    const countResult = await session.run('MATCH (t:Transaction) RETURN count(t) as total');
    const total = countResult.records[0].get('total').toNumber();

    // Get transactions with simple query (avoiding SKIP/LIMIT for now)
    const result = await session.run(
      `
      MATCH (t:Transaction)
      RETURN t
      ORDER BY t.timestamp DESC
      `
    );

    // Handle pagination in JavaScript for now
    const allTransactions = result.records.map(record => {
      const tx = record.get('t').properties;
      return {
        ...tx,
        amount: tx.amount?.toNumber ? tx.amount.toNumber() : tx.amount
      };
    });

    // Paginate in memory
    const startIndex = skip;
    const endIndex = startIndex + limit;
    const transactions = allTransactions.slice(startIndex, endIndex);

    const totalPages = Math.ceil(total / limit);

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error in getAllTransactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await session.close();
  }
};

// Get transaction by ID
const getTransactionById = async (req, res) => {
  const session = driver.session();
  try {
    const { id } = req.params;

    const result = await session.run(
      'MATCH (t:Transaction {id: $id}) RETURN t',
      { id }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = result.records[0].get('t').properties;
    res.json({
      ...transaction,
      amount: transaction.amount.toNumber ? transaction.amount.toNumber() : transaction.amount,
      metadata: JSON.parse(transaction.metadata || '{}')
    });
  } catch (error) {
    console.error('Error fetching transaction by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await session.close();
  }
};

// Get transaction types with counts
const getTransactionTypes = async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (t:Transaction)
      WHERE t.type IS NOT NULL
      RETURN t.type as type, count(t) as count
      ORDER BY count DESC
    `);

    const typesInData = result.records.map(record => ({
      type: record.get('type'),
      count: record.get('count').toNumber()
    }));

    res.json({ 
      typesInData,
      allTypes: TRANSACTION_TYPES 
    });
  } catch (error) {
    console.error('Error fetching transaction types:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await session.close();
  }
};

// Get transactions by type
const getTransactionsByType = async (req, res) => {
  const session = driver.session();
  try {
    const { type } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    // Get total count for this type
    const countResult = await session.run(
      'MATCH (t:Transaction {type: $type}) RETURN count(t) as total',
      { type }
    );
    const total = countResult.records[0].get('total').toNumber();

    // Get transactions for this type
    const result = await session.run(`
      MATCH (t:Transaction {type: $type})
      RETURN t
      ORDER BY t.timestamp DESC
    `, { type });

    // Handle pagination in JavaScript for now
    const allTransactions = result.records.map(record => {
      const tx = record.get('t').properties;
      return {
        ...tx,
        amount: tx.amount?.toNumber ? tx.amount.toNumber() : tx.amount
      };
    });

    // Paginate in memory
    const startIndex = skip;
    const endIndex = startIndex + limit;
    const transactions = allTransactions.slice(startIndex, endIndex);

    const totalPages = Math.ceil(total / limit);

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching transactions by type:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await session.close();
  }
};

// Get transactions by status
const getTransactionsByStatus = async (req, res) => {
  const session = driver.session();
  try {
    const { status } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const query = `
      MATCH (t:Transaction {status: $status})
      RETURN t
      ORDER BY t.timestamp DESC
      SKIP $offset
      LIMIT $limit
    `;

    const result = await session.run(query, { status, offset, limit });

    const transactions = result.records.map(record => {
      const transaction = record.get('t').properties;
      return {
        ...transaction,
        amount: transaction.amount.toNumber ? transaction.amount.toNumber() : transaction.amount,
        metadata: JSON.parse(transaction.metadata || '{}')
      };
    });

    res.json({ transactions });

  } catch (error) {
    console.error('Error fetching transactions by status:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await session.close();
  }
};

// Export constants and functions
module.exports = {
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  createOrUpdateTransaction,
  getAllTransactions,
  getTransactionById,
  getTransactionTypes,
  getTransactionsByType,
  getTransactionsByStatus,
  searchTransactions: async (req, res) => {
    const session = driver.session();
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const result = await session.run(
        `
        MATCH (t:Transaction)
        WHERE t.id CONTAINS $searchTerm 
           OR t.userId CONTAINS $searchTerm
           OR toString(t.amount) CONTAINS $searchTerm
           OR t.type CONTAINS $searchTerm
           OR t.status CONTAINS $searchTerm
        RETURN t
        ORDER BY t.timestamp DESC
        LIMIT 50
        `,
        { searchTerm: q.toLowerCase() }
      );

      const transactions = result.records.map(record => {
        const transaction = record.get('t').properties;
        return {
          ...transaction,
          amount: transaction.amount.toNumber ? transaction.amount.toNumber() : transaction.amount,
          metadata: JSON.parse(transaction.metadata || '{}')
        };
      });

      res.json({ transactions });
    } catch (error) {
      console.error('Error searching transactions:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      await session.close();
    }
  },
  getTransactionStatuses: async (req, res) => {
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (t:Transaction)
        RETURN t.status as status, count(t) as count
        ORDER BY count DESC
      `);

      const statuses = result.records.map(record => ({
        status: record.get('status'),
        count: record.get('count').toNumber()
      }));

      res.json(statuses);
    } catch (error) {
      console.error('Error fetching transaction statuses:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      await session.close();
    }
  },
  getTransactionAnalytics: async (req, res) => {
    res.json({ message: 'Analytics not implemented yet' });
  },
  exportTransactionsCSV: async (req, res) => {
    res.json({ message: 'CSV export not implemented yet' });
  },
  exportTransactionsJSON: async (req, res) => {
    res.json({ message: 'JSON export not implemented yet' });
  },
  getPendingTransactions: (req, res) => {
    req.params.status = 'pending';
    return getTransactionsByStatus(req, res);
  },
  getCompletedTransactions: (req, res) => {
    req.params.status = 'completed';
    return getTransactionsByStatus(req, res);
  },
  getFailedTransactions: (req, res) => {
    req.params.status = 'failed';
    return getTransactionsByStatus(req, res);
  },
  deleteTransaction: async (req, res) => {
    const session = driver.session();
    try {
      const { id } = req.params;
      await session.run('MATCH (t:Transaction {id: $id}) DELETE t', { id });
      res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      await session.close();
    }
  },


};