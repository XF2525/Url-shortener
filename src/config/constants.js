/**
 * Configuration constants for the URL shortener application
 */

const CONFIG = {
  // Application settings
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Limits and performance settings
  HISTORY_LIMIT: 100,
  OPERATIONS_LOG_LIMIT: 1000,
  BULK_CLICK_LIMIT: 50,
  BULK_BLOG_VIEW_LIMIT: 30,
  
  // Memory management settings
  MAX_URLS_IN_MEMORY: 10000,
  MAX_ANALYTICS_HISTORY: 1000,
  CLEANUP_INTERVAL: 3600000, // 1 hour
  VALIDATION_CACHE_LIMIT: 1000,
  
  // Timing configurations
  BASE_DELAYS: {
    CLICK_GENERATION: 200,
    BLOG_VIEW_GENERATION: 300
  },
  
  TIME_WINDOWS: {
    ONE_HOUR: 60 * 60 * 1000,
    ONE_DAY: 24 * 60 * 60 * 1000
  },
  
  // Cache durations
  CACHE_DURATIONS: {
    ANALYTICS: 10000, // 10 seconds
    HTML_TEMPLATES: 30000, // 30 seconds
    STATIC_CONTENT: 60000 // 1 minute
  },
  
  // HTTP response headers
  RESPONSE_HEADERS: {
    JSON: { 'Content-Type': 'application/json' },
    HTML: { 'Content-Type': 'text/html; charset=utf-8' },
    CACHE_CONTROL: { 'Cache-Control': 'public, max-age=300' }
  },
  
  // Security settings
  SECURITY: {
    JSON_LIMIT: '1mb',
    RATE_LIMIT_WINDOW: 60000, // 1 minute
    RATE_LIMIT_MAX: 100
  },
  
  // URL shortening settings
  SHORT_CODE_LENGTH: 6,
  SHORT_CODE_CHARS: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
};

// Admin credentials (should be from environment in production)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

module.exports = {
  CONFIG,
  ADMIN_PASSWORD
};