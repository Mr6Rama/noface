const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log('🔍 Testing health check...');
  try {
    const response = await makeRequest('GET', '/health');
    console.log('✅ Health check:', response.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
}

async function testRegisterPeer() {
  console.log('\n🔍 Testing peer registration...');
  try {
    const peerData = {
      id: 'test_peer_123',
      ip: '192.168.1.100',
      port: 8080,
      name: 'Test Node'
    };
    
    const response = await makeRequest('POST', '/register', peerData);
    console.log('✅ Peer registration:', response.data);
  } catch (error) {
    console.log('❌ Peer registration failed:', error.message);
  }
}

async function testGetPeers() {
  console.log('\n🔍 Testing get peers...');
  try {
    const response = await makeRequest('GET', '/peers');
    console.log('✅ Get peers:', response.data);
  } catch (error) {
    console.log('❌ Get peers failed:', error.message);
  }
}

async function testGetStatus() {
  console.log('\n🔍 Testing get status...');
  try {
    const response = await makeRequest('GET', '/status');
    console.log('✅ Get status:', response.data);
  } catch (error) {
    console.log('❌ Get status failed:', error.message);
  }
}

async function testRegisterMultiplePeers() {
  console.log('\n🔍 Testing multiple peer registration...');
  try {
    const peers = [
      { id: 'peer_1', ip: '192.168.1.101', port: 8081, name: 'Node 1' },
      { id: 'peer_2', ip: '192.168.1.102', port: 8082, name: 'Node 2' },
      { id: 'peer_3', ip: '192.168.1.103', port: 8083, name: 'Node 3' }
    ];

    for (const peer of peers) {
      const response = await makeRequest('POST', '/register', peer);
      console.log(`✅ Registered ${peer.name}:`, response.data.success);
    }
  } catch (error) {
    console.log('❌ Multiple peer registration failed:', error.message);
  }
}

async function testInvalidRegistration() {
  console.log('\n🔍 Testing invalid registration...');
  try {
    const invalidData = {
      id: 'invalid_peer',
      // Missing ip and port
    };
    
    const response = await makeRequest('POST', '/register', invalidData);
    console.log('✅ Invalid registration (should fail):', response.data);
  } catch (error) {
    console.log('❌ Invalid registration test failed:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting NoFace Bootstrap Server API Tests\n');
  
  await testHealthCheck();
  await testRegisterPeer();
  await testGetPeers();
  await testGetStatus();
  await testRegisterMultiplePeers();
  await testGetPeers(); // Get peers again to see all registered
  await testInvalidRegistration();
  
  console.log('\n✅ All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  makeRequest,
  testHealthCheck,
  testRegisterPeer,
  testGetPeers,
  testGetStatus
};
