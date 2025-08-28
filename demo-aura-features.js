#!/usr/bin/env node

/**
 * Advanced Aura Features Demo Script
 * Demonstrates the new real-time activity logging and monitoring system
 */

const bulkGeneration = require('./src/utils/bulkGeneration');

console.log('🔮 Advanced Aura Features Demo');
console.log('================================\n');

async function demoAdvancedAuraFeatures() {
  // 1. Real-time Activity Logging Demo
  console.log('📊 1. Real-time Activity Logging');
  console.log('   - Logging various types of activities...');
  
  // Log different types of activities
  bulkGeneration.logGenerationActivity('demo_bulk', 25, 92, { demo: true });
  bulkGeneration.logAuraOptimization('neural_enhancement', 78, 95, { improvement: 17 });
  bulkGeneration.logAnalyticsActivity('real_time_insights', 1500, { insights: 'premium quality' });
  bulkGeneration.logSecurityActivity('anomaly_detection', 'medium', { detected: 2 });
  
  console.log('   ✅ Logged 4 different activity types\n');

  // 2. Enhanced Generation with Activity Tracking
  console.log('🚀 2. Enhanced Generation with Activity Tracking');
  console.log('   - Running bulk traffic generation with full logging...');
  
  try {
    const result = await bulkGeneration.generateBulkTrafficWithAura('demo', 8, {
      auraQualityTarget: 88,
      delay: 100
    });
    
    console.log(`   ✅ Generated ${result.totalGenerated} traffic entries`);
    console.log(`   📈 Average Aura Score: ${result.auraMetrics.averageScore.toFixed(2)}`);
    console.log(`   🎯 Quality Distribution: ${JSON.stringify(result.auraMetrics.qualityDistribution)}`);
    console.log(`   ⏱️  Processing Time: ${result.processingTime}ms\n`);
  } catch (error) {
    console.log(`   ❌ Generation failed: ${error.message}\n`);
  }

  // 3. AI Optimization with Activity Logging
  console.log('🤖 3. AI Optimization with Activity Logging');
  console.log('   - Running AI-powered optimization...');
  
  const aiResult = bulkGeneration.generateAIOptimizedTraffic('demo_ai', 5, {
    aiLearning: true,
    adaptiveOptimization: true,
    predictiveModeling: true
  });
  
  console.log(`   ✅ AI Enhancement: ${aiResult.aiEnhanced ? 'Enabled' : 'Disabled'}`);
  console.log(`   🧠 Optimization Score: ${aiResult.aiOptimization.optimizationScore.toFixed(2)}\n`);

  // 4. Advanced Analytics with Activity Logging
  console.log('📈 4. Advanced Analytics with Activity Logging');
  console.log('   - Generating advanced analytics insights...');
  
  const analyticsResult = bulkGeneration.generateAdvancedAuraAnalytics('demo_analytics', '2h');
  
  console.log(`   ✅ Heatmap Data Points: ${analyticsResult.heatmapData.dataPoints.length}`);
  console.log(`   🎯 Forecast Accuracy: ${(analyticsResult.predictiveForecasting.accuracy * 100).toFixed(1)}%`);
  console.log(`   📊 Trend Direction: ${analyticsResult.trendAnalysis.trendDirection}`);
  console.log(`   🔍 Real-time Quality: ${analyticsResult.realTimeInsights.currentQuality.toFixed(2)}\n`);

  // 5. Activity Statistics and Monitoring
  console.log('📋 5. Activity Statistics and Monitoring');
  console.log('   - Retrieving comprehensive activity statistics...');
  
  const stats = bulkGeneration.getActivityStats();
  console.log(`   📊 Total Activities: ${stats.total}`);
  console.log(`   💾 Stored Activities: ${stats.stored}`);
  console.log(`   ⏰ Last Hour: ${stats.lastHour}`);
  console.log(`   📦 Storage Utilization: ${stats.storageUtilization}`);
  console.log(`   🏷️  Categories: ${Object.keys(stats.byCategory).join(', ')}`);
  console.log(`   ⚠️  Severities: ${Object.keys(stats.bySeverity).join(', ')}\n`);

  // 6. Real-time Activity Filtering
  console.log('🔍 6. Activity Filtering and Retrieval');
  console.log('   - Demonstrating activity filtering capabilities...');
  
  const recentActivities = bulkGeneration.getRecentActivities(5);
  const generationActivities = bulkGeneration.getRecentActivities(10, 'generation');
  const successActivities = bulkGeneration.getRecentActivities(10, null, 'success');
  
  console.log(`   📄 Recent Activities (5): ${recentActivities.length} found`);
  console.log(`   🎯 Generation Activities: ${generationActivities.length} found`);
  console.log(`   ✅ Success Activities: ${successActivities.length} found\n`);

  // 7. Real-time Listener Demo
  console.log('🔔 7. Real-time Activity Listener');
  console.log('   - Setting up real-time activity monitoring...');
  
  let listenerCount = 0;
  const removeListener = bulkGeneration.addRealtimeListener((activity) => {
    listenerCount++;
    console.log(`   🔥 [LIVE] ${activity.category.toUpperCase()}: ${activity.action} (${activity.severity})`);
  });
  
  // Trigger some activities to show real-time monitoring
  console.log('   - Triggering activities to demonstrate real-time monitoring...');
  bulkGeneration.logActivity('demo', 'real_time_test_1', { demo: true }, 'info');
  bulkGeneration.logActivity('demo', 'real_time_test_2', { demo: true }, 'success');
  bulkGeneration.logActivity('demo', 'real_time_test_3', { demo: true }, 'warning');
  
  // Clean up listener
  setTimeout(() => {
    removeListener();
    console.log(`   ✅ Real-time listener received ${listenerCount} activities\n`);
    
    // 8. Activity Backup Demo
    console.log('💾 8. Activity Backup and Maintenance');
    console.log('   - Performing activity backup...');
    
    bulkGeneration.backupActivities().then(() => {
      console.log('   ✅ Activity backup completed successfully');
      
      // 9. Final Statistics
      console.log('\n📈 Final Activity Statistics:');
      const finalStats = bulkGeneration.getActivityStats();
      console.log(`   Total Activities Generated: ${finalStats.total}`);
      console.log(`   System Uptime: ${process.uptime().toFixed(2)}s`);
      console.log(`   Memory Usage: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)}MB`);
      
      console.log('\n🎉 Advanced Aura Features Demo Complete!');
      console.log('🔥 Real-time generation activity recording is fully operational!');
      console.log('\n💡 Key Features Demonstrated:');
      console.log('   ✅ Real-time activity logging for all generation operations');
      console.log('   ✅ Comprehensive activity tracking with context and metrics');
      console.log('   ✅ Advanced filtering and retrieval capabilities');
      console.log('   ✅ Live activity monitoring with real-time listeners');
      console.log('   ✅ Automatic backup and maintenance functionality');
      console.log('   ✅ Enhanced generation methods with full activity integration');
      console.log('\n🚀 Ready for production use with complete activity audit trail!');
    }).catch(error => {
      console.log(`   ❌ Backup failed: ${error.message}`);
    });
  }, 100);
}

// Run the demo
demoAdvancedAuraFeatures().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});