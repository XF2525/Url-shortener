/**
 * Enhanced input validation utilities with caching for better performance
 */

const { cacheUtils } = require('./cache');

const validator = {
  // URL validation cache for repeated validations
  _urlCache: new Map(),
  
  /**
   * Validate URL with caching
   * @param {string} url - URL to validate
   * @returns {boolean} Whether URL is valid
   */
  isValidUrl(url) {
    // Input validation to prevent issues
    if (!url || typeof url !== 'string' || url.length > 2048) {
      return false;
    }
    
    // Check cache first for better performance
    if (this._urlCache.has(url)) {
      return this._urlCache.get(url);
    }
    
    try {
      const parsedUrl = new URL(url);
      const isValid = ['http:', 'https:'].includes(parsedUrl.protocol);
      
      // Efficient cache management with LRU-like behavior
      if (this._urlCache.size >= 1000) {
        // Remove first 200 entries efficiently (oldest)
        const keysToDelete = [];
        let count = 0;
        for (const key of this._urlCache.keys()) {
          if (count++ >= 200) break;
          keysToDelete.push(key);
        }
        keysToDelete.forEach(key => this._urlCache.delete(key));
      }
      
      this._urlCache.set(url, isValid);
      return isValid;
    } catch (error) {
      // Only cache valid strings to avoid memory bloat
      if (typeof url === 'string' && url.length < 500) {
        this._urlCache.set(url, false);
      }
      return false;
    }
  },

  /**
   * Validate required fields in data
   * @param {object} schema - Validation schema
   * @param {object} data - Data to validate
   * @returns {array} Array of error messages
   */
  validateInput(schema, data) {
    const errors = [];
    
    // Input validation
    if (!schema || typeof schema !== 'object') {
      return ['Invalid validation schema'];
    }
    
    if (!data || typeof data !== 'object') {
      return ['Invalid data object'];
    }
    
    try {
      for (const [field, rules] of Object.entries(schema)) {
        // Validate rules object
        if (!rules || typeof rules !== 'object') {
          errors.push(`Invalid rules for field ${field}`);
          continue;
        }
        
        const value = data[field];
        
        // Check required fields
        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push(`${field} is required`);
          continue;
        }
        
        // Skip validation if field is not required and empty
        if (!rules.required && (!value || value === '')) {
          continue;
        }
        
        // Type validation with better error messages
        if (rules.type && typeof value !== rules.type) {
          errors.push(`${field} must be of type ${rules.type}, got ${typeof value}`);
          continue;
        }
        
        // String length validation with bounds checking
        if (typeof value === 'string') {
          if (rules.minLength && typeof rules.minLength === 'number' && value.length < rules.minLength) {
            errors.push(`${field} must be at least ${rules.minLength} characters`);
          }
          
          if (rules.maxLength && typeof rules.maxLength === 'number' && value.length > rules.maxLength) {
            errors.push(`${field} must be no more than ${rules.maxLength} characters`);
          }
        }
        
        // URL validation
        if (rules.format === 'url' && !this.isValidUrl(value)) {
          errors.push(`${field} must be a valid URL`);
        }
        
        // Custom validation function with error handling
        if (rules.validate && typeof rules.validate === 'function') {
          try {
            const customError = rules.validate(value);
            if (customError) {
              errors.push(`${field} ${customError}`);
            }
          } catch (validationError) {
            errors.push(`${field} validation failed: ${validationError.message}`);
          }
        }
        
        // Pattern validation with error handling
        if (rules.pattern) {
          try {
            if (rules.pattern instanceof RegExp && !rules.pattern.test(value)) {
              errors.push(`${field} format is invalid`);
            }
          } catch (patternError) {
            errors.push(`${field} pattern validation failed`);
          }
        }
      }
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }
    
    return errors;
  },

  /**
   * Sanitize HTML input to prevent XSS
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Enhanced XSS prevention
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/\\/g, '&#x5C;')
      .replace(/`/g, '&#96;')
      .replace(/=/g, '&#x3D;');
  },

  /**
   * Enhanced URL normalization to prevent bypass attempts
   * @param {string} url - URL to normalize
   * @returns {object} Result object with normalized URL and validation info
   */
  normalizeUrl(url) {
    if (typeof url !== 'string') {
      return { url: url, valid: false, error: 'URL must be a string' };
    }
    
    try {
      // Check for potentially dangerous protocols
      const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:'];
      const lowerUrl = url.toLowerCase().trim();
      
      for (const protocol of dangerousProtocols) {
        if (lowerUrl.startsWith(protocol)) {
          return { url: '', valid: false, error: `Protocol '${protocol}' is not allowed for security reasons` };
        }
      }
      
      // Normalize using URL constructor
      const normalizedUrl = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(normalizedUrl.protocol)) {
        return { url: '', valid: false, error: `Protocol '${normalizedUrl.protocol}' is not supported. Only HTTP and HTTPS are allowed` };
      }
      
      return { url: normalizedUrl.href, valid: true, error: null };
    } catch (error) {
      return { url: '', valid: false, error: 'Invalid URL format' };
    }
  },

  /**
   * Clear caches periodically to prevent memory leaks
   */
  clearCaches() {
    this._urlCache.clear();
    console.log('[VALIDATION] Caches cleared for memory optimization');
  }
};

module.exports = validator;