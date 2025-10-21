const { driver } = require('../../config/database');

// Calculate intelligent limits based on user activity    
function calculateIntelligentLimits(txCount, totalValue) {
  const limits = {
    transactions: 10,
    relatedUsers: 5,
    depth: 1
  };

  if (txCount > 50) {
    limits.transactions = 20;
    limits.relatedUsers = 10;
    limits.depth = 2;
  } else if (txCount > 20) {
    limits.transactions = 15;
    limits.relatedUsers = 8;
    limits.depth = 1;
  }

  if (totalValue > 50000) {
    limits.transactions = 25;
    limits.relatedUsers = 12;
  } else if (totalValue > 20000) {
    limits.transactions = 18;
    limits.relatedUsers = 8;
  }

  return limits;
}

// Get user relationships
exports.getUserRelationships = async (req, res) => {      
  const session = driver.session();
  try {
    const { id } = req.params;

    // Enhanced relationship query that includes transactions
    const graphResult = await session.run(
      `
      MATCH (u:User {id: $id})

      // Get user's transactions
      OPTIONAL MATCH (u)-[:MADE_TRANSACTION]->(t:Transaction)
      WITH u, collect(DISTINCT t)[0..10] as userTransactions     

      // User-to-User money transfer relationships        
      OPTIONAL MATCH (u)-[sent:SENT_MONEY_TO]->(recipient:User)
      OPTIONAL MATCH (u)<-[received:RECEIVED_MONEY_FROM]-(sender:User)
      WITH u, userTransactions,
           collect(DISTINCT {user: recipient, relationship: 'SENT_MONEY_TO', amount: sent.amount, date: sent.date})[0..5] as sentTo,
           collect(DISTINCT {user: sender, relationship: 'RECEIVED_MONEY_FROM', amount: received.amount, date: received.date})[0..5] as receivedFrom
      
      // Shared attribute relationships
      OPTIONAL MATCH (u)-[shares:SHARES_EMAIL|SHARES_PHONE|SHARES_ADDRESS]->(related:User)
      WITH u, userTransactions, sentTo, receivedFrom,     
           collect(DISTINCT {user: related, relationship: type(shares), sharedValue: shares.value})[0..3] as sharedAttributes
      
      // Network connections (IP/Device)
      OPTIONAL MATCH (u)-[network:SAME_IP|SAME_DEVICE|TEMPORAL_LINK|NETWORK_CONNECTED]->(connected:User)
      WITH u, userTransactions, sentTo, receivedFrom, sharedAttributes,
           collect(DISTINCT {user: connected, relationship: type(network), details: network.details})[0..3] as networkConnections
      
      RETURN u, userTransactions, sentTo, receivedFrom, sharedAttributes, networkConnections
      `,
      { id }
    );

    // Process results
    const nodes = [];
    const edges = [];

    if (graphResult.records.length > 0) {
      const mainRecord = graphResult.records[0];
      const mainUser = mainRecord.get('u').properties;    

      // Add main user node
      nodes.push({
        data: {
          id: mainUser.id,
          label: mainUser.name || mainUser.id,
          type: 'user',
          ...mainUser
        }
      });

      // Add transaction nodes - THIS IS THE KEY FIX
      const transactions = mainRecord.get('userTransactions') || [];
      transactions.forEach(tx => {
        if (tx && tx.properties) {
          const txProps = tx.properties;
          nodes.push({
            data: {
              id: txProps.id,
              label: `TX\n$${txProps.amount}`,
              type: 'transaction',  // Make sure this is set
              ...txProps,
              amount: txProps.amount?.toNumber ? txProps.amount.toNumber() : txProps.amount
            }
          });

          // Add edge from user to transaction
          edges.push({
            data: {
              id: `${mainUser.id}-${txProps.id}`,
              source: mainUser.id,
              target: txProps.id,
              type: 'MADE_TRANSACTION',
              label: 'Made Transaction',
              color: '#0066ff'  // Blue color for transaction edges
            }
          });
        }
      });

      // Process money transfer relationships
      const processMoneyTransfers = (transfers, isOutgoing) => {
        transfers.forEach(transfer => {
          if (transfer.user && transfer.user.properties) {
            const otherUser = transfer.user.properties;   
            const nodeId = otherUser.id;

            // Add user node if not exists
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

            // Add relationship edge
            const edgeId = isOutgoing ? `${mainUser.id}-${nodeId}` : `${nodeId}-${mainUser.id}`;
            edges.push({
              data: {
                id: edgeId,
                source: isOutgoing ? mainUser.id : nodeId,
                target: isOutgoing ? nodeId : mainUser.id,
                type: transfer.relationship,
                label: isOutgoing ? 'Sent Money' : 'Received Money',
                amount: transfer.amount,
                date: transfer.date,
                color: isOutgoing ? '#00ff00' : '#ff4500'
              }
            });
          }
        });
      };

      processMoneyTransfers(mainRecord.get('sentTo') || [], true);
      processMoneyTransfers(mainRecord.get('receivedFrom') || [], false);
      
      // Process shared attributes and network connections
      ['sharedAttributes', 'networkConnections'].forEach(relationshipType => {
        const relationships = mainRecord.get(relationshipType) || [];
        relationships.forEach(rel => {
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

            edges.push({
              data: {
                id: `${mainUser.id}-${nodeId}-${rel.relationship}`,
                source: mainUser.id,
                target: nodeId,
                type: rel.relationship,
                label: rel.relationship.replace(/_/g, ' '),
                sharedValue: rel.sharedValue,
                details: rel.details,
                color: getEdgeColor(rel.relationship)
              }
            });
          }
        });
      });
    }

    res.json({ nodes, edges });

  } catch (error) {
    console.error('Error fetching user relationships:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await session.close();
  }
};

// Helper function to get edge colors
function getEdgeColor(relationshipType) {
  const colors = {
    'SHARES_EMAIL': '#ff0000',
    'SHARES_PHONE': '#ffa500', 
    'SHARES_ADDRESS': '#800080',
    'SAME_IP': '#ff6600',
    'SAME_DEVICE': '#cc0066',
    'NETWORK_CONNECTED': '#20b2aa'
  };
  return colors[relationshipType] || '#999';
}

module.exports = {
  calculateIntelligentLimits,
  getUserRelationships: exports.getUserRelationships      
};