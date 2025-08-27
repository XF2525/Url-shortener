/**
 * Authentication middleware
 */

const { ADMIN_PASSWORD } = require('../config/constants');
const bulkGeneration = require('../utils/bulkGeneration');

// Track authentication attempts for security
const authAttempts = new Map();

/**
 * Basic admin authentication middleware
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Next middleware function
 */
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth === `Bearer ${ADMIN_PASSWORD}`) {
    next();
  } else {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Valid authorization header required'
    });
  }
}

/**
 * Advanced admin authentication with enhanced security for bulk operations
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Next middleware function
 */
function requireAdvancedAuth(req, res, next) {
  try {
    // Basic auth check
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Valid authorization header required'
      });
    }
    
    // Get client IP for security tracking
    const ip = bulkGeneration.getClientIP(req);
    const path = req.path;
    const timestamp = Date.now();
    
    // Track authentication attempts
    if (!authAttempts.has(ip)) {
      authAttempts.set(ip, { attempts: [], lastSuccess: null });
    }
    
    const tracking = authAttempts.get(ip);
    tracking.attempts = tracking.attempts.filter(attempt => 
      timestamp - attempt < 3600000 // Keep last hour
    );
    tracking.lastSuccess = timestamp;
    
    // Enhanced security checks for bulk/automation endpoints
    if (path.includes('/automation/') || path.includes('/bulk')) {
      // Additional validation for bulk operations
      const userAgent = req.headers['user-agent'] || 'unknown';
      const contentType = req.headers['content-type'] || '';
      
      // Check for suspicious patterns
      if (userAgent === 'unknown' || userAgent.length < 10) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid user agent for bulk operations'
        });
      }
      
      // Ensure proper content type for POST requests
      if (req.method === 'POST' && !contentType.includes('application/json')) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Content-Type must be application/json for bulk operations'
        });
      }
      
      // Rate limiting for authentication attempts
      const recentAttempts = tracking.attempts.length;
      if (recentAttempts > 20) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Authentication rate limit exceeded'
        });
      }
    }
    
    // Log the operation attempt for audit trail
    console.log(`[AUTH] Admin access from ${ip} to ${path} - User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'unknown'}`);
    
    // Add security context to request
    req.securityContext = {
      ip,
      timestamp,
      path,
      authenticated: true,
      authLevel: 'advanced'
    };
    
    next();
    
  } catch (error) {
    console.error('[AUTH] Advanced authentication error:', error);
    res.status(500).json({
      error: 'Authentication system error',
      message: 'Please try again later'
    });
  }
}

/**
 * Ultra-secure authentication for sensitive bulk operations
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Next middleware function
 */
function requireUltraSecureAuth(req, res, next) {
  try {
    // First run advanced auth
    requireAdvancedAuth(req, res, (error) => {
      if (error) return;
      
      const ip = req.securityContext.ip;
      const timestamp = Date.now();
      
      // Additional security checks for ultra-sensitive operations
      
      // Check if this is a bulk operation during suspicious hours
      const hour = new Date().getHours();
      if ((hour < 6 || hour > 22) && req.body && (req.body.clickCount > 50 || req.body.viewCount > 100)) {
        console.warn(`[SECURITY] Suspicious bulk operation attempt at ${hour}:00 from ${ip}`);
        
        // Allow but with extra logging and reduced limits
        req.securityContext.suspiciousHours = true;
        req.securityContext.reducedLimits = true;
      }
      
      // Check request size and frequency
      const bodySize = JSON.stringify(req.body || {}).length;
      if (bodySize > 10000) { // 10KB limit for bulk requests
        return res.status(413).json({
          error: 'Request too large',
          message: 'Bulk operation request exceeds size limit'
        });
      }
      
      // Enhanced logging for ultra-secure operations
      console.log(`[ULTRA-AUTH] Authorized ultra-secure operation from ${ip}: ${req.method} ${req.path}`);
      console.log(`[ULTRA-AUTH] Request size: ${bodySize} bytes, Body keys: ${Object.keys(req.body || {}).join(', ')}`);
      
      req.securityContext.authLevel = 'ultra_secure';
      next();
    });
    
  } catch (error) {
    console.error('[AUTH] Ultra-secure authentication error:', error);
    res.status(500).json({
      error: 'Ultra-secure authentication system error',
      message: 'Please try again later'
    });
  }
}

/**
 * Cleanup old authentication attempts
 */
function cleanupAuthAttempts() {
  const now = Date.now();
  const cleanupThreshold = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [ip, tracking] of authAttempts.entries()) {
    tracking.attempts = tracking.attempts.filter(attempt => 
      now - attempt < cleanupThreshold
    );
    
    if (tracking.attempts.length === 0 && (!tracking.lastSuccess || now - tracking.lastSuccess > cleanupThreshold)) {
      authAttempts.delete(ip);
    }
  }
  
  console.log(`[AUTH] Cleanup completed: ${authAttempts.size} IPs being tracked`);
}

// Run cleanup every hour
setInterval(cleanupAuthAttempts, 3600000);

module.exports = {
  requireAuth,
  requireAdvancedAuth,
  requireUltraSecureAuth,
  cleanupAuthAttempts
};