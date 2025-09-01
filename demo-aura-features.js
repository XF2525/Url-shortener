#!/usr/bin/env node

/**
 * Advanced Aura Features Demo Script
 * Demonstrates the new real-time activity logging and monitoring system
 * Optimized for performance and memory efficiency
 */

const bulkGeneration = require('./src/utils/bulkGeneration');
const { performance } = require('perf_hooks');

console.log('🔮 Advanced Aura Features Demo');
console.log('================================\n');

// Performance monitoring wrapper
const measurePerformance = async (name, fn) => {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  console.log(`   ⏱️  ${name} completed in ${(endTime - startTime).toFixed(2)}ms`);
  return result;
};

// Memory usage report
const getMemoryUsage = () => {
  const used = process.memoryUsage();
  return {
    rss: `${Math.round(used.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(used.external / 1024 / 1024)} MB`
  };
};

async function demoAdvancedAuraFeatures() {
  try {
    // 1. Real-time Activity Logging Demo - Batched for efficiency
    console.log('📊 1. Real-time Activity Logging');
    console.log('   - Logging various types of activities...');
    
    await measurePerformance('Activity Logging', async () => {
      // Batch log operations for better performance
      await Promise.all([
        bulkGeneration.logGenerationActivity('demo_bulk', 25, 92, { demo: true }),
        bulkGeneration.logAuraOptimization('neural_enhancement', 78, 95, { improvement: 17 }),
        bulkGeneration.logAnalyticsActivity('real_time_insights', 1500, { insights: 'premium quality' }),
        bulkGeneration.logSecurityActivity('anomaly_detection', 'medium', { detected: 2 })
      ]);
    });
    
    console.log('   ✅ Logged 4 different activity types\n');

    // 2. Enhanced Generation with Activity Tracking - With performance monitoring
    console.log('🚀 2. Enhanced Generation with Activity Tracking');
    console.log('   - Running bulk traffic generation with full logging...');
    
    const result = await measurePerformance('Bulk Traffic Generation', async () => {
      return bulkGeneration.generateBulkTrafficWithAura('demo', 8, {
        auraQualityTarget: 88,
        delay: 100,
        optimizeMemory: true // New option for memory optimization
      });
    });
    
    console.log(`   ✅ Generated ${result.totalGenerated} traffic entries`);
    console.log(`   📈 Average Aura Score: ${result.auraMetrics.averageScore.toFixed(2)}`);
    console.log(`   🎯 Quality Distribution: ${JSON.stringify(result.auraMetrics.qualityDistribution)}`);
    console.log(`   ⏱️  Processing Time: ${result.processingTime}ms\n`);

    // 3. AI Optimization with Activity Logging - Enhanced with caching
    console.log('🤖 3. AI Optimization with Activity Logging');
    console.log('   - Running AI-powered optimization...');
    
    const aiResult = await measurePerformance('AI Optimization', async () => {
      return bulkGeneration.generateAIOptimizedTraffic('demo_ai', 5, {
        aiLearning: true,
        adaptiveOptimization: true,
        predictiveModeling: true,
        useCache: true // Enable caching for better performance
      });
    });
    
    console.log(`   ✅ AI Enhancement: ${aiResult.aiEnhanced ? 'Enabled' : 'Disabled'}`);
    console.log(`   🧠 Optimization Score: ${aiResult.aiOptimization.optimizationScore.toFixed(2)}\n`);

    // 4. Advanced Analytics with Activity Logging - Optimized for speed
    console.log('📈 4. Advanced Analytics with Activity Logging');
    console.log('   - Generating advanced analytics insights...');
    
    const analyticsResult = await measurePerformance('Advanced Analytics', async () => {
      return bulkGeneration.generateAdvancedAuraAnalytics('demo_analytics', '2h', {
        optimizeComputation: true // Enable computation optimization
      });
    });
    
    console.log(`   ✅ Heatmap Data Points: ${analyticsResult.heatmapData.dataPoints.length}`);
    console.log(`   🎯 Forecast Accuracy: ${(analyticsResult.predictiveForecasting.accuracy * 100).toFixed(1)}%`);
    console.log(`   📊 Trend Direction: ${analyticsResult.trendAnalysis.trendDirection}`);
    console.log(`   🔍 Real-time Quality: ${analyticsResult.realTimeInsights.currentQuality.toFixed(2)}\n`);

    // 5. Activity Statistics and Monitoring - With memory optimizations
    console.log('📋 5. Activity Statistics and Monitoring');
    console.log('   - Retrieving comprehensive activity statistics...');
    
    const stats = await measurePerformance('Statistics Retrieval', async () => {
      return bulkGeneration.getActivityStats({
        optimizeRetrieval: true, // New option for optimized data retrieval
        useIndexing: true // Use indexed lookups for faster retrieval
      });
    });
    
    console.log(`   📊 Total Activities: ${stats.total}`);
    console.log(`   💾 Stored Activities: ${stats.stored}`);
    console.log(`   ⏰ Last Hour: ${stats.lastHour}`);
    console.log(`   📦 Storage Utilization: ${stats.storageUtilization}`);
    console.log(`   🏷️  Categories: ${Object.keys(stats.byCategory).join(', ')}`);
    console.log(`   ⚠️  Severities: ${Object.keys(stats.bySeverity).join(', ')}\n`);

    // 6. Real-time Activity Filtering - With optimized data filtering
    console.log('🔍 6. Activity Filtering and Retrieval');
    console.log('   - Demonstrating activity filtering capabilities...');
    
    const [recentActivities, generationActivities, successActivities] = await measurePerformance('Activity Filtering', async () => {
      // Parallel processing for better performance
      return Promise.all([
        bulkGeneration.getRecentActivities(5, null, null, { useIndexing: true }),
        bulkGeneration.getRecentActivities(10, 'generation', null, { useIndexing: true }),
        bulkGeneration.getRecentActivities(10, null, 'success', { useIndexing: true })
      ]);
    });
    
    console.log(`   📄 Recent Activities (5): ${recentActivities.length} found`);
    console.log(`   🎯 Generation Activities: ${generationActivities.length} found`);
    console.log(`   ✅ Success Activities: ${successActivities.length} found\n`);

    // 7. Real-time Listener Demo - With memory leak prevention
    console.log('🔔 7. Real-time Activity Listener');
    console.log('   - Setting up real-time activity monitoring...');
    
    let listenerCount = 0;
    // Optimized listener with debouncing to prevent excessive processing
    const removeListener = bulkGeneration.addRealtimeListener((activity) => {
      listenerCount++;
      console.log(`   🔥 [LIVE] ${activity.category.toUpperCase()}: ${activity.action} (${activity.severity})`);
    }, { debounce: 50 }); // Add debouncing to prevent excessive processing
    
    // Trigger activities more efficiently in batch
    console.log('   - Triggering activities to demonstrate real-time monitoring...');
    await Promise.all([
      bulkGeneration.logActivity('demo', 'real_time_test_1', { demo: true }, 'info'),
      bulkGeneration.logActivity('demo', 'real_time_test_2', { demo: true }, 'success'),
      bulkGeneration.logActivity('demo', 'real_time_test_3', { demo: true }, 'warning')
    ]);
    
    // Use a more efficient Promise-based approach
    return new Promise((resolve) => {
      setTimeout(async () => {
        // Clean up listener to prevent memory leaks
        removeListener();
        console.log(`   ✅ Real-time listener received ${listenerCount} activities\n`);
        
        // 8. Activity Backup Demo - With compression for efficiency
        console.log('💾 8. Activity Backup and Maintenance');
        console.log('   - Performing activity backup...');
        
        try {
          await measurePerformance('Activity Backup', async () => {
            return bulkGeneration.backupActivities({ 
              compress: true, // Enable compression
              optimize: true  // Enable optimization
            });
          });
          
          console.log('   ✅ Activity backup completed successfully');
          
          // 9. Final Statistics with memory usage report
          console.log('\n📈 Final Activity Statistics:');
          const finalStats = await bulkGeneration.getActivityStats({ fullReport: true });
          console.log(`   Total Activities Generated: ${finalStats.total}`);
          console.log(`   System Uptime: ${process.uptime().toFixed(2)}s`);
          
          // Enhanced memory usage reporting
          const memoryUsage = getMemoryUsage();
          console.log('   🧠 Memory Usage:');
          console.log(`     - RSS: ${memoryUsage.rss}`);
          console.log(`     - Heap Total: ${memoryUsage.heapTotal}`);
          console.log(`     - Heap Used: ${memoryUsage.heapUsed}`);
          
          console.log('\n🎉 Advanced Aura Features Demo Complete!');
          console.log('🔥 Real-time generation activity recording is fully operational!');
          console.log('\n💡 Key Features Demonstrated:');
          console.log('   ✅ Real-time activity logging for all generation operations');
          console.log('   ✅ Comprehensive activity tracking with context and metrics');
          console.log('   ✅ Advanced filtering and retrieval capabilities');
          console.log('   ✅ Live activity monitoring with real-time listeners');
          console.log('   ✅ Automatic backup and maintenance functionality');
          console.log('   ✅ Enhanced generation methods with full activity integration');
          console.log('   ✅ Memory-optimized processing with performance monitoring');
          console.log('\n🚀 Ready for production use with complete activity audit trail!');
          
          resolve();
        } catch (error) {
          console.log(`   ❌ Backup failed: ${error.message}`);
          resolve();
        }
      }, 100);
    });
  } catch (error) {
    console.error('Demo failed with error:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the demo with global error handling
demoAdvancedAuraFeatures().catch(error => {
  console.error('Unhandled exception in demo:', error);
  process.exit(1);
});