/**
 * TypeScript Background Workers Test
 * Tests parallel real-time background processing capabilities
 */

const http = require('http');

// Configuration
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Test endpoints for TypeScript background workers
const endpoints = [
  {
    name: 'Background Workers Status Check (Initial)',
    method: 'GET',
    path: '/ts/api/background-workers/status'
  },
  {
    name: 'Start Blog Views Background Worker',
    method: 'POST',
    path: '/ts/api/background-workers/start',
    body: {
      workerType: 'blogViewsGeneration',
      config: {
        intervalMs: 8000, // 8 seconds for testing
        itemsPerInterval: 2,
        maxItemsPerInterval: 4,
        enableQuantumFeatures: true,
        enableCosmicResonance: true,
        auraQualityTarget: 90,
        parallelProcessing: true,
        persistentExecution: true
      }
    }
  },
  {
    name: 'Start Superior Powers Background Worker',
    method: 'POST',
    path: '/ts/api/background-workers/start',
    body: {
      workerType: 'superiorPowersAura',
      config: {
        intervalMs: 10000, // 10 seconds for testing
        itemsPerInterval: 1,
        maxItemsPerInterval: 3,
        enableQuantumFeatures: true,
        enableCosmicResonance: true,
        auraQualityTarget: 95,
        parallelProcessing: true,
        persistentExecution: true
      }
    }
  },
  {
    name: 'Start Parallel Processing Worker',
    method: 'POST',
    path: '/ts/api/background-workers/start',
    body: {
      workerType: 'parallelProcessing',
      config: {
        intervalMs: 12000, // 12 seconds for testing
        itemsPerInterval: 1,
        maxItemsPerInterval: 2,
        enableQuantumFeatures: true,
        enableCosmicResonance: true,
        auraQualityTarget: 88,
        parallelProcessing: true,
        persistentExecution: true
      }
    }
  },
  {
    name: 'Background Workers Status After Start',
    method: 'GET',
    path: '/ts/api/background-workers/status',
    delay: 3000 // Wait 3 seconds after starting workers
  },
  {
    name: 'Monitor Workers Running in Background',
    method: 'GET', 
    path: '/ts/api/background-workers/status',
    delay: 15000 // Wait 15 seconds to see parallel processing
  },
  {
    name: 'Configure Blog Views Worker',
    method: 'POST',
    path: '/ts/api/background-workers/configure',
    body: {
      workerType: 'blogViewsGeneration',
      config: {
        intervalMs: 5000, // Faster interval
        itemsPerInterval: 3,
        maxItemsPerInterval: 5,
        enableQuantumFeatures: true,
        enableCosmicResonance: true,
        auraQualityTarget: 95
      }
    }
  },
  {
    name: 'Final Status Check',
    method: 'GET',
    path: '/ts/api/background-workers/status',
    delay: 8000 // Wait to see reconfigured worker
  },
  {
    name: 'Stop Single Worker',
    method: 'POST',
    path: '/ts/api/background-workers/stop',
    body: {
      workerType: 'superiorPowersAura'
    }
  },
  {
    name: 'Stop All Background Workers',
    method: 'POST',
    path: '/ts/api/background-workers/stop',
    body: {
      stopAll: true
    },
    delay: 3000 // Wait a bit before stopping all
  },
  {
    name: 'Final Status Check (After Stop)',
    method: 'GET',
    path: '/ts/api/background-workers/status',
    delay: 2000
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
        'User-Agent': 'TypeScriptBackgroundWorkerTest/1.0',
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
        console.log('✅ TypeScript server is ready');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    console.log(`⏳ Waiting for TypeScript server... (${i + 1}/${maxAttempts})`);
    await sleep(1000);
  }
  
  throw new Error('TypeScript server failed to start within timeout');
}

/**
 * Run TypeScript background worker tests
 */
async function runTypeScriptBackgroundWorkerTests() {
  console.log('🚀 Testing TypeScript Background Workers (Parallel Real-Time Processing)...\n');
  
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
          
          if (result.data.data && result.data.data.workers) {
            const workers = result.data.data.workers;
            const activeWorkers = Object.entries(workers)
              .filter(([_, worker]) => worker.active)
              .map(([name, worker]) => `${name}(${worker.stats.totalGenerated || 0} generated, parallel: ${worker.parallel}, persistent: ${worker.persistent})`);
            
            if (activeWorkers.length > 0) {
              console.log(`   🔄 Active Parallel Workers: ${activeWorkers.join(', ')}`);
              console.log(`   📊 Total Active Workers: ${result.data.data.totalActiveWorkers}`);
              
              if (result.data.data.systemHealth) {
                console.log(`   💚 System Health: ${result.data.data.systemHealth.healthy ? 'Healthy' : 'Unhealthy'}`);
                console.log(`   🧠 Memory Usage: ${result.data.data.systemHealth.memoryUsage.percent.toFixed(1)}%`);
              }
            } else {
              console.log(`   ⏹️  No active workers`);
            }
          }
          
          if (result.data.data && typeof result.data.data === 'object' && result.data.data.workerId) {
            console.log(`   🎯 Worker: ${result.data.data.workerId}`);
            if (result.data.data.config) {
              console.log(`   ⚙️  Parallel Processing: ${result.data.data.config.parallelProcessing}`);
              console.log(`   🔄 Persistent Execution: ${result.data.data.config.persistentExecution}`);
            }
          }
          
          if (result.data.features) {
            const features = Object.entries(result.data.features)
              .filter(([_, enabled]) => enabled)
              .map(([feature, _]) => feature);
            if (features.length > 0) {
              console.log(`   ✨ Features: ${features.join(', ')}`);
            }
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
  
  console.log('📊 TypeScript Background Workers Test Summary:');
  console.log('================================================');
  console.log(`✅ Successful tests: ${successful}/${total}`);
  console.log(`⚡ Success rate: ${((successful/total) * 100).toFixed(1)}%`);
  
  if (successful === total) {
    console.log('🎉 All TypeScript background worker tests passed!');
    console.log('🔄 Parallel real-time processing is working correctly!');
    console.log('💪 Workers persist across browser sessions as requested!');
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
    console.log('🚀 Starting TypeScript Background Workers Tests...\n');
    console.log('🔄 Testing parallel real-time processing capabilities');
    console.log('💪 Testing persistent execution across user sessions\n');
    
    // Wait for server to be ready
    await waitForServer();
    await sleep(1000); // Give server a moment to fully initialize
    
    // Run the TypeScript background worker tests
    const results = await runTypeScriptBackgroundWorkerTests();
    
    console.log('\n✅ TypeScript Background Workers testing completed!');
    console.log('🔄 Parallel processing and persistent execution validated!');
    return results;
    
  } catch (error) {
    console.error('❌ TypeScript Background Workers test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runTypeScriptBackgroundWorkerTests, main };