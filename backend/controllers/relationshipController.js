const { driver } = require('../config/database');

// Helper function to get edge colors based on relationship type
function getEdgeColor(relationshipType) {
  const colors = {
    'MADE_TRANSACTION': '#0066ff',      // Blue - Made Transaction
    'RECEIVED_TRANSACTION': '#00cc66',  // Green - Received Transaction
    'SENT_MONEY_TO': '#00ff00',         // Bright Green - Sent Money To
    'RECEIVED_MONEY_FROM': '#ff4500',   // Orange Red - Received Money From
    'SHARES_EMAIL': '#ff0000',          // Red - Shares Email
    'SHARES_PHONE': '#ffa500',          // Orange - Shares Phone
    'SHARES_ADDRESS': '#800080',        // Purple - Shares Address
    'SAME_IP': '#ff6600',               // Dark Orange - Same IP
    'SAME_DEVICE': '#cc0066',           // Pink - Same Device
    'NETWORK_CONNECTED': '#20b2aa',     // Light Sea Green - Network Connected
    'FAMILY_MEMBER': '#9932cc',         // Dark Orchid - Family Member
    'BUSINESS_PARTNER': '#32cd32',      // Lime Green - Business Partner
    'TEMPORAL_LINK': '#ff69b4',         // Hot Pink - Temporal Link
    'AMOUNT_PATTERN': '#dda0dd'         // Plum - Amount Pattern
  };
  return colors[relationshipType] || '#999999'; // Default gray for unknown types
}

// Get user relationships
const getUserRelationships = async (req, res) => {
  const session = driver.session();
  try {
    const { id } = req.params;

    // Get user relationships including transactions
    const result = await session.run(
      `
      MATCH (u:User {id: $id})
      
      // Get user's transactions
      OPTIONAL MATCH (u)-[:MADE_TRANSACTION]->(t:Transaction)
      WITH u, collect(DISTINCT t)[0..20] as userTransactions
      
      // Get related users through money transfers
      OPTIONAL MATCH (u)-[r:SENT_MONEY_TO|RECEIVED_MONEY_FROM]-(related:User)
      WITH u, userTransactions, collect(DISTINCT {user: related, relationship: type(r)}) as relatedUsers
      
      // Get users sharing attributes
      OPTIONAL MATCH (u)-[s:SHARES_EMAIL|SHARES_PHONE|SHARES_ADDRESS]->(shared:User)
      WITH u, userTransactions, relatedUsers, 
           collect(DISTINCT {user: shared, relationship: type(s), sharedValue: s.value}) as sharedUsers
      
      // Get users connected through same IP (via transactions)
      OPTIONAL MATCH (u)-[:MADE_TRANSACTION]->(t1:Transaction)
      OPTIONAL MATCH (other:User)-[:MADE_TRANSACTION]->(t2:Transaction)
      WHERE t1.ipAddress IS NOT NULL AND t1.ipAddress = t2.ipAddress AND u <> other
      WITH u, userTransactions, relatedUsers, sharedUsers, 
           collect(DISTINCT {user: other, relationship: 'SAME_IP', ipAddress: t1.ipAddress})[0..10] as sameIPUsers
      
      // Get users connected through same device (via transactions)  
      OPTIONAL MATCH (u)-[:MADE_TRANSACTION]->(t3:Transaction)
      OPTIONAL MATCH (deviceUser:User)-[:MADE_TRANSACTION]->(t4:Transaction)
      WHERE t3.deviceId IS NOT NULL AND t3.deviceId = t4.deviceId AND u <> deviceUser
      WITH u, userTransactions, relatedUsers, sharedUsers, sameIPUsers,
           collect(DISTINCT {user: deviceUser, relationship: 'SAME_DEVICE', deviceId: t3.deviceId})[0..10] as sameDeviceUsers
      
      RETURN u, userTransactions, relatedUsers, sharedUsers, sameIPUsers, sameDeviceUsers
      `,
      { id }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const record = result.records[0];
    const mainUser = record.get('u').properties;
    const transactions = record.get('userTransactions') || [];
    const relatedUsers = record.get('relatedUsers') || [];
    const sharedUsers = record.get('sharedUsers') || [];
    const sameIPUsers = record.get('sameIPUsers') || [];
    const sameDeviceUsers = record.get('sameDeviceUsers') || [];

    // Build graph nodes and edges
    const nodes = [];
    const edges = [];

    // Add main user node
    nodes.push({
      data: {
        id: mainUser.id,
        label: mainUser.name || mainUser.id,
        type: 'user',
        ...mainUser
      }
    });

    // Add transaction nodes
    transactions.forEach(tx => {
      if (tx && tx.properties) {
        const txProps = tx.properties;
        nodes.push({
          data: {
            id: txProps.id,
            label: `TX\n$${txProps.amount}`,
            // Spread properties first, then override type to ensure it stays 'transaction'
            ...txProps,
            amount: txProps.amount.toNumber ? txProps.amount.toNumber() : txProps.amount,
            originalType: txProps.type, // Keep original for reference
            type: 'transaction' // FORCE this to 'transaction' for blue color
          }
        });
        
        edges.push({
          data: {
            id: `${mainUser.id}-${txProps.id}`,
            source: mainUser.id,
            target: txProps.id,
            type: 'MADE_TRANSACTION',
            label: 'Made Transaction',
            color: getEdgeColor('MADE_TRANSACTION')
          }
        });
      }
    });

    // Add related user nodes and edges
    [...relatedUsers, ...sharedUsers, ...sameIPUsers, ...sameDeviceUsers].forEach(rel => {
      if (rel.user && rel.user.properties) {
        const otherUser = rel.user.properties;
        const nodeId = otherUser.id;
        
        if (!nodes.find(n => n.data.id === nodeId)) {
          nodes.push({
            data: {
              id: nodeId,
              label: otherUser.name || nodeId,
              type: 'user',
              ...otherUser
            }
          });
        }
        
        // Create a more descriptive label based on relationship type
        let edgeLabel = rel.relationship.replace(/_/g, ' ');
        if (rel.relationship === 'SAME_IP' && rel.ipAddress) {
          edgeLabel = `Same IP (${rel.ipAddress})`;
        } else if (rel.relationship === 'SAME_DEVICE' && rel.deviceId) {
          edgeLabel = `Same Device (${rel.deviceId})`;
        } else if (rel.sharedValue) {
          edgeLabel = `${edgeLabel} (${rel.sharedValue})`;
        }
        
        edges.push({
          data: {
            id: `${mainUser.id}-${nodeId}-${rel.relationship}`,
            source: mainUser.id,
            target: nodeId,
            type: rel.relationship,
            label: edgeLabel,
            color: getEdgeColor(rel.relationship)
          }
        });
      }
    });

    res.json({ nodes, edges });

  } catch (error) {
    console.error('Error fetching user relationships:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await session.close();
  }
};

// Get transaction relationships
const getTransactionRelationships = async (req, res) => {
  const session = driver.session();
  try {
    const { id } = req.params;

    const result = await session.run(
      `
      MATCH (t:Transaction {id: $id})
      OPTIONAL MATCH (u:User)-[:MADE_TRANSACTION]->(t)
      OPTIONAL MATCH (t)-[r]-(related)
      RETURN t, u, collect(DISTINCT {node: related, relationship: type(r)}) as relationships
      `,
      { id }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const record = result.records[0];
    const transaction = record.get('t').properties;
    const user = record.get('u')?.properties;
    
    const nodes = [];
    const edges = [];

    // Add transaction node
    nodes.push({
      data: {
        id: transaction.id,
        label: `$${transaction.amount} ${transaction.type}`,
        type: 'transaction',
        ...transaction,
        amount: transaction.amount.toNumber ? transaction.amount.toNumber() : transaction.amount
      }
    });

    // Add user node if exists
    if (user) {
      nodes.push({
        data: {
          id: user.id,
          label: user.name || user.id,
          type: 'user',
          ...user
        }
      });

      edges.push({
        data: {
          id: `${user.id}-${transaction.id}`,
          source: user.id,
          target: transaction.id,
          type: 'MADE_TRANSACTION',
          label: 'Made Transaction',
          color: getEdgeColor('MADE_TRANSACTION')
        }
      });
    }

    res.json({ nodes, edges });

  } catch (error) {
    console.error('Error fetching transaction relationships:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await session.close();
  }
};

// Find shortest path between users
const findShortestPath = async (req, res) => {
  const session = driver.session();
  try {
    const { user1Id, user2Id } = req.params;

    if (!user1Id || !user2Id) {
      return res.status(400).json({ error: 'Both user1Id and user2Id parameters are required' });
    }

    const result = await session.run(
      `
      MATCH (start:User {id: $user1Id}), (end:User {id: $user2Id})
      MATCH path = shortestPath((start)-[*..6]-(end))
      RETURN 
        [n IN nodes(path) | { id: coalesce(n.id, 'node-' + toString(id(n))), type: CASE WHEN n:Transaction THEN 'transaction' WHEN n:User THEN 'user' ELSE head(labels(n)) END, name: n.name }] AS nodes,
        [r IN relationships(path) | { start: coalesce(startNode(r).id, 'node-' + toString(id(startNode(r)))), end: coalesce(endNode(r).id, 'node-' + toString(id(endNode(r)))), type: type(r) }] AS relationships,
        length(path) as pathLength
      `,
      { user1Id, user2Id }
    );

    if (result.records.length === 0) {
      return res.json({
        found: false,
        message: 'No path found between the specified users',
        pathLength: null,
        path: null
      });
    }

    const record = result.records[0];
    const pathLength = record.get('pathLength').toNumber();
    const nodes = record.get('nodes') || [];
    const relationships = record.get('relationships') || [];

    res.json({
      found: true,
      pathLength,
      nodes,
      relationships,
      message: `Path found with ${pathLength} hops`
    });

  } catch (error) {
    console.error('Error finding shortest path:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await session.close();
  }
};

module.exports = {
  getUserRelationships,
  getTransactionRelationships,
  findShortestPath,
  
  // Placeholder for other endpoints
  detectAndCreateRelationships: async (req, res) => {
    res.status(501).json({ message: 'This endpoint is deprecated' });
  },
  
  getFraudAnalysis: async (req, res) => {
    res.status(501).json({ message: 'Fraud analysis has been removed' });
  },
  
  getTransactionClusters: async (req, res) => {
    res.status(501).json({ message: 'Clustering analysis not yet implemented' });
  },

  exportGraphJSON: async (req, res) => {
    res.json({ message: 'JSON export not implemented yet' });
  },

  exportGraphCSV: async (req, res) => {
    res.json({ message: 'CSV export not implemented yet' });
  }
};