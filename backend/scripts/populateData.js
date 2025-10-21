const { faker } = require('@faker-js/faker');
const { driver } = require('../config/database');

const NUM_USERS = 100; // Scaled users for 100K transactions
const NUM_TRANSACTIONS = 100000; // Full scale dataset for fraud detection demo
const BATCH_SIZE = 5000; // Increased for performance with large dataset

// REALISTIC fraud patterns: Only 10-15% of users should have shared attributes
const FRAUD_PROBABILITY = 0.12; // 12% of users will have shared attributes (realistic fraud rate)

// Small sets of shared attributes for realistic fraud rings
const SHARED_EMAILS = [
  'fraud.ring1@example.com',
  'suspicious.group@example.com', 
  'fake.account@example.com',
  'money.launder@example.com',
  'identity.theft@example.com'
];

const SHARED_PHONES = [
  '+1-555-FRAUD',
  '+1-555-SCAM1', 
  '+1-555-SCAM2',
  '+1-555-THEFT',
  '+1-555-WASH1'
];

const SHARED_ADDRESSES = [
  '123 Fraud Street, Scamcity, SC 12345',
  '456 Suspicious Ave, Alertville, AL 67890',
  '789 Identity Road, Theftville, TV 11111'
];

const SHARED_IPS = [
  '192.168.1.100', // Fraud ring IP
  '10.0.0.50',     // Money laundering group
  '172.16.0.10',   // Identity theft ring
  '203.0.113.1'    // Suspicious activity cluster
];

const SHARED_DEVICES = [
  'device-fraud-001',
  'device-scam-002', 
  'device-theft-003',
  'device-wash-004'
];

// Generate fake user data with REALISTIC fraud patterns
function generateUser(index) {
  const userId = `user-${index}`;
  
  // Most users get unique, realistic attributes
  let email = faker.internet.email();
  let phone = faker.phone.number();
  let address = `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()} ${faker.location.zipCode()}`;
  
  // Only a small percentage of users are in fraud rings (realistic)
  if (Math.random() < FRAUD_PROBABILITY) {
    // This user is part of a fraud ring - assign shared attributes
    const fraudRingIndex = Math.floor(Math.random() * SHARED_EMAILS.length);
    
    // 50% chance to share email, 30% phone, 20% address
    if (Math.random() < 0.5) {
      email = SHARED_EMAILS[fraudRingIndex];
    }
    if (Math.random() < 0.3) {
      phone = SHARED_PHONES[fraudRingIndex];
    }
    if (Math.random() < 0.2) {
      address = SHARED_ADDRESSES[fraudRingIndex % SHARED_ADDRESSES.length];
    }
  }

  return {
    id: userId,
    name: faker.person.fullName(),
    email: email,
    phone: phone,
    address: address,
    country: faker.location.country()
  };
}

// Generate fake transaction data with REALISTIC fraud patterns
function generateTransaction(userId, index, allUserIds) {
  const types = ['purchase', 'transfer', 'withdrawal', 'deposit', 'payment'];
  const statuses = ['completed', 'pending', 'failed', 'cancelled'];
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY'];

  // All transactions get unique IP and device (no IP-based relationships)
  let ipAddress = faker.internet.ip();
  let deviceId = `device-${faker.string.alphanumeric(8)}`;

  const transactionType = faker.helpers.arrayElement(types);
  let recipientUserId = null;
  
  // For transfer and payment transactions, add a recipient
  if ((transactionType === 'transfer' || transactionType === 'payment') && Math.random() < 0.7) {
    // 70% of transfers/payments have recipients
    recipientUserId = faker.helpers.arrayElement(allUserIds.filter(id => id !== userId));
  }

  return {
    id: `tx-${index}`,
    userId: userId,
    recipientUserId: recipientUserId,
    amount: parseFloat(faker.finance.amount(10, 10000, 2)),
    currency: faker.helpers.arrayElement(currencies),
    type: transactionType,
    status: faker.helpers.arrayElement(statuses),
    ipAddress: ipAddress,
    deviceId: deviceId,
    timestamp: faker.date.recent({ days: 365 }).toISOString(),
    metadata: JSON.stringify({
      location: faker.location.city(),
      merchant: faker.company.name(),
      category: faker.commerce.department()
    })
  };
}

// Create users in batches
async function createUsers(session) {
  console.log(`Creating ${NUM_USERS} users...`);
  const users = [];

  for (let i = 0; i < NUM_USERS; i++) {
    users.push(generateUser(i));

    if (users.length >= BATCH_SIZE || i === NUM_USERS - 1) {
      await session.run(
        `
        UNWIND $users AS user
        CREATE (u:User)
        SET u = user,
            u.createdAt = datetime(),
            u.updatedAt = datetime()
        `,
        { users }
      );
      
      console.log(`Created ${Math.min((Math.floor(i / BATCH_SIZE) + 1) * BATCH_SIZE, NUM_USERS)} users`);
      users.length = 0; // Clear array
    }
  }

  // Get all user IDs
  const result = await session.run(`MATCH (u:User) RETURN u.id as id`);
  return result.records.map(record => record.get('id'));
}

// Create transactions in batches
async function createTransactions(session, userIds) {
  console.log(`Creating ${NUM_TRANSACTIONS} transactions...`);
  const transactions = [];

  for (let i = 0; i < NUM_TRANSACTIONS; i++) {
    const userId = faker.helpers.arrayElement(userIds);
    transactions.push(generateTransaction(userId, i, userIds));

    if (transactions.length >= BATCH_SIZE || i === NUM_TRANSACTIONS - 1) {
      await session.run(
        `
        UNWIND $transactions AS transaction
        CREATE (t:Transaction)
        SET t = transaction,
            t.createdAt = datetime(),
            t.updatedAt = datetime()
        `,
        { transactions }
      );

      console.log(`Created ${Math.min((Math.floor(i / BATCH_SIZE) + 1) * BATCH_SIZE, NUM_TRANSACTIONS)} transactions`);
      transactions.length = 0; // Clear array
    }
  }
}

// Link users to transactions
async function linkUsersToTransactions(session) {
  console.log('Linking users to transactions...');
  
  // Link users to their outgoing transactions
  await session.run(`
    MATCH (u:User)
    MATCH (t:Transaction)
    WHERE u.id = t.userId
    MERGE (u)-[r:MADE_TRANSACTION]->(t)
    SET r.timestamp = t.timestamp
  `);

  // Link users to incoming transactions (when they are recipients)
  await session.run(`
    MATCH (u:User)
    MATCH (t:Transaction)
    WHERE u.id = t.recipientUserId AND t.recipientUserId IS NOT NULL
    MERGE (u)-[r:RECEIVED_TRANSACTION]->(t)
    SET r.timestamp = t.timestamp
  `);

  // Create direct user-to-user relationships for money transfers
  await session.run(`
    MATCH (sender:User)-[:MADE_TRANSACTION]->(t:Transaction)
    MATCH (recipient:User)-[:RECEIVED_TRANSACTION]->(t)
    WHERE t.type IN ['transfer', 'payment'] AND t.status = 'completed'
    MERGE (sender)-[r:SENT_MONEY_TO]->(recipient)
    SET r.amount = t.amount, 
        r.currency = t.currency, 
        r.timestamp = t.timestamp,
        r.transactionId = t.id
    MERGE (recipient)-[r2:RECEIVED_MONEY_FROM]->(sender)
    SET r2.amount = t.amount, 
        r2.currency = t.currency, 
        r2.timestamp = t.timestamp,
        r2.transactionId = t.id
  `);

  console.log('Users linked to transactions and direct money transfers created');
}

// Create relationships based on shared attributes
async function createRelationships(session) {
  console.log('Detecting and creating relationships...');

  // User relationships - same email
  await session.run(`
    MATCH (u1:User), (u2:User)
    WHERE u1.id < u2.id AND u1.email = u2.email
    MERGE (u1)-[r:SHARES_EMAIL]->(u2)
    SET r.attribute = 'email'
  `);
  console.log('✅ Created email relationships');

  // User relationships - same phone
  await session.run(`
    MATCH (u1:User), (u2:User)
    WHERE u1.id < u2.id 
      AND u1.phone = u2.phone 
      AND u1.phone IS NOT NULL
    MERGE (u1)-[r:SHARES_PHONE]->(u2)
    SET r.attribute = 'phone'
  `);
  console.log('✅ Created phone relationships');

  // User relationships - same address
  await session.run(`
    MATCH (u1:User), (u2:User)
    WHERE u1.id < u2.id 
      AND u1.address = u2.address 
      AND u1.address IS NOT NULL
    MERGE (u1)-[r:SHARES_ADDRESS]->(u2)
    SET r.attribute = 'address'
  `);
  console.log('✅ Created address relationships');
  
  console.log('✅ Skipping IP and device relationships (not creating any)');
}

// Main population function
async function populateDatabase() {
  const session = driver.session();
  
  try {
    console.log('🚀 Starting database population...\n');

    // Clear existing data
    console.log('Clearing existing data...');
    await session.run(`MATCH (n) DETACH DELETE n`);
    console.log('✅ Database cleared\n');

    // Create users
    const userIds = await createUsers(session);
    console.log(`✅ Created ${userIds.length} users\n`);

    // Create transactions
    await createTransactions(session, userIds);
    console.log(`✅ Created transactions\n`);

    // Link users to transactions
    await linkUsersToTransactions(session);

    // Create relationships
    await createRelationships(session);

    // Get statistics
    const userCount = await session.run(`MATCH (u:User) RETURN count(u) as count`);
    const transactionCount = await session.run(`MATCH (t:Transaction) RETURN count(t) as count`);
    const relationshipCount = await session.run(`MATCH ()-[r]->() RETURN count(r) as count`);

    console.log('\nDatabase Statistics:');
    console.log(`   Users: ${userCount.records[0].get('count').toNumber()}`);
    console.log(`   Transactions: ${transactionCount.records[0].get('count').toNumber()}`);
    console.log(`   Relationships: ${relationshipCount.records[0].get('count').toNumber()}`);
    
    console.log('\n✅ Database populated successfully!');
  } catch (error) {
    console.error('❌ Error populating database:', error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

// Run the population script
populateDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
