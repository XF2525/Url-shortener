/**
 * URL Shortener Application - MVP Structure
 * Clean, modular architecture with proper separation of concerns
 */

// Check if dependencies are installed
try {
  require('express');
} catch (error) {
  console.error('\n❌ Dependencies not installed!');
  console.error('Please run: npm install');
  console.error('Or use the quick setup script: ./setup.sh');
  console.error('\nFor more information, see README.md\n');
  process.exit(1);
}

const express = require('express');
const { CONFIG } = require('./src/config/constants');
// Fix: Add missing bulkGeneration import
const bulkGeneration = require('./src/utils/bulkGeneration');

// Import middleware
const { securityHeaders, rateLimit } = require('./src/middleware/security');
const { requireAuth, requireAdvancedAuth, requireUltraSecureAuth } = require('./src/middleware/auth');

// Import controllers
const MainController = require('./src/controllers/MainController');
const AdminController = require('./src/controllers/AdminController');
const BlogController = require('./src/controllers/BlogController');

// Create Express application
const app = express();
const PORT = CONFIG.PORT;

// Security and parsing middleware
app.use(express.json({ limit: CONFIG.SECURITY.JSON_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: CONFIG.SECURITY.JSON_LIMIT }));

// Apply security headers to all routes
app.use(securityHeaders);

// Apply rate limiting to all routes
app.use(rateLimit());

// Trust proxy for proper IP detection (important for rate limiting)
app.set('trust proxy', true);

// Routes

// Health check endpoint (no auth required)
app.get('/health', MainController.healthCheck);

// Blog routes (public)
app.get('/blog', MainController.getBlogPage);
app.get('/blog/:id', MainController.getBlogPostPage);

// Memory management endpoints (no auth required for basic stats)
app.get('/api/memory-stats', MainController.getMemoryStats);
app.get('/api/export-data', MainController.exportData);
app.post('/api/create-backup', MainController.createBackup);

// Main application routes
app.get('/', MainController.getHomepage);
app.post('/shorten', MainController.shortenUrl);

// Admin routes
app.get('/admin', AdminController.getLoginPage); // Login page (no auth required)
app.get('/admin/dashboard', AdminController.getDashboard); // Dashboard with client-side auth
app.get('/admin/api/analytics', requireAuth, AdminController.getAllAnalytics);
app.get('/admin/api/analytics/:shortCode', requireAuth, AdminController.getAnalytics);
app.get('/admin/api/status', requireAuth, AdminController.getSystemStatus);

// Blog API routes (admin only)
app.get('/admin/api/blog', requireAuth, BlogController.getAllBlogPosts);
app.post('/admin/api/blog', requireAuth, BlogController.createBlogPost);
app.get('/admin/api/blog/:id', requireAuth, BlogController.getBlogPostById);
app.put('/admin/api/blog/:id', requireAuth, BlogController.updateBlogPost);
app.delete('/admin/api/blog/:id', requireAuth, BlogController.deleteBlogPost);

// Enhanced Bulk Generation Routes (requires ultra-secure authentication)
app.post('/admin/api/automation/generate-clicks', requireUltraSecureAuth, AdminController.generateBulkClicks);
app.post('/admin/api/automation/generate-bulk-clicks', requireUltraSecureAuth, AdminController.generateBulkClicksAll);
app.post('/admin/api/blog/automation/generate-views', requireUltraSecureAuth, AdminController.generateBlogViews);

// EXPERIMENTAL: Advanced Blog Views with Ads Interactions (requires ultra-secure authentication)
app.post('/admin/api/blog/automation/generate-advanced-views-with-ads', requireUltraSecureAuth, AdminController.generateAdvancedBlogViewsWithAds);

// Background continuous generation endpoints (requires ultra-secure authentication)
app.post('/admin/api/automation/start-background-clicks', requireUltraSecureAuth, AdminController.startBackgroundClicks);
app.post('/admin/api/automation/start-background-views', requireUltraSecureAuth, AdminController.startBackgroundViews);
app.post('/admin/api/automation/stop-background-processes', requireUltraSecureAuth, AdminController.stopBackgroundProcesses);
app.get('/admin/api/automation/background-status', requireAdvancedAuth, AdminController.getBackgroundStatus);

// Bulk generation management routes (requires advanced authentication)
app.get('/admin/api/automation/stats', requireAdvancedAuth, AdminController.getBulkGenerationStats);
app.post('/admin/api/automation/emergency-stop', requireAdvancedAuth, AdminController.emergencyStopBulkOperations);
app.post('/admin/api/automation/cleanup', requireAdvancedAuth, AdminController.performSecurityCleanup);

// ENHANCED: Comprehensive Aura Features API Routes - Many More Advanced Capabilities
app.post('/admin/api/aura/generate-clicks', requireUltraSecureAuth, AdminController.generateBulkClicksWithAura);
app.post('/admin/api/aura/generate-blog-views', requireUltraSecureAuth, AdminController.generateBlogViewsWithAura);
app.get('/admin/api/aura/status', requireAdvancedAuth, AdminController.getAuraStatus);

// NEW: Advanced Aura Intelligence API Routes
app.post('/admin/api/aura/ai-optimized-traffic', requireUltraSecureAuth, AdminController.generateAIOptimizedTraffic);
app.get('/admin/api/aura/advanced-analytics', requireAdvancedAuth, AdminController.getAdvancedAuraAnalytics);
app.post('/admin/api/aura/human-behavior', requireAdvancedAuth, AdminController.generateHumanLikeBehavior);

// NEW: Aura Geographic Intelligence API Routes
app.get('/admin/api/aura/geographic-intelligence', requireAdvancedAuth, AdminController.getGeographicIntelligence);
app.post('/admin/api/aura/security-enhanced-traffic', requireUltraSecureAuth, AdminController.generateSecurityEnhancedTraffic);

// NEW: Aura Performance & Quality API Routes
app.post('/admin/api/aura/optimize-performance', requireAdvancedAuth, AdminController.optimizeAuraPerformance);
app.post('/admin/api/aura/quality-assurance', requireAdvancedAuth, AdminController.implementAuraQualityAssurance);

// NEW: Aura Customization API Routes
app.post('/admin/api/aura/custom-profile', requireAdvancedAuth, AdminController.generateCustomAuraProfile);
app.post('/admin/api/aura/nextgen-features', requireUltraSecureAuth, AdminController.generateNextGenAuraFeatures);

// NEW: Aura Parallels Features API Routes (Enhanced with Quantum Efficiency)
app.post('/admin/api/aura/parallels-features', requireUltraSecureAuth, AdminController.generateParallelsAuraFeatures);
app.get('/admin/api/aura/parallels-status', requireAdvancedAuth, AdminController.getParallelsStatus);
app.post('/admin/api/aura/test-parallels', requireAdvancedAuth, AdminController.testParallelsFeatures);

// NEW: Code Efficiency and Performance Optimization APIs
app.post('/admin/api/efficiency/analyze-code', requireUltraSecureAuth, (req, res) => {
  try {
    const { operationType = 'efficiency_analysis', executionMetrics = {} } = req.body;
    console.log(`[EFFICIENCY-API] Analyzing code efficiency for ${operationType}`);
    
    const analysis = bulkGeneration.analyzeCodeEfficiency(operationType, executionMetrics);
    
    res.json({
      success: true,
      message: 'Code efficiency analysis completed',
      analysis: analysis,
      efficiencyScore: analysis.efficiencyScore,
      recommendations: analysis.recommendations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[EFFICIENCY-API] Code analysis failed:', error);
    res.status(500).json({ error: 'Code efficiency analysis failed', details: error.message });
  }
});

app.post('/admin/api/efficiency/optimize-config', requireUltraSecureAuth, (req, res) => {
  try {
    // Add validation for input parameters
    const parallelTasks = Math.max(1, Math.min(1000000, parseInt(req.body.parallelTasks) || 100));
    const options = req.body.options || {};
    
    console.log(`[EFFICIENCY-API] Optimizing configuration for ${parallelTasks} parallel tasks`);
    
    // Add request timeout protection
    const timeoutId = setTimeout(() => {
      console.error('[EFFICIENCY-API] Optimization operation timed out');
      return res.status(408).json({ 
        error: 'Request timeout', 
        message: 'Configuration optimization operation took too long to complete'
      });
    }, 30000); // 30 second timeout
    
    const optimizedConfig = bulkGeneration.optimizeParallelsConfiguration(parallelTasks, options);
    const performanceProjection = bulkGeneration.calculatePerformanceProjection(parallelTasks, optimizedConfig);
    
    // Clear timeout since operation completed
    clearTimeout(timeoutId);
    
    res.json({
      success: true,
      message: 'Configuration optimization completed',
      optimizedConfig: optimizedConfig,
      performanceProjection: performanceProjection,
      parallelTasks: parallelTasks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[EFFICIENCY-API] Configuration optimization failed:', error);
    res.status(500).json({ 
      error: 'Configuration optimization failed', 
      details: error.message,
      stack: CONFIG.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/admin/api/efficiency/auto-optimize', requireUltraSecureAuth, (req, res) => {
  try {
    const { currentConfig = {}, performanceMetrics = {} } = req.body;
    console.log(`[EFFICIENCY-API] Auto-optimizing configuration based on performance metrics`);
    
    const autoOptimizedConfig = bulkGeneration.autoOptimizeParallels(currentConfig, performanceMetrics);
    
    res.json({
      success: true,
      message: 'Auto-optimization completed',
      originalConfig: currentConfig,
      optimizedConfig: autoOptimizedConfig,
      optimizationReason: autoOptimizedConfig.optimizationReason,
      performanceMetrics: performanceMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[EFFICIENCY-API] Auto-optimization failed:', error);
    res.status(500).json({ error: 'Auto-optimization failed', details: error.message });
  }
});

// NEW: Quantum Efficiency Testing API
app.post('/admin/api/efficiency/quantum-test', requireUltraSecureAuth, (req, res) => {
  try {
    // Validate and sanitize input parameters
    const parallelTasks = Math.max(1, Math.min(1000000, parseInt(req.body.parallelTasks) || 10000));
    const testDuration = Math.max(1, Math.min(300, parseInt(req.body.testDuration) || 30));
    
    console.log(`[QUANTUM-EFFICIENCY] Testing quantum efficiency with ${parallelTasks} parallel tasks`);
    
    // Add request timeout protection (testDuration + 5 seconds buffer)
    const timeoutId = setTimeout(() => {
      console.error('[QUANTUM-EFFICIENCY] Test operation timed out');
      return res.status(408).json({ 
        error: 'Request timeout', 
        message: 'Quantum efficiency test took too long to complete'
      });
    }, (testDuration + 5) * 1000);
    
    // Add performance monitoring
    const startTime = process.hrtime();
    
    // Execute test with validated parameters
    const quantumTest = bulkGeneration.generateParallelsAuraFeatures('quantum_efficiency_test', {
      parallelTasks,
      quantumEfficiencyMode: true,
      ultraHighThroughput: parallelTasks > 50000,
      coordinationLevel: 'superiorpowers',
      autoOptimization: true,
      testDuration
    });
    
    // Calculate actual execution time
    const endTime = process.hrtime(startTime);
    const executionTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
    
    // Clear timeout since operation completed
    clearTimeout(timeoutId);
    
    res.json({
      success: true,
      message: 'Quantum efficiency test completed',
      testResults: {
        parallelTasks: parallelTasks,
        quantumSpeedup: quantumTest.optimizedConfiguration?.quantumSpeedup,
        efficiencyGain: quantumTest.optimizedConfiguration?.efficiencyGain,
        quantumEntanglement: quantumTest.optimizedConfiguration?.quantumEntanglement,
        projectedSpeedup: quantumTest.performanceProjection?.speedupFactor,
        efficiencyScore: quantumTest.performanceProjection?.efficiencyScore
      },
      quantumMetrics: quantumTest.optimizedConfiguration,
      performanceProjection: quantumTest.performanceProjection,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[QUANTUM-EFFICIENCY] Quantum test failed:', error);
    res.status(500).json({ 
      error: 'Quantum efficiency test failed', 
      details: error.message,
      stack: CONFIG.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// NEW: Ultra-High Throughput Testing API (1M+ parallels)
app.post('/admin/api/efficiency/ultra-throughput-test', requireUltraSecureAuth, (req, res) => {
  try {
    const { parallelTasks = 100000, maxTasks = 1000000 } = req.body;
    const effectiveTasks = Math.min(parallelTasks, maxTasks);
    
    console.log(`[ULTRA-THROUGHPUT] Testing ultra-high throughput with ${effectiveTasks} parallel tasks`);
    
    const throughputTest = bulkGeneration.generateParallelsAuraFeatures('ultra_throughput_test', {
      parallelTasks: effectiveTasks,
      ultraHighThroughput: true,
      quantumEfficiencyMode: true,
      superiorPowersMode: true,
      realTimeProcessing: true,
      massiveScaleMode: true,
      coordinationLevel: 'superiorpowers',
      autoOptimization: true
    });
    
    res.json({
      success: true,
      message: 'Ultra-high throughput test completed',
      testResults: {
        parallelTasks: effectiveTasks,
        maxSupportedParallels: throughputTest.maxSupportedParallels,
        throughputActive: throughputTest.ultraHighThroughputActive,
        pipelineDepth: throughputTest.optimizedConfiguration?.pipelineDepth,
        vectorProcessing: throughputTest.optimizedConfiguration?.vectorProcessing,
        projectedSpeedup: throughputTest.performanceProjection?.speedupFactor,
        resourceUtilization: throughputTest.performanceProjection?.resourceUtilization
      },
      throughputMetrics: throughputTest.optimizedConfiguration,
      performanceProjection: throughputTest.performanceProjection,
      recommendations: throughputTest.performanceProjection?.recommendedConfiguration,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ULTRA-THROUGHPUT] Ultra-throughput test failed:', error);
    res.status(500).json({ error: 'Ultra-high throughput test failed', details: error.message });
  }
});

// NEW: Comprehensive Aura Dashboard & Testing API Routes
app.get('/admin/api/aura/dashboard', requireAdvancedAuth, AdminController.getComprehensiveAuraDashboard);
app.post('/admin/api/aura/test-all-features', requireAdvancedAuth, AdminController.testAllAuraFeatures);

// NEW: Bulk Features Verification API Routes - Ensure IP/UA rotation is working
app.get('/admin/api/bulk/verify', requireAdvancedAuth, AdminController.verifyBulkFeatures);
app.get('/admin/api/bulk/test-ip-rotation', requireAdvancedAuth, AdminController.testIPRotation);
app.get('/admin/api/bulk/test-ua-rotation', requireAdvancedAuth, AdminController.testUserAgentRotation);

// NEW: Advanced Aura Activity Logging API Routes
app.get('/admin/api/activity/recent', requireAdvancedAuth, AdminController.getRecentActivities);
app.get('/admin/api/activity/stats', requireAdvancedAuth, AdminController.getActivityStats);
app.get('/admin/api/activity/stream', requireAdvancedAuth, AdminController.getActivityStream);
app.post('/admin/api/activity/cleanup', requireAdvancedAuth, AdminController.cleanupActivities);
app.post('/admin/api/activity/backup', requireAdvancedAuth, AdminController.backupActivities);

// NEW: Advanced Features from ADVANCED_FEATURES_GUIDE.md
app.post('/admin/api/automation/generate-session-clicks', requireUltraSecureAuth, AdminController.generateSessionClicks);
app.post('/admin/api/automation/generate-geo-targeted-clicks', requireUltraSecureAuth, AdminController.generateGeoTargetedClicks);
app.post('/admin/api/automation/simulate-viral-traffic', requireUltraSecureAuth, AdminController.simulateViralTraffic);
app.post('/admin/api/automation/generate-ab-test-traffic', requireUltraSecureAuth, AdminController.generateABTestTraffic);

// NEW: Enhanced Experimental Features API Routes
app.post('/admin/api/experimental/ai-traffic-patterns', requireUltraSecureAuth, AdminController.generateAITrafficPatterns);
app.post('/admin/api/experimental/behavioral-traffic', requireUltraSecureAuth, AdminController.generateBehavioralTraffic);
app.post('/admin/api/experimental/traffic-wave', requireUltraSecureAuth, AdminController.simulateTrafficWave);
app.post('/admin/api/experimental/gamification', requireUltraSecureAuth, AdminController.testGamification);
app.post('/admin/api/experimental/predictive-analytics', requireAdvancedAuth, AdminController.runPredictiveAnalytics);
app.post('/admin/api/experimental/multi-dimensional-test', requireUltraSecureAuth, AdminController.runMultiDimensionalTest);
app.post('/admin/api/experimental/real-time-optimization', requireUltraSecureAuth, AdminController.startRealTimeOptimization);
app.post('/admin/api/experimental/persona-simulation', requireAdvancedAuth, AdminController.simulatePersonas);

// NEW: Advanced Aura Intelligence System API Routes
app.post('/admin/api/aura/digital-consciousness', requireUltraSecureAuth, AdminController.simulateDigitalConsciousness);
app.post('/admin/api/aura/emotional-intelligence', requireUltraSecureAuth, AdminController.activateEmotionalIntelligence);
app.post('/admin/api/aura/quantum-entanglement', requireUltraSecureAuth, AdminController.activateQuantumEntanglement);
app.post('/admin/api/aura/dimensional-portal', requireUltraSecureAuth, AdminController.openDimensionalPortal);
app.post('/admin/api/aura/reality-manipulation', requireUltraSecureAuth, AdminController.activateRealityManipulation);
app.post('/admin/api/aura/cosmic-resonance', requireUltraSecureAuth, AdminController.activateCosmicResonance);
app.post('/admin/api/aura/temporal-manipulation', requireUltraSecureAuth, AdminController.activateTemporalManipulation);
app.post('/admin/api/aura/energy-field', requireUltraSecureAuth, AdminController.generateEnergyField);

// NEW: Aura System Status Monitoring API Routes
app.get('/admin/api/aura/neural-status', requireAdvancedAuth, AdminController.checkNeuralNetworkStatus);
app.get('/admin/api/aura/quantum-status', requireAdvancedAuth, AdminController.checkQuantumSystems);
app.get('/admin/api/aura/portal-status', requireAdvancedAuth, AdminController.checkPortalStatus);
app.get('/admin/api/aura/temporal-status', requireAdvancedAuth, AdminController.checkTemporalSystems);

// NEW: Aura Master Control API Routes
app.post('/admin/api/aura/master-mode', requireUltraSecureAuth, AdminController.activateAuraMasterMode);
app.post('/admin/api/aura/emergency-shutdown', requireAdvancedAuth, AdminController.emergencyAuraShutdown);
app.post('/admin/api/automation/simulate-viral-traffic', requireUltraSecureAuth, AdminController.simulateViralTraffic);
app.post('/admin/api/automation/generate-ab-test-traffic', requireUltraSecureAuth, AdminController.generateABTestTraffic);
app.get('/admin/api/automation/advanced-analytics', requireAdvancedAuth, AdminController.getAdvancedAnalyticsFromGuide);

// Short URL redirect (must be last to avoid conflicts)
app.get('/:shortCode', MainController.redirectToOriginal);

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
      <h1>🔗 Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <a href="/" style="color: #3498db; text-decoration: none;">← Go back to homepage</a>
    </div>
  `);
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
    message: CONFIG.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Graceful shutdown handling
function gracefulShutdown() {
  console.log('\n[SHUTDOWN] Gracefully shutting down...');
  
  // Stop background workers
  try {
    const { stopBackgroundWorkers } = require('./src/utils/backgroundWorkers');
    stopBackgroundWorkers();
  } catch (error) {
    console.log('[SHUTDOWN] Note: Background workers cleanup completed or not running');
  }
  
  // Stop auth cleanup interval
  try {
    const { stopAuthCleanup } = require('./src/middleware/auth');
    stopAuthCleanup();
  } catch (error) {
    console.log('[SHUTDOWN] Note: Auth cleanup already stopped');
  }
  
  // Close server
  server.close(() => {
    console.log('[SHUTDOWN] HTTP server closed');
    process.exit(0);
  });
  
  // Force close after timeout
  setTimeout(() => {
    console.log('[SHUTDOWN] Forcing shutdown');
    process.exit(1);
  }, 10000);
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`URL Shortener server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to use the URL shortener`);
  console.log(`Environment: ${CONFIG.NODE_ENV}`);
});

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;