const express = require('express');
const router = express.Router();
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password123'
  )
);

/**
 * Flagright Webhook Handler
 * Receives real-time events from Flagright and syncs to Neo4j
 */
router.post('/flagright', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    console.log(`📥 Received Flagright webhook: ${event}`);

    switch (event) {
      case 'USER_CREATED':
      case 'USER_UPDATED':
        await handleUserEvent(data);
        break;

      case 'TRANSACTION_CREATED':
      case 'TRANSACTION_UPDATED':
        await handleTransactionEvent(data);
        break;

      case 'ALERT_CREATED':
        await handleAlertEvent(data);
        break;

      case 'RISK_SCORE_UPDATED':
        await handleRiskScoreEvent(data);
        break;

      case 'LINKED_ENTITIES_DETECTED':
        await handleLinkedEntitiesEvent(data);
        break;

      default:
        console.log(`⚠️  Unknown event type: ${event}`);
    }

    res.status(200).json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Handle user creation/update events
 */
async function handleUserEvent(userData) {
  const session = driver.session();
  
  try {
    await session.run(
      `
      MERGE (u:User {userId: $userId})
      SET u.name = $name,
          u.email = $email,
          u.phone = $phone,
          u.address = $address,
          u.createdAt = $createdAt,
          u.kycStatus = $kycStatus,
          u.riskScore = $riskScore,
          u.updatedAt = $updatedAt
      RETURN u
      `,
      {
        userId: userData.userId,
        name: userData.name || 'Unknown',
        email: userData.email || null,
        phone: userData.phone || null,
        address: userData.address || null,
        createdAt: userData.createdAt || new Date().toISOString(),
        kycStatus: userData.kycStatus || 'PENDING',
        riskScore: userData.riskScore || null,
        updatedAt: new Date().toISOString()
      }
    );

    console.log(`✅ User ${userData.userId} synced to Neo4j`);

  } catch (error) {
    console.error('❌ Error handling user event:', error);
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Handle transaction creation/update events
 */
async function handleTransactionEvent(txData) {
  const session = driver.session();
  
  try {
    // Create transaction and link to origin user
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
          t.deviceId = $deviceId,
          t.updatedAt = $updatedAt
      MERGE (u)-[:MADE_TRANSACTION]->(t)
      RETURN t
      `,
      {
        transactionId: txData.transactionId,
        originUserId: txData.originUserId,
        amount: txData.amount || 0,
        currency: txData.currency || 'USD',
        type: txData.type || 'TRANSFER',
        status: txData.status || 'COMPLETED',
        timestamp: txData.timestamp || new Date().toISOString(),
        riskScore: txData.riskScore || null,
        riskLevel: txData.riskLevel || null,
        originIp: txData.originDeviceData?.ipAddress || null,
        deviceId: txData.originDeviceData?.deviceId || null,
        updatedAt: new Date().toISOString()
      }
    );

    // Link to destination user if exists
    if (txData.destinationUserId) {
      await session.run(
        `
        MATCH (t:Transaction {transactionId: $transactionId})
        MATCH (u:User {userId: $destinationUserId})
        MERGE (t)-[:TO_USER]->(u)
        `,
        {
          transactionId: txData.transactionId,
          destinationUserId: txData.destinationUserId
        }
      );
    }

    console.log(`✅ Transaction ${txData.transactionId} synced to Neo4j`);

  } catch (error) {
    console.error('❌ Error handling transaction event:', error);
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Handle alert creation events
 */
async function handleAlertEvent(alertData) {
  const session = driver.session();
  
  try {
    await session.run(
      `
      MERGE (a:Alert {alertId: $alertId})
      SET a.type = $type,
          a.severity = $severity,
          a.message = $message,
          a.userId = $userId,
          a.transactionId = $transactionId,
          a.createdAt = $createdAt
      WITH a
      OPTIONAL MATCH (u:User {userId: $userId})
      OPTIONAL MATCH (t:Transaction {transactionId: $transactionId})
      FOREACH (user IN CASE WHEN u IS NOT NULL THEN [u] ELSE [] END |
        MERGE (user)-[:HAS_ALERT]->(a)
      )
      FOREACH (txn IN CASE WHEN t IS NOT NULL THEN [t] ELSE [] END |
        MERGE (txn)-[:HAS_ALERT]->(a)
      )
      RETURN a
      `,
      {
        alertId: alertData.alertId,
        type: alertData.type || 'UNKNOWN',
        severity: alertData.severity || 'MEDIUM',
        message: alertData.message || '',
        userId: alertData.userId || null,
        transactionId: alertData.transactionId || null,
        createdAt: alertData.createdAt || new Date().toISOString()
      }
    );

    console.log(`✅ Alert ${alertData.alertId} synced to Neo4j`);

  } catch (error) {
    console.error('❌ Error handling alert event:', error);
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Handle risk score updates
 */
async function handleRiskScoreEvent(riskData) {
  const session = driver.session();
  
  try {
    if (riskData.userId) {
      await session.run(
        `
        MATCH (u:User {userId: $userId})
        SET u.riskScore = $riskScore,
            u.riskLevel = $riskLevel,
            u.riskUpdatedAt = $updatedAt
        RETURN u
        `,
        {
          userId: riskData.userId,
          riskScore: riskData.riskScore,
          riskLevel: riskData.riskLevel,
          updatedAt: new Date().toISOString()
        }
      );
      console.log(`✅ User ${riskData.userId} risk score updated`);
    }

    if (riskData.transactionId) {
      await session.run(
        `
        MATCH (t:Transaction {transactionId: $transactionId})
        SET t.riskScore = $riskScore,
            t.riskLevel = $riskLevel,
            t.riskUpdatedAt = $updatedAt
        RETURN t
        `,
        {
          transactionId: riskData.transactionId,
          riskScore: riskData.riskScore,
          riskLevel: riskData.riskLevel,
          updatedAt: new Date().toISOString()
        }
      );
      console.log(`✅ Transaction ${riskData.transactionId} risk score updated`);
    }

  } catch (error) {
    console.error('❌ Error handling risk score event:', error);
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Handle linked entities detection
 */
async function handleLinkedEntitiesEvent(linkData) {
  const session = driver.session();
  
  try {
    const { userId, linkedEntities } = linkData;

    for (const linkedEntity of linkedEntities) {
      const relationshipType = linkedEntity.linkType || 'LINKED_TO';
      
      await session.run(
        `
        MATCH (u1:User {userId: $userId})
        MATCH (u2:User {userId: $linkedUserId})
        MERGE (u1)-[r:${relationshipType}]->(u2)
        SET r.reason = $reason,
            r.confidence = $confidence,
            r.detectedAt = $detectedAt
        RETURN r
        `,
        {
          userId: userId,
          linkedUserId: linkedEntity.userId,
          reason: linkedEntity.reason || 'FLAGRIGHT_DETECTION',
          confidence: linkedEntity.confidence || 0.5,
          detectedAt: new Date().toISOString()
        }
      );
    }

    console.log(`✅ Linked entities for user ${userId} synced to Neo4j`);

  } catch (error) {
    console.error('❌ Error handling linked entities event:', error);
    throw error;
  } finally {
    await session.close();
  }
}

module.exports = router;
