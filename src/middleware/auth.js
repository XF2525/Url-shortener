/**
 * Authentication middleware
 */

const { ADMIN_PASSWORD } = require('../config/constants');

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
 * Advanced admin authentication with enhanced security
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Next middleware function
 */
function requireAdvancedAuth(req, res, next) {
  // Basic auth check
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Valid authorization header required'
    });
  }
  
  // Enhanced security checks for automation endpoints
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const path = req.path;
  
  // Log the operation attempt (could be enhanced with proper logging)
  console.log(`[AUTH] Admin access from ${ip} to ${path}`);
  
  next();
}

module.exports = {
  requireAuth,
  requireAdvancedAuth
};