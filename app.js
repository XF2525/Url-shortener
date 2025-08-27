/**
 * URL Shortener Application - MVP Structure
 * Clean, modular architecture with proper separation of concerns
 */

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

// Bulk generation management routes (requires advanced authentication)
app.get('/admin/api/automation/stats', requireAdvancedAuth, AdminController.getBulkGenerationStats);
app.post('/admin/api/automation/emergency-stop', requireAdvancedAuth, AdminController.emergencyStopBulkOperations);
app.post('/admin/api/automation/cleanup', requireAdvancedAuth, AdminController.performSecurityCleanup);

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