const { driver } = require('../../config/database');

// Get all transactions with pagination
exports.getAllTransactions = async (req, res) => {
  let session = null;
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Simple query first
    session = driver.session();
    
    const query = `
      MATCH (t:Transaction)
      RETURN t
      ORDER BY t.timestamp DESC
      SKIP toInteger($offset)
      LIMIT toInteger($limit)
    `;

    const result = await session.run(query, {
      offset: offset,
      limit: limit
    });

    const transactions = result.records.map(record => {
      const transaction = record.get('t').properties;
      return {
        id: transaction.id,
        amount: transaction.amount?.toNumber ? transaction.amount.toNumber() : transaction.amount,
        currency: transaction.currency,
        type: transaction.type,
        status: transaction.status,
        originUserId: transaction.originUserId,
        destinationUserId: transaction.destinationUserId,
        timestamp: transaction.timestamp,
        description: transaction.description || '',
        riskScore: transaction.riskScore?.toNumber ? transaction.riskScore.toNumber() : transaction.riskScore
      };
    });

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total: transactions.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (session) {
      await session.close();
    }
  }
};

// Get transactions by type
exports.getTransactionsByType = async (req, res) => {
  const session = driver.session();
  try {
    const { type } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const query = `
      MATCH (t:Transaction {type: $type})
      RETURN t
      ORDER BY t.timestamp DESC
      SKIP $offset
      LIMIT $limit
    `;

    const result = await session.run(query, { type, offset, limit });

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
    console.error('Error fetching transactions by type:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await session.close();
  }
};

// Get transactions by status
exports.getTransactionsByStatus = async (req, res) => {
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

// Search transactions
exports.searchTransactions = async (req, res) => {
  const session = driver.session();
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const query = `
      MATCH (t:Transaction)
      WHERE t.id CONTAINS $searchTerm
         OR t.userId CONTAINS $searchTerm
         OR toString(t.amount) CONTAINS $searchTerm
         OR t.type CONTAINS $searchTerm
         OR t.status CONTAINS $searchTerm
      RETURN t
      ORDER BY t.timestamp DESC
      SKIP $offset
      LIMIT $limit
    `;

    const result = await session.run(query, {
      searchTerm: q.toLowerCase(),
      offset,
      limit
    });

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
};