/**
 * Security middleware for the URL shortener application
 */

const { CONFIG } = require('../config/constants');

/**
 * Security headers middleware
 */
function securityHeaders(req, res, next) {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CORS headers for API endpoints
  if (req.path.startsWith('/admin/api/') || req.path.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  }
  
  next();
}

// Rate limiting store (simple in-memory implementation)
const rateLimitStore = new Map();

/**
 * Optimized rate limiting middleware with better performance
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} maxRequests - Maximum requests per window
 * @returns {function} Middleware function
 */
function rateLimit(windowMs = CONFIG.SECURITY.RATE_LIMIT_WINDOW, maxRequests = CONFIG.SECURITY.RATE_LIMIT_MAX) {
  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Efficient cleanup: only clean when store gets large
    if (rateLimitStore.size > 1000) {
      const keysToDelete = [];
      
      // Collect expired entries
      for (const [key, requests] of rateLimitStore.entries()) {
        const recentRequests = requests.filter(time => time > windowStart);
        if (recentRequests.length === 0) {
          keysToDelete.push(key);
        } else {
          rateLimitStore.set(key, recentRequests);
        }
      }
      
      // Batch delete expired entries
      keysToDelete.forEach(key => rateLimitStore.delete(key));
    }
    
    // Get and filter current requests for this client
    const clientRequests = rateLimitStore.get(clientId) || [];
    const recentRequests = clientRequests.filter(time => time > windowStart);
    
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({ 
        error: 'Too many requests', 
        retryAfter: Math.ceil(windowMs / 1000),
        limit: maxRequests,
        current: recentRequests.length
      });
    }
    
    // Add current request and update store
    recentRequests.push(now);
    rateLimitStore.set(clientId, recentRequests);
    
    // Add rate limit headers for transparency
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - recentRequests.length));
    res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
    
    next();
  };
}

module.exports = {
  securityHeaders,
  rateLimit,
  rateLimitStore
};