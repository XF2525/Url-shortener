#!/usr/bin/env node

/**
 * Advanced Aura Activity Logging System Test
 * Tests the real-time activity recording and storage features
 */

const bulkGeneration = require('./src/utils/bulkGeneration');

console.log('🧪 Testing Advanced Aura Activity Logging System...\n');

async function testAuraActivityLogging() {
  let testsPassed = 0;
  let totalTests = 0;

  function test(description, testFn) {
    totalTests++;
    try {
      const result = testFn();
      if (result) {
        console.log(`✅ Test ${totalTests} PASSED: ${description}`);
        testsPassed++;
      } else {
        console.log(`❌ Test ${totalTests} FAILED: ${description}`);
      }
    } catch (error) {
      console.log(`❌ Test ${totalTests} FAILED: ${description} - ${error.message}`);
    }
  }

  // Test 1: Basic activity logging
  test('Activity logging basic functionality', () => {
    const activityId = bulkGeneration.logActivity(
      'generation',
      'test_activity',
      { testData: 'example' },
      'info'
    );
    return typeof activityId === 'string' && activityId.length > 0;
  });

  // Test 2: Generation-specific activity logging
  test('Generation activity logging', () => {
    const activityId = bulkGeneration.logGenerationActivity(
      'test_generation',
      10,
      85,
      { quality: 'premium' }
    );
    return typeof activityId === 'string' && activityId.length > 0;
  });

  // Test 3: Aura optimization activity logging
  test('Aura optimization activity logging', () => {
    const activityId = bulkGeneration.logAuraOptimization(
      'ai_enhancement',
      75,
      88,
      { improvement: 13 }
    );
    return typeof activityId === 'string' && activityId.length > 0;
  });

  // Test 4: Analytics activity logging
  test('Analytics activity logging', () => {
    const activityId = bulkGeneration.logAnalyticsActivity(
      'heatmap_generation',
      1000,
      { insights: 'test insights' }
    );
    return typeof activityId === 'string' && activityId.length > 0;
  });

  // Test 5: Security activity logging
  test('Security activity logging', () => {
    const activityId = bulkGeneration.logSecurityActivity(
      'rate_limit_check',
      'low',
      { ip: '192.168.1.1' }
    );
    return typeof activityId === 'string' && activityId.length > 0;
  });

  // Test 6: Get recent activities
  test('Retrieve recent activities', () => {
    const activities = bulkGeneration.getRecentActivities(10);
    return Array.isArray(activities) && activities.length > 0;
  });

  // Test 7: Get activity statistics
  test('Get activity statistics', () => {
    const stats = bulkGeneration.getActivityStats();
    return stats && 
           typeof stats.total === 'number' && 
           typeof stats.stored === 'number' &&
           stats.total >= 4; // We logged at least 4 activities
  });

  // Test 8: Real-time listener functionality
  test('Real-time activity listener', () => {
    let listenerCalled = false;
    const removeListener = bulkGeneration.addRealtimeListener((activity) => {
      listenerCalled = true;
    });
    
    // Log an activity to trigger the listener
    bulkGeneration.logActivity('test', 'listener_test', {}, 'info');
    
    // Clean up
    removeListener();
    
    return listenerCalled;
  });

  // Test 9: Activity filtering by category
  test('Activity filtering by category', () => {
    const generationActivities = bulkGeneration.getRecentActivities(100, 'generation');
    return Array.isArray(generationActivities) && 
           generationActivities.every(activity => activity.category === 'generation');
  });

  // Test 10: Activity filtering by severity
  test('Activity filtering by severity', () => {
    const infoActivities = bulkGeneration.getRecentActivities(100, null, 'info');
    return Array.isArray(infoActivities) && 
           infoActivities.every(activity => activity.severity === 'info');
  });

  // Test 11: Test enhanced generation with activity logging
  test('Enhanced generation with activity logging', async () => {
    try {
      const beforeCount = bulkGeneration.getActivityStats().total;
      
      const result = await bulkGeneration.generateBulkTrafficWithAura('test', 3, {
        auraQualityTarget: 80
      });
      
      const afterCount = bulkGeneration.getActivityStats().total;
      
      return result.success && 
             result.generationId && 
             afterCount > beforeCount;
    } catch (error) {
      return false;
    }
  });

  // Test 12: AI optimization with activity logging
  test('AI optimization with activity logging', () => {
    try {
      const beforeCount = bulkGeneration.getActivityStats().total;
      
      const result = bulkGeneration.generateAIOptimizedTraffic('test', 2, {
        aiLearning: true,
        adaptiveOptimization: true
      });
      
      const afterCount = bulkGeneration.getActivityStats().total;
      
      return result.aiEnhanced && afterCount > beforeCount;
    } catch (error) {
      return false;
    }
  });

  // Test 13: Analytics generation with activity logging
  test('Analytics generation with activity logging', () => {
    try {
      const beforeCount = bulkGeneration.getActivityStats().total;
      
      const result = bulkGeneration.generateAdvancedAuraAnalytics('test', '1h');
      
      const afterCount = bulkGeneration.getActivityStats().total;
      
      return result && 
             result.heatmapData && 
             afterCount > beforeCount;
    } catch (error) {
      return false;
    }
  });

  // Test 14: Activity cleanup functionality
  test('Activity cleanup functionality', () => {
    try {
      const removedCount = bulkGeneration.cleanupOldActivities(0); // Remove all activities
      return typeof removedCount === 'number' && removedCount >= 0;
    } catch (error) {
      return false;
    }
  });

  // Test 15: Activity backup functionality
  test('Activity backup functionality', async () => {
    try {
      await bulkGeneration.backupActivities();
      return true;
    } catch (error) {
      return false;
    }
  });

  console.log(`\n📊 Test Results:`);
  console.log(`✅ Tests Passed: ${testsPassed}/${totalTests}`);
  console.log(`📈 Success Rate: ${((testsPassed / totalTests) * 100).toFixed(1)}%`);

  if (testsPassed === totalTests) {
    console.log('\n🎉 All Advanced Aura Activity Logging tests passed!');
    console.log('🔥 Real-time generation activity recording is working perfectly!');
    
    // Show some activity statistics
    const stats = bulkGeneration.getActivityStats();
    console.log('\n📈 Activity Statistics:');
    console.log(`   Total Activities: ${stats.total}`);
    console.log(`   Stored Activities: ${stats.stored}`);
    console.log(`   Storage Utilization: ${stats.storageUtilization}`);
    console.log(`   Categories: ${Object.keys(stats.byCategory).join(', ')}`);
    console.log(`   Severities: ${Object.keys(stats.bySeverity).join(', ')}`);
    
    // Show recent activities sample
    const recentActivities = bulkGeneration.getRecentActivities(5);
    console.log('\n📋 Recent Activities Sample:');
    recentActivities.forEach((activity, index) => {
      console.log(`   ${index + 1}. [${activity.severity.toUpperCase()}] ${activity.category}: ${activity.action} (${activity.timestamp})`);
    });
    
    return true;
  } else {
    console.log('\n❌ Some tests failed. Please check the implementation.');
    return false;
  }
}

// Run the tests
testAuraActivityLogging().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});