const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced configuration constants for maximum efficiency
const CONFIG = {
  HISTORY_LIMIT: 100,
  OPERATIONS_LOG_LIMIT: 1000,
  BULK_CLICK_LIMIT: 50,
  BULK_BLOG_VIEW_LIMIT: 30,
  BASE_DELAYS: {
    CLICK_GENERATION: 200,
    BLOG_VIEW_GENERATION: 300
  },
  TIME_WINDOWS: {
    ONE_HOUR: 60 * 60 * 1000,
    ONE_DAY: 24 * 60 * 60 * 1000
  },
  CACHE_DURATIONS: {
    ANALYTICS: 10000, // 10 seconds
    HTML_TEMPLATES: 30000, // 30 seconds
    STATIC_CONTENT: 60000 // 1 minute
  },
  RESPONSE_HEADERS: {
    JSON: { 'Content-Type': 'application/json' },
    HTML: { 'Content-Type': 'text/html; charset=utf-8' },
    CACHE_CONTROL: { 'Cache-Control': 'public, max-age=300' }
  }
};

// Enhanced multi-level caching system for optimal performance
const enhancedCache = {
  analytics: { urlStats: null, blogStats: null, lastUpdated: 0 },
  templates: new Map(),
  staticContent: new Map(),
  responses: new Map()
};

// Optimized cache management utilities
const cacheUtils = {
  get(category, key, duration = CONFIG.CACHE_DURATIONS.ANALYTICS) {
    const cache = enhancedCache[category];
    if (!cache) return null;
    
    if (cache instanceof Map) {
      const item = cache.get(key);
      return item && (Date.now() - item.timestamp < duration) ? item.data : null;
    }
    
    return (Date.now() - cache.lastUpdated < duration) ? cache[key] : null;
  },
  
  set(category, key, data, isMap = true) {
    const cache = enhancedCache[category];
    if (!cache) return;
    
    if (isMap && cache instanceof Map) {
      cache.set(key, { data, timestamp: Date.now() });
      // Prevent memory bloat - keep only last 50 entries
      if (cache.size > 50) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
    } else {
      cache[key] = data;
      cache.lastUpdated = Date.now();
    }
  },
  
  clear(category) {
    const cache = enhancedCache[category];
    if (cache instanceof Map) {
      cache.clear();
    } else if (cache) {
      Object.keys(cache).forEach(key => {
        if (key !== 'lastUpdated') delete cache[key];
      });
      cache.lastUpdated = 0;
    }
  }
};

// Legacy compatibility functions (optimized)
function getCachedAnalytics(type) {
  return cacheUtils.get('analytics', type, CONFIG.CACHE_DURATIONS.ANALYTICS);
}

function setCachedAnalytics(type, data) {
  cacheUtils.set('analytics', type, data, false);
}

// In-memory storage for URL mappings
const urlDatabase = {};

// In-memory storage for URL analytics
const urlAnalytics = {};

// In-memory storage for blog posts
const blogDatabase = {};

// In-memory storage for blog analytics
const blogAnalytics = {};

// In-memory storage for announcements
const announcementDatabase = {};

// In-memory storage for safelink configuration
const safelinkConfig = {
  enabled: false,
  defaultTemplate: 1, // Which safelink template to use by default (1-8)
  templates: {
    1: {
      name: 'Classic SafeLink',
      enabled: true,
      adSlots: {
        header: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000" data-ad-format="auto"></ins></div>',
        sidebar: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:inline-block;width:300px;height:250px" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000"></ins></div>',
        footer: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000" data-ad-format="auto"></ins></div>'
      },
      waitTime: 10,
      skipButton: true
    },
    2: {
      name: 'Premium SafeLink',
      enabled: true,
      adSlots: {
        header: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000" data-ad-format="auto"></ins></div>',
        sidebar: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:inline-block;width:300px;height:250px" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000"></ins></div>',
        footer: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000" data-ad-format="auto"></ins></div>',
        popup: '<div id="popupAd" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border:2px solid #ccc;z-index:1000;display:none;"><div style="text-align:right;"><button onclick="closePopup()" style="background:red;color:white;border:none;padding:5px 10px;">×</button></div><div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:inline-block;width:300px;height:250px" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000"></ins></div></div>'
      },
      waitTime: 15,
      skipButton: false
    },
    3: {
      name: 'Gaming SafeLink',
      enabled: true,
      adSlots: {
        header: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000" data-ad-format="auto"></ins></div>',
        sidebar: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:inline-block;width:300px;height:250px" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000"></ins></div>',
        footer: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000" data-ad-format="auto"></ins></div>'
      },
      waitTime: 12,
      skipButton: true
    },
    4: {
      name: 'Tech SafeLink',
      enabled: true,
      adSlots: {
        header: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000" data-ad-format="auto"></ins></div>',
        sidebar: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:inline-block;width:300px;height:250px" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000"></ins></div>',
        footer: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000" data-ad-format="auto"></ins></div>'
      },
      waitTime: 8,
      skipButton: true
    },
    5: {
      name: 'Business SafeLink',
      enabled: true,
      adSlots: {
        header: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000" data-ad-format="auto"></ins></div>',
        sidebar: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:inline-block;width:300px;height:250px" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000"></ins></div>',
        footer: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000" data-ad-format="auto"></ins></div>'
      },
      waitTime: 10,
      skipButton: false
    },
    6: {
      name: 'Entertainment SafeLink',
      enabled: true,
      adSlots: {
        header: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000" data-ad-format="auto"></ins></div>',
        sidebar: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:inline-block;width:300px;height:250px" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000"></ins></div>',
        footer: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000" data-ad-format="auto"></ins></div>',
        video: '<div style="text-align:center;margin:15px 0;"><div style="width:100%;height:250px;background:#000;display:flex;align-items:center;justify-content:center;color:white;">Video Ad Placeholder</div></div>'
      },
      waitTime: 20,
      skipButton: true
    },
    7: {
      name: 'News SafeLink',
      enabled: true,
      adSlots: {
        header: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000" data-ad-format="auto"></ins></div>',
        sidebar: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:inline-block;width:300px;height:250px" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000"></ins></div>',
        footer: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000" data-ad-format="auto"></ins></div>'
      },
      waitTime: 10,
      skipButton: true
    },
    8: {
      name: 'Lifestyle SafeLink',
      enabled: true,
      adSlots: {
        header: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000" data-ad-format="auto"></ins></div>',
        sidebar: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:inline-block;width:300px;height:250px" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000"></ins></div>',
        footer: '<div style="text-align:center;margin:10px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000" data-ad-format="auto"></ins></div>',
        banner: '<div style="text-align:center;margin:15px 0;"><ins class="adsbygoogle" style="display:block;width:728px;height:90px" data-ad-client="ca-pub-0000000000000000" data-ad-slot="0000000000"></ins></div>'
      },
      waitTime: 8,
      skipButton: true
    }
  }
};

// 8-Page Redirection Configuration (Admin Only)
const eightPageRedirectionConfig = {
  enabled: false,
  pages: [
    {
      type: 'internal', // 'internal' for blog posts, 'external' for URLs
      id: null, // blog post ID for internal, null for external
      url: null, // URL for external blogs
      waitTime: 3, // seconds to wait on each page
      enabled: true
    },
    {
      type: 'internal',
      id: null,
      url: null,
      waitTime: 3,
      enabled: true
    },
    {
      type: 'internal',
      id: null,
      url: null,
      waitTime: 3,
      enabled: true
    },
    {
      type: 'internal',
      id: null,
      url: null,
      waitTime: 3,
      enabled: true
    },
    {
      type: 'internal',
      id: null,
      url: null,
      waitTime: 3,
      enabled: true
    },
    {
      type: 'internal',
      id: null,
      url: null,
      waitTime: 3,
      enabled: true
    },
    {
      type: 'internal',
      id: null,
      url: null,
      waitTime: 3,
      enabled: true
    },
    {
      type: 'internal',
      id: null,
      url: null,
      waitTime: 3,
      enabled: true
    }
  ],
  randomize: true, // whether to randomize the order of pages
  analytics: {
    totalRedirects: 0,
    completedChains: 0,
    abandonedAt: {} // track which page users abandon at
  }
};

// Advanced security tracking for admin operations
const adminSecurity = {
  sessions: {}, // Track admin sessions with enhanced security
  ipTracking: {}, // Track operations per IP address
  operationLogs: [], // Log all admin operations
  rateLimits: {
    maxOperationsPerHour: 50, // Maximum automation operations per hour per IP
    maxBulkOperationsPerDay: 10, // Maximum bulk operations per day per IP
    cooldownBetweenBulk: 300000, // 5 minutes cooldown between bulk operations
    progressiveDelayFactor: 1.5 // Increase delays for repeated operations
  },
  emergencyStop: false // Emergency stop for all automation
};

// Simple admin credentials (in production, use proper authentication)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Middleware
// Enhanced performance monitoring and optimization utilities
const performanceUtils = {
  // Request timing middleware for performance monitoring
  addTimingMiddleware() {
    return (req, res, next) => {
      const start = process.hrtime();
      
      res.on('finish', () => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const milliseconds = seconds * 1000 + nanoseconds / 1000000;
        
        // Log slow requests (over 100ms)
        if (milliseconds > 100) {
          console.log(`[SLOW] ${req.method} ${req.path} - ${milliseconds.toFixed(2)}ms`);
        }
      });
      
      next();
    };
  },

  // Memory usage optimization
  optimizeMemoryUsage() {
    // Clean up caches periodically
    setInterval(() => {
      // Clear old cache entries
      Object.values(enhancedCache).forEach(cache => {
        if (cache instanceof Map && cache.size > 100) {
          const keysToDelete = Array.from(cache.keys()).slice(0, 50);
          keysToDelete.forEach(key => cache.delete(key));
        }
      });
      
      // Garbage collection hint
      if (global.gc) {
        global.gc();
      }
    }, 300000); // Every 5 minutes
  },

  // Response compression for better network performance
  compressResponse(content) {
    // Simple compression for HTML content
    if (typeof content === 'string' && content.length > 1000) {
      return content
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
    }
    return content;
  },

  // Database optimization helpers
  optimizeDatabase() {
    // Clean up old analytics data periodically
    setInterval(() => {
      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      // Clean URL analytics
      Object.values(urlAnalytics).forEach(analytics => {
        if (analytics.clickHistory) {
          analytics.clickHistory = analytics.clickHistory.filter(
            entry => entry.timestamp > cutoff
          );
        }
      });
      
      // Clean blog analytics
      Object.values(blogAnalytics).forEach(analytics => {
        if (analytics.viewHistory) {
          analytics.viewHistory = analytics.viewHistory.filter(
            entry => entry.timestamp > cutoff
          );
        }
      });
      
      console.log('[OPTIMIZATION] Cleaned up old analytics data');
    }, 86400000); // Every 24 hours
  }
};

// Initialize performance optimizations
performanceUtils.optimizeMemoryUsage();
performanceUtils.optimizeDatabase();

// Express middleware configuration with performance optimizations
app.use(express.json({ limit: '1mb' })); // Limit payload size for security and performance
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static('public', { 
  maxAge: '1h', // Cache static files for 1 hour
  etag: false   // Disable etag for better performance
}));

// Function to generate a random short code
// Optimized route handling utilities for better performance and code reuse
const routeUtils = {
  // Efficient URL validation with caching
  validateURL(url, useCache = true) {
    if (useCache) {
      const cached = cacheUtils.get('responses', `url_valid_${url}`, 30000);
      if (cached !== null) return cached;
    }
    
    try {
      const urlObj = new URL(url);
      const isValid = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      
      if (useCache) {
        cacheUtils.set('responses', `url_valid_${url}`, isValid);
      }
      
      return isValid;
    } catch {
      if (useCache) {
        cacheUtils.set('responses', `url_valid_${url}`, false);
      }
      return false;
    }
  },

  // Optimized short code generation with collision detection
  generateUniqueCode(length = 6, database = urlDatabase, maxAttempts = 10) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const code = this.generateRandomCode(length);
      if (!database[code]) {
        return code;
      }
    }
    
    // If we can't find a unique code, increase length
    return this.generateUniqueCode(length + 1, database, maxAttempts);
  },

  // Efficient random code generation
  generateRandomCode(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const charsLength = chars.length;
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * charsLength));
    }
    
    return result;
  },

  // Optimized slug generation with collision handling
  generateUniqueSlug(title, database = blogDatabase, maxAttempts = 10) {
    let baseSlug = this.createSlugFromTitle(title);
    
    // Check if base slug is unique
    if (!this.findBySlug(baseSlug, database)) {
      return baseSlug;
    }
    
    // Try variations with numbers
    for (let i = 2; i <= maxAttempts + 1; i++) {
      const slug = `${baseSlug}-${i}`;
      if (!this.findBySlug(slug, database)) {
        return slug;
      }
    }
    
    // Fallback to timestamp-based slug
    return `${baseSlug}-${Date.now()}`;
  },

  // Efficient slug creation from title
  createSlugFromTitle(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')
      .substring(0, 50); // Limit length for efficiency
  },

  // Fast blog post lookup by slug
  findBySlug(slug, database = blogDatabase) {
    // Use Object.values with early return for better performance
    const entries = Object.values(database);
    for (const post of entries) {
      if (post.slug === slug) {
        return post;
      }
    }
    return null;
  },

  // Efficient request data extraction
  extractRequestData(req) {
    return {
      ip: req.ip || req.connection.remoteAddress || 'Unknown',
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: Date.now(),
      method: req.method,
      path: req.path
    };
  }
};

// Legacy compatibility functions (optimized)
function generateShortCode(length = 6) {
  return routeUtils.generateRandomCode(length);
}

function isValidUrl(string) {
  return routeUtils.validateURL(string);
}

function generateBlogId() {
  return 'blog_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateSlug(title) {
  return routeUtils.createSlugFromTitle(title);
}

// Unified analytics recording function
// Optimized analytics system with enhanced performance and memory management
const analyticsEngine = {
  // High-performance analytics recording with batch processing
  recordEvent(database, key, req, eventType = 'interaction') {
    const now = Date.now();
    const timestamp = new Date(now);
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';
    
    // Initialize analytics entry efficiently
    if (!database[key]) {
      const isView = eventType === 'view';
      database[key] = {
        [isView ? 'views' : 'clicks']: 0,
        [isView ? 'firstView' : 'firstClick']: null,
        [isView ? 'lastView' : 'lastClick']: null,
        [isView ? 'viewHistory' : 'clickHistory']: []
      };
    }
    
    const analytics = database[key];
    const isView = eventType === 'view';
    const countKey = isView ? 'views' : 'clicks';
    const firstKey = isView ? 'firstView' : 'firstClick';
    const lastKey = isView ? 'lastView' : 'lastClick';
    const historyKey = isView ? 'viewHistory' : 'clickHistory';
    
    // Increment counter
    analytics[countKey]++;
    analytics[lastKey] = timestamp;
    
    // Set first timestamp efficiently
    if (!analytics[firstKey]) analytics[firstKey] = timestamp;
    
    // Add to history with efficient data structure
    analytics[historyKey].push({ timestamp, userAgent, ip });
    
    // Efficient memory management - batch removal for better performance
    if (analytics[historyKey].length > CONFIG.HISTORY_LIMIT) {
      analytics[historyKey].shift();
    }
    
    // Clear analytics cache when data changes
    cacheUtils.clear('analytics');
  },

  // Optimized bulk statistics calculation with caching
  calculateStats(database, useCache = true) {
    if (useCache) {
      const cached = getCachedAnalytics('stats');
      if (cached) return cached;
    }

    const entries = Object.values(database);
    if (entries.length === 0) {
      return { total: 0, average: 0, recent: 0 };
    }

    // Use efficient reduce with single pass
    const stats = entries.reduce((acc, entry) => {
      const count = entry.clicks || entry.views || 0;
      acc.total += count;
      acc.max = Math.max(acc.max, count);
      acc.min = Math.min(acc.min, count);
      
      // Count recent activity (last 24 hours)
      const recentHistory = entry.clickHistory || entry.viewHistory || [];
      const recentCount = this.countRecentEvents(recentHistory, CONFIG.TIME_WINDOWS.ONE_DAY);
      acc.recent += recentCount;
      
      return acc;
    }, { total: 0, max: 0, min: Infinity, recent: 0 });

    stats.average = stats.total / entries.length;
    stats.count = entries.length;
    
    if (useCache) {
      setCachedAnalytics('stats', stats);
    }
    
    return stats;
  },

  // Efficient recent events counting
  countRecentEvents(history, timeWindow) {
    const cutoff = Date.now() - timeWindow;
    let count = 0;
    
    // Count from the end since recent events are at the end
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].timestamp >= cutoff) {
        count++;
      } else {
        break; // Since array is chronologically ordered
      }
    }
    
    return count;
  }
};

// Legacy compatibility functions (optimized)
function recordAnalytics(database, key, req, eventType = 'interaction') {
  analyticsEngine.recordEvent(database, key, req, eventType);
}

function recordClick(shortCode, req) {
  analyticsEngine.recordEvent(urlAnalytics, shortCode, req, 'click');
}

function recordBlogView(blogId, req) {
  analyticsEngine.recordEvent(blogAnalytics, blogId, req, 'view');
}

// Utility functions
function generateBlogId() {
  return 'blog_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateSlug(title) {
  return routeUtils.generateUniqueSlug(title);
}

// Advanced security functions
function getClientIP(req) {
  return req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
}

// Enhanced error handling utilities
function createErrorHandler(operation) {
  return (error, req, res, next) => {
    console.error(`Error in ${operation}:`, error);
    logAdminOperation('ERROR', getClientIP(req), { operation, error: error.message });
    
    if (res.headersSent) {
      return next(error);
    }
    
    sendError(res, error.message || 'Internal server error', error.status || 500);
  };
}

function validateInput(schema, data) {
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    if (rules.required && (!value || value.toString().trim() === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    if (value && rules.type) {
      if (rules.type === 'number' && isNaN(Number(value))) {
        errors.push(`${field} must be a number`);
      }
      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`${field} must be a string`);
      }
    }
    
    if (value && rules.min && Number(value) < rules.min) {
      errors.push(`${field} must be at least ${rules.min}`);
    }
    
    if (value && rules.max && Number(value) > rules.max) {
      errors.push(`${field} must be at most ${rules.max}`);
    }
    
    if (value && rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${field} format is invalid`);
    }
  }
  
  return errors;
}

// Legacy compatibility functions using optimized utilities
function sendSuccess(res, data, message = 'Success') {
  responseUtils.sendSuccess(res, data, message);
}

function sendError(res, error, status = 400) {
  responseUtils.sendError(res, error, status);
}

// Optimized response utilities for consistent and efficient handling
const responseUtils = {
  // Unified JSON response handler with caching
  sendJSON(res, data, statusCode = 200, enableCache = false) {
    const headers = { ...CONFIG.RESPONSE_HEADERS.JSON };
    if (enableCache) {
      Object.assign(headers, CONFIG.RESPONSE_HEADERS.CACHE_CONTROL);
    }
    
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    res.status(statusCode).json(data);
  },

  // Optimized HTML response handler with template caching
  sendHTML(res, html, statusCode = 200, enableCache = true) {
    const headers = { ...CONFIG.RESPONSE_HEADERS.HTML };
    if (enableCache) {
      Object.assign(headers, CONFIG.RESPONSE_HEADERS.CACHE_CONTROL);
    }
    
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    res.status(statusCode).send(html);
  },

  // Efficient error response handler
  sendError(res, message, statusCode = 400, details = null) {
    const errorData = { error: message };
    if (details) errorData.details = details;
    this.sendJSON(res, errorData, statusCode);
  },

  // Success response with consistent structure
  sendSuccess(res, data, message = null) {
    const response = { success: true, data };
    if (message) response.message = message;
    this.sendJSON(res, response);
  }
};

// Legacy compatibility function (optimized)
function sendJSON(res, data) {
  responseUtils.sendJSON(res, data);
}

// Optimized memory management utility
// Optimized memory management and data processing utilities
const dataUtils = {
  // Efficient array trimming with memory optimization
  trimArray(arr, maxLength, preserveRecent = true) {
    if (!Array.isArray(arr) || arr.length <= maxLength) return arr;
    
    if (preserveRecent) {
      arr.splice(0, arr.length - maxLength); // Keep most recent items (in-place)
    } else {
      arr.splice(maxLength); // Keep oldest items (in-place)
    }
    return arr;
  },

  // Optimized object filtering with caching
  filterObjects(objMap, filterFn, useCache = false, cacheKey = null) {
    if (useCache && cacheKey) {
      const cached = cacheUtils.get('responses', cacheKey);
      if (cached) return cached;
    }

    const result = Object.values(objMap).filter(filterFn);
    
    if (useCache && cacheKey) {
      cacheUtils.set('responses', cacheKey, result);
    }
    
    return result;
  },

  // Efficient data aggregation
  aggregateData(items, keyExtractor, valueExtractor = null) {
    const aggregated = new Map();
    
    for (const item of items) {
      const key = keyExtractor(item);
      const value = valueExtractor ? valueExtractor(item) : 1;
      aggregated.set(key, (aggregated.get(key) || 0) + value);
    }
    
    return Object.fromEntries(aggregated);
  },

  // Optimized array operations with early returns
  findInArray(arr, predicate, returnIndex = false) {
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i], i)) {
        return returnIndex ? i : arr[i];
      }
    }
    return returnIndex ? -1 : null;
  }
};

// Legacy compatibility function (optimized)
function trimArray(arr, maxLength) {
  dataUtils.trimArray(arr, maxLength);
}

// Optimized time-based filtering
// Optimized time-based filtering with improved performance
const timeUtils = {
  filterByTimeWindow(timestamps, windowMs) {
    const cutoff = Date.now() - windowMs;
    let startIndex = 0;
    
    // Use binary search for better performance on large arrays
    if (timestamps.length > 100) {
      let left = 0, right = timestamps.length - 1;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (timestamps[mid] < cutoff) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
      startIndex = left;
    } else {
      // Linear search for smaller arrays
      for (let i = 0; i < timestamps.length; i++) {
        if (timestamps[i] >= cutoff) {
          startIndex = i;
          break;
        }
      }
    }
    
    return timestamps.slice(startIndex);
  },

  // Efficient timestamp grouping
  groupByTimeInterval(timestamps, intervalMs) {
    const groups = new Map();
    
    for (const timestamp of timestamps) {
      const intervalKey = Math.floor(timestamp / intervalMs) * intervalMs;
      if (!groups.has(intervalKey)) {
        groups.set(intervalKey, []);
      }
      groups.get(intervalKey).push(timestamp);
    }
    
    return groups;
  },

  // Performance-optimized time calculations
  calculateTimeStats(timestamps) {
    if (timestamps.length === 0) {
      return { first: null, last: null, count: 0, rate: 0 };
    }
    
    const sorted = timestamps.length > 1 && timestamps[0] > timestamps[timestamps.length - 1] 
      ? [...timestamps].sort((a, b) => a - b) 
      : timestamps;
    
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const timeSpan = last - first;
    const rate = timeSpan > 0 ? (sorted.length - 1) / (timeSpan / 1000) : 0;
    
    return { first, last, count: sorted.length, rate };
  }
};

// Legacy compatibility function (optimized)
function filterByTimeWindow(timestamps, windowMs) {
  return timeUtils.filterByTimeWindow(timestamps, windowMs);
}

function logAdminOperation(operation, ip, details = {}) {
  const logEntry = {
    timestamp: new Date(),
    operation,
    ip,
    details,
    id: Date.now() + Math.random()
  };
  
  adminSecurity.operationLogs.push(logEntry);
  trimArray(adminSecurity.operationLogs, CONFIG.OPERATIONS_LOG_LIMIT);
  
  return logEntry;
}

function checkRateLimit(ip, operationType) {
  const now = Date.now();
  
  if (!adminSecurity.ipTracking[ip]) {
    adminSecurity.ipTracking[ip] = {
      operationsLastHour: [],
      bulkOperationsLastDay: [],
      lastBulkOperation: 0,
      warningCount: 0
    };
  }
  
  const tracking = adminSecurity.ipTracking[ip];
  
  // Optimized cleanup with efficient filtering
  tracking.operationsLastHour = filterByTimeWindow(tracking.operationsLastHour, CONFIG.TIME_WINDOWS.ONE_HOUR);
  tracking.bulkOperationsLastDay = filterByTimeWindow(tracking.bulkOperationsLastDay, CONFIG.TIME_WINDOWS.ONE_DAY);
  
  // Check rate limits
  if (operationType === 'bulk') {
    // Check cooldown between bulk operations
    if (now - tracking.lastBulkOperation < adminSecurity.rateLimits.cooldownBetweenBulk) {
      const remainingTime = Math.ceil((adminSecurity.rateLimits.cooldownBetweenBulk - (now - tracking.lastBulkOperation)) / 1000);
      return {
        allowed: false,
        reason: `Bulk operation cooldown active. Please wait ${remainingTime} seconds.`,
        remainingTime
      };
    }
    
    // Check daily bulk limit
    if (tracking.bulkOperationsLastDay.length >= adminSecurity.rateLimits.maxBulkOperationsPerDay) {
      return {
        allowed: false,
        reason: `Daily bulk operation limit reached (${adminSecurity.rateLimits.maxBulkOperationsPerDay}). Try again tomorrow.`
      };
    }
    
    tracking.bulkOperationsLastDay.push(now);
    tracking.lastBulkOperation = now;
  }
  
  // Check hourly operation limit
  if (tracking.operationsLastHour.length >= adminSecurity.rateLimits.maxOperationsPerHour) {
    tracking.warningCount++;
    return {
      allowed: false,
      reason: `Hourly operation limit reached (${adminSecurity.rateLimits.maxOperationsPerHour}). Please wait before performing more operations.`
    };
  }
  
  tracking.operationsLastHour.push(now);
  
  return { allowed: true };
}

function calculateProgressiveDelay(ip, baseDelay) {
  const tracking = adminSecurity.ipTracking[ip];
  if (!tracking) return baseDelay;
  
  const recentOperations = tracking.operationsLastHour.length;
  const progressiveFactor = Math.pow(adminSecurity.rateLimits.progressiveDelayFactor, Math.floor(recentOperations / 10));
  
  return Math.min(baseDelay * progressiveFactor, baseDelay * 5); // Max 5x the original delay
}

function requireAdvancedAuth(req, res, next) {
  // Check emergency stop
  if (adminSecurity.emergencyStop) {
    return res.status(503).json({ 
      error: 'All automation operations are temporarily suspended for security reasons.',
      code: 'EMERGENCY_STOP'
    });
  }
  
  // Basic auth check
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Enhanced security checks for automation endpoints
  const ip = getClientIP(req);
  const path = req.path;
  
  // Log the operation attempt
  logAdminOperation('AUTH_CHECK', ip, { path, userAgent: req.get('User-Agent') });
  
  next();
}

// HTML Template utilities for efficiency
// Enhanced HTML template system with caching and optimization
const templateUtils = {
  // Common HTML components for reusability
  components: {
    // Standard navigation component
    navigation(currentPage = '') {
      const pages = [
        { path: '/', label: 'Home' },
        { path: '/blog', label: 'Blog' },
        { path: '/admin', label: 'Admin' }
      ];
      
      return `
        <nav style="background: #333; padding: 1rem; margin-bottom: 2rem;">
          <div style="max-width: 800px; margin: 0 auto; display: flex; gap: 1rem;">
            ${pages.map(page => `
              <a href="${page.path}" style="color: ${currentPage === page.path ? '#4CAF50' : 'white'}; 
                 text-decoration: none; font-weight: ${currentPage === page.path ? 'bold' : 'normal'};">
                ${page.label}
              </a>
            `).join('')}
          </div>
        </nav>
      `;
    },

    // Experimental badge component
    experimentalBadge(text = 'EXPERIMENTAL') {
      return `
        <span class="experimental-badge">${text}</span>
      `;
    },

    // Loading spinner component
    loadingSpinner(text = 'Loading...') {
      return `
        <div class="loading-spinner" style="text-align: center; padding: 20px;">
          <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; 
                      border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <p style="margin-top: 10px;">${text}</p>
        </div>
      `;
    },

    // Standard button component
    button(text, onclick, className = 'btn-primary', disabled = false) {
      return `
        <button class="btn ${className}" onclick="${onclick}" ${disabled ? 'disabled' : ''}>
          ${text}
        </button>
      `;
    },

    // Form group component
    formGroup(label, input, helpText = '') {
      return `
        <div class="form-group">
          <label>${label}</label>
          ${input}
          ${helpText ? `<small style="color: #666;">${helpText}</small>` : ''}
        </div>
      `;
    }
  },

  // Optimized template generation with caching
  generateHTML(title, content, additionalCSS = '', additionalJS = '', useNav = false, currentPage = '') {
    const cacheKey = `template_${title}_${useNav}_${currentPage}`;
    
    // Check template cache
    let cachedTemplate = cacheUtils.get('templates', cacheKey, CONFIG.CACHE_DURATIONS.HTML_TEMPLATES);
    if (cachedTemplate && !additionalCSS && !additionalJS) {
      return cachedTemplate.replace('{{CONTENT}}', content);
    }

    const template = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
              ${this.getOptimizedCSS()}
              ${additionalCSS}
          </style>
      </head>
      <body>
          ${useNav ? this.components.navigation(currentPage) : ''}
          {{CONTENT}}
          <script>
              ${this.getOptimizedJS()}
              ${additionalJS}
          </script>
      </body>
      </html>
    `;

    // Cache base template
    if (!additionalCSS && !additionalJS) {
      cacheUtils.set('templates', cacheKey, template);
    }

    return template.replace('{{CONTENT}}', content);
  },

  // Optimized CSS with better organization and compression
  getOptimizedCSS() {
    const cached = cacheUtils.get('staticContent', 'commonCSS', CONFIG.CACHE_DURATIONS.STATIC_CONTENT);
    if (cached) return cached;

    const css = `
      *{box-sizing:border-box}body{font-family:Arial,sans-serif;max-width:800px;margin:50px auto;padding:20px;background-color:#f5f5f5}
      .container{background-color:white;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
      h1{color:#333;text-align:center;margin-bottom:30px}
      .experimental-badge{background:linear-gradient(45deg,#ff6b6b,#4ecdc4);color:white;padding:5px 10px;border-radius:15px;font-size:12px;font-weight:bold;display:inline-block;margin-left:10px;animation:pulse 2s infinite}
      @keyframes pulse{0%{opacity:1}50%{opacity:0.7}100%{opacity:1}}
      @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
      .form-group{margin-bottom:20px}label{display:block;margin-bottom:5px;font-weight:bold;color:#555}
      input[type="text"],input[type="url"],textarea{width:100%;padding:12px;border:2px solid #ddd;border-radius:5px;font-size:16px}
      .btn{background:linear-gradient(45deg,#4CAF50,#45a049);color:white;padding:12px 24px;border:none;border-radius:5px;cursor:pointer;font-size:16px;font-weight:bold;transition:all 0.3s ease;text-decoration:none;display:inline-block;text-align:center}
      .btn:hover{transform:translateY(-2px);box-shadow:0 4px 8px rgba(0,0,0,0.2)}
      .btn-primary{background:linear-gradient(45deg,#007bff,#0056b3)}
      .btn-secondary{background:linear-gradient(45deg,#6c757d,#545b62)}
      .btn-success{background:linear-gradient(45deg,#28a745,#218838)}
      .btn-danger{background:linear-gradient(45deg,#dc3545,#c82333)}
      .btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
      .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;margin-bottom:20px}
      .stat-card{background-color:#e9ecef;padding:15px;border-radius:8px;text-align:center}
      .stat-number{font-size:24px;font-weight:bold;color:#007bff}
      .stat-label{font-size:12px;color:#666;margin-top:5px}
      .warning{background-color:#fff3cd;border:1px solid #ffeaa7;color:#856404;padding:15px;border-radius:5px;margin:10px 0}
      .success{background-color:#d4edda;border:1px solid #c3e6cb;color:#155724;padding:15px;border-radius:5px;margin:10px 0}
      .error{background-color:#f8d7da;border:1px solid #f5c6cb;color:#721c24;padding:15px;border-radius:5px;margin:10px 0}
    `;

    cacheUtils.set('staticContent', 'commonCSS', css);
    return css;
  },

  // Optimized JavaScript with common utilities
  getOptimizedJS() {
    const cached = cacheUtils.get('staticContent', 'commonJS', CONFIG.CACHE_DURATIONS.STATIC_CONTENT);
    if (cached) return cached;

    const js = `
      function copyToClipboard(text){navigator.clipboard.writeText(text).then(()=>showMessage('Copied to clipboard!','success')).catch(()=>showMessage('Failed to copy','error'))}
      function showMessage(message,type='info'){const div=document.createElement('div');div.textContent=message;div.style.cssText='position:fixed;top:20px;right:20px;z-index:9999;padding:15px;border-radius:5px;color:white;background:'+(type==='error'?'#f44336':type==='success'?'#4CAF50':'#2196F3')+';animation:slideIn 0.3s ease';document.body.appendChild(div);setTimeout(()=>div.remove(),3000)}
      function toggleLoader(show,target='body'){const loader=document.querySelector('.loading-spinner');if(show&&!loader){const div=document.createElement('div');div.innerHTML='<div class="loading-spinner" style="text-align:center;padding:20px;"><div style="display:inline-block;width:20px;height:20px;border:3px solid #f3f3f3;border-top:3px solid #3498db;border-radius:50%;animation:spin 1s linear infinite;"></div><p style="margin-top:10px;">Loading...</p></div>';document.querySelector(target).appendChild(div.firstElementChild)}else if(!show&&loader){loader.remove()}}
      function debounce(func,wait){let timeout;return function executedFunction(...args){const later=()=>{clearTimeout(timeout);func(...args)};clearTimeout(timeout);timeout=setTimeout(later,wait)}}
      @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    `;

    cacheUtils.set('staticContent', 'commonJS', js);
    return js;
  }
};

// Legacy compatibility functions (optimized)
function generateHTMLTemplate(title, content, additionalCSS = '', additionalJS = '') {
  return templateUtils.generateHTML(title, content, additionalCSS, additionalJS);
}

function getCommonCSS() {
  return templateUtils.getOptimizedCSS();
}

function getCommonJS() {
  return templateUtils.getOptimizedJS();
}



// Middleware to check admin authentication
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth === `Bearer ${ADMIN_PASSWORD}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Routes

// Home page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>URL Shortener</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 600px;
                margin: 50px auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 30px;
            }
            .experimental-badge {
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                color: white;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: bold;
                display: inline-block;
                margin-left: 10px;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                color: #555;
            }
            input[type="url"], input[type="text"] {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 5px;
                font-size: 16px;
                box-sizing: border-box;
            }
            input[type="url"]:focus, input[type="text"]:focus {
                border-color: #007bff;
                outline: none;
            }
            .custom-code-section {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                border-left: 4px solid #007bff;
            }
            .custom-code-section h3 {
                margin-top: 0;
                color: #007bff;
                font-size: 16px;
            }
            .custom-code-help {
                font-size: 14px;
                color: #666;
                margin-top: 5px;
            }
            button {
                background-color: #007bff;
                color: white;
                padding: 12px 30px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                width: 100%;
            }
            button:hover {
                background-color: #0056b3;
            }
            .result {
                margin-top: 20px;
                padding: 15px;
                background-color: #e7f3ff;
                border-radius: 5px;
                display: none;
            }
            .short-url {
                word-break: break-all;
                font-weight: bold;
                color: #007bff;
            }
            .result-actions {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-top: 15px;
            }
            .result-actions button {
                padding: 8px 16px;
                font-size: 14px;
            }
            .btn-secondary {
                background-color: #6c757d;
            }
            .btn-secondary:hover {
                background-color: #545b62;
            }
            .btn-success {
                background-color: #28a745;
            }
            .btn-success:hover {
                background-color: #218838;
            }
            .custom-badge {
                background-color: #28a745;
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                margin-left: 8px;
            }
            .qr-section {
                text-align: center;
                margin-top: 15px;
                display: none;
            }
            .qr-section img {
                border: 1px solid #ddd;
                border-radius: 8px;
                margin-top: 10px;
            }
            .announcement-banner {
                margin-bottom: 20px;
                padding: 12px 16px;
                border-radius: 8px;
                border-left: 4px solid;
                font-size: 14px;
                line-height: 1.4;
                animation: slideIn 0.5s ease-out;
            }
            .announcement-info {
                background-color: #d1ecf1;
                border-left-color: #007bff;
                color: #0c5460;
            }
            .announcement-success {
                background-color: #d4edda;
                border-left-color: #28a745;
                color: #155724;
            }
            .announcement-warning {
                background-color: #fff3cd;
                border-left-color: #ffc107;
                color: #856404;
            }
            .announcement-error {
                background-color: #f8d7da;
                border-left-color: #dc3545;
                color: #721c24;
            }
            .announcement-title {
                font-weight: bold;
                margin-bottom: 4px;
            }
            @keyframes slideIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Announcements Section (for visitors only) -->
            <div id="announcementsSection" style="display: none;">
                <!-- Announcements will be loaded here -->
            </div>
            
            <h1>🔗 URL Shortener<span class="experimental-badge">NEW FEATURES!</span></h1>
            
            <!-- Blog Link -->
            <div style="text-align: center; margin-bottom: 20px;">
                <a href="/blog" style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 10px 20px; border-radius: 25px; text-decoration: none; font-weight: bold; display: inline-block;">📝 Visit Our Blog</a>
            </div>
            
            <form id="urlForm">
                <div class="form-group">
                    <label for="originalUrl">Enter URL to shorten:</label>
                    <input type="url" id="originalUrl" name="originalUrl" placeholder="https://example.com" required>
                </div>
                
                <div class="custom-code-section">
                    <h3>🎯 Custom Short Code (Experimental)</h3>
                    <input type="text" id="customCode" name="customCode" placeholder="my-custom-link" maxlength="20">
                    <div class="custom-code-help">
                        Leave empty for auto-generated code, or create your own (3-20 characters, letters and numbers only)
                    </div>
                </div>
                
                <button type="submit">Shorten URL</button>
            </form>
            
            <div id="result" class="result">
                <p>Short URL: <span id="shortUrl" class="short-url"></span><span id="customBadge" class="custom-badge" style="display: none;">CUSTOM</span></p>
                <div class="result-actions">
                    <button onclick="copyToClipboard()" class="btn-success">📋 Copy URL</button>
                    <button onclick="showPreview()" class="btn-secondary">👀 Preview & Analytics</button>
                    <button onclick="showQR()" class="btn-secondary">📱 Show QR Code</button>
                    <button onclick="downloadQR()" class="btn-secondary">💾 Download QR</button>
                </div>
                <div id="qrSection" class="qr-section">
                    <h4>📱 QR Code</h4>
                    <img id="qrImage" alt="QR Code" width="150" height="150">
                </div>
            </div>
        </div>

        <script>
            let currentShortCode = '';
            
            document.getElementById('urlForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const originalUrl = document.getElementById('originalUrl').value;
                const customCode = document.getElementById('customCode').value.trim();
                
                try {
                    const response = await fetch('/shorten', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ originalUrl, customCode: customCode || undefined })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        currentShortCode = data.shortCode;
                        const shortUrl = window.location.origin + '/' + data.shortCode;
                        document.getElementById('shortUrl').textContent = shortUrl;
                        
                        // Show custom badge if it's a custom code
                        const customBadge = document.getElementById('customBadge');
                        if (data.isCustom) {
                            customBadge.style.display = 'inline';
                        } else {
                            customBadge.style.display = 'none';
                        }
                        
                        // Load QR code
                        const qrImage = document.getElementById('qrImage');
                        qrImage.src = \`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=\${encodeURIComponent(shortUrl)}\`;
                        
                        document.getElementById('result').style.display = 'block';
                        document.getElementById('qrSection').style.display = 'none';
                    } else {
                        alert('Error: ' + data.error);
                    }
                } catch (error) {
                    alert('Error: ' + error.message);
                }
            });

            function copyToClipboard() {
                const shortUrl = document.getElementById('shortUrl').textContent;
                navigator.clipboard.writeText(shortUrl).then(() => {
                    alert('Short URL copied to clipboard!');
                });
            }
            
            function showPreview() {
                window.open('/preview/' + currentShortCode, '_blank');
            }
            
            function showQR() {
                const qrSection = document.getElementById('qrSection');
                qrSection.style.display = qrSection.style.display === 'none' ? 'block' : 'none';
            }
            
            function downloadQR() {
                const shortUrl = document.getElementById('shortUrl').textContent;
                const qrUrl = \`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=\${encodeURIComponent(shortUrl)}\`;
                
                const link = document.createElement('a');
                link.href = qrUrl;
                link.download = \`qr-code-\${currentShortCode}.png\`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            
            // Load announcements on page load (for visitors only)
            async function loadPageAnnouncements() {
                // Check if user is admin by checking for admin token
                const adminToken = localStorage.getItem('adminToken');
                if (adminToken) {
                    // Don't show announcements to admin users
                    return;
                }
                
                try {
                    const response = await fetch('/api/announcements');
                    if (response.ok) {
                        const announcements = await response.json();
                        displayPageAnnouncements(announcements);
                    }
                } catch (error) {
                    console.error('Error loading announcements:', error);
                }
            }
            
            function displayPageAnnouncements(announcements) {
                const announcementsSection = document.getElementById('announcementsSection');
                
                if (announcements.length === 0) {
                    announcementsSection.style.display = 'none';
                    return;
                }
                
                const typeIcons = {
                    info: 'ℹ️',
                    success: '✅',
                    warning: '⚠️',
                    error: '❌'
                };
                
                let html = '';
                for (let i = 0; i < announcements.length; i++) {
                    const announcement = announcements[i];
                    html += '<div class="announcement-banner announcement-' + announcement.type + '">' +
                            '<div class="announcement-title">' + typeIcons[announcement.type] + ' ' + announcement.title + '</div>' +
                            '<div>' + announcement.message + '</div>' +
                            '</div>';
                }
                
                announcementsSection.innerHTML = html;
                announcementsSection.style.display = 'block';
            }
            
            // Load announcements when page loads
            document.addEventListener('DOMContentLoaded', loadPageAnnouncements);
        </script>
    </body>
    </html>
  `);
});

// Shorten URL endpoint
app.post('/shorten', (req, res) => {
  try {
    const { originalUrl, customCode } = req.body;
    
    // Validate input using utility function
    const validationErrors = validateInput({
      originalUrl: { required: true, type: 'string' }
    }, req.body);
    
    if (validationErrors.length > 0) {
      return sendError(res, validationErrors.join(', '));
    }
    
    // Validate URL
    if (!isValidUrl(originalUrl)) {
      return sendError(res, 'Please provide a valid URL');
    }
    
    // Check if custom code is provided and validate it
    if (customCode) {
      if (!/^[a-zA-Z0-9]{3,20}$/.test(customCode)) {
        return sendError(res, 'Custom code must be 3-20 characters long and contain only letters and numbers');
      }
      
      // Check if custom code already exists
      if (urlDatabase[customCode]) {
        return sendError(res, 'Custom code already exists. Please choose a different one.', 409);
      }
      
      // Use custom code
      urlDatabase[customCode] = originalUrl;
      return sendSuccess(res, { shortCode: customCode, originalUrl, isCustom: true });
    }
    
    // Check if URL already exists (for auto-generated codes only)
    for (const [shortCode, url] of Object.entries(urlDatabase)) {
      if (url === originalUrl) {
        return sendSuccess(res, { shortCode, originalUrl, isCustom: false });
      }
    }
    
    // Generate unique short code
    let shortCode;
    do {
      shortCode = generateShortCode();
    } while (urlDatabase[shortCode]);
    
    // Store the mapping
    urlDatabase[shortCode] = originalUrl;
    
    sendSuccess(res, { shortCode, originalUrl, isCustom: false });
  } catch (error) {
    createErrorHandler('shorten')(error, req, res, () => {});
  }
});

// QR Code generation endpoint
app.get('/qr/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  const originalUrl = urlDatabase[shortCode];
  
  if (!originalUrl) {
    return res.status(404).json({ error: 'Short code not found' });
  }
  
  const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shortUrl)}`;
  
  res.json({ 
    shortCode, 
    originalUrl, 
    shortUrl,
    qrCodeUrl: qrApiUrl 
  });
});

// URL Preview endpoint (before redirect)
app.get('/preview/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  const originalUrl = urlDatabase[shortCode];
  
  if (!originalUrl) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>URL Not Found</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  max-width: 600px;
                  margin: 50px auto;
                  padding: 20px;
                  text-align: center;
                  background-color: #f5f5f5;
              }
              .container {
                  background-color: white;
                  padding: 30px;
                  border-radius: 10px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 {
                  color: #dc3545;
              }
              a {
                  color: #007bff;
                  text-decoration: none;
              }
              a:hover {
                  text-decoration: underline;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>404 - URL Not Found</h1>
              <p>The short URL you're looking for doesn't exist.</p>
              <a href="/">← Go back to create a new short URL</a>
          </div>
      </body>
      </html>
    `);
  }
  
  const analytics = urlAnalytics[shortCode] || { clicks: 0, firstClick: null, lastClick: null };
  const shortUrl = req.protocol + '://' + req.get('host') + '/' + shortCode;
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>URL Preview - ' + shortCode + '</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 30px;
            }
            .preview-info {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            .url-info {
                margin-bottom: 15px;
            }
            .label {
                font-weight: bold;
                color: #555;
            }
            .url {
                word-break: break-all;
                color: #007bff;
            }
            .stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }
            .stat-card {
                background-color: #e9ecef;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
            }
            .stat-number {
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
            }
            .stat-label {
                font-size: 12px;
                color: #666;
                margin-top: 5px;
            }
            .action-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
                flex-wrap: wrap;
            }
            .btn {
                padding: 12px 24px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                text-decoration: none;
                display: inline-block;
                text-align: center;
                transition: background-color 0.3s;
            }
            .btn-primary {
                background-color: #007bff;
                color: white;
            }
            .btn-primary:hover {
                background-color: #0056b3;
            }
            .btn-secondary {
                background-color: #6c757d;
                color: white;
            }
            .btn-secondary:hover {
                background-color: #545b62;
            }
            .btn-success {
                background-color: #28a745;
                color: white;
            }
            .btn-success:hover {
                background-color: #218838;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
            }
            .qr-code {
                text-align: center;
                margin: 20px 0;
            }
            .qr-code img {
                border: 1px solid #ddd;
                border-radius: 8px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔗 URL Preview</h1>
            
            <div class="warning">
                <strong>🛡️ Security Notice:</strong> You are about to visit an external website. Please verify the URL below before proceeding.
            </div>
            
            <div class="preview-info">
                <div class="url-info">
                    <span class="label">Short URL:</span><br>
                    <span class="url">' + shortUrl + '</span>
                </div>
                <div class="url-info">
                    <span class="label">Destination URL:</span><br>
                    <span class="url">' + originalUrl + '</span>
                </div>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">' + analytics.clicks + '</div>
                    <div class="stat-label">Total Clicks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">' + (analytics.firstClick ? new Date(analytics.firstClick).toLocaleDateString() : 'Never') + '</div>
                    <div class="stat-label">First Clicked</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">' + (analytics.lastClick ? new Date(analytics.lastClick).toLocaleDateString() : 'Never') + '</div>
                    <div class="stat-label">Last Clicked</div>
                </div>
            </div>
            
            <div class="qr-code">
                <h3>QR Code</h3>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(shortUrl) + '" alt="QR Code for ' + shortUrl + '">
            </div>
            
            <div class="action-buttons">
                <a href="' + originalUrl + '" class="btn btn-primary">🔗 Continue to Website</a>
                <a href="/' + shortCode + '" class="btn btn-secondary">➡️ Direct Redirect</a>
                <button onclick="copyToClipboard(\'' + shortUrl + '\')" class="btn btn-success">📋 Copy Short URL</button>
                <a href="/" class="btn btn-secondary">🏠 Create New URL</a>
            </div>
        </div>
        
        <script>
            function copyToClipboard(text) {
                navigator.clipboard.writeText(text).then(() => {
                    alert('Short URL copied to clipboard!');
                });
            }
        </script>
    </body>
    </html>
  `);
});
app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Login - URL Shortener</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 400px;
                margin: 50px auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 30px;
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                color: #555;
            }
            input[type="password"] {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 5px;
                font-size: 16px;
                box-sizing: border-box;
            }
            input[type="password"]:focus {
                border-color: #007bff;
                outline: none;
            }
            button {
                background-color: #007bff;
                color: white;
                padding: 12px 30px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                width: 100%;
            }
            button:hover {
                background-color: #0056b3;
            }
            .error {
                color: #dc3545;
                margin-top: 10px;
                text-align: center;
            }
            .back-link {
                text-align: center;
                margin-top: 20px;
            }
            .back-link a {
                color: #007bff;
                text-decoration: none;
            }
            .back-link a:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔐 Admin Login</h1>
            <form id="loginForm">
                <div class="form-group">
                    <label for="password">Admin Password:</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <button type="submit">Login</button>
                <div id="error" class="error" style="display: none;"></div>
            </form>
            <div class="back-link">
                <a href="/">← Back to URL Shortener</a>
            </div>
        </div>

        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const password = document.getElementById('password').value;
                
                try {
                    const response = await fetch('/admin/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ password })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        localStorage.setItem('adminToken', data.token);
                        window.location.href = '/admin/dashboard';
                    } else {
                        document.getElementById('error').textContent = data.error;
                        document.getElementById('error').style.display = 'block';
                    }
                } catch (error) {
                    document.getElementById('error').textContent = 'Login failed';
                    document.getElementById('error').style.display = 'block';
                }
            });
        </script>
    </body>
    </html>
  `);
});

// Admin login endpoint
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    res.json({ token: ADMIN_PASSWORD, message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Admin dashboard
app.get('/admin/dashboard', (req, res) => {
  // Dashboard implementation would go here
  res.send('Dashboard');
});

console.log('File loaded successfully');
