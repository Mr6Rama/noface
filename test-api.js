#!/usr/bin/env node

/**
 * NoFace Bootstrap Server API Test Suite
 * Simple test script to verify server functionality
 */

const http = require('http');
const https = require('https');

// Configuration
const config = {
  host: process.env.TEST_HOST || 'localhost',
  port: process.env.TEST_PORT || 3000,
  protocol: process.env.TEST_PROTOCOL || 'http',
  timeout: 5000
};

const baseUrl = `${config.protocol}://${config.host}:${config.port}`;
const client = config.protocol === 'https' ? https : http;

// Test data
const testPeer = {
  id: 'QmTestPeer123456789abcdef',
  ip: '192.168.1.100',
  port: 4001,
  name: 'Test Peer Node',
  capabilities: ['websocket', 'webrtc'],
  version: '1.0.0'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test results
let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: config.host,
      port: config.port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NoFace-Test-Client/1.0.0'
      },
      timeout: config.timeout
    };

    const req = client.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  log('\n🔍 Testing Health Check...', 'cyan');
  
  try {
    const response = await makeRequest('GET', '/health');
    
    if (response.statusCode === 200 && response.body.status === 'ok') {
      log('✅ Health check passed', 'green');
      testResults.passed++;
    } else {
      log(`❌ Health check failed: ${response.statusCode}`, 'red');
      testResults.failed++;
    }
  } catch (error) {
    log(`❌ Health check error: ${error.message}`, 'red');
    testResults.failed++;
  }
  
  testResults.total++;
}

async function testStatus() {
  log('\n📊 Testing Status Endpoint...', 'cyan');
  
  try {
    const response = await makeRequest('GET', '/status');
    
    if (response.statusCode === 200 && response.body.success) {
      log('✅ Status endpoint passed', 'green');
      log(`   Server: ${response.body.server.status}`, 'blue');
      log(`   Total Peers: ${response.body.network.totalPeers}`, 'blue');
      log(`   Active Peers: ${response.body.network.activePeers}`, 'blue');
      testResults.passed++;
    } else {
      log(`❌ Status endpoint failed: ${response.statusCode}`, 'red');
      testResults.failed++;
    }
  } catch (error) {
    log(`❌ Status endpoint error: ${error.message}`, 'red');
    testResults.failed++;
  }
  
  testResults.total++;
}

async function testPeerRegistration() {
  log('\n👤 Testing Peer Registration...', 'cyan');
  
  try {
    const response = await makeRequest('POST', '/register', testPeer);
    
    if (response.statusCode === 200 && response.body.success) {
      log('✅ Peer registration passed', 'green');
      log(`   Peer ID: ${response.body.peer.id}`, 'blue');
      log(`   Peer Name: ${response.body.peer.name}`, 'blue');
      testResults.passed++;
    } else {
      log(`❌ Peer registration failed: ${response.statusCode}`, 'red');
      log(`   Error: ${response.body.error || 'Unknown error'}`, 'red');
      testResults.failed++;
    }
  } catch (error) {
    log(`❌ Peer registration error: ${error.message}`, 'red');
    testResults.failed++;
  }
  
  testResults.total++;
}

async function testPeerList() {
  log('\n📋 Testing Peer List...', 'cyan');
  
  try {
    const response = await makeRequest('GET', '/peers');
    
    if (response.statusCode === 200 && response.body.success) {
      log('✅ Peer list passed', 'green');
      log(`   Total Peers: ${response.body.data.pagination.total}`, 'blue');
      log(`   Returned Peers: ${response.body.data.peers.length}`, 'blue');
      testResults.passed++;
    } else {
      log(`❌ Peer list failed: ${response.statusCode}`, 'red');
      testResults.failed++;
    }
  } catch (error) {
    log(`❌ Peer list error: ${error.message}`, 'red');
    testResults.failed++;
  }
  
  testResults.total++;
}

async function testPeerDetails() {
  log('\n🔍 Testing Peer Details...', 'cyan');
  
  try {
    const response = await makeRequest('GET', `/peers/${testPeer.id}`);
    
    if (response.statusCode === 200 && response.body.success) {
      log('✅ Peer details passed', 'green');
      log(`   Peer Name: ${response.body.peer.name}`, 'blue');
      log(`   Peer Version: ${response.body.peer.version}`, 'blue');
      testResults.passed++;
    } else {
      log(`❌ Peer details failed: ${response.statusCode}`, 'red');
      testResults.failed++;
    }
  } catch (error) {
    log(`❌ Peer details error: ${error.message}`, 'red');
    testResults.failed++;
  }
  
  testResults.total++;
}

async function testHeartbeat() {
  log('\n💓 Testing Heartbeat...', 'cyan');
  
  try {
    const response = await makeRequest('POST', `/peers/${testPeer.id}/heartbeat`);
    
    if (response.statusCode === 200 && response.body.success) {
      log('✅ Heartbeat passed', 'green');
      testResults.passed++;
    } else {
      log(`❌ Heartbeat failed: ${response.statusCode}`, 'red');
      testResults.failed++;
    }
  } catch (error) {
    log(`❌ Heartbeat error: ${error.message}`, 'red');
    testResults.failed++;
  }
  
  testResults.total++;
}

async function testPeerDeletion() {
  log('\n🗑️  Testing Peer Deletion...', 'cyan');
  
  try {
    const response = await makeRequest('DELETE', `/peers/${testPeer.id}`);
    
    if (response.statusCode === 200 && response.body.success) {
      log('✅ Peer deletion passed', 'green');
      testResults.passed++;
    } else {
      log(`❌ Peer deletion failed: ${response.statusCode}`, 'red');
      testResults.failed++;
    }
  } catch (error) {
    log(`❌ Peer deletion error: ${error.message}`, 'red');
    testResults.failed++;
  }
  
  testResults.total++;
}

async function testApiDocs() {
  log('\n📚 Testing API Documentation...', 'cyan');
  
  try {
    const response = await makeRequest('GET', '/api-docs');
    
    if (response.statusCode === 200 && response.body.success) {
      log('✅ API docs passed', 'green');
      log(`   Title: ${response.body.title}`, 'blue');
      log(`   Version: ${response.body.version}`, 'blue');
      testResults.passed++;
    } else {
      log(`❌ API docs failed: ${response.statusCode}`, 'red');
      testResults.failed++;
    }
  } catch (error) {
    log(`❌ API docs error: ${error.message}`, 'red');
    testResults.failed++;
  }
  
  testResults.total++;
}

async function testInvalidEndpoints() {
  log('\n🚫 Testing Invalid Endpoints...', 'cyan');
  
  try {
    const response = await makeRequest('GET', '/nonexistent');
    
    if (response.statusCode === 404) {
      log('✅ 404 handling passed', 'green');
      testResults.passed++;
    } else {
      log(`❌ 404 handling failed: ${response.statusCode}`, 'red');
      testResults.failed++;
    }
  } catch (error) {
    log(`❌ 404 handling error: ${error.message}`, 'red');
    testResults.failed++;
  }
  
  testResults.total++;
}

// Main test runner
async function runTests() {
  log('🚀 NoFace Bootstrap Server API Test Suite', 'bright');
  log('=' .repeat(50), 'bright');
  log(`Testing server at: ${baseUrl}`, 'blue');
  log(`Timeout: ${config.timeout}ms`, 'blue');
  log('=' .repeat(50), 'bright');

  // Run all tests
  await testHealthCheck();
  await testStatus();
  await testPeerRegistration();
  await testPeerList();
  await testPeerDetails();
  await testHeartbeat();
  await testPeerDeletion();
  await testApiDocs();
  await testInvalidEndpoints();

  // Print results
  log('\n' + '=' .repeat(50), 'bright');
  log('📊 Test Results:', 'bright');
  log(`✅ Passed: ${testResults.passed}`, 'green');
  log(`❌ Failed: ${testResults.failed}`, 'red');
  log(`📈 Total: ${testResults.total}`, 'blue');
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  log(`🎯 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
  
  if (testResults.failed === 0) {
    log('\n🎉 All tests passed! Server is working correctly.', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Please check the server configuration.', 'yellow');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('NoFace Bootstrap Server API Test Suite', 'bright');
  log('\nUsage: node test-api.js [options]', 'blue');
  log('\nOptions:', 'blue');
  log('  --host HOST     Server hostname (default: localhost)', 'blue');
  log('  --port PORT     Server port (default: 3000)', 'blue');
  log('  --protocol      Protocol (http|https) (default: http)', 'blue');
  log('  --timeout MS    Request timeout in milliseconds (default: 5000)', 'blue');
  log('  --help, -h      Show this help message', 'blue');
  log('\nEnvironment Variables:', 'blue');
  log('  TEST_HOST       Server hostname', 'blue');
  log('  TEST_PORT       Server port', 'blue');
  log('  TEST_PROTOCOL   Protocol (http|https)', 'blue');
  process.exit(0);
}

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const key = args[i];
  const value = args[i + 1];
  
  switch (key) {
    case '--host':
      config.host = value;
      break;
    case '--port':
      config.port = parseInt(value);
      break;
    case '--protocol':
      config.protocol = value;
      break;
    case '--timeout':
      config.timeout = parseInt(value);
      break;
  }
}

// Run tests
runTests().catch((error) => {
  log(`💥 Test runner error: ${error.message}`, 'red');
  process.exit(1);
});