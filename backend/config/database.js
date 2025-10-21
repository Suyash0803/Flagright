const neo4j = require('neo4j-driver');
require('dotenv').config();

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password123'
  )
);

// Test connection
const testConnection = async () => {
  const session = driver.session();
  try {
    await session.run('RETURN 1');
    console.log('✅ Neo4j database connected successfully');
  } catch (error) {
    console.error('❌ Neo4j connection failed:', error.message);
  } finally {
    await session.close();
  }
};

// Initialize database constraints and indexes
const initializeDatabase = async () => {
  const session = driver.session();
  try {
    // Create constraints for unique identifiers
    await session.run(`
      CREATE CONSTRAINT user_id_unique IF NOT EXISTS
      FOR (u:User) REQUIRE u.id IS UNIQUE
    `);
    
    await session.run(`
      CREATE CONSTRAINT transaction_id_unique IF NOT EXISTS
      FOR (t:Transaction) REQUIRE t.id IS UNIQUE
    `);

    // Create indexes for faster lookups
    await session.run(`
      CREATE INDEX user_email IF NOT EXISTS
      FOR (u:User) ON (u.email)
    `);
    
    await session.run(`
      CREATE INDEX user_phone IF NOT EXISTS
      FOR (u:User) ON (u.phone)
    `);
    
    await session.run(`
      CREATE INDEX transaction_ip IF NOT EXISTS
      FOR (t:Transaction) ON (t.ipAddress)
    `);
    
    await session.run(`
      CREATE INDEX transaction_device IF NOT EXISTS
      FOR (t:Transaction) ON (t.deviceId)
    `);

    console.log('✅ Database indexes and constraints created');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  } finally {
    await session.close();
  }
};

module.exports = {
  driver,
  testConnection,
  initializeDatabase
};
