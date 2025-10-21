require('dotenv').config();
const neo4j = require('neo4j-driver');
const { flagrightClient } = require('../services/flagrightService');

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password123'
  )
);

/**
 * Sync users from Flagright to Neo4j
 */
async function syncUsers(userIds) {
  const session = driver.session();
  let syncedCount = 0;
  let errorCount = 0;

  console.log(`\n🔄 Syncing ${userIds.length} users from Flagright to Neo4j...`);

  for (const userId of userIds) {
    try {
      // Fetch user from Flagright
      const userData = await flagrightClient.getUser(userId);
      
      // Get user risk score
      let riskScore = null;
      try {
        const riskData = await flagrightClient.getUserRiskScore(userId);
        riskScore = riskData.riskScore;
      } catch (err) {
        console.log(`⚠️  No risk score available for user ${userId}`);
      }

      // Create/update user in Neo4j
      await session.run(
        `
        MERGE (u:User {userId: $userId})
        SET u.name = $name,
            u.email = $email,
            u.phone = $phone,
            u.address = $address,
            u.createdAt = $createdAt,
            u.riskScore = $riskScore,
            u.kycStatus = $kycStatus
        RETURN u
        `,
        {
          userId: userData.userId || userId,
          name: userData.name || 'Unknown',
          email: userData.email || null,
          phone: userData.phone || null,
          address: userData.address || null,
          createdAt: userData.createdAt || new Date().toISOString(),
          riskScore: riskScore,
          kycStatus: userData.kycStatus || 'PENDING'
        }
      );

      syncedCount++;
      if (syncedCount % 10 === 0) {
        console.log(`✅ Synced ${syncedCount}/${userIds.length} users...`);
      }

    } catch (error) {
      errorCount++;
      console.error(`❌ Error syncing user ${userId}:`, error.message);
    }
  }

  await session.close();
  console.log(`\n✅ User sync complete: ${syncedCount} synced, ${errorCount} errors\n`);
  return { syncedCount, errorCount };
}

/**
 * Sync transactions from Flagright to Neo4j
 */
async function syncTransactions(transactionIds) {
  const session = driver.session();
  let syncedCount = 0;
  let errorCount = 0;

  console.log(`\n🔄 Syncing ${transactionIds.length} transactions from Flagright to Neo4j...`);

  for (const transactionId of transactionIds) {
    try {
      // Fetch transaction from Flagright
      const txData = await flagrightClient.getTransaction(transactionId);
      
      // Get transaction risk score
      let riskScore = null;
      let riskLevel = null;
      try {
        const riskData = await flagrightClient.getTransactionRiskScore(transactionId);
        riskScore = riskData.riskScore;
        riskLevel = riskData.riskLevel;
      } catch (err) {
        console.log(`⚠️  No risk score available for transaction ${transactionId}`);
      }

      // Create transaction and relationship to user in Neo4j
      await session.run(
        `
        MATCH (u:User {userId: $originUserId})
        MERGE (t:Transaction {transactionId: $transactionId})
        SET t.amount = $amount,
            t.currency = $currency,
            t.type = $type,
            t.status = $status,
            t.timestamp = $timestamp,
            t.riskScore = $riskScore,
            t.riskLevel = $riskLevel,
            t.originIp = $originIp,
            t.deviceId = $deviceId
        MERGE (u)-[:MADE_TRANSACTION]->(t)
        RETURN t
        `,
        {
          transactionId: txData.transactionId || transactionId,
          originUserId: txData.originUserId,
          amount: txData.amount || 0,
          currency: txData.currency || 'USD',
          type: txData.type || 'TRANSFER',
          status: txData.status || 'COMPLETED',
          timestamp: txData.timestamp || new Date().toISOString(),
          riskScore: riskScore,
          riskLevel: riskLevel,
          originIp: txData.originDeviceData?.ipAddress || null,
          deviceId: txData.originDeviceData?.deviceId || null
        }
      );

      // If there's a destination user, create relationship
      if (txData.destinationUserId) {
        await session.run(
          `
          MATCH (t:Transaction {transactionId: $transactionId})
          MATCH (u:User {userId: $destinationUserId})
          MERGE (t)-[:TO_USER]->(u)
          `,
          {
            transactionId: txData.transactionId || transactionId,
            destinationUserId: txData.destinationUserId
          }
        );
      }

      syncedCount++;
      if (syncedCount % 10 === 0) {
        console.log(`✅ Synced ${syncedCount}/${transactionIds.length} transactions...`);
      }

    } catch (error) {
      errorCount++;
      console.error(`❌ Error syncing transaction ${transactionId}:`, error.message);
    }
  }

  await session.close();
  console.log(`\n✅ Transaction sync complete: ${syncedCount} synced, ${errorCount} errors\n`);
  return { syncedCount, errorCount };
}

/**
 * Sync relationships detected by Flagright
 */
async function syncLinkedEntities(userId) {
  const session = driver.session();
  let relationshipCount = 0;

  try {
    console.log(`\n🔄 Syncing linked entities for user ${userId}...`);
    
    const linkedData = await flagrightClient.getLinkedEntities(userId);
    
    // Process linked users
    if (linkedData.linkedUsers) {
      for (const linkedUser of linkedData.linkedUsers) {
        const relationshipType = linkedUser.linkType || 'LINKED_TO';
        
        await session.run(
          `
          MATCH (u1:User {userId: $userId})
          MATCH (u2:User {userId: $linkedUserId})
          MERGE (u1)-[r:${relationshipType}]->(u2)
          SET r.reason = $reason,
              r.confidence = $confidence
          `,
          {
            userId: userId,
            linkedUserId: linkedUser.userId,
            reason: linkedUser.reason || 'FLAGRIGHT_DETECTION',
            confidence: linkedUser.confidence || 0.5
          }
        );
        relationshipCount++;
      }
    }

    console.log(`✅ Created ${relationshipCount} relationships for user ${userId}\n`);

  } catch (error) {
    console.error(`❌ Error syncing linked entities for user ${userId}:`, error.message);
  }

  await session.close();
  return relationshipCount;
}

/**
 * Main sync function
 */
async function syncFlagrightToNeo4j(config) {
  const startTime = Date.now();
  
  console.log('\n🚀 Starting Flagright to Neo4j sync...\n');
  console.log('Configuration:', JSON.stringify(config, null, 2));

  try {
    // Sync users
    if (config.userIds && config.userIds.length > 0) {
      await syncUsers(config.userIds);
    }

    // Sync transactions
    if (config.transactionIds && config.transactionIds.length > 0) {
      await syncTransactions(config.transactionIds);
    }

    // Sync linked entities (relationships)
    if (config.detectRelationships && config.userIds) {
      for (const userId of config.userIds) {
        await syncLinkedEntities(userId);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Sync completed in ${duration}s\n`);

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    throw error;
  } finally {
    await driver.close();
  }
}

// If run directly from command line
if (require.main === module) {
  const config = {
    userIds: process.env.USER_IDS ? process.env.USER_IDS.split(',') : [],
    transactionIds: process.env.TRANSACTION_IDS ? process.env.TRANSACTION_IDS.split(',') : [],
    detectRelationships: process.env.DETECT_RELATIONSHIPS !== 'false'
  };

  syncFlagrightToNeo4j(config)
    .then(() => {
      console.log('✅ Sync script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Sync script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  syncUsers,
  syncTransactions,
  syncLinkedEntities,
  syncFlagrightToNeo4j
};
