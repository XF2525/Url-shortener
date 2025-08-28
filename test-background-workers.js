/**
 * Background Workers API Test
 * Tests the new continuous background generation endpoints
 */

const http = require('http');

// Configuration
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const AUTH_TOKEN = 'admin123'; // Default admin password

// Test endpoints
const endpoints = [
  {
    name: 'Background Status Check',
    method: 'GET',
    path: '/admin/api/automation/background-status',
    auth: 'advanced'
  },
  {
    name: 'Start Background Clicks',
    method: 'POST',
    path: '/admin/api/automation/start-background-clicks',
    auth: 'ultra',
    body: {
      config: {
        intervalMs: 10000, // 10 seconds for testing
        clicksPerInterval: 2,
        maxClicksPerInterval: 3
      }
    }
  },
  {
    name: 'Start Background Views',
    method: 'POST', 
    path: '/admin/api/automation/start-background-views',
    auth: 'ultra',
    body: {
      config: {
        intervalMs: 15000, // 15 seconds for testing
        viewsPerInterval: 1,
        maxViewsPerInterval: 2,
        enableAds: true
      }
    }
  },
  {
    name: 'Background Status After Start',
    method: 'GET',
    path: '/admin/api/automation/background-status',
    auth: 'advanced',
    delay: 2000 // Wait 2 seconds after starting
  },
  {
    name: 'Stop Background Processes',
    method: 'POST',
    path: '/admin/api/automation/stop-background-processes',
    auth: 'ultra',
    body: {},
    delay: 5000 // Wait 5 seconds to see some generation
  }
];

/**
 * Make HTTP request
 */
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const data = endpoint.body ? JSON.stringify(endpoint.body) : null;
    
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'User-Agent': 'BackgroundWorkerTest/1.0',
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: parsedData,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: responseData,
            success: false,
            error: 'Invalid JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if server is running
 */
async function waitForServer(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await makeRequest({ method: 'GET', path: '/health' });
      if (result.success) {
        console.log('✅ Server is ready');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    console.log(`⏳ Waiting for server... (${i + 1}/${maxAttempts})`);
    await sleep(1000);
  }
  
  throw new Error('Server failed to start within timeout');
}

/**
 * Run background worker tests
 */
async function runBackgroundWorkerTests() {
  console.log('🔧 Testing Background Worker API Endpoints...\n');
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      // Apply delay if specified
      if (endpoint.delay) {
        console.log(`⏳ Waiting ${endpoint.delay}ms before ${endpoint.name}...`);
        await sleep(endpoint.delay);
      }
      
      console.log(`📡 Testing: ${endpoint.name}`);
      console.log(`   ${endpoint.method} ${endpoint.path}`);
      
      const startTime = Date.now();
      const result = await makeRequest(endpoint);
      const duration = Date.now() - startTime;
      
      results.push({
        name: endpoint.name,
        success: result.success,
        statusCode: result.statusCode,
        duration,
        data: result.data
      });
      
      if (result.success) {
        console.log(`✅ ${endpoint.name}: ${result.statusCode} (${duration}ms)`);
        
        // Show relevant response data
        if (result.data) {
          if (result.data.message) {
            console.log(`   📝 ${result.data.message}`);
          }
          
          if (result.data.status && result.data.status.workers) {
            const workers = result.data.status.workers;
            const activeWorkers = Object.entries(workers)
              .filter(([_, worker]) => worker.active)
              .map(([name, worker]) => `${name}(${worker.stats.totalGenerated || 0} generated)`);
            
            if (activeWorkers.length > 0) {
              console.log(`   🔄 Active Workers: ${activeWorkers.join(', ')}`);
            } else {
              console.log(`   ⏹️  No active workers`);
            }
          }
          
          if (result.data.results) {
            const keys = Object.keys(result.data.results);
            console.log(`   📊 Stopped Workers: ${keys.join(', ')}`);
          }
        }
      } else {
        console.log(`❌ ${endpoint.name}: ${result.statusCode} (${duration}ms)`);
        if (result.data && result.data.error) {
          console.log(`   ⚠️  Error: ${result.data.error}`);
        }
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ERROR - ${error.message}\n`);
      results.push({
        name: endpoint.name,
        success: false,
        error: error.message
      });
    }
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log('📊 Background Worker API Test Summary:');
  console.log('================================================');
  console.log(`✅ Successful tests: ${successful}/${total}`);
  console.log(`⚡ Success rate: ${((successful/total) * 100).toFixed(1)}%`);
  
  if (successful === total) {
    console.log('🎉 All background worker API tests passed!');
  } else {
    console.log('⚠️  Some tests failed - check the logs above');
  }
  
  return results;
}

/**
 * Main test execution
 */
async function main() {
  try {
    console.log('🚀 Starting Background Worker API Tests...\n');
    
    // Wait for server to be ready
    await waitForServer();
    await sleep(1000); // Give server a moment to fully initialize
    
    // First, create a test URL for click generation
    console.log('📝 Creating test URL for click generation...');
    const createUrlResult = await makeRequest({
      method: 'POST',
      path: '/shorten',
      body: { url: 'https://example.com/test-background-clicks' }
    });
    
    if (createUrlResult.success) {
      console.log(`✅ Test URL created: ${createUrlResult.data.shortCode}\n`);
    } else {
      console.log('⚠️  Failed to create test URL, but continuing with tests...\n');
    }
    
    // Run the background worker tests
    const results = await runBackgroundWorkerTests();
    
    console.log('\n✅ Background Worker API testing completed!');
    return results;
    
  } catch (error) {
    console.error('❌ Background Worker API test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runBackgroundWorkerTests, main };