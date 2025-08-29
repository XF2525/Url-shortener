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

// Import middleware
const { securityHeaders, rateLimit } = require('./src/middleware/security');
const { requireAuth, requireAdvancedAuth, requireUltraSecureAuth } = require('./src/middleware/auth');

// Import controllers
const MainController = require('./src/controllers/MainController');
const AdminController = require('./src/controllers/AdminController');

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

// Main application routes
app.get('/', MainController.getHomepage);
app.post('/shorten', MainController.shortenUrl);

// Admin routes (requires authentication)
app.get('/admin', requireAuth, AdminController.getDashboard);
app.get('/admin/api/analytics', requireAuth, AdminController.getAllAnalytics);
app.get('/admin/api/analytics/:shortCode', requireAuth, AdminController.getAnalytics);
app.get('/admin/api/status', requireAuth, AdminController.getSystemStatus);

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

// NEW: Aura Parallels Features API Routes
app.post('/admin/api/aura/parallels-features', requireUltraSecureAuth, AdminController.generateParallelsAuraFeatures);
app.get('/admin/api/aura/parallels-status', requireAdvancedAuth, AdminController.getParallelsStatus);
app.post('/admin/api/aura/test-parallels', requireAdvancedAuth, AdminController.testParallelsFeatures);

// NEW: Comprehensive Aura Dashboard & Testing API Routes
app.get('/admin/api/aura/dashboard', requireAdvancedAuth, AdminController.getComprehensiveAuraDashboard);
app.post('/admin/api/aura/test-all-features', requireAdvancedAuth, AdminController.testAllAuraFeatures);

// NEW: Bulk Features Verification API Routes - Ensure IP/UA rotation is working
app.get('/admin/api/bulk/verify', requireAdvancedAuth, AdminController.verifyBulkFeatures);
app.get('/admin/api/bulk/test-ip-rotation', requireAdvancedAuth, AdminController.testIPRotation);
app.get('/admin/api/bulk/test-ua-rotation', requireAdvancedAuth, AdminController.testUserAgentRotation);

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