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
    // Check cache first for better performance
    if (this._urlCache.has(url)) {
      return this._urlCache.get(url);
    }
    
    try {
      const parsedUrl = new URL(url);
      const isValid = ['http:', 'https:'].includes(parsedUrl.protocol);
      
      // Cache result (with size limit)
      if (this._urlCache.size > 1000) {
        // Clear oldest entries
        const entries = Array.from(this._urlCache.entries());
        entries.slice(0, 500).forEach(([key]) => this._urlCache.delete(key));
      }
      
      this._urlCache.set(url, isValid);
      return isValid;
    } catch (error) {
      this._urlCache.set(url, false);
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
    
    for (const [field, rules] of Object.entries(schema)) {
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
      
      // Type validation
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be of type ${rules.type}`);
      }
      
      // String length validation
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be no more than ${rules.maxLength} characters`);
      }
      
      // URL validation
      if (rules.format === 'url' && !this.isValidUrl(value)) {
        errors.push(`${field} must be a valid URL`);
      }
      
      // Custom validation function
      if (rules.validate && typeof rules.validate === 'function') {
        const customError = rules.validate(value);
        if (customError) {
          errors.push(`${field} ${customError}`);
        }
      }
      
      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
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
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
};

module.exports = validator;