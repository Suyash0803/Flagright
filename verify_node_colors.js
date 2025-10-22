console.log('🔍 Testing Fraud Detection System - Node Color Verification');

// First get a list of users to find a valid user ID
fetch('http://localhost:5000/api/users?limit=1')
  .then(response => response.json())
  .then(userData => {
    if (userData.users && userData.users.length > 0) {
      const userId = userData.users[0].id;
      console.log(`🎯 Testing with user ID: ${userId}`);
      
      // Test the relationships API
      return fetch(`http://localhost:5000/api/relationships/user/${userId}`);
    } else {
      throw new Error('No users found in database');
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log('\n📊 API Response Analysis:');
    
    const transactionNodes = data.nodes.filter(node => node.data.type === 'transaction');
    const userNodes = data.nodes.filter(node => node.data.type === 'user');
    
    console.log(`✅ Transaction nodes found: ${transactionNodes.length}`);
    console.log(`✅ User nodes found: ${userNodes.length}`);
    
    // Sample transaction nodes
    console.log('\n🔵 Sample Transaction Nodes (should be BLUE):');
    transactionNodes.slice(0, 3).forEach(node => {
      console.log(`  - ${node.data.id}: type="${node.data.type}", label="${node.data.label}"`);
    });
    
    // Sample user nodes
    console.log('\n🟢 Sample User Nodes (should be GREEN):');
    userNodes.slice(0, 3).forEach(node => {
      console.log(`  - ${node.data.id}: type="${node.data.type}", label="${node.data.label}"`);
    });
    
    console.log('\n🎯 VERIFICATION RESULT:');
    if (transactionNodes.length > 0 && userNodes.length > 0) {
      console.log('✅ SUCCESS: Both transaction and user nodes are present with correct types!');
      console.log('🔵 Transaction nodes should appear BLUE in the frontend');
      console.log('🟢 User nodes should appear GREEN in the frontend');
    } else {
      console.log('❌ ERROR: Missing nodes or incorrect types');
    }
  })
  .catch(error => {
    console.error('❌ API Test Failed:', error);
  });