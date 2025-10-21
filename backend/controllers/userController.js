const { driver } = require('../config/database');

// Create or update user
exports.createOrUpdateUser = async (req, res) => {
  const session = driver.session();
  try {
    const { id, name, email, phone, address, country } = req.body;

    if (!id || !name || !email) {
      return res.status(400).json({ error: 'Missing required fields: id, name, email' });
    }

    const result = await session.run(
      `
      MERGE (u:User {id: $id})
      SET u.name = $name,
          u.email = $email,
          u.phone = $phone,
          u.address = $address,
          u.country = $country,
          u.updatedAt = datetime()
      ON CREATE SET u.createdAt = datetime()
      RETURN u
      `,
      { id, name, email, phone, address, country }
    );

    const user = result.records[0].get('u').properties;
    
    // Detect and create relationships after user creation
    await detectUserRelationships(session, id);

    res.status(201).json({ 
      message: 'User created/updated successfully',
      user 
    });
  } catch (error) {
    console.error('Error creating/updating user:', error);
    res.status(500).json({ error: 'Failed to create/update user', details: error.message });
  } finally {
    await session.close();
  }
};

// Get all users with pagination, search, filtering & sorting
exports.getAllUsers = async (req, res) => {
  const session = driver.session();
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      country = '',
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [];
    const params = { skip: skip, limit: parseInt(limit) };
    
    if (search) {
      whereConditions.push(`(u.name CONTAINS $search OR u.email CONTAINS $search OR u.phone CONTAINS $search)`);
      params.search = search;
    }
    if (country) {
      whereConditions.push(`u.country = $country`);
      params.country = country;
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    const orderBy = ['name', 'email', 'createdAt'].includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const result = await session.run(
      `
      MATCH (u:User)
      ${whereClause}
      RETURN u
      ORDER BY u.${orderBy} ${order}
      SKIP toInteger($skip)
      LIMIT toInteger($limit)
      `,
      params
    );

    const countResult = await session.run(
      `MATCH (u:User) ${whereClause} RETURN count(u) as total`,
      params
    );

    const users = result.records.map(record => {
      const user = record.get('u');
      const props = user.properties || {};
      return {
        id: props.id || `user-${user.identity.toNumber()}`,
        ...props
      };
    });
    const total = countResult.records[0] ? countResult.records[0].get('total').toNumber() : 0;

    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      },
      filters: { search, country }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  } finally {
    await session.close();
  }
};

// Search users
exports.searchUsers = async (req, res) => {
  const session = driver.session();
  try {
    const { query, limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const result = await session.run(
      `
      MATCH (u:User)
      WHERE u.name CONTAINS $query 
         OR u.email CONTAINS $query 
         OR u.phone CONTAINS $query
      RETURN u LIMIT toInteger($limit)
      `,
      { query, limit: parseInt(limit) }
    );

    const results = result.records.map(record => {
      const user = record.get('u');
      const props = user.properties || {};
      return {
        id: props.id || `user-${user.identity.toNumber()}`,
        ...props
      };
    });
    res.json({ results, count: results.length });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users', details: error.message });
  } finally {
    await session.close();
  }
};

// Export users to CSV
exports.exportUsersCSV = async (req, res) => {
  const session = driver.session();
  try {
    const { country = '' } = req.query;
    
    let whereClause = '';
    const params = {};
    
    if (country) {
      whereClause = 'WHERE u.country = $country';
      params.country = country;
    }
    
    const result = await session.run(
      `MATCH (u:User) ${whereClause} RETURN u ORDER BY u.createdAt DESC`,
      params
    );

    const users = result.records.map(record => {
      const user = record.get('u');
      const props = user.properties || {};
      return {
        id: props.id || `user-${user.identity.toNumber()}`,
        ...props
      };
    });
    
    // Build CSV header
    const headers = ['id', 'name', 'email', 'phone', 'address', 'country'];
    const csvHeader = headers.join(',');
    
    // Build CSV rows
    const csvRows = users.map(user => {
      return headers.map(header => {
        const value = user[header] || '';
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',');
    });
    
    const csv = [csvHeader, ...csvRows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({ error: 'Failed to export users', details: error.message });
  } finally {
    await session.close();
  }
};

// Export users to JSON
exports.exportUsersJSON = async (req, res) => {
  const session = driver.session();
  try {
    const { country = '' } = req.query;
    
    let whereClause = '';
    const params = {};
    
    if (country) {
      whereClause = 'WHERE u.country = $country';
      params.country = country;
    }
    
    const result = await session.run(
      `MATCH (u:User) ${whereClause} RETURN u ORDER BY u.createdAt DESC`,
      params
    );

    const users = result.records.map(record => {
      const user = record.get('u');
      const props = user.properties || {};
      return {
        id: props.id || `user-${user.identity.toNumber()}`,
        ...props
      };
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=users.json');
    res.json({ 
      exportDate: new Date().toISOString(),
      totalRecords: users.length,
      users 
    });
  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({ error: 'Failed to export users', details: error.message });
  } finally {
    await session.close();
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  const session = driver.session();
  try {
    const { id } = req.params;

    const result = await session.run(
      `MATCH (u:User {id: $id}) RETURN u`,
      { id }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.records[0].get('u').properties;
    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user', details: error.message });
  } finally {
    await session.close();
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  const session = driver.session();
  try {
    const { id } = req.params;

    await session.run(
      `MATCH (u:User {id: $id}) DETACH DELETE u`,
      { id }
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  } finally {
    await session.close();
  }
};

// Helper function to detect user relationships
async function detectUserRelationships(session, userId) {
  // Find users with same email
  await session.run(
    `
    MATCH (u1:User {id: $userId})
    MATCH (u2:User)
    WHERE u1.email = u2.email AND u1.id <> u2.id
    MERGE (u1)-[r:SHARES_EMAIL]->(u2)
    SET r.attribute = 'email'
    `,
    { userId }
  );

  // Find users with same phone
  await session.run(
    `
    MATCH (u1:User {id: $userId})
    MATCH (u2:User)
    WHERE u1.phone = u2.phone AND u1.id <> u2.id AND u1.phone IS NOT NULL
    MERGE (u1)-[r:SHARES_PHONE]->(u2)
    SET r.attribute = 'phone'
    `,
    { userId }
  );

  // Find users with same address
  await session.run(
    `
    MATCH (u1:User {id: $userId})
    MATCH (u2:User)
    WHERE u1.address = u2.address AND u1.id <> u2.id AND u1.address IS NOT NULL
    MERGE (u1)-[r:SHARES_ADDRESS]->(u2)
    SET r.attribute = 'address'
    `,
    { userId }
  );
}
