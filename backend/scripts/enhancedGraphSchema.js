const neo4j = require('neo4j-driver');

/**
 * Enhanced Graph Database Schema for Fraud Detection
 * 
 * NODES:
 * - User: Individual users with attributes (id, name, email, phone, address)
 * - Transaction: Financial transactions with metadata (id, amount, timestamp, ipAddress, deviceId)
 * - Device: Shared devices used across transactions
 * - IPAddress: IP addresses used in transactions
 * - Email: Email domains for user clustering
 * - Phone: Phone number prefixes for user clustering
 * - Address: Physical addresses for user clustering
 * 
 * RELATIONSHIPS:
 * User ↔ User:
 * - SENT_MONEY_TO: Direct money transfer
 * - RECEIVED_MONEY_FROM: Direct money receipt
 * - SHARES_EMAIL: Same email domain
 * - SHARES_PHONE: Same phone prefix
 * - SHARES_ADDRESS: Same physical address
 * - FAMILY_MEMBER: Family relationship
 * - BUSINESS_PARTNER: Business relationship
 * 
 * User ↔ Transaction:
 * - MADE_TRANSACTION: User initiated transaction
 * - RECEIVED_TRANSACTION: User received transaction
 * 
 * Transaction ↔ Transaction:
 * - SAME_IP: Transactions from same IP address
 * - SAME_DEVICE: Transactions from same device
 * - TEMPORAL_LINK: Transactions within time window
 * - AMOUNT_PATTERN: Similar transaction amounts
 * 
 * User ↔ Shared Entities:
 * - HAS_EMAIL: User has email domain
 * - HAS_PHONE: User has phone prefix  
 * - HAS_ADDRESS: User has address
 * - USES_DEVICE: User uses device
 * - USES_IP: User uses IP address
 * 
 * Transaction ↔ Shared Entities:
 * - USED_IP: Transaction used IP
 * - USED_DEVICE: Transaction used device
 */

class EnhancedGraphSchema {
  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password123'
      )
    );
  }

  async createSchema() {
    const session = this.driver.session();
    
    try {
      console.log('🏗️  Creating Enhanced Graph Database Schema...');
      
      // Create constraints and indexes
      await this.createConstraintsAndIndexes(session);
      
      // Create shared entity nodes
      await this.createSharedEntityNodes(session);
      
      // Enhance existing relationships
      await this.enhanceUserUserRelationships(session);
      await this.createTransactionTransactionRelationships(session);
      await this.createSharedEntityRelationships(session);
      
      console.log('✅ Enhanced graph schema created successfully!');
      
    } catch (error) {
      console.error('❌ Error creating schema:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async createConstraintsAndIndexes(session) {
    console.log('📋 Creating constraints and indexes...');
    
    const commands = [
      // Device constraints and indexes
      "CREATE CONSTRAINT device_id_unique IF NOT EXISTS FOR (d:Device) REQUIRE d.id IS UNIQUE",
      "CREATE INDEX device_type_idx IF NOT EXISTS FOR (d:Device) ON (d.type)",
      
      // IP Address constraints and indexes
      "CREATE CONSTRAINT ip_address_unique IF NOT EXISTS FOR (ip:IPAddress) REQUIRE ip.address IS UNIQUE",
      "CREATE INDEX ip_country_idx IF NOT EXISTS FOR (ip:IPAddress) ON (ip.country)",
      
      // Email domain constraints and indexes
      "CREATE CONSTRAINT email_domain_unique IF NOT EXISTS FOR (e:EmailDomain) REQUIRE e.domain IS UNIQUE",
      
      // Phone prefix constraints and indexes
      "CREATE CONSTRAINT phone_prefix_unique IF NOT EXISTS FOR (p:PhonePrefix) REQUIRE p.prefix IS UNIQUE",
      
      // Address constraints and indexes
      "CREATE CONSTRAINT address_id_unique IF NOT EXISTS FOR (a:Address) REQUIRE a.id IS UNIQUE",
      "CREATE INDEX address_city_idx IF NOT EXISTS FOR (a:Address) ON (a.city)",
      
      // Enhanced transaction indexes for pattern detection
      "CREATE INDEX transaction_amount_idx IF NOT EXISTS FOR (t:Transaction) ON (t.amount)",
      "CREATE INDEX transaction_timestamp_idx IF NOT EXISTS FOR (t:Transaction) ON (t.timestamp)",
      "CREATE INDEX transaction_type_idx IF NOT EXISTS FOR (t:Transaction) ON (t.type)"
    ];
    
    for (const command of commands) {
      try {
        await session.run(command);
        console.log(`✅ ${command.split(' ')[1]} ${command.split(' ')[2]} created`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.warn(`⚠️  ${command}: ${error.message}`);
        }
      }
    }
  }

  async createSharedEntityNodes(session) {
    console.log('🔗 Creating shared entity nodes...');
    
    // Create Device nodes from existing transaction data
    await session.run(`
      MATCH (t:Transaction)
      WHERE t.deviceId IS NOT NULL
      WITH DISTINCT t.deviceId as deviceId
      MERGE (d:Device {id: deviceId})
      SET d.type = CASE 
        WHEN deviceId CONTAINS 'mobile' THEN 'mobile'
        WHEN deviceId CONTAINS 'desktop' THEN 'desktop'
        WHEN deviceId CONTAINS 'tablet' THEN 'tablet'
        ELSE 'unknown'
      END
      RETURN count(d) as devicesCreated
    `);
    
    // Create IPAddress nodes from existing transaction data
    await session.run(`
      MATCH (t:Transaction)
      WHERE t.ipAddress IS NOT NULL
      WITH DISTINCT t.ipAddress as ipAddr
      MERGE (ip:IPAddress {address: ipAddr})
      SET ip.country = CASE 
        WHEN ipAddr STARTS WITH '192.168' THEN 'Local'
        WHEN ipAddr STARTS WITH '10.' THEN 'Private'
        ELSE 'Unknown'
      END,
      ip.isPrivate = ipAddr STARTS WITH '192.168' OR ipAddr STARTS WITH '10.'
      RETURN count(ip) as ipsCreated
    `);
    
    // Create EmailDomain nodes from existing user data
    await session.run(`
      MATCH (u:User)
      WHERE u.email IS NOT NULL
      WITH DISTINCT split(u.email, '@')[1] as domain
      MERGE (e:EmailDomain {domain: domain})
      SET e.isCommon = domain IN ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']
      RETURN count(e) as domainsCreated
    `);
    
    // Create PhonePrefix nodes from existing user data
    await session.run(`
      MATCH (u:User)
      WHERE u.phone IS NOT NULL
      WITH DISTINCT substring(u.phone, 0, 3) as prefix
      MERGE (p:PhonePrefix {prefix: prefix})
      RETURN count(p) as prefixesCreated
    `);
    
    // Create Address nodes from existing user data
    await session.run(`
      MATCH (u:User)
      WHERE u.address IS NOT NULL
      WITH DISTINCT u.address as addr, u
      MERGE (a:Address {id: replace(addr, ' ', '_')})
      SET a.fullAddress = addr,
          a.city = split(addr, ',')[0],
          a.isResidential = true
      RETURN count(DISTINCT a) as addressesCreated
    `);
    
    console.log('✅ Shared entity nodes created');
  }

  async enhanceUserUserRelationships(session) {
    console.log('👥 Enhancing user-user relationships...');
    
    // Add family member relationships (based on shared address and similar names)
    await session.run(`
      MATCH (u1:User), (u2:User)
      WHERE u1.id <> u2.id 
        AND u1.address = u2.address
        AND (
          u1.name CONTAINS split(u2.name, ' ')[1] OR
          u2.name CONTAINS split(u1.name, ' ')[1]
        )
      MERGE (u1)-[r:FAMILY_MEMBER]-(u2)
      SET r.relationship = 'address_name_match',
          r.confidence = 0.8
      RETURN count(r) as familyLinks
    `);
    
    // Add business partner relationships (based on high transaction volume)
    await session.run(`
      MATCH (u1:User)-[:SENT_MONEY_TO]-(u2:User)
      WITH u1, u2, count(*) as txCount
      WHERE txCount >= 5
      MERGE (u1)-[r:BUSINESS_PARTNER]-(u2)
      SET r.transactionCount = txCount,
          r.confidence = CASE 
            WHEN txCount >= 10 THEN 0.9
            WHEN txCount >= 7 THEN 0.7
            ELSE 0.5
          END
      RETURN count(r) as businessLinks
    `);
    
    console.log('✅ Enhanced user-user relationships created');
  }

  async createTransactionTransactionRelationships(session) {
    console.log('💰 Creating transaction-transaction relationships...');
    
    // Create SAME_IP relationships
    await session.run(`
      MATCH (t1:Transaction), (t2:Transaction)
      WHERE t1.id <> t2.id 
        AND t1.ipAddress = t2.ipAddress
        AND t1.ipAddress IS NOT NULL
      WITH t1, t2
      LIMIT 50000
      MERGE (t1)-[r:SAME_IP]-(t2)
      SET r.ipAddress = t1.ipAddress
      RETURN count(r) as sameIpLinks
    `);
    
    // Create SAME_DEVICE relationships
    await session.run(`
      MATCH (t1:Transaction), (t2:Transaction)
      WHERE t1.id <> t2.id 
        AND t1.deviceId = t2.deviceId
        AND t1.deviceId IS NOT NULL
      WITH t1, t2
      LIMIT 50000
      MERGE (t1)-[r:SAME_DEVICE]-(t2)
      SET r.deviceId = t1.deviceId
      RETURN count(r) as sameDeviceLinks
    `);
    
    // Create TEMPORAL_LINK relationships (transactions within 1 hour)
    await session.run(`
      MATCH (t1:Transaction), (t2:Transaction)
      WHERE t1.id <> t2.id 
        AND abs(duration.between(t1.timestamp, t2.timestamp).seconds) < 3600
      WITH t1, t2, abs(duration.between(t1.timestamp, t2.timestamp).seconds) as timeDiff
      WHERE timeDiff > 0
      LIMIT 30000
      MERGE (t1)-[r:TEMPORAL_LINK]-(t2)
      SET r.timeDifferenceSeconds = timeDiff,
          r.confidence = 1.0 - (timeDiff / 3600.0)
      RETURN count(r) as temporalLinks
    `);
    
    // Create AMOUNT_PATTERN relationships (similar amounts within 10%)
    await session.run(`
      MATCH (t1:Transaction), (t2:Transaction)
      WHERE t1.id <> t2.id 
        AND abs(t1.amount - t2.amount) / t1.amount < 0.1
        AND t1.amount > 1000
      WITH t1, t2, abs(t1.amount - t2.amount) as amountDiff
      LIMIT 20000
      MERGE (t1)-[r:AMOUNT_PATTERN]-(t2)
      SET r.amountDifference = amountDiff,
          r.similarity = 1.0 - (amountDiff / t1.amount)
      RETURN count(r) as amountPatternLinks
    `);
    
    console.log('✅ Transaction-transaction relationships created');
  }

  async createSharedEntityRelationships(session) {
    console.log('🔗 Creating shared entity relationships...');
    
    // Link users to email domains
    await session.run(`
      MATCH (u:User), (e:EmailDomain)
      WHERE u.email CONTAINS e.domain
      MERGE (u)-[r:HAS_EMAIL]->(e)
      RETURN count(r) as userEmailLinks
    `);
    
    // Link users to phone prefixes
    await session.run(`
      MATCH (u:User), (p:PhonePrefix)
      WHERE u.phone STARTS WITH p.prefix
      MERGE (u)-[r:HAS_PHONE]->(p)
      RETURN count(r) as userPhoneLinks
    `);
    
    // Link users to addresses
    await session.run(`
      MATCH (u:User), (a:Address)
      WHERE replace(u.address, ' ', '_') = a.id
      MERGE (u)-[r:HAS_ADDRESS]->(a)
      RETURN count(r) as userAddressLinks
    `);
    
    // Link transactions to IP addresses
    await session.run(`
      MATCH (t:Transaction), (ip:IPAddress)
      WHERE t.ipAddress = ip.address
      MERGE (t)-[r:USED_IP]->(ip)
      RETURN count(r) as transactionIpLinks
    `);
    
    // Link transactions to devices
    await session.run(`
      MATCH (t:Transaction), (d:Device)
      WHERE t.deviceId = d.id
      MERGE (t)-[r:USED_DEVICE]->(d)
      RETURN count(r) as transactionDeviceLinks
    `);
    
    // Link users to devices (through transactions)
    await session.run(`
      MATCH (u:User)-[:MADE_TRANSACTION]->(t:Transaction)-[:USED_DEVICE]->(d:Device)
      MERGE (u)-[r:USES_DEVICE]->(d)
      ON CREATE SET r.firstUsed = t.timestamp, r.transactionCount = 1
      ON MATCH SET r.transactionCount = r.transactionCount + 1
      RETURN count(DISTINCT r) as userDeviceLinks
    `);
    
    // Link users to IP addresses (through transactions)
    await session.run(`
      MATCH (u:User)-[:MADE_TRANSACTION]->(t:Transaction)-[:USED_IP]->(ip:IPAddress)
      MERGE (u)-[r:USES_IP]->(ip)
      ON CREATE SET r.firstUsed = t.timestamp, r.transactionCount = 1
      ON MATCH SET r.transactionCount = r.transactionCount + 1
      RETURN count(DISTINCT r) as userIpLinks
    `);
    
    console.log('✅ Shared entity relationships created');
  }

  async getSchemaStats() {
    const session = this.driver.session();
    
    try {
      // Get node counts
      const nodeResult = await session.run(`
        MATCH (n)
        RETURN labels(n)[0] as nodeType, count(*) as count
        ORDER BY count DESC
      `);
      
      console.log('\n📊 NODE STATISTICS:');
      nodeResult.records.forEach(record => {
        console.log(`   ${record.get('nodeType')}: ${record.get('count').toNumber()}`);
      });
      
      // Get relationship counts
      const relResult = await session.run(`
        MATCH ()-[r]-()
        RETURN type(r) as relType, count(*) as count
        ORDER BY count DESC
      `);
      
      console.log('\n🔗 RELATIONSHIP STATISTICS:');
      relResult.records.forEach(record => {
        console.log(`   ${record.get('relType')}: ${record.get('count').toNumber()}`);
      });
      
    } finally {
      await session.close();
    }
  }

  async close() {
    await this.driver.close();
  }
}

module.exports = EnhancedGraphSchema;

// Run if called directly
if (require.main === module) {
  const schema = new EnhancedGraphSchema();
  
  schema.createSchema()
    .then(() => schema.getSchemaStats())
    .then(() => schema.close())
    .catch(error => {
      console.error('❌ Schema creation failed:', error);
      process.exit(1);
    });
}