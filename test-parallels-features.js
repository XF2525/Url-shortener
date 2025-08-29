#!/usr/bin/env node

/**
 * Test script for Parallels Aura Features
 * Tests the new parallels functionality to ensure it works correctly
 */

console.log('🔄 Testing Parallels Aura Features...\n');

const bulkGeneration = require('./src/utils/bulkGeneration');

async function testParallelsFeatures() {
  try {
    console.log('1. Testing Parallels System Initialization...');
    
    // Test initialization
    const system = bulkGeneration.initializeParallelsSystem();
    console.log(`   ✅ Parallels system initialized: ${system.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`   ✅ Max parallel tasks: ${system.maxParallelTasks}`);
    
    console.log('\n2. Testing Basic Parallels Generation...');
    
    // Test basic parallels generation
    const basicParallels = bulkGeneration.generateParallelsAuraFeatures('test_basic', {
      parallelTasks: 3,
      coordinationLevel: 'basic',
      loadBalancing: true
    });
    
    console.log(`   ✅ Basic parallels generated: ${basicParallels.parallelsEnabled ? 'Success' : 'Failed'}`);
    console.log(`   ✅ Parallels score: ${basicParallels.parallelsData.parallelsScore}/100`);
    console.log(`   ✅ Active tasks: ${basicParallels.parallelsData.parallelCoordination.activeTasks}`);
    
    console.log('\n3. Testing Advanced Parallels Generation...');
    
    // Test advanced parallels generation
    const advancedParallels = bulkGeneration.generateParallelsAuraFeatures('test_advanced', {
      parallelTasks: 6,
      coordinationLevel: 'advanced',
      loadBalancing: true,
      distributedProcessing: true,
      realTimeOptimization: true
    });
    
    console.log(`   ✅ Advanced parallels generated: ${advancedParallels.parallelsEnabled ? 'Success' : 'Failed'}`);
    console.log(`   ✅ Parallels score: ${advancedParallels.parallelsData.parallelsScore}/100`);
    console.log(`   ✅ Estimated speedup: ${advancedParallels.parallelsData.parallelCoordination.estimatedSpeedup}x`);
    console.log(`   ✅ Efficiency: ${(advancedParallels.parallelsData.parallelCoordination.efficiency * 100).toFixed(1)}%`);
    
    console.log('\n4. Testing Parallels Status...');
    
    // Test status retrieval
    const status = bulkGeneration.getParallelsStatus();
    console.log(`   ✅ System enabled: ${status.enabled ? 'Yes' : 'No'}`);
    console.log(`   ✅ Active parallel tasks: ${status.activeParallelTasks}`);
    console.log(`   ✅ Total generations: ${status.totalParallelGenerations}`);
    console.log(`   ✅ Efficiency score: ${status.parallelEfficiencyScore}/100`);
    console.log(`   ✅ Throughput gain: ${status.parallelThroughputGain}x`);
    
    console.log('\n5. Testing Comprehensive Parallels Features...');
    
    // Test comprehensive features test
    const testResults = await bulkGeneration.testParallelsFeatures();
    console.log(`   ✅ Tests passed: ${testResults.testsPassed}/${testResults.totalTests}`);
    console.log(`   ✅ Average parallels score: ${testResults.averageParallelsScore}/100`);
    console.log(`   ✅ Average speedup: ${testResults.averageSpeedup}x`);
    console.log(`   ✅ Recommendation: ${testResults.recommendation}`);
    
    console.log('\n6. Testing Expert Level Parallels...');
    
    // Test expert level
    const expertParallels = bulkGeneration.generateParallelsAuraFeatures('test_expert', {
      parallelTasks: 9,
      coordinationLevel: 'expert',
      loadBalancing: true,
      distributedProcessing: true,
      realTimeOptimization: true,
      crossTaskSynchronization: true
    });
    
    console.log(`   ✅ Expert parallels generated: ${expertParallels.parallelsEnabled ? 'Success' : 'Failed'}`);
    console.log(`   ✅ Parallels score: ${expertParallels.parallelsData.parallelsScore}/100`);
    console.log(`   ✅ Load balancing efficiency: ${expertParallels.parallelsData.loadBalancingResults?.balancingEfficiency?.toFixed(1)}%`);
    console.log(`   ✅ Distributed processing nodes: ${expertParallels.parallelsData.distributedProcessing?.distributionNodes}`);
    
    // Final validation
    const finalStatus = bulkGeneration.getParallelsStatus();
    
    console.log('\n🎯 Parallels Features Test Summary:');
    console.log(`   • System Status: ${finalStatus.enabled ? 'OPERATIONAL' : 'OFFLINE'}`);
    console.log(`   • Total Parallel Generations: ${finalStatus.totalParallelGenerations}`);
    console.log(`   • Average Efficiency: ${finalStatus.parallelEfficiencyScore}/100`);
    console.log(`   • System Health: ${finalStatus.systemHealth.overallHealth.toUpperCase()}`);
    console.log(`   • CPU Usage: ${finalStatus.systemHealth.cpuUsage.toFixed(1)}%`);
    console.log(`   • Memory Usage: ${finalStatus.systemHealth.memoryUsage.toFixed(1)}%`);
    console.log(`   • Network Latency: ${finalStatus.systemHealth.networkLatency.toFixed(1)}ms`);
    
    if (finalStatus.parallelEfficiencyScore >= 85 && testResults.testsPassed === testResults.totalTests) {
      console.log('\n🎉 All Parallels Features Tests PASSED! The system is working excellently.');
      return true;
    } else {
      console.log('\n⚠️  Some tests had suboptimal results. System is functional but may need optimization.');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Parallels Features Test FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the tests
testParallelsFeatures()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });