#!/usr/bin/env node

// Simple performance test for URL Shortener enhancements
console.log('🚀 Running Performance Tests...');

const http = require('http');
const { performance } = require('perf_hooks');

// Test configuration
const TEST_CONFIG = {
  HOST: 'localhost',
  PORT: 3001, // Use different port for testing
  CONCURRENT_REQUESTS: 10,
  TOTAL_REQUESTS: 50
};

// Start the app in test mode
const app = require('./app.js');
const server = app.listen(TEST_CONFIG.PORT, () => {
  console.log(`Test server started on port ${TEST_CONFIG.PORT}`);
  runPerformanceTests();
});

async function makeRequest(path, method = 'GET', data = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: TEST_CONFIG.HOST,
      port: TEST_CONFIG.PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Performance-Test/1.0',
        ...extraHeaders
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: responseData,
          headers: res.headers
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testEndpoint(name, path, method = 'GET', data = null, extraHeaders = {}) {
  console.log(`\n📊 Testing ${name}...`);
  
  const start = performance.now();
  const promises = [];
  
  for (let i = 0; i < TEST_CONFIG.CONCURRENT_REQUESTS; i++) {
    promises.push(makeRequest(path, method, data, extraHeaders));
  }
  
  try {
    const results = await Promise.all(promises);
    const end = performance.now();
    
    const totalTime = end - start;
    const avgTime = totalTime / TEST_CONFIG.CONCURRENT_REQUESTS;
    const successCount = results.filter(r => r.statusCode < 400).length;
    
    console.log(`✅ ${name}: ${successCount}/${TEST_CONFIG.CONCURRENT_REQUESTS} successful`);
    console.log(`⏱️  Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`📈 Average time: ${avgTime.toFixed(2)}ms per request`);
    
    return { success: successCount === TEST_CONFIG.CONCURRENT_REQUESTS, avgTime };
  } catch (error) {
    console.log(`❌ ${name}: Test failed - ${error.message}`);
    return { success: false, avgTime: 0 };
  }
}

async function runPerformanceTests() {
  console.log('\n🧪 Starting Performance Tests...');
  console.log(`📊 Configuration: ${TEST_CONFIG.CONCURRENT_REQUESTS} concurrent requests`);
  
  const testResults = [];
  
  // Test 1: Health check endpoint
  const healthTest = await testEndpoint('Health Check', '/health');
  testResults.push({ name: 'Health Check', ...healthTest });
  
  // Test 2: Homepage
  const homeTest = await testEndpoint('Homepage', '/');
  testResults.push({ name: 'Homepage', ...homeTest });
  
  // Test 3: URL shortening (POST)
  const shortenTest = await testEndpoint('URL Shortening', '/shorten', 'POST', {
    originalUrl: 'https://example.com/test-url-' + Date.now()
  });
  testResults.push({ name: 'URL Shortening', ...shortenTest });
  
  // Test 4: Admin dashboard (with authentication)
  const adminTest = await testEndpoint('Admin Dashboard', '/admin', 'GET', null, {
    'Authorization': 'Bearer admin123'
  });
  testResults.push({ name: 'Admin Dashboard', ...adminTest });
  
  // Generate summary
  console.log('\n📊 Performance Test Summary:');
  console.log('=' + '='.repeat(50));
  
  const successfulTests = testResults.filter(t => t.success).length;
  const totalTests = testResults.length;
  const avgResponseTime = testResults.reduce((sum, t) => sum + t.avgTime, 0) / totalTests;
  
  testResults.forEach(test => {
    const status = test.success ? '✅' : '❌';
    console.log(`${status} ${test.name}: ${test.avgTime.toFixed(2)}ms avg`);
  });
  
  console.log('=' + '='.repeat(50));
  console.log(`🎯 Overall Success Rate: ${successfulTests}/${totalTests} (${((successfulTests/totalTests) * 100).toFixed(1)}%)`);
  console.log(`⚡ Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
  
  if (avgResponseTime < 100) {
    console.log('🚀 Performance: EXCELLENT (< 100ms)');
  } else if (avgResponseTime < 500) {
    console.log('✅ Performance: GOOD (< 500ms)');
  } else {
    console.log('⚠️  Performance: NEEDS IMPROVEMENT (> 500ms)');
  }
  
  console.log('\n✅ Performance tests completed!');
  
  // Close the test server
  server.close(() => {
    console.log('🔚 Test server shut down');
    process.exit(successfulTests === totalTests ? 0 : 1);
  });
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  server.close(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason);
  server.close(() => process.exit(1));
});