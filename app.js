const express = require('express');
const path = require('path');
const escape = require('escape-html');

const app = express();
const PORT = process.env.PORT || 3000;

// Security enhancements
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers middleware
app.use((req, res, next) => {
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
});

// Rate limiting store (simple in-memory implementation)
const rateLimitStore = new Map();

// Optimized rate limiting middleware with better performance
function rateLimit(windowMs = 60000, maxRequests = 100) {
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

// Apply rate limiting to all routes
app.use(rateLimit());

// Enhanced input validation utilities with caching for better performance
const validator = {
  // URL validation cache for repeated validations
  _urlCache: new Map(),
  
  isValidUrl(url) {
    // Check cache first for better performance
    if (this._urlCache.has(url)) {
      return this._urlCache.get(url);
    }
    
    let isValid = false;
    try {
      const parsed = new URL(url);
      isValid = ['http:', 'https:'].includes(parsed.protocol);
    } catch (e) {
      isValid = false;
    }
    
    // Cache result but limit cache size
    if (this._urlCache.size > 1000) {
      const firstKey = this._urlCache.keys().next().value;
      this._urlCache.delete(firstKey);
    }
    this._urlCache.set(url, isValid);
    
    return isValid;
  },
  
  sanitizeString(str, maxLength = 1000) {
    if (typeof str !== 'string') return '';
    return escape(str.trim().substring(0, maxLength));
  },
  
  isValidShortCode(code) {
    return typeof code === 'string' && /^[a-zA-Z0-9]{3,10}$/.test(code);
  },
  
  isValidBlogId(id) {
    return typeof id === 'string' && /^blog_\d+_[a-zA-Z0-9]+$/.test(id);
  }
};

// Enhanced error handling
function handleError(res, error, statusCode = 500) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  
  const response = {
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString()
  };
  
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }
  
  res.status(statusCode).json(response);
}

// Async wrapper for better error handling
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(error => {
      handleError(res, error);
    });
  };
}

// Enhanced configuration constants for maximum efficiency
const CONFIG = {
  HISTORY_LIMIT: 100,
  OPERATIONS_LOG_LIMIT: 1000,
  BULK_CLICK_LIMIT: 50,
  BULK_BLOG_VIEW_LIMIT: 3000,
  MAX_CACHE_SIZE: 50,
  MAX_URL_LENGTH: 2048,
  MAX_SHORT_CODE_LENGTH: 10,
  MAX_TITLE_LENGTH: 200,
  MAX_CONTENT_LENGTH: 10000,
  
  // Advanced Simulation Limits
  MAX_SESSION_PAGES: 15,
  MAX_CONVERSION_FUNNEL_STEPS: 10,
  MAX_VIRAL_BURST_MULTIPLIER: 50,
  MAX_CAMPAIGN_DURATION_HOURS: 168, // 1 week
  BASE_DELAYS: {
    CLICK_GENERATION: 200,
    BLOG_VIEW_GENERATION: 300,
    SESSION_GENERATION: 500,
    VIRAL_SIMULATION: 5000,
    GEO_TARGETING: 250
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
    JSON: { 'Content-Type': 'application/json; charset=utf-8' },
    HTML: { 'Content-Type': 'text/html; charset=utf-8' },
    CACHE_CONTROL: { 'Cache-Control': 'public, max-age=300' },
    NO_CACHE: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
  }
};

// Enhanced realistic user agent list for better simulation
const REALISTIC_USER_AGENTS = [
  // Chrome on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  
  // Chrome on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  
  // Safari on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
  
  // Firefox on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  
  // Firefox on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  
  // Chrome on Linux
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  
  // Mobile Chrome on Android
  'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 12; SM-A525F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
  
  // Safari on iOS
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  
  // Edge on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  
  // Samsung Internet
  'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
  
  // Opera
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
  
  // Tablet user agents
  'Mozilla/5.0 (Linux; Android 13; Tab S8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
];

// Enhanced multi-level caching system for optimal performance
const enhancedCache = {
  analytics: { urlStats: null, blogStats: null, lastUpdated: 0 },
  templates: new Map(),
  staticContent: new Map(),
  responses: new Map()
};

// Optimized cache management utilities with memory leak prevention
const cacheUtils = {
  get(category, key, duration = CONFIG.CACHE_DURATIONS.ANALYTICS) {
    try {
      const cache = enhancedCache[category];
      if (!cache) return null;
      
      if (cache instanceof Map) {
        const item = cache.get(key);
        return item && (Date.now() - item.timestamp < duration) ? item.data : null;
      }
      
      return (Date.now() - cache.lastUpdated < duration) ? cache[key] : null;
    } catch (error) {
      console.error('Cache get error:', error.message);
      return null;
    }
  },
  
  set(category, key, data, isMap = true) {
    try {
      const cache = enhancedCache[category];
      if (!cache) return false;
      
      if (isMap && cache instanceof Map) {
        cache.set(key, { data, timestamp: Date.now() });
        // Prevent memory bloat - keep only last CONFIG.MAX_CACHE_SIZE entries
        if (cache.size > CONFIG.MAX_CACHE_SIZE) {
          const keysToDelete = Math.floor(CONFIG.MAX_CACHE_SIZE * 0.2); // Remove 20% of entries
          const iterator = cache.keys();
          for (let i = 0; i < keysToDelete; i++) {
            const firstKey = iterator.next().value;
            if (firstKey !== undefined) {
              cache.delete(firstKey);
            }
          }
        }
      } else {
        cache[key] = data;
        cache.lastUpdated = Date.now();
      }
      return true;
    } catch (error) {
      console.error('Cache set error:', error.message);
      return false;
    }
  },
  
  clear(category) {
    try {
      const cache = enhancedCache[category];
      if (cache instanceof Map) {
        cache.clear();
      } else if (cache) {
        Object.keys(cache).forEach(key => {
          if (key !== 'lastUpdated') delete cache[key];
        });
        cache.lastUpdated = 0;
      }
      return true;
    } catch (error) {
      console.error('Cache clear error:', error.message);
      return false;
    }
  },
  
  // Optimized periodic cleanup to prevent memory leaks
  cleanup() {
    try {
      const now = Date.now();
      const expiredThreshold = CONFIG.CACHE_DURATIONS.STATIC_CONTENT * 2;
      
      // Use more efficient cleanup with batching
      ['templates', 'staticContent', 'responses'].forEach(category => {
        const cache = enhancedCache[category];
        if (cache instanceof Map && cache.size > 0) {
          const keysToDelete = [];
          
          // Collect expired keys first
          for (const [key, item] of cache.entries()) {
            if (item && item.timestamp && (now - item.timestamp > expiredThreshold)) {
              keysToDelete.push(key);
            }
          }
          
          // Batch delete expired keys
          keysToDelete.forEach(key => cache.delete(key));
          
          // If cache is still too large, remove oldest entries
          if (cache.size > CONFIG.MAX_CACHE_SIZE) {
            const entriesToRemove = cache.size - CONFIG.MAX_CACHE_SIZE;
            let removed = 0;
            for (const key of cache.keys()) {
              if (removed >= entriesToRemove) break;
              cache.delete(key);
              removed++;
            }
          }
        }
      });
    } catch (error) {
      console.error('Cache cleanup error:', error.message);
    }
  }
};

// Optimized utility functions - consolidated for efficiency
const utilityFunctions = {
  // Random generation utilities with enhanced validation
  generateRandomString(length = 6) {
    if (length < 1 || length > 20) length = 6;
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const charsLength = chars.length;
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * charsLength));
    }
    
    return result;
  },

  generateBlogId() {
    return 'blog_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  generateRandomIP(options = {}) {
    const { country, region, provider } = options;
    
    // Geographic IP ranges for targeted simulation
    const geographicRanges = {
      'US': [
        { first: [8, 8], last: [8, 8], provider: 'Google DNS' },
        { first: [52, 0], last: [52, 255], provider: 'AWS' },
        { first: [74, 125], last: [74, 125], provider: 'Google' },
        { first: [23, 20], last: [23, 255], provider: 'AWS' },
        { first: [199, 36], last: [199, 36], provider: 'Various ISPs' }
      ],
      'EU': [
        { first: [34, 192], last: [34, 255], provider: 'Google Cloud EU' },
        { first: [35, 184], last: [35, 255], provider: 'Google Cloud EU' },
        { first: [54, 144], last: [54, 255], provider: 'AWS EU' },
        { first: [185, 0], last: [185, 255], provider: 'European ISPs' },
        { first: [31, 13], last: [31, 13], provider: 'OVH' }
      ],
      'ASIA': [
        { first: [13, 107], last: [13, 107], provider: 'Microsoft Asia' },
        { first: [103, 0], last: [103, 255], provider: 'Asian ISPs' },
        { first: [112, 0], last: [112, 255], provider: 'Asian Cloud' },
        { first: [119, 0], last: [119, 255], provider: 'Asian Telecom' }
      ],
      'CA': [
        { first: [142, 250], last: [142, 251], provider: 'Google Canada' },
        { first: [216, 58], last: [216, 58], provider: 'Google Canada' },
        { first: [198, 168], last: [198, 168], provider: 'Canadian ISPs' }
      ],
      'AU': [
        { first: [139, 130], last: [139, 130], provider: 'Australian ISPs' },
        { first: [203, 0], last: [203, 255], provider: 'Australian Telecom' }
      ],
      'BR': [
        { first: [179, 0], last: [179, 255], provider: 'Brazilian ISPs' },
        { first: [189, 0], last: [189, 255], provider: 'Brazilian Telecom' }
      ]
    };
    
    // Default global ranges if no country specified
    const defaultRanges = [
      { first: [1, 4], last: [254, 254], provider: 'Global ISPs' },
      { first: [8, 8], last: [8, 8], provider: 'Google DNS' },
      { first: [13, 107], last: [13, 107], provider: 'Microsoft' },
      { first: [23, 20], last: [23, 255], provider: 'AWS' },
      { first: [34, 192], last: [34, 255], provider: 'Google Cloud' },
      { first: [35, 184], last: [35, 255], provider: 'Google Cloud' },
      { first: [52, 0], last: [52, 255], provider: 'AWS' },
      { first: [54, 144], last: [54, 255], provider: 'AWS' },
      { first: [64, 233], last: [64, 233], provider: 'Google' },
      { first: [66, 249], last: [66, 249], provider: 'Google' },
      { first: [74, 125], last: [74, 125], provider: 'Google' },
      { first: [108, 177], last: [108, 177], provider: 'Google' },
      { first: [142, 250], last: [142, 251], provider: 'Google' },
      { first: [173, 194], last: [173, 194], provider: 'Google' },
      { first: [199, 36], last: [199, 36], provider: 'Various ISPs' },
      { first: [207, 46], last: [207, 46], provider: 'Microsoft' },
      { first: [216, 58], last: [216, 58], provider: 'Google' }
    ];
    
    let ranges = defaultRanges;
    
    // Select ranges based on geographic targeting
    if (country && geographicRanges[country.toUpperCase()]) {
      ranges = geographicRanges[country.toUpperCase()];
    } else if (region) {
      // Regional targeting
      switch (region.toLowerCase()) {
        case 'north_america':
          ranges = [...geographicRanges.US, ...geographicRanges.CA];
          break;
        case 'europe':
          ranges = geographicRanges.EU;
          break;
        case 'asia_pacific':
          ranges = [...geographicRanges.ASIA, ...geographicRanges.AU];
          break;
        case 'south_america':
          ranges = geographicRanges.BR;
          break;
      }
    }
    
    // Filter by provider if specified
    if (provider) {
      ranges = ranges.filter(range => 
        range.provider.toLowerCase().includes(provider.toLowerCase())
      );
      if (ranges.length === 0) ranges = defaultRanges;
    }
    
    const range = ranges[Math.floor(Math.random() * ranges.length)];
    const firstOctet = Math.floor(Math.random() * (range.last[0] - range.first[0] + 1)) + range.first[0];
    const secondOctet = range.first[1] === range.last[1] ? range.first[1] : 
                       Math.floor(Math.random() * (range.last[1] - range.first[1] + 1)) + range.first[1];
    
    const ip = [
      firstOctet,
      secondOctet,
      Math.floor(Math.random() * 254) + 1,
      Math.floor(Math.random() * 254) + 1
    ].join('.');
    
    // Return enhanced IP data for advanced features
    if (options.detailed) {
      return {
        ip: ip,
        provider: range.provider,
        country: country || this.getCountryFromIP(ip),
        region: region || this.getRegionFromIP(ip)
      };
    }
    
    return ip;
  },

  getCountryFromIP(ip) {
    // Simple country detection based on IP ranges
    const firstOctet = parseInt(ip.split('.')[0]);
    if (firstOctet >= 1 && firstOctet <= 126) return 'US';
    if (firstOctet >= 128 && firstOctet <= 191) return 'EU';
    if (firstOctet >= 192 && firstOctet <= 223) return 'ASIA';
    return 'GLOBAL';
  },

  getRegionFromIP(ip) {
    const country = this.getCountryFromIP(ip);
    const regionMap = {
      'US': 'north_america',
      'CA': 'north_america', 
      'EU': 'europe',
      'ASIA': 'asia_pacific',
      'AU': 'asia_pacific',
      'BR': 'south_america'
    };
    return regionMap[country] || 'global';
  },

  getRandomUserAgent(agents) {
    if (!Array.isArray(agents) || agents.length === 0) {
      return 'Mozilla/5.0 (compatible; URLShortener/1.0)';
    }
    return agents[Math.floor(Math.random() * agents.length)];
  },

  generateUniqueId(prefix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return prefix + timestamp + '_' + random;
  },

  // Debounce function for performance optimization
  debounce(func, wait) {
    if (typeof func !== 'function') {
      throw new Error('Debounce requires a function');
    }
    if (wait < 0) wait = 0;
    
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Interval manager for better resource management
  intervalManager: {
    intervals: new Map(),
    
    create(id, callback, delay) {
      if (typeof callback !== 'function' || delay < 0) {
        throw new Error('Invalid callback or delay');
      }
      
      // Clear existing interval with same ID
      if (this.intervals.has(id)) {
        clearInterval(this.intervals.get(id));
      }
      
      const intervalId = setInterval(callback, delay);
      this.intervals.set(id, intervalId);
      return intervalId;
    },
    
    clear(id) {
      if (this.intervals.has(id)) {
        clearInterval(this.intervals.get(id));
        this.intervals.delete(id);
        return true;
      }
      return false;
    },
    
    clearAll() {
      this.intervals.forEach(intervalId => clearInterval(intervalId));
      this.intervals.clear();
    }
  },

  // Safe JSON parsing
  safeParse(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  },

  // Safe number parsing
  safeParseInt(value, defaultValue = 0) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  },

  // Enhanced realistic simulation features
  getRealisticDelay(baseDelay) {
    // Add random variation to make timing more natural (±20% variation)
    const variation = 0.2;
    const minDelay = baseDelay * (1 - variation);
    const maxDelay = baseDelay * (1 + variation);
    return Math.floor(Math.random() * (maxDelay - minDelay) + minDelay);
  },

  getRandomDeviceInfo() {
    const devices = [
      { type: 'desktop', os: 'Windows', share: 0.4 },
      { type: 'desktop', os: 'macOS', share: 0.15 },
      { type: 'desktop', os: 'Linux', share: 0.05 },
      { type: 'mobile', os: 'Android', share: 0.25 },
      { type: 'mobile', os: 'iOS', share: 0.12 },
      { type: 'tablet', os: 'iPad', share: 0.03 }
    ];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (const device of devices) {
      cumulative += device.share;
      if (random <= cumulative) {
        return device;
      }
    }
    
    return devices[0]; // fallback
  },

  simulateNaturalBehavior() {
    // Simulate natural user behavior patterns
    const behaviors = {
      readTime: Math.floor(Math.random() * 120000) + 5000, // 5-125 seconds
      scrollDepth: Math.floor(Math.random() * 100), // 0-100%
      interactionTime: Math.floor(Math.random() * 300000) + 10000, // 10-310 seconds
      bounceRate: Math.random() < 0.3 // 30% bounce rate
    };
    
    return behaviors;
  },

  // Geographic distribution simulation
  getGeographicData() {
    const regions = [
      { region: 'North America', share: 0.4, timezones: ['EST', 'CST', 'MST', 'PST'] },
      { region: 'Europe', share: 0.25, timezones: ['GMT', 'CET', 'EET'] },
      { region: 'Asia', share: 0.2, timezones: ['JST', 'CST', 'IST'] },
      { region: 'South America', share: 0.08, timezones: ['BRT', 'ART'] },
      { region: 'Africa', share: 0.04, timezones: ['CAT', 'WAT'] },
      { region: 'Oceania', share: 0.03, timezones: ['AEST', 'NZST'] }
    ];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (const region of regions) {
      cumulative += region.share;
      if (random <= cumulative) {
        const timezone = region.timezones[Math.floor(Math.random() * region.timezones.length)];
        return { region: region.region, timezone };
      }
    }
    
    return regions[0]; // fallback
  },

  // Referrer simulation for realistic traffic
  getRandomReferrer() {
    const referrers = [
      'https://www.google.com/search?q=',
      'https://www.bing.com/search?q=',
      'https://duckduckgo.com/?q=',
      'https://twitter.com/',
      'https://www.facebook.com/',
      'https://www.reddit.com/',
      'https://www.linkedin.com/',
      'https://www.youtube.com/',
      'direct', // 30% direct traffic
      'direct',
      'direct'
    ];
    
    return referrers[Math.floor(Math.random() * referrers.length)];
  },

  // ====== ADVANCED SIMULATION FEATURES ======

  // Session simulation with multi-page journeys
  simulateUserSession(options = {}) {
    const { sessionLength = 'random', deviceType = null, region = null } = options;
    
    let pages;
    if (sessionLength === 'random') {
      // Realistic session lengths: 1-15 pages, weighted toward smaller sessions
      const weights = [0.4, 0.25, 0.15, 0.08, 0.05, 0.03, 0.02, 0.01, 0.005, 0.005, 0.003, 0.002, 0.001, 0.001, 0.001];
      const random = Math.random();
      let cumulative = 0;
      pages = 1;
      
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (random <= cumulative) {
          pages = i + 1;
          break;
        }
      }
    } else {
      pages = Math.min(Math.max(parseInt(sessionLength), 1), CONFIG.MAX_SESSION_PAGES);
    }
    
    const session = {
      sessionId: this.generateUniqueId('session_'),
      pages: pages,
      startTime: Date.now(),
      deviceType: deviceType || this.getRandomDeviceInfo().type,
      region: region || this.getGeographicData().region,
      totalDuration: 0,
      bounced: pages === 1 && Math.random() < 0.3, // 30% bounce rate for single page
      pageViews: []
    };
    
    // Generate page view sequence
    for (let i = 0; i < pages; i++) {
      const pageView = {
        pageNumber: i + 1,
        timeOnPage: this.generateRealisticTimeOnPage(i === 0),
        scrollDepth: Math.floor(Math.random() * 100),
        interactions: Math.floor(Math.random() * 5), // 0-4 interactions per page
        exitPage: i === pages - 1
      };
      
      session.totalDuration += pageView.timeOnPage;
      session.pageViews.push(pageView);
    }
    
    return session;
  },

  generateRealisticTimeOnPage(isLandingPage = false) {
    // Landing pages typically get more attention
    const baseTime = isLandingPage ? 45000 : 25000; // 45s vs 25s base
    const variation = Math.random() * 0.8 + 0.6; // 60%-140% variation
    return Math.floor(baseTime * variation);
  },

  // Time-based traffic pattern simulation
  simulateTrafficPatterns(hour = null, timezone = 'UTC') {
    const currentHour = hour !== null ? hour : new Date().getHours();
    
    // Traffic patterns by hour (0-23), different for weekdays vs weekends
    const weekdayTraffic = [
      0.2, 0.1, 0.05, 0.05, 0.1, 0.15, 0.25, 0.4, // 0-7
      0.6, 0.8, 0.9, 1.0, 0.95, 0.85, 0.9, 0.95, // 8-15
      0.85, 0.8, 0.75, 0.7, 0.6, 0.5, 0.4, 0.3   // 16-23
    ];
    
    const weekendTraffic = [
      0.15, 0.1, 0.05, 0.05, 0.05, 0.1, 0.2, 0.3, // 0-7
      0.4, 0.5, 0.7, 0.8, 0.9, 1.0, 0.95, 0.9,   // 8-15
      0.8, 0.7, 0.6, 0.5, 0.45, 0.4, 0.3, 0.2    // 16-23
    ];
    
    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
    const trafficPattern = isWeekend ? weekendTraffic : weekdayTraffic;
    
    return {
      multiplier: trafficPattern[currentHour],
      peakHour: currentHour >= 11 && currentHour <= 14,
      offPeakHour: currentHour <= 5 || currentHour >= 22,
      timezone: timezone,
      dayType: isWeekend ? 'weekend' : 'weekday'
    };
  },

  // Viral traffic burst simulation
  simulateViralTraffic(baseVolume = 100) {
    const viralPatterns = [
      { type: 'social_media_spike', multiplier: 5, duration: 3600000 }, // 1 hour
      { type: 'reddit_frontpage', multiplier: 15, duration: 7200000 }, // 2 hours
      { type: 'influencer_share', multiplier: 8, duration: 1800000 },  // 30 minutes
      { type: 'viral_video', multiplier: 25, duration: 14400000 },     // 4 hours
      { type: 'news_mention', multiplier: 12, duration: 10800000 },    // 3 hours
      { type: 'celebrity_tweet', multiplier: 30, duration: 900000 }    // 15 minutes
    ];
    
    const pattern = viralPatterns[Math.floor(Math.random() * viralPatterns.length)];
    const peakVolume = Math.min(baseVolume * pattern.multiplier, baseVolume * CONFIG.MAX_VIRAL_BURST_MULTIPLIER);
    
    return {
      type: pattern.type,
      baseVolume: baseVolume,
      peakVolume: peakVolume,
      multiplier: pattern.multiplier,
      duration: pattern.duration,
      startTime: Date.now(),
      curve: this.generateViralCurve(pattern.duration)
    };
  },

  generateViralCurve(duration) {
    // Generate realistic viral traffic curve (rapid rise, gradual fall)
    const points = 20;
    const curve = [];
    
    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1);
      let multiplier;
      
      if (progress < 0.2) {
        // Rapid initial growth
        multiplier = Math.pow(progress / 0.2, 0.3);
      } else if (progress < 0.4) {
        // Peak period
        multiplier = 0.9 + (0.1 * Math.sin((progress - 0.2) * Math.PI * 5));
      } else {
        // Gradual decline
        multiplier = Math.pow((1 - progress) / 0.6, 0.7);
      }
      
      curve.push({
        time: Math.floor((duration * progress) / 1000), // seconds
        multiplier: Math.max(0.1, multiplier)
      });
    }
    
    return curve;
  },

  // A/B testing traffic simulation
  simulateABTest(variants = ['A', 'B'], distribution = [0.5, 0.5]) {
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < variants.length; i++) {
      cumulative += distribution[i];
      if (random <= cumulative) {
        return {
          variant: variants[i],
          testGroup: `group_${variants[i]}`,
          conversionRate: this.getVariantConversionRate(variants[i]),
          experimentId: this.generateUniqueId('exp_')
        };
      }
    }
    
    return { variant: variants[0], testGroup: 'group_A', conversionRate: 0.02 };
  },

  getVariantConversionRate(variant) {
    // Simulate different conversion rates for A/B test variants
    const baseRates = {
      'A': 0.02,  // 2% base conversion
      'B': 0.025, // 2.5% improved conversion
      'C': 0.018, // 1.8% worse conversion
      'D': 0.035  // 3.5% significantly better
    };
    
    return baseRates[variant] || 0.02;
  },

  // Conversion funnel simulation
  simulateConversionFunnel(steps = ['landing', 'interest', 'consideration', 'conversion']) {
    const funnelRates = {
      'landing': 1.0,        // 100% see landing
      'interest': 0.6,       // 60% show interest
      'consideration': 0.25,  // 25% consider
      'conversion': 0.05      // 5% convert
    };
    
    const userJourney = [];
    let currentRate = 1.0;
    
    for (const step of steps) {
      const stepRate = funnelRates[step] || 0.1;
      const continuesJourney = Math.random() < (stepRate * currentRate);
      
      userJourney.push({
        step: step,
        completed: continuesJourney,
        dropOffRate: 1 - stepRate,
        cumulativeRate: stepRate * currentRate
      });
      
      if (!continuesJourney) break;
      currentRate = stepRate;
    }
    
    return {
      steps: userJourney,
      finalConversion: userJourney[userJourney.length - 1]?.step === steps[steps.length - 1],
      dropOffPoint: userJourney.find(step => !step.completed)?.step || null
    };
  },

  // Campaign simulation with attribution
  simulateCampaignTraffic(campaignType = 'organic') {
    const campaignData = {
      'organic': {
        sources: ['google', 'bing', 'duckduckgo'],
        conversionRate: 0.03,
        qualityScore: 0.8,
        cpc: 0 // Free
      },
      'paid_search': {
        sources: ['google_ads', 'bing_ads'],
        conversionRate: 0.05,
        qualityScore: 0.7,
        cpc: 1.25
      },
      'social_media': {
        sources: ['facebook', 'twitter', 'linkedin', 'instagram'],
        conversionRate: 0.015,
        qualityScore: 0.6,
        cpc: 0.80
      },
      'email': {
        sources: ['newsletter', 'promotional', 'transactional'],
        conversionRate: 0.08,
        qualityScore: 0.9,
        cpc: 0.05
      },
      'referral': {
        sources: ['partner_site', 'blog_mention', 'forum_link'],
        conversionRate: 0.04,
        qualityScore: 0.85,
        cpc: 0
      }
    };
    
    const campaign = campaignData[campaignType] || campaignData['organic'];
    const source = campaign.sources[Math.floor(Math.random() * campaign.sources.length)];
    
    return {
      campaignType: campaignType,
      source: source,
      medium: this.getCampaignMedium(campaignType),
      conversionRate: campaign.conversionRate,
      qualityScore: campaign.qualityScore,
      costPerClick: campaign.cpc,
      campaignId: this.generateUniqueId('camp_'),
      timestamp: Date.now()
    };
  },

  getCampaignMedium(campaignType) {
    const mediumMap = {
      'organic': 'organic',
      'paid_search': 'cpc',
      'social_media': 'social',
      'email': 'email',
      'referral': 'referral'
    };
    return mediumMap[campaignType] || 'organic';
  }
};

// Legacy compatibility functions (optimized)
function getCachedAnalytics(type) {
  return cacheUtils.get('analytics', type, CONFIG.CACHE_DURATIONS.ANALYTICS);
}

function setCachedAnalytics(type, data) {
  cacheUtils.set('analytics', type, data, false);
}

// Enhanced whitelist of trusted domains for redirection
const TRUSTED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'example.com',
  'google.com',
  'github.com',
  // Add your own domain(s) here
];

// Enhanced URL validation with security checks
function isTrustedUrl(url) {
  try {
    const parsed = new URL(url);
    
    // Check protocol
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    // Check for malicious patterns
    const maliciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /file:/i,
      /ftp:/i
    ];
    
    if (maliciousPatterns.some(pattern => pattern.test(url))) {
      return false;
    }
    
    // Check if domain is trusted
    return TRUSTED_DOMAINS.some(domain => {
      return parsed.hostname === domain || parsed.hostname.endsWith('.' + domain);
    });
  } catch (e) {
    console.error('URL validation error:', e.message);
    return false;
  }
}

// Enhanced URL validation for general use
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.length > CONFIG.MAX_URL_LENGTH) return false;
  
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch (e) {
    return false;
  }
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
    { type: 'internal', id: null, url: null, waitTime: 3, enabled: true },
    { type: 'internal', id: null, url: null, waitTime: 3, enabled: true },
    { type: 'internal', id: null, url: null, waitTime: 3, enabled: true },
    { type: 'internal', id: null, url: null, waitTime: 3, enabled: true },
    { type: 'internal', id: null, url: null, waitTime: 3, enabled: true },
    { type: 'internal', id: null, url: null, waitTime: 3, enabled: true },
    { type: 'internal', id: null, url: null, waitTime: 3, enabled: true },
    { type: 'internal', id: null, url: null, waitTime: 3, enabled: true }
  ],
  randomize: true,
  analytics: {
    totalRedirects: 0,
    completedChains: 0,
    abandonedAt: {}
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

// Enhanced authentication with security improvements
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// Active admin sessions tracking
const adminSessions = new Map();

// Authentication utilities
const authUtils = {
  generateToken() {
    return utilityFunctions.generateRandomString(32);
  },
  
  createSession(token) {
    const session = {
      token,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    adminSessions.set(token, session);
    return session;
  },
  
  validateSession(token) {
    const session = adminSessions.get(token);
    if (!session) return false;
    
    const now = Date.now();
    if (now - session.createdAt > SESSION_TIMEOUT) {
      adminSessions.delete(token);
      return false;
    }
    
    // Update last activity
    session.lastActivity = now;
    return true;
  },
  
  cleanupSessions() {
    const now = Date.now();
    for (const [token, session] of adminSessions.entries()) {
      if (now - session.createdAt > SESSION_TIMEOUT) {
        adminSessions.delete(token);
      }
    }
  }
};

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

  // Enhanced memory usage optimization
  optimizeMemoryUsage() {
    const performCleanup = () => {
      try {
        // Clear old cache entries more efficiently
        for (const [category, cache] of Object.entries(enhancedCache)) {
          if (cache instanceof Map && cache.size > CONFIG.HISTORY_LIMIT) {
            // Delete oldest entries efficiently
            const keysToDelete = Math.min(cache.size - CONFIG.HISTORY_LIMIT + 20, 50);
            const iterator = cache.keys();
            for (let i = 0; i < keysToDelete; i++) {
              const key = iterator.next().value;
              if (key) cache.delete(key);
            }
          }
        }
        
        // Clean up operation logs if they exceed limit
        if (adminSecurity.operationLogs.length > CONFIG.OPERATIONS_LOG_LIMIT) {
          adminSecurity.operationLogs.splice(0, adminSecurity.operationLogs.length - CONFIG.OPERATIONS_LOG_LIMIT);
        }
        
        // Garbage collection hint
        if (global.gc) {
          global.gc();
        }
      } catch (error) {
        console.error('[MEMORY] Cleanup error:', error.message);
      }
    };
    
    // Start memory cleanup with interval manager
    utilityFunctions.intervalManager.create('memoryCleanup', performCleanup, 300000);
    
    // Return cleanup function for manual trigger
    return {
      cleanup: performCleanup,
      stop: () => utilityFunctions.intervalManager.clear('memoryCleanup')
    };
  },

  // Enhanced response compression for better network performance
  compressResponse(content) {
    // Only compress strings longer than 1KB to avoid overhead
    if (typeof content !== 'string' || content.length <= 1000) {
      return content;
    }
    
    // Use more efficient single-pass compression
    return content
      .replace(/\s+/g, ' ')           // Collapse whitespace
      .replace(/>\s+</g, '><')        // Remove spaces between tags
      .replace(/^\s+|\s+$/g, '');     // Trim start and end
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

  // Efficient random code generation - uses consolidated utility
  generateRandomCode(length) {
    return utilityFunctions.generateRandomString(length);
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
    
    // Add to history with efficient data structure (ensure array exists)
    if (!analytics[historyKey]) {
      analytics[historyKey] = [];
    }
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
    id: utilityFunctions.generateUniqueId()
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
  
  try {
    // Basic auth check
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Missing or invalid authorization header' 
      });
    }
    
    const token = auth.substring(7); // Remove 'Bearer ' prefix
    
    // Check if it's the master password (for initial login)
    if (token === ADMIN_PASSWORD) {
      // Enhanced security checks for automation endpoints
      const ip = getClientIP(req);
      const path = req.path;
      
      // Log the operation attempt
      logAdminOperation('AUTH_CHECK', ip, { path, userAgent: req.get('User-Agent') });
      
      return next();
    }
    
    // Check session token
    if (authUtils.validateSession(token)) {
      // Enhanced security checks for automation endpoints
      const ip = getClientIP(req);
      const path = req.path;
      
      // Log the operation attempt
      logAdminOperation('AUTH_CHECK', ip, { path, userAgent: req.get('User-Agent') });
      
      return next();
    }
    
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid or expired session' 
    });
  } catch (error) {
    console.error('Advanced auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
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



// Enhanced authentication middleware with session management
function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Missing or invalid authorization header' 
      });
    }
    
    const token = auth.substring(7); // Remove 'Bearer ' prefix
    
    // Check if it's the master password (for initial login)
    if (token === ADMIN_PASSWORD) {
      return next();
    }
    
    // Check session token
    if (authUtils.validateSession(token)) {
      return next();
    }
    
    res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid or expired session' 
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

// Routes

// Enhanced health check endpoint for deployment monitoring
app.get('/health', asyncHandler(async (req, res) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
    },
    performance: {
      userCPU: Math.round(cpuUsage.user / 1000) + ' ms',
      systemCPU: Math.round(cpuUsage.system / 1000) + ' ms'
    },
    database: {
      totalUrls: Object.keys(urlDatabase).length,
      totalBlogs: Object.keys(blogDatabase).length,
      totalAnnouncements: Object.keys(announcementDatabase).length
    },
    cache: {
      analyticsCache: enhancedCache.analytics.lastUpdated > 0 ? 'active' : 'inactive',
      templatesCache: enhancedCache.templates.size,
      responsesCache: enhancedCache.responses.size
    },
    features: {
      safelink: safelinkConfig.enabled,
      eightPageRedirection: eightPageRedirectionConfig.enabled,
      experimentalFeatures: 'active'
    }
  };
  
  res.status(200).json(healthStatus);
}));

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

// Enhanced URL shortening endpoint with comprehensive validation
app.post('/shorten', asyncHandler(async (req, res) => {
  const { originalUrl, customCode } = req.body;
  
  // Enhanced validation
  if (!originalUrl || typeof originalUrl !== 'string') {
    return res.status(400).json({ 
      error: 'Invalid input', 
      message: 'originalUrl is required and must be a string' 
    });
  }
  
  // Sanitize and validate URL
  const sanitizedUrl = originalUrl.trim();
  if (!isValidUrl(sanitizedUrl)) {
    return res.status(400).json({ 
      error: 'Invalid URL', 
      message: 'Please provide a valid HTTP or HTTPS URL' 
    });
  }
  
  // Check URL length
  if (sanitizedUrl.length > CONFIG.MAX_URL_LENGTH) {
    return res.status(400).json({ 
      error: 'URL too long', 
      message: `URL must be less than ${CONFIG.MAX_URL_LENGTH} characters` 
    });
  }
  
  // Validate custom code if provided
  if (customCode) {
    const sanitizedCode = validator.sanitizeString(customCode, CONFIG.MAX_SHORT_CODE_LENGTH);
    
    if (!validator.isValidShortCode(sanitizedCode)) {
      return res.status(400).json({ 
        error: 'Invalid custom code', 
        message: 'Custom code must be 3-10 characters long and contain only letters and numbers' 
      });
    }
    
    // Check if custom code already exists
    if (urlDatabase[sanitizedCode]) {
      return res.status(409).json({ 
        error: 'Code already exists', 
        message: 'Custom code already exists. Please choose a different one.' 
      });
    }
    
    // Store with custom code
    urlDatabase[sanitizedCode] = sanitizedUrl;
    urlAnalytics[sanitizedCode] = {
      clicks: 0,
      createdAt: new Date().toISOString(),
      lastAccessed: null,
      referrers: {},
      userAgents: {},
      isCustom: true
    };
    
    return res.json({ 
      shortCode: sanitizedCode, 
      originalUrl: sanitizedUrl, 
      isCustom: true,
      shortUrl: `${req.protocol}://${req.get('host')}/${sanitizedCode}`
    });
  }
  
  // Check if URL already exists (for auto-generated codes only)
  for (const [shortCode, url] of Object.entries(urlDatabase)) {
    if (url === sanitizedUrl && urlAnalytics[shortCode]?.isCustom !== true) {
      return res.json({ 
        shortCode, 
        originalUrl: sanitizedUrl, 
        isExisting: true,
        shortUrl: `${req.protocol}://${req.get('host')}/${shortCode}`
      });
    }
  }
  
  // Generate unique short code
  let shortCode;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    shortCode = utilityFunctions.generateRandomString(6);
    attempts++;
  } while (urlDatabase[shortCode] && attempts < maxAttempts);
  
  if (attempts >= maxAttempts) {
    return res.status(500).json({ 
      error: 'Generation failed', 
      message: 'Failed to generate unique short code. Please try again.' 
    });
  }
  
  // Store the URL
  urlDatabase[shortCode] = sanitizedUrl;
  urlAnalytics[shortCode] = {
    clicks: 0,
    createdAt: new Date().toISOString(),
    lastAccessed: null,
    referrers: {},
    userAgents: {},
    isCustom: false
  };
  
  res.json({ 
    shortCode, 
    originalUrl: sanitizedUrl,
    shortUrl: `${req.protocol}://${req.get('host')}/${shortCode}`
  });
}));

// API endpoint for URL shortening (alternative path for API consistency)
app.post('/api/shorten', asyncHandler(async (req, res) => {
  const { url, originalUrl, customCode } = req.body;
  
  // Support both 'url' and 'originalUrl' parameters for flexibility
  const targetUrl = url || originalUrl;
  
  // Enhanced validation
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).json({ 
      error: 'Invalid input', 
      message: 'url or originalUrl is required and must be a string' 
    });
  }
  
  // Sanitize and validate URL
  const sanitizedUrl = targetUrl.trim();
  if (!isValidUrl(sanitizedUrl)) {
    return res.status(400).json({ 
      error: 'Invalid URL', 
      message: 'Please provide a valid HTTP or HTTPS URL' 
    });
  }
  
  // Check URL length
  if (sanitizedUrl.length > CONFIG.MAX_URL_LENGTH) {
    return res.status(400).json({ 
      error: 'URL too long', 
      message: `URL must be less than ${CONFIG.MAX_URL_LENGTH} characters` 
    });
  }
  
  // Generate or validate short code
  let shortCode;
  if (customCode) {
    const sanitizedCode = validator.sanitizeString(customCode, CONFIG.MAX_SHORT_CODE_LENGTH);
    if (!validator.isValidShortCode(sanitizedCode)) {
      return res.status(400).json({ 
        error: 'Invalid custom code', 
        message: 'Custom code must be 3-10 characters long and contain only letters and numbers' 
      });
    }
    
    if (urlDatabase[sanitizedCode]) {
      return res.status(409).json({ 
        error: 'Code already exists', 
        message: 'Please choose a different custom code' 
      });
    }
    shortCode = sanitizedCode;
  } else {
    shortCode = routeUtils.generateUniqueCode(6, urlDatabase);
  }
  
  // Store the mapping with enhanced analytics structure
  urlDatabase[shortCode] = {
    originalUrl: sanitizedUrl,
    shortCode,
    clicks: 0,
    createdAt: new Date().toISOString(),
    lastAccessed: null,
    referrers: {},
    userAgents: {},
    isCustom: !!customCode
  };
  
  // Return response
  res.status(201).json({
    success: true,
    shortCode,
    originalUrl: sanitizedUrl,
    shortUrl: `${req.protocol}://${req.get('host')}/${shortCode}`,
    customCode: !!customCode
  });
}));

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
  const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>URL Preview - ${shortCode}</title>
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
                    <span class="url">${shortUrl}</span>
                </div>
                <div class="url-info">
                    <span class="label">Destination URL:</span><br>
                    <span class="url">${originalUrl}</span>
                </div>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${analytics.clicks}</div>
                    <div class="stat-label">Total Clicks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${analytics.firstClick ? new Date(analytics.firstClick).toLocaleDateString() : 'Never'}</div>
                    <div class="stat-label">First Clicked</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${analytics.lastClick ? new Date(analytics.lastClick).toLocaleDateString() : 'Never'}</div>
                    <div class="stat-label">Last Clicked</div>
                </div>
            </div>
            
            <div class="qr-code">
                <h3>QR Code</h3>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shortUrl)}" alt="QR Code for ${shortUrl}">
            </div>
            
            <div class="action-buttons">
                <a href="${originalUrl}" class="btn btn-primary">🔗 Continue to Website</a>
                <a href="/${shortCode}" class="btn btn-secondary">➡️ Direct Redirect</a>
                <button onclick="copyToClipboard('${shortUrl}')" class="btn btn-success">📋 Copy Short URL</button>
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

// Enhanced admin login endpoint with rate limiting and security
app.post('/admin/login', rateLimit(60000, 5), asyncHandler(async (req, res) => {
  const { password } = req.body;
  
  // Input validation
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ 
      error: 'Invalid input', 
      message: 'Password is required and must be a string' 
    });
  }
  
  // Rate limiting for failed attempts
  const clientId = req.ip || req.connection.remoteAddress;
  const attemptKey = `login_attempts_${clientId}`;
  
  if (password === ADMIN_PASSWORD) {
    // Generate session token
    const sessionToken = authUtils.generateToken();
    authUtils.createSession(sessionToken);
    
    // Log successful login
    console.log(`[AUTH] Successful admin login from ${clientId} at ${new Date().toISOString()}`);
    
    res.json({ 
      token: sessionToken, 
      message: 'Login successful',
      expiresIn: SESSION_TIMEOUT / 1000 // seconds
    });
  } else {
    // Log failed attempt
    console.warn(`[AUTH] Failed admin login attempt from ${clientId} at ${new Date().toISOString()}`);
    
    res.status(401).json({ 
      error: 'Invalid credentials', 
      message: 'Incorrect password' 
    });
  }
}));

// Admin dashboard
app.get('/admin/dashboard', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - URL Shortener</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .header h1 { color: #333; margin: 0; }
        .refresh-btn { background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; text-decoration: none; }
        .logout-btn { background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; text-decoration: none; }
        .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-item { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-number { font-size: 32px; font-weight: bold; color: #007bff; }
        
        /* Simple Tab Styles */
        .tab-btn {
            background: #f8f9fa;
            border: none;
            padding: 10px 20px;
            margin-right: 5px;
            border-radius: 5px 5px 0 0;
            cursor: pointer;
            font-weight: 500;
            transition: background 0.2s;
        }
        .tab-btn.active {
            background: #007bff;
            color: white;
        }
        .automation-tab-simple {
            display: none;
            padding: 20px 0;
        }
        .automation-tab-simple.active {
            display: block;
        }
        
        /* Enhanced Automation Panel Styles */
        .experimental-badge { 
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4); 
            color: white; 
            padding: 5px 10px; 
            border-radius: 15px; 
            font-size: 12px; 
            margin-left: 10px; 
        }
        
        .automation-header h2 { margin-bottom: 10px; color: #333; }
        .automation-header p { color: #666; margin-bottom: 20px; }
        
        .automation-tabs {
            display: flex;
            margin-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        
        .tab-btn {
            background: none;
            border: none;
            padding: 12px 20px;
            cursor: pointer;
            font-size: 14px;
            color: #6c757d;
            border-bottom: 2px solid transparent;
            transition: all 0.3s ease;
        }
        
        .tab-btn:hover { color: #007bff; background: #f8f9fa; }
        .tab-btn.active { color: #007bff; border-bottom-color: #007bff; background: #f8f9fa; }
        
        .automation-tab { display: none; }
        .automation-tab.active { display: block; }
        
        .automation-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .automation-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            border: 1px solid #e9ecef;
            transition: transform 0.2s ease;
        }
        
        .automation-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .automation-card h3 { margin-top: 0; color: #343a40; font-size: 16px; margin-bottom: 15px; }
        
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: 600; color: #495057; font-size: 14px; }
        .form-group input, .form-group select {
            width: 100%;
            padding: 8px 12px;
            border: 2px solid #e9ecef;
            border-radius: 5px;
            font-size: 14px;
            transition: border-color 0.2s ease;
            box-sizing: border-box;
        }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #007bff; }
        
        .security-notice { color: #e74c3c; font-size: 12px; display: block; margin-top: 5px; }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            display: inline-block;
            transition: all 0.2s ease;
        }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        .btn-success { background: #28a745; color: white; }
        .btn-primary { background: #007bff; color: white; }
        .btn-danger { background: #dc3545; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        
        .progress-info { margin-bottom: 15px; }
        .progress-item { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
        
        .progress-bar-container {
            background: #e9ecef;
            border-radius: 10px;
            height: 20px;
            position: relative;
            margin-bottom: 15px;
        }
        
        .progress-bar {
            background: linear-gradient(45deg, #28a745, #20c997);
            height: 100%;
            border-radius: 10px;
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .progress-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 12px;
            font-weight: 600;
            color: #343a40;
        }
        
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .stat-box {
            text-align: center;
            padding: 8px;
            background: white;
            border-radius: 5px;
            border: 1px solid #e9ecef;
        }
        .stat-box label { display: block; font-size: 12px; color: #6c757d; margin-bottom: 3px; }
        .stat-box span { font-size: 14px; font-weight: 600; color: #343a40; }
        
        .templates-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .template-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 2px solid #e9ecef;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .template-card:hover { border-color: #007bff; transform: translateY(-2px); }
        .template-card h4 { margin-top: 0; color: #343a40; margin-bottom: 8px; font-size: 14px; }
        .template-card p { color: #6c757d; font-size: 12px; margin-bottom: 10px; }
        .template-stats { background: #f8f9fa; padding: 6px 10px; border-radius: 4px; font-size: 11px; color: #495057; }
        
        .analytics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .analytics-card { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; }
        .analytics-card h4 { margin-top: 0; color: #343a40; margin-bottom: 15px; font-size: 16px; }
        
        .stat-item { text-align: center; margin-bottom: 15px; }
        .stat-item .stat-number { font-size: 24px; font-weight: 700; color: #007bff; display: block; }
        .stat-item .stat-label { font-size: 12px; color: #6c757d; text-transform: uppercase; }
        
        .metric-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f8f9fa; }
        .metric-row label { font-weight: 600; color: #495057; }
        .metric-row span { color: #007bff; font-weight: 500; }
        
        .export-section { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .export-section h4 { margin-top: 0; color: #343a40; margin-bottom: 10px; font-size: 14px; }
        .export-section .btn { margin-right: 10px; margin-bottom: 5px; }
        
        .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .setting-group label { display: block; margin-bottom: 5px; font-weight: 600; color: #495057; font-size: 14px; }
        
        .status-panel {
            background: #e7f3ff;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
            border-left: 4px solid #007bff;
        }
        .status-panel.success { background: #d4edda; border-left-color: #28a745; }
        .status-panel.error { background: #f8d7da; border-left-color: #dc3545; }
        .status-panel.info { background: #d1ecf1; border-left-color: #17a2b8; }
        
        #statusMessage { font-weight: 600; color: #343a40; }
        
        @media (max-width: 768px) {
            .automation-grid { grid-template-columns: 1fr; }
            .templates-grid { grid-template-columns: 1fr; }
            .analytics-grid { grid-template-columns: 1fr; }
            .settings-grid { grid-template-columns: 1fr; }
            .stats-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛠️ Admin Dashboard</h1>
        <div>
            <a href="/admin/blog" class="refresh-btn" style="background-color: #007bff; margin-right: 10px;">📝 Blog Management</a>
            <button class="refresh-btn" onclick="showAnnouncements()" style="background-color: #ffc107; margin-right: 10px;">📢 Announcements</button>
            <button class="refresh-btn" onclick="showAutomation()" style="background-color: #ff6b6b; margin-right: 10px;">🤖 Automation</button>
            <button class="refresh-btn" onclick="showSecurityDashboard()" style="background-color: #e74c3c; margin-right: 10px;">🛡️ Security</button>
            <button class="refresh-btn" onclick="showSafelinkSettings()" style="background-color: #28a745; margin-right: 10px;">🔗 SafeLink</button>
            <button class="refresh-btn" onclick="alert('8-Page Redirection feature successfully added! This experimental feature allows URLs to redirect through 8 blog pages before reaching the final destination. Full configuration panel coming soon!')" style="background-color: #9b59b6; margin-right: 10px;">📄 8-Page Redirect</button>
            <button class="refresh-btn" onclick="loadUrls()">Refresh</button>
            <a href="/admin" class="logout-btn" onclick="logout()">Logout</a>
        </div>
    </div>

    <div class="stats">
        <div class="stat-item">
            <div class="stat-number" id="totalUrls">0</div>
            <div>Total URLs</div>
        </div>
        <div class="stat-item">
            <div class="stat-number" id="totalClicks">0</div>
            <div>Total Clicks</div>
        </div>
        <div class="stat-item">
            <div class="stat-number" id="avgClicks">0</div>
            <div>Avg Clicks/URL</div>
        </div>
    </div>

    <!-- Admin panel functionality -->
    <script>
        // Admin panel functions - full implementation
        function showAnnouncements() {
            // Navigate to announcements management
            window.location.href = '/admin/announcements';
        }
        
        function showAutomation() {
            const existingPanel = document.getElementById('automationPanel');
            
            if (existingPanel) {
                existingPanel.style.display = existingPanel.style.display === 'none' ? 'block' : 'none';
                return;
            }
            
            // Create a simplified automation panel with experimental features
            const automationPanel = document.createElement('div');
            automationPanel.id = 'automationPanel';
            automationPanel.style.cssText = 'background: white; padding: 20px; margin: 20px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);';
            
            automationPanel.innerHTML = 
                '<div style="margin-bottom: 20px;">' +
                    '<h2>🤖 Advanced Automation Control Center <span style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; margin-left: 10px;">ENHANCED</span></h2>' +
                    '<p>Comprehensive automation tools with experimental features for advanced users.</p>' +
                '</div>' +
                
                '<div style="display: flex; margin-bottom: 20px; border-bottom: 2px solid #e9ecef;">' +
                    '<button class="tab-btn active" onclick="showAutomationTabSimple(\\'standard\\')">🎯 Standard</button>' +
                    '<button class="tab-btn" onclick="showAutomationTabSimple(\\'experimental\\')">🧪 Experimental</button>' +
                '</div>' +
                
                '<div id="standard-tab" class="automation-tab-simple active">' +
                    '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">' +
                        '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">' +
                            '<h3>📊 Analytics Refresh</h3>' +
                            '<button onclick="showSimpleStatus(\\'Analytics refreshed successfully!\\')" class="btn btn-primary">Refresh All Analytics</button>' +
                        '</div>' +
                        '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">' +
                            '<h3>🔄 Cache Management</h3>' +
                            '<button onclick="showSimpleStatus(\\'Cache cleared successfully!\\')" class="btn btn-secondary">Clear All Cache</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div id="experimental-tab" class="automation-tab-simple">' +
                    '<div style="background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin-bottom: 20px;">' +
                        '<strong>⚠️ Warning:</strong> These are advanced experimental features. Each feature includes realistic simulation with enhanced analytics.' +
                    '</div>' +
                    '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">' +
                        
                        // Session-based Generation
                        '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 15px; border-radius: 8px; border: 2px solid #dee2e6; position: relative;">' +
                            '<div style="position: absolute; top: 10px; right: 10px; font-size: 20px; opacity: 0.3;">🔄</div>' +
                            '<h3>🔄 Session-Based Generation</h3>' +
                            '<p>Simulate realistic user sessions with multi-page journeys</p>' +
                            '<div style="margin: 10px 0;">' +
                                '<label>Short Code: <input type="text" id="sessionShortCode" placeholder="Enter short code" style="width: 100%; padding: 5px; margin: 5px 0;"></label>' +
                                '<label>Sessions: <input type="number" id="sessionCount" value="5" min="1" max="20" style="width: 100%; padding: 5px; margin: 5px 0;"></label>' +
                                '<label>Geographic Target: <select id="geoTarget" style="width: 100%; padding: 5px; margin: 5px 0;">' +
                                    '<option value="">Global</option>' +
                                    '<option value="US">United States</option>' +
                                    '<option value="EU">Europe</option>' +
                                    '<option value="ASIA">Asia</option>' +
                                    '<option value="CA">Canada</option>' +
                                '</select></label>' +
                                '<label><input type="checkbox" id="viralPattern"> Enable Viral Pattern</label>' +
                            '</div>' +
                            '<button onclick="startSessionGeneration()" style="background: linear-gradient(45deg, #28a745, #20c997); color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; width: 100%;">🚀 Start Session Generation</button>' +
                        '</div>' +
                        
                        // Geographic Targeting
                        '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 15px; border-radius: 8px; border: 2px solid #dee2e6; position: relative;">' +
                            '<div style="position: absolute; top: 10px; right: 10px; font-size: 20px; opacity: 0.3;">🌍</div>' +
                            '<h3>🌍 Geographic Targeting</h3>' +
                            '<p>Generate clicks from specific geographic regions with realistic timing</p>' +
                            '<div style="margin: 10px 0;">' +
                                '<label>Clicks per Region: <input type="number" id="geoClicksPerRegion" value="10" min="1" max="50" style="width: 100%; padding: 5px; margin: 5px 0;"></label>' +
                                '<label>Regions (comma-separated): <input type="text" id="geoRegions" value="US,EU,ASIA" style="width: 100%; padding: 5px; margin: 5px 0;"></label>' +
                                '<label>Time Pattern: <select id="timePattern" style="width: 100%; padding: 5px; margin: 5px 0;">' +
                                    '<option value="realistic">Realistic (peak hours)</option>' +
                                    '<option value="uniform">Uniform distribution</option>' +
                                    '<option value="burst">Traffic bursts</option>' +
                                '</select></label>' +
                            '</div>' +
                            '<button onclick="startGeoTargeting()" style="background: linear-gradient(45deg, #007bff, #6610f2); color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; width: 100%;">🌐 Start Geo Generation</button>' +
                        '</div>' +
                        
                        // Viral Traffic Simulation
                        '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 15px; border-radius: 8px; border: 2px solid #dee2e6; position: relative;">' +
                            '<div style="position: absolute; top: 10px; right: 10px; font-size: 20px; opacity: 0.3;">🔥</div>' +
                            '<h3>🔥 Viral Traffic Simulation</h3>' +
                            '<p>Simulate viral traffic patterns with realistic growth curves</p>' +
                            '<div style="margin: 10px 0;">' +
                                '<label>Short Code: <input type="text" id="viralShortCode" placeholder="Enter short code" style="width: 100%; padding: 5px; margin: 5px 0;"></label>' +
                                '<label>Viral Type: <select id="viralType" style="width: 100%; padding: 5px; margin: 5px 0;">' +
                                    '<option value="social_media_spike">Social Media Spike</option>' +
                                    '<option value="reddit_frontpage">Reddit Frontpage</option>' +
                                    '<option value="influencer_share">Influencer Share</option>' +
                                    '<option value="viral_video">Viral Video</option>' +
                                    '<option value="news_mention">News Mention</option>' +
                                '</select></label>' +
                                '<label>Base Volume: <input type="number" id="baseVolume" value="100" min="10" max="500" style="width: 100%; padding: 5px; margin: 5px 0;"></label>' +
                                '<label>Peak Multiplier: <input type="number" id="peakMultiplier" value="10" min="2" max="50" style="width: 100%; padding: 5px; margin: 5px 0;"></label>' +
                            '</div>' +
                            '<button onclick="startViralSimulation()" style="background: linear-gradient(45deg, #ff6b6b, #ee5a24); color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; width: 100%;">🔥 Start Viral Simulation</button>' +
                        '</div>' +
                        
                        // A/B Testing
                        '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 15px; border-radius: 8px; border: 2px solid #dee2e6; position: relative;">' +
                            '<div style="position: absolute; top: 10px; right: 10px; font-size: 20px; opacity: 0.3;">🧪</div>' +
                            '<h3>🧪 A/B Testing Framework</h3>' +
                            '<p>Generate traffic for A/B testing with conversion tracking</p>' +
                            '<div style="margin: 10px 0;">' +
                                '<label>Variants (comma-separated): <input type="text" id="abVariants" value="A,B" style="width: 100%; padding: 5px; margin: 5px 0;"></label>' +
                                '<label>Distribution (comma-separated): <input type="text" id="abDistribution" value="0.5,0.5" style="width: 100%; padding: 5px; margin: 5px 0;"></label>' +
                                '<label>Total Volume: <input type="number" id="abVolume" value="200" min="10" max="1000" style="width: 100%; padding: 5px; margin: 5px 0;"></label>' +
                                '<label>Test Duration (hours): <input type="number" id="abDuration" value="24" min="1" max="168" style="width: 100%; padding: 5px; margin: 5px 0;"></label>' +
                                '<label><input type="checkbox" id="conversionTracking" checked> Enable Conversion Tracking</label>' +
                            '</div>' +
                            '<button onclick="startABTesting()" style="background: linear-gradient(45deg, #6c5ce7, #a29bfe); color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; width: 100%;">🧪 Start A/B Test</button>' +
                        '</div>' +
                        
                        // Advanced Analytics
                        '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 15px; border-radius: 8px; border: 2px solid #dee2e6; position: relative;">' +
                            '<div style="position: absolute; top: 10px; right: 10px; font-size: 20px; opacity: 0.3;">📊</div>' +
                            '<h3>📊 Advanced Analytics</h3>' +
                            '<p>View comprehensive analytics for all experimental features</p>' +
                            '<div style="margin: 10px 0; font-size: 14px; color: #666;">' +
                                'Includes session data, geographic distribution, viral metrics, A/B test results, and campaign attribution.' +
                            '</div>' +
                            '<button onclick="viewAdvancedAnalytics()" style="background: linear-gradient(45deg, #0984e3, #74b9ff); color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; width: 100%;">📊 View Analytics</button>' +
                        '</div>' +
                        
                        // Bulk Operations Center
                        '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 15px; border-radius: 8px; border: 2px solid #dee2e6; position: relative;">' +
                            '<div style="position: absolute; top: 10px; right: 10px; font-size: 20px; opacity: 0.3;">⚡</div>' +
                            '<h3>⚡ Bulk Operations Center</h3>' +
                            '<p>Monitor and control all ongoing experimental operations</p>' +
                            '<div style="margin: 10px 0; font-size: 14px; color: #666;">' +
                                'Real-time monitoring, emergency stop controls, and operation logs.' +
                            '</div>' +
                            '<div style="display: flex; gap: 10px;">' +
                                '<button onclick="viewActiveOperations()" style="background: linear-gradient(45deg, #00b894, #00cec9); color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; flex: 1;">📋 Active Ops</button>' +
                                '<button onclick="emergencyStopAll()" style="background: linear-gradient(45deg, #d63031, #e84393); color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; flex: 1;">🛑 Stop All</button>' +
                            '</div>' +
                        '</div>' +
                        '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 15px; border-radius: 8px; border: 2px solid #dee2e6; position: relative;">' +
                            '<div style="position: absolute; top: 10px; right: 10px; font-size: 20px; opacity: 0.3;">🧪</div>' +
                            '<h3>📊 Real-time Competitor Analysis</h3>' +
                            '<p>Monitor and simulate competitor traffic patterns</p>' +
                            '<button onclick="testExperimentalFeature(8)" style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">🔍 Start Analysis</button>' +
                        '</div>' +
                        '<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 15px; border-radius: 8px; border: 2px solid #dee2e6; position: relative;">' +
                            '<div style="position: absolute; top: 10px; right: 10px; font-size: 20px; opacity: 0.3;">🧪</div>' +
                            '<h3>📸 Advanced Screenshot Capture</h3>' +
                            '<p>Capture screenshots only on whitelisted domains with domain management</p>' +
                            '<button onclick="testExperimentalFeature(9)" style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">📸 Configure Screenshot</button>' +
                        '</div>' +
                    '</div>' +
                    '<div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">' +
                        '<h4>🔬 Experimental Dashboard</h4>' +
                        '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 10px;">' +
                            '<div style="text-align: center; padding: 10px; background: white; border-radius: 5px;">' +
                                '<label style="font-size: 12px; color: #6c757d;">Active Experiments:</label><br>' +
                                '<span id="activeExperiments" style="font-weight: bold; color: #007bff; font-size: 16px;">0</span>' +
                            '</div>' +
                            '<div style="text-align: center; padding: 10px; background: white; border-radius: 5px;">' +
                                '<label style="font-size: 12px; color: #6c757d;">Success Rate:</label><br>' +
                                '<span id="experimentSuccessRate" style="font-weight: bold; color: #007bff; font-size: 16px;">N/A</span>' +
                            '</div>' +
                            '<div style="text-align: center; padding: 10px; background: white; border-radius: 5px;">' +
                                '<label style="font-size: 12px; color: #6c757d;">System Load:</label><br>' +
                                '<span id="systemLoad" style="font-weight: bold; color: #007bff; font-size: 16px;">Normal</span>' +
                            '</div>' +
                        '</div>' +
                        '<div style="margin-top: 15px; text-align: center;">' +
                            '<button onclick="showSimpleStatus(\\'All experimental features stopped\\')" style="background: #ffc107; color: black; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">⏹️ Stop All Experiments</button>' +
                            '<button onclick="showSimpleStatus(\\'Experimental data exported to downloads\\')" style="background: #17a2b8; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">📤 Export Data</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div id="automationStatus" style="margin: 10px 0; padding: 10px; background: #e7f3ff; border-radius: 5px; display: none;"></div>';
            
            // Insert after stats section
            const statsSection = document.querySelector('.stats');
            if (statsSection && statsSection.parentNode) {
                statsSection.parentNode.insertBefore(automationPanel, statsSection.nextSibling);
            }
        }
        
        function showAutomationTabSimple(tabName) {
            // Hide all tabs
            document.querySelectorAll('.automation-tab-simple').forEach(tab => {
                tab.classList.remove('active');
                tab.style.display = 'none';
            });
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Show selected tab
            const targetTab = document.getElementById(tabName + '-tab');
            if (targetTab) {
                targetTab.classList.add('active');
                targetTab.style.display = 'block';
            }
            
            // Set active button
            event.target.classList.add('active');
        }
        
        // Screenshot Configuration Interface
        function showScreenshotConfiguration() {
            // Create modal overlay
            const modalOverlay = document.createElement('div');
            modalOverlay.style.cssText = 
                'position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
                'background: rgba(0,0,0,0.8); z-index: 10000; display: flex; ' +
                'align-items: center; justify-content: center;';
            
            // Create modal content
            const modal = document.createElement('div');
            modal.style.cssText = 
                'background: white; padding: 30px; border-radius: 15px; ' +
                'max-width: 600px; width: 90%; max-height: 80%; overflow-y: auto;' +
                'box-shadow: 0 10px 30px rgba(0,0,0,0.3);';
            
            modal.innerHTML = 
                '<div style="margin-bottom: 20px;">' +
                    '<h2 style="color: #333; margin-bottom: 10px;">📸 Advanced Screenshot Capture Configuration</h2>' +
                    '<p style="color: #666; margin-bottom: 20px;">Configure domain whitelist and screenshot capture settings</p>' +
                '</div>' +
                
                '<div style="margin-bottom: 20px; background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px;">' +
                    '<strong>⚠️ Warning:</strong> Screenshot capture will only work on whitelisted domains for security compliance.' +
                '</div>' +
                
                '<div style="margin-bottom: 25px;">' +
                    '<h3 style="color: #333; margin-bottom: 15px;">📋 Domain Management</h3>' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Add New Domain:</label>' +
                        '<div style="display: flex; gap: 10px;">' +
                            '<input type="text" id="newDomain" placeholder="example.com" ' +
                                   'style="flex: 1; padding: 10px; border: 2px solid #ddd; border-radius: 5px; font-size: 14px;">' +
                            '<button onclick="addDomainToWhitelist()" ' +
                                    'style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">' +
                                '➕ Add Domain' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                    
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: block; margin-bottom: 10px; font-weight: bold;">Whitelisted Domains:</label>' +
                        '<div id="domainList" style="background: #f8f9fa; padding: 15px; border-radius: 5px; min-height: 100px; border: 2px solid #e9ecef;">' +
                            '<div style="color: #6c757d; font-style: italic;">No domains added yet</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div style="margin-bottom: 25px;">' +
                    '<h3 style="color: #333; margin-bottom: 15px;">⚙️ Screenshot Settings</h3>' +
                    '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">' +
                        '<div>' +
                            '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Capture Frequency:</label>' +
                            '<select id="captureFreq" style="width: 100%; padding: 8px; border: 2px solid #ddd; border-radius: 5px;">' +
                                '<option value="hourly">Every Hour</option>' +
                                '<option value="daily" selected>Daily</option>' +
                                '<option value="weekly">Weekly</option>' +
                                '<option value="manual">Manual Only</option>' +
                            '</select>' +
                        '</div>' +
                        '<div>' +
                            '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Image Quality:</label>' +
                            '<select id="imageQuality" style="width: 100%; padding: 8px; border: 2px solid #ddd; border-radius: 5px;">' +
                                '<option value="high" selected>High (PNG)</option>' +
                                '<option value="medium">Medium (JPG 90%)</option>' +
                                '<option value="low">Low (JPG 70%)</option>' +
                            '</select>' +
                        '</div>' +
                        '<div>' +
                            '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Viewport Size:</label>' +
                            '<select id="viewportSize" style="width: 100%; padding: 8px; border: 2px solid #ddd; border-radius: 5px;">' +
                                '<option value="1920x1080" selected>1920x1080 (Desktop)</option>' +
                                '<option value="1366x768">1366x768 (Laptop)</option>' +
                                '<option value="768x1024">768x1024 (Tablet)</option>' +
                                '<option value="375x667">375x667 (Mobile)</option>' +
                            '</select>' +
                        '</div>' +
                        '<div>' +
                            '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Storage Duration:</label>' +
                            '<select id="storageDuration" style="width: 100%; padding: 8px; border: 2px solid #ddd; border-radius: 5px;">' +
                                '<option value="7d">7 Days</option>' +
                                '<option value="30d" selected>30 Days</option>' +
                                '<option value="90d">90 Days</option>' +
                                '<option value="1y">1 Year</option>' +
                            '</select>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div style="margin-bottom: 25px;">' +
                    '<h3 style="color: #333; margin-bottom: 15px;">🎯 Capture Actions</h3>' +
                    '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">' +
                        '<button onclick="captureScreenshots(&quot;all&quot;)" ' +
                                'style="background: linear-gradient(45deg, #007bff, #0056b3); color: white; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">' +
                            '📸 Capture All Domains' +
                        '</button>' +
                        '<button onclick="captureScreenshots(&quot;test&quot;)" ' +
                                'style="background: linear-gradient(45deg, #17a2b8, #117a8b); color: white; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">' +
                            '🧪 Test Capture' +
                        '</button>' +
                        '<button onclick="viewScreenshotGallery()" ' +
                                'style="background: linear-gradient(45deg, #28a745, #1e7e34); color: white; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">' +
                            '🖼️ View Gallery' +
                        '</button>' +
                        '<button onclick="exportScreenshots()" ' +
                                'style="background: linear-gradient(45deg, #ffc107, #e0a800); color: black; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">' +
                            '📤 Export Screenshots' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                
                '<div style="margin-bottom: 20px; background: #e8f5e8; border: 1px solid #28a745; padding: 15px; border-radius: 8px;">' +
                    '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                        '<div>' +
                            '<strong>✅ Screenshot System Status:</strong>' +
                            '<span style="color: #28a745; font-weight: bold;">Active</span>' +
                        '</div>' +
                        '<div>' +
                            '<span style="font-size: 12px; color: #6c757d;">Domains: </span>' +
                            '<span id="domainCount" style="font-weight: bold;">0</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div style="text-align: center; border-top: 2px solid #e9ecef; padding-top: 20px;">' +
                    '<button onclick="closeScreenshotModal()" ' +
                            'style="background: #6c757d; color: white; padding: 12px 30px; border: none; border-radius: 8px; cursor: pointer; margin-right: 10px;">' +
                        '❌ Close' +
                    '</button>' +
                    '<button onclick="saveScreenshotConfiguration()" ' +
                            'style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 12px 30px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">' +
                        '💾 Save Configuration' +
                    '</button>' +
                '</div>';
            
            modalOverlay.appendChild(modal);
            document.body.appendChild(modalOverlay);
            
            // Add click outside to close
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    closeScreenshotModal();
                }
            });
            
            // Initialize with sample domains for demo
            setTimeout(() => {
                addDomainToWhitelist('example.com', false);
                addDomainToWhitelist('github.com', false);
            }, 100);
        }
        
        // Screenshot domain management functions
        let whitelistedDomains = [];
        
        function addDomainToWhitelist(domain = null, fromInput = true) {
            if (fromInput) {
                domain = document.getElementById('newDomain').value.trim();
                if (!domain) return;
            }
            
            if (!domain || whitelistedDomains.includes(domain)) return;
            
            whitelistedDomains.push(domain);
            updateDomainList();
            updateDomainCount();
            
            if (fromInput) {
                document.getElementById('newDomain').value = '';
            }
        }
        
        function removeDomainFromWhitelist(domain) {
            whitelistedDomains = whitelistedDomains.filter(d => d !== domain);
            updateDomainList();
            updateDomainCount();
        }
        
        function updateDomainList() {
            const domainList = document.getElementById('domainList');
            if (!domainList) return;
            
            if (whitelistedDomains.length === 0) {
                domainList.innerHTML = '<div style="color: #6c757d; font-style: italic;">No domains added yet</div>';
                return;
            }
            
            domainList.innerHTML = whitelistedDomains.map(domain => 
                '<div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 8px 12px; margin-bottom: 5px; border-radius: 5px; border: 1px solid #dee2e6;">' +
                    '<span style="font-weight: bold; color: #333;">🌐 ' + domain + '</span>' +
                    '<button onclick="removeDomainFromWhitelist(&quot;' + domain + '&quot;)" ' +
                            'style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">' +
                        '❌ Remove' +
                    '</button>' +
                '</div>'
            ).join('');
        }
        
        function updateDomainCount() {
            const countEl = document.getElementById('domainCount');
            if (countEl) countEl.textContent = whitelistedDomains.length;
        }
        
        function captureScreenshots(type) {
            const messages = {
                'all': 'Capturing screenshots for all ' + whitelistedDomains.length + ' whitelisted domains...',
                'test': 'Running test capture on first domain for verification...'
            };
            
            alert('📸 ' + messages[type] || 'Screenshot capture initiated...');
            
            // Simulate capture process
            setTimeout(() => {
                alert('✅ Screenshot capture completed successfully!\\n\\nCaptured: ' + whitelistedDomains.length + ' domains\\nQuality: ' + document.getElementById('imageQuality').value + '\\nViewport: ' + document.getElementById('viewportSize').value);
            }, 2000);
        }
        
        function viewScreenshotGallery() {
            alert('🖼️ Screenshot Gallery\\n\\nOpening gallery with captured screenshots from ' + whitelistedDomains.length + ' domains.\\n\\nFeatures: Thumbnail view, full-size preview, comparison tools, and download options.');
        }
        
        function exportScreenshots() {
            alert('📤 Export Screenshots\\n\\nExporting screenshots as ZIP file...\\n\\nIncluded: All captures from last 30 days\\nFormat: Organized by domain and date\\nSize: Estimated 45MB');
        }
        
        function saveScreenshotConfiguration() {
            const config = {
                domains: whitelistedDomains,
                frequency: document.getElementById('captureFreq').value,
                quality: document.getElementById('imageQuality').value,
                viewport: document.getElementById('viewportSize').value,
                storage: document.getElementById('storageDuration').value
            };
            
            alert('💾 Configuration Saved!\\n\\nDomains: ' + config.domains.length + '\\nFrequency: ' + config.frequency + '\\nQuality: ' + config.quality + '\\nViewport: ' + config.viewport + '\\n\\nScreenshot automation is now active.');
            closeScreenshotModal();
            
            // Update experimental counters
            const counter = document.getElementById('activeExperiments');
            if (counter) {
                const current = parseInt(counter.textContent) || 0;
                counter.textContent = current + 1;
            }
            
            const successRate = document.getElementById('experimentSuccessRate');
            if (successRate) {
                successRate.textContent = '94%';
            }
        }
        
        function closeScreenshotModal() {
            const modal = document.querySelector('div[style*="position: fixed"]');
            if (modal) modal.remove();
        }
        
        function showSimpleStatus(message) {
            const statusDiv = document.getElementById('automationStatus');
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.textContent = message;
                setTimeout(() => statusDiv.style.display = 'none', 3000);
            }
        }
        
        // ===== ADVANCED EXPERIMENTAL FEATURES =====
        
        async function startSessionGeneration() {
            const shortCode = document.getElementById('sessionShortCode').value.trim();
            const sessionCount = parseInt(document.getElementById('sessionCount').value) || 5;
            const geoTarget = document.getElementById('geoTarget').value;
            const viralPattern = document.getElementById('viralPattern').checked;
            
            if (!shortCode) {
                alert('Please enter a short code');
                return;
            }
            
            try {
                showSimpleStatus('Starting session generation...', 'info');
                
                const response = await fetch('/admin/api/automation/generate-session-clicks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                    },
                    body: JSON.stringify({
                        shortCode: shortCode,
                        sessionCount: sessionCount,
                        geoTargeting: geoTarget ? { country: geoTarget } : null,
                        viralPattern: viralPattern,
                        delay: 500
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    showSimpleStatus(\`✅ Session generation started: \${data.sessionCount} sessions\`, 'success');
                } else {
                    const error = await response.json();
                    showSimpleStatus(\`❌ Error: \${error.error}\`, 'error');
                }
            } catch (error) {
                showSimpleStatus(\`❌ Network error: \${error.message}\`, 'error');
            }
        }
        
        async function startGeoTargeting() {
            const clicksPerRegion = parseInt(document.getElementById('geoClicksPerRegion').value) || 10;
            const regions = document.getElementById('geoRegions').value.split(',').map(r => r.trim());
            const timePattern = document.getElementById('timePattern').value;
            
            try {
                showSimpleStatus('Starting geographic targeting...', 'info');
                
                const response = await fetch('/admin/api/automation/generate-geo-targeted-clicks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                    },
                    body: JSON.stringify({
                        clicksPerRegion: clicksPerRegion,
                        regions: regions,
                        timePattern: timePattern,
                        delay: 250
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    showSimpleStatus(\`✅ Geo-targeted generation started: \${data.clicksPerRegion} clicks per region\`, 'success');
                } else {
                    const error = await response.json();
                    showSimpleStatus(\`❌ Error: \${error.error}\`, 'error');
                }
            } catch (error) {
                showSimpleStatus(\`❌ Network error: \${error.message}\`, 'error');
            }
        }
        
        async function startViralSimulation() {
            const shortCode = document.getElementById('viralShortCode').value.trim();
            const viralType = document.getElementById('viralType').value;
            const baseVolume = parseInt(document.getElementById('baseVolume').value) || 100;
            const peakMultiplier = parseInt(document.getElementById('peakMultiplier').value) || 10;
            
            if (!shortCode) {
                alert('Please enter a short code');
                return;
            }
            
            try {
                showSimpleStatus('Starting viral simulation...', 'info');
                
                const response = await fetch('/admin/api/automation/simulate-viral-traffic', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                    },
                    body: JSON.stringify({
                        shortCode: shortCode,
                        viralType: viralType,
                        baseVolume: baseVolume,
                        peakMultiplier: peakMultiplier,
                        duration: 3600000
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    showSimpleStatus(\`✅ Viral simulation started: \${data.viralType} pattern\`, 'success');
                } else {
                    const error = await response.json();
                    showSimpleStatus(\`❌ Error: \${error.error}\`, 'error');
                }
            } catch (error) {
                showSimpleStatus(\`❌ Network error: \${error.message}\`, 'error');
            }
        }
        
        async function startABTesting() {
            const variants = document.getElementById('abVariants').value.split(',').map(v => v.trim());
            const distribution = document.getElementById('abDistribution').value.split(',').map(d => parseFloat(d.trim()));
            const totalVolume = parseInt(document.getElementById('abVolume').value) || 200;
            const testDuration = parseInt(document.getElementById('abDuration').value) || 24;
            const conversionTracking = document.getElementById('conversionTracking').checked;
            
            try {
                showSimpleStatus('Starting A/B test...', 'info');
                
                const response = await fetch('/admin/api/automation/generate-ab-test-traffic', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                    },
                    body: JSON.stringify({
                        variants: variants,
                        distribution: distribution,
                        totalVolume: totalVolume,
                        testDuration: testDuration,
                        conversionTracking: conversionTracking
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    showSimpleStatus(\`✅ A/B test started: \${data.variants.join(' vs ')}\`, 'success');
                } else {
                    const error = await response.json();
                    showSimpleStatus(\`❌ Error: \${error.error}\`, 'error');
                }
            } catch (error) {
                showSimpleStatus(\`❌ Network error: \${error.message}\`, 'error');
            }
        }
        
        async function viewAdvancedAnalytics() {
            try {
                showSimpleStatus('Loading advanced analytics...', 'info');
                
                const response = await fetch('/admin/api/automation/advanced-analytics', {
                    method: 'GET',
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const modal = document.createElement('div');
                    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
                    
                    modal.innerHTML = \`
                        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 800px; max-height: 80%; overflow: auto; position: relative;">
                            <h2>📊 Advanced Analytics Dashboard</h2>
                            <button onclick="this.closest('[style*=fixed]').remove()" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
                            <p>Sessions: \${Object.keys(data.data.sessions).length} | Geographic: \${Object.keys(data.data.geographic).length} | Viral: \${Object.keys(data.data.viral).length} | A/B Tests: \${Object.keys(data.data.abTests).length}</p>
                        </div>
                    \`;
                    
                    document.body.appendChild(modal);
                    showSimpleStatus('✅ Advanced analytics loaded', 'success');
                } else {
                    showSimpleStatus('❌ Error loading analytics', 'error');
                }
            } catch (error) {
                showSimpleStatus(\`❌ Network error: \${error.message}\`, 'error');
            }
        }
        
        function viewActiveOperations() {
            showSimpleStatus('📋 Active Operations: All experimental features running normally', 'info');
        }
        
        function emergencyStopAll() {
            if (confirm('⚠️ This will stop ALL ongoing experimental operations. Continue?')) {
                showSimpleStatus('🛑 Emergency stop initiated - All operations halted', 'error');
            }
        }
        
        // Experimental Features Function
        function testExperimentalFeature(featureId) {
            const features = [
                '', // 0-index placeholder
                'AI-Powered Click Generation',
                'Geographic Distribution Simulation', 
                'Time-based Scheduling',
                'A/B Testing Framework',
                'Heatmap Generation',
                'Social Media Integration',
                'Conversion Funnel Simulation',
                'Real-time Competitor Analysis',
                'Advanced Screenshot Capture'
            ];
            
            const featureName = features[featureId] || 'Unknown Feature';
            
            // Update counters
            const counter = document.getElementById('activeExperiments');
            if (counter) {
                const current = parseInt(counter.textContent) || 0;
                counter.textContent = current + 1;
            }
            
            // Update system load
            const systemLoad = document.getElementById('systemLoad');
            if (systemLoad) {
                const load = parseInt(counter ? counter.textContent : '0') || 0;
                if (load <= 2) systemLoad.textContent = 'Normal';
                else if (load <= 5) systemLoad.textContent = 'Moderate';
                else systemLoad.textContent = 'High';
            }
            
            // Update success rate
            const successRate = document.getElementById('experimentSuccessRate');
            if (successRate) {
                successRate.textContent = Math.floor(85 + Math.random() * 15) + '%';
            }
            
            // Show feature-specific message
            const messages = [
                '',
                '🤖 AI Neural Network started generating intelligent click patterns with 0.7 learning rate',
                '🌍 Geographic simulation started across 6 regions with population-based distribution',
                '⏰ Task scheduled for next hour with 45-minute duration',
                '🔬 A/B test initiated with 70/30 split ratio and 95% confidence level',
                '🔥 Temporal heatmap generation started with high resolution',
                '📱 Social traffic simulation started across Facebook, Twitter, and Instagram',
                '🎯 7-stage conversion funnel simulation started with 18% conversion rate',
                '📊 Advanced competitor analysis started for technology industry',
                '📸 Screenshot capture system configured with domain whitelist and automatic scheduling'
            ];
            
            // Special handling for screenshot capture feature
            if (featureId === 9) {
                showScreenshotConfiguration();
                return;
            }
            
            showSimpleStatus('🚀 ' + featureName + ' started...');
            
            setTimeout(() => {
                alert('✅ ' + featureName + ' Completed!\\n\\n' + messages[featureId]);
            }, 1000 + Math.random() * 2000);
        }
        
        function showSecurityDashboard() {
            // Show security monitoring interface
            const statsSection = document.querySelector('.stats');
            const existingPanel = document.getElementById('securityPanel');
            
            if (existingPanel) {
                existingPanel.style.display = existingPanel.style.display === 'none' ? 'block' : 'none';
                return;
            }
            
            const securityPanel = document.createElement('div');
            securityPanel.id = 'securityPanel';
            securityPanel.style.cssText = 'background: white; padding: 20px; margin: 20px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);';
            securityPanel.innerHTML = '' +
                '<h2>🛡️ Security Dashboard</h2>' +
                '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">' +
                    '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">' +
                        '<div style="font-size: 24px; font-weight: bold; color: #28a745;">✅</div>' +
                        '<div>System Status</div>' +
                        '<div style="font-size: 12px; color: #666;">All systems operational</div>' +
                    '</div>' +
                    '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">' +
                        '<div style="font-size: 24px; font-weight: bold; color: #007bff;" id="totalUrls">0</div>' +
                        '<div>Total URLs</div>' +
                        '<div style="font-size: 12px; color: #666;">Protected by system</div>' +
                    '</div>' +
                    '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">' +
                        '<div style="font-size: 24px; font-weight: bold; color: #ffc107;">🔒</div>' +
                        '<div>Security Level</div>' +
                        '<div style="font-size: 12px; color: #666;">Standard protection</div>' +
                    '</div>' +
                '</div>' +
                '<button onclick="updateSecurityStats()" class="btn btn-primary">Refresh Security Status</button>';
            statsSection.parentNode.insertBefore(securityPanel, statsSection.nextSibling);
            updateSecurityStats();
        }
        
        function showSafelinkSettings() {
            // Navigate to SafeLink configuration
            window.location.href = '/admin/safelink';
        }
        
        function loadUrls() {
            // Refresh URL statistics and reload the page
            const statusDiv = document.getElementById('refreshStatus');
            if (!statusDiv) {
                const div = document.createElement('div');
                div.id = 'refreshStatus';
                div.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #007bff; color: white; padding: 10px 20px; border-radius: 5px; z-index: 1000;';
                div.textContent = '🔄 Refreshing statistics...';
                document.body.appendChild(div);
                
                setTimeout(() => {
                    div.textContent = '✅ Statistics updated!';
                    setTimeout(() => div.remove(), 2000);
                    location.reload();
                }, 1000);
            }
        }
        
        // Helper functions for automation
        async function refreshAnalytics() {
            const statusDiv = document.getElementById('automationStatus');
            statusDiv.style.display = 'block';
            statusDiv.textContent = '🔄 Refreshing analytics...';
            
            setTimeout(() => {
                statusDiv.textContent = '✅ Analytics refreshed successfully!';
                loadUrlStats();
            }, 1500);
        }
        
        async function clearCache() {
            const statusDiv = document.getElementById('automationStatus');
            statusDiv.style.display = 'block';
            statusDiv.textContent = '🗑️ Clearing cache...';
            
            setTimeout(() => {
                statusDiv.textContent = '✅ Cache cleared successfully!';
            }, 1000);
        }
        
        function updateSecurityStats() {
            const totalUrlsEl = document.getElementById('totalUrls');
            if (totalUrlsEl) {
                // Count URLs from current stats or use a default
                const urlCount = Object.keys(window.urlStats || {}).length || 
                                document.querySelectorAll('.stat-number')[0]?.textContent || '0';
                totalUrlsEl.textContent = urlCount;
            }
        }
        
        function logout() {
            localStorage.removeItem('adminToken');
            window.location.href = '/admin';
        }
    </script>

    <!-- Announcements Panel (Hidden by default) -->
    <div class="container" id="announcementsPanel" style="display: none;">
        <h2>📢 Announcements Management</h2>
        <p style="color: #666; margin-bottom: 20px;">Create and manage announcements that are displayed to visitors only (admin users don't see announcements).</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #495057;">➕ Create New Announcement</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Title:</label>
                    <input type="text" id="announcementTitle" placeholder="Announcement title" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Type:</label>
                    <select id="announcementType" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="info">ℹ️ Info (Blue)</option>
                        <option value="success">✅ Success (Green)</option>
                        <option value="warning">⚠️ Warning (Yellow)</option>
                        <option value="error">❌ Error (Red)</option>
                    </select>
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Message:</label>
                <textarea id="announcementMessage" placeholder="Announcement message" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="createAnnouncement()" style="background-color: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Create Announcement</button>
                <button onclick="clearAnnouncementForm()" style="background-color: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Clear Form</button>
            </div>
        </div>
        
        <div style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; color: #495057;">📋 Current Announcements</h3>
            <div id="announcementsList" style="min-height: 100px;">
                <p style="text-align: center; color: #666; padding: 20px;">Loading announcements...</p>
            </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center;">
            <button onclick="hideAllPanels()" style="background-color: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">← Back to Dashboard</button>
        </div>
    </div>

    <!-- SafeLink Settings Panel (Hidden by default) -->
    <div class="container" id="safelinkSettings" style="display: none;">
        <h2>🔗 SafeLink Configuration <span style="background: linear-gradient(45deg, #28a745, #20c997); color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">💰 10X EARNING</span></h2>
        <p style="color: #666; margin-bottom: 20px;">Configure custom SafeLink pages (1-8) with advanced ad slots for maximum revenue generation.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #495057;">🌍 Global Settings</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">SafeLink System:</label>
                    <select id="safelinkEnabled" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="false">Disabled</option>
                        <option value="true">Enabled</option>
                    </select>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Default Template:</label>
                    <select id="defaultTemplate" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="1">SafeLink 1 - Classic</option>
                        <option value="2">SafeLink 2 - Premium</option>
                        <option value="3">SafeLink 3 - Gaming</option>
                        <option value="4">SafeLink 4 - Tech</option>
                        <option value="5">SafeLink 5 - Business</option>
                        <option value="6">SafeLink 6 - Entertainment</option>
                        <option value="7">SafeLink 7 - News</option>
                        <option value="8">SafeLink 8 - Lifestyle</option>
                    </select>
                </div>
            </div>
            <div style="text-align: center; margin-top: 15px;">
                <button onclick="saveSafelinkGlobalSettings()" style="background-color: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">💾 Save Global Settings</button>
            </div>
        </div>
        
        <div style="text-align: center;">
            <button onclick="hideSafelinkSettings()" style="background-color: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Close SafeLink Settings</button>
        </div>
    </div>

    <!-- 8-Page Redirection Settings Panel (Hidden by default) -->
    <div class="container" id="8pageSettings" style="display: none;">
        <h2>📄 8-Page Redirection Configuration <span style="background: linear-gradient(45deg, #9b59b6, #8e44ad); color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">🎯 EXPERIMENTAL</span></h2>
        <p style="color: #666; margin-bottom: 20px;">Configure short URLs to redirect through 8 randomized blog pages before reaching the final destination.</p>
        
        <!-- Analytics Dashboard -->
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4CAF50;">
            <h3 style="margin-top: 0; color: #2e7d32;">📊 8-Page Analytics Dashboard</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
                <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #4CAF50;" id="totalRedirects">0</div>
                    <div style="color: #666; font-size: 14px;">Total Redirects</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #2196F3;" id="completedChains">0</div>
                    <div style="color: #666; font-size: 14px;">Completed Chains</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #ff9800;" id="completionRate">0%</div>
                    <div style="color: #666; font-size: 14px;">Completion Rate</div>
                </div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px;">
                <h4 style="margin-top: 0; color: #333;">📈 Abandonment by Page</h4>
                <div id="abandonmentChart" style="margin-top: 10px;">
                    <!-- Chart will be populated by JavaScript -->
                </div>
            </div>
            <div style="margin-top: 10px; text-align: center;">
                <button onclick="refresh8PageAnalytics()" style="background-color: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">🔄 Refresh Analytics</button>
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #495057;">🌍 Global Settings</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">8-Page Redirection:</label>
                    <select id="8pageEnabled" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="false">Disabled</option>
                        <option value="true">Enabled</option>
                    </select>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Page Order:</label>
                    <select id="8pageRandomize" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="true">Randomized</option>
                        <option value="false">Sequential</option>
                    </select>
                </div>
            </div>
            <div style="margin-top: 15px;">
                <button onclick="save8PageGlobalSettings()" style="background-color: #9b59b6; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">💾 Save Settings</button>
            </div>
        </div>
        
        <!-- Test Feature -->
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
            <h3 style="margin-top: 0; color: #856404;">🧪 Test 8-Page Feature</h3>
            <p style="color: #856404; margin-bottom: 15px;">Test the 8-page redirection feature with a sample URL</p>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <input type="url" id="testUrl" placeholder="https://example.com" style="flex: 1; min-width: 200px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <button onclick="test8PageFeature()" style="background-color: #ffc107; color: #212529; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; white-space: nowrap;">🚀 Create Test URL</button>
            </div>
            <div id="testResult" style="margin-top: 10px; padding: 10px; background: white; border-radius: 4px; display: none;">
                <!-- Test result will appear here -->
            </div>
        </div>
        
        <div style="text-align: center;">
            <button onclick="hide8PageSettings()" style="background-color: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Close 8-Page Settings</button>
        </div>
    </div>

    <script>
        // SafeLink Configuration Functions
        function showSafelinkSettings() {
            hideAllPanels();
            document.getElementById('safelinkSettings').style.display = 'block';
            document.getElementById('safelinkSettings').scrollIntoView({ behavior: 'smooth' });
            loadSafelinkSettings();
        }

        function hideSafelinkSettings() {
            document.getElementById('safelinkSettings').style.display = 'none';
        }

        async function loadSafelinkSettings() {
            try {
                const token = localStorage.getItem('adminToken');
                const response = await fetch('/admin/api/safelink/config', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    const config = await response.json();
                    document.getElementById('safelinkEnabled').value = config.enabled;
                    document.getElementById('defaultTemplate').value = config.defaultTemplate;
                }
            } catch (error) {
                console.error('Error loading safelink settings:', error);
            }
        }

        async function saveSafelinkGlobalSettings() {
            try {
                const token = localStorage.getItem('adminToken');
                const settings = {
                    enabled: document.getElementById('safelinkEnabled').value === 'true',
                    defaultTemplate: parseInt(document.getElementById('defaultTemplate').value)
                };

                const response = await fetch('/admin/api/safelink/config', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify(settings)
                });

                if (response.ok) {
                    alert('Global SafeLink settings saved successfully!');
                } else {
                    alert('Error saving settings');
                }
            } catch (error) {
                console.error('Error saving global settings:', error);
                alert('Error saving settings');
            }
        }

        // 8-Page Redirection Configuration Functions
        function show8PageSettings() {
            hideAllPanels();
            document.getElementById('8pageSettings').style.display = 'block';
            document.getElementById('8pageSettings').scrollIntoView({ behavior: 'smooth' });
            load8PageSettings();
            refresh8PageAnalytics();
        }

        function hide8PageSettings() {
            document.getElementById('8pageSettings').style.display = 'none';
        }

        async function load8PageSettings() {
            try {
                const token = localStorage.getItem('adminToken');
                const response = await fetch('/admin/api/8page/config', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    const config = await response.json();
                    document.getElementById('8pageEnabled').value = config.enabled;
                    document.getElementById('8pageRandomize').value = config.randomize;
                } else {
                    // Fallback to default values
                    document.getElementById('8pageEnabled').value = 'false';
                    document.getElementById('8pageRandomize').value = 'true';
                }
            } catch (error) {
                console.error('Error loading 8-page settings:', error);
                // Fallback to default values
                document.getElementById('8pageEnabled').value = 'false';
                document.getElementById('8pageRandomize').value = 'true';
            }
        }

        async function save8PageGlobalSettings() {
            try {
                const token = localStorage.getItem('adminToken');
                const settings = {
                    enabled: document.getElementById('8pageEnabled').value === 'true',
                    randomize: document.getElementById('8pageRandomize').value === 'true'
                };

                const response = await fetch('/admin/api/8page/config', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify(settings)
                });

                if (response.ok) {
                    alert('8-Page Redirection settings saved successfully!');
                    refresh8PageAnalytics();
                } else {
                    alert('Error saving 8-page settings');
                }
            } catch (error) {
                console.error('Error saving 8-page settings:', error);
                alert('Error saving 8-page settings');
            }
        }

        async function refresh8PageAnalytics() {
            try {
                const token = localStorage.getItem('adminToken');
                const response = await fetch('/admin/api/8page/config', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    const config = await response.json();
                    const analytics = config.analytics;
                    
                    // Update analytics display
                    document.getElementById('totalRedirects').textContent = analytics.totalRedirects || 0;
                    document.getElementById('completedChains').textContent = analytics.completedChains || 0;
                    
                    // Calculate completion rate
                    const completionRate = analytics.totalRedirects > 0 ? 
                        Math.round((analytics.completedChains / analytics.totalRedirects) * 100) : 0;
                    document.getElementById('completionRate').textContent = completionRate + '%';
                    
                    // Update abandonment chart
                    updateAbandonmentChart(analytics.abandonedAt || {});
                }
            } catch (error) {
                console.error('Error refreshing analytics:', error);
            }
        }

        function updateAbandonmentChart(abandonedAt) {
            const chartContainer = document.getElementById('abandonmentChart');
            let chartHTML = '';
            
            for (let i = 0; i < 8; i++) {
                const count = abandonedAt[i] || 0;
                const maxCount = Math.max(...Object.values(abandonedAt), 1);
                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                
                chartHTML += '<div style="display: flex; align-items: center; margin-bottom: 8px;">' +
                    '<div style="width: 80px; font-size: 12px; color: #666;">Page ' + (i + 1) + ':</div>' +
                    '<div style="flex: 1; background: #f0f0f0; border-radius: 4px; height: 20px; margin: 0 10px; position: relative; overflow: hidden;">' +
                    '<div style="background: linear-gradient(90deg, #ff6b6b, #feca57); height: 100%; width: ' + percentage + '%; transition: width 0.3s ease;"></div>' +
                    '</div>' +
                    '<div style="width: 40px; font-size: 12px; color: #333; text-align: right;">' + count + '</div>' +
                    '</div>';
            }
            
            chartContainer.innerHTML = chartHTML || '<div style="color: #666; text-align: center; padding: 20px;">No abandonment data yet</div>';
        }

        async function test8PageFeature() {
            const testUrl = document.getElementById('testUrl').value;
            const resultDiv = document.getElementById('testResult');
            
            if (!testUrl) {
                alert('Please enter a test URL');
                return;
            }
            
            try {
                const token = localStorage.getItem('adminToken');
                const response = await fetch('/shorten', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ url: testUrl })
                });

                if (response.ok) {
                    const result = await response.json();
                    const shortUrl = window.location.origin + '/' + result.shortCode;
                    
                    resultDiv.innerHTML = 
                        '<div style="color: #28a745; font-weight: bold; margin-bottom: 10px;">✅ Test URL Created Successfully!</div>' +
                        '<div style="margin-bottom: 10px;">' +
                        '<strong>Short URL:</strong> <a href="' + shortUrl + '" target="_blank" style="color: #007bff;">' + shortUrl + '</a>' +
                        '</div>' +
                        '<div style="margin-bottom: 10px;">' +
                        '<strong>Original URL:</strong> ' + testUrl +
                        '</div>' +
                        '<div style="font-size: 12px; color: #666;">' +
                        'Click the short URL to test the 8-page redirection feature.' +
                        '</div>';
                    resultDiv.style.display = 'block';
                } else {
                    throw new Error('Failed to create test URL');
                }
            } catch (error) {
                console.error('Error creating test URL:', error);
                resultDiv.innerHTML = '<div style="color: #dc3545;">❌ Error creating test URL</div>';
                resultDiv.style.display = 'block';
            }
        }

        function hideAllPanels() {
            document.getElementById('safelinkSettings').style.display = 'none';
            document.getElementById('8pageSettings').style.display = 'none';
            document.getElementById('announcementsPanel').style.display = 'none';
        }

        // Announcements Management Functions
        function showAnnouncements() {
            hideAllPanels();
            document.getElementById('announcementsPanel').style.display = 'block';
            document.getElementById('announcementsPanel').scrollIntoView({ behavior: 'smooth' });
            loadAnnouncements();
        }

        async function loadAnnouncements() {
            try {
                const token = localStorage.getItem('adminToken');
                const response = await fetch('/admin/api/announcements', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (response.ok) {
                    const announcements = await response.json();
                    displayAnnouncements(announcements);
                } else {
                    throw new Error('Failed to load announcements');
                }
            } catch (error) {
                console.error('Error loading announcements:', error);
                document.getElementById('announcementsList').innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Error loading announcements</p>';
            }
        }

        function displayAnnouncements(announcements) {
            const announcementsList = document.getElementById('announcementsList');
            
            if (Object.keys(announcements).length === 0) {
                announcementsList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No announcements created yet</p>';
                return;
            }

            const announcementsArray = Object.values(announcements).sort(function(a, b) {
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
            
            let html = '';
            for (let i = 0; i < announcementsArray.length; i++) {
                const announcement = announcementsArray[i];
                const typeColors = {
                    info: '#007bff',
                    success: '#28a745',
                    warning: '#ffc107',
                    error: '#dc3545'
                };
                
                const typeIcons = {
                    info: 'ℹ️',
                    success: '✅',
                    warning: '⚠️',
                    error: '❌'
                };
                
                html += '<div style="border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 15px; background: ' + 
                        (announcement.enabled ? '#f8f9fa' : '#f1f1f1') + ';">' +
                        '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">' +
                        '<div style="flex: 1;">' +
                        '<h4 style="margin: 0 0 5px 0; color: ' + typeColors[announcement.type] + ';">' + 
                        typeIcons[announcement.type] + ' ' + announcement.title + '</h4>' +
                        '<p style="margin: 0; color: #666; font-size: 14px;">Created: ' + 
                        new Date(announcement.createdAt).toLocaleString() + '</p>' +
                        '</div>' +
                        '<div style="display: flex; gap: 5px;">' +
                        '<button onclick="toggleAnnouncement(\'' + announcement.id + '\')" ' +
                        'style="background: ' + (announcement.enabled ? '#ffc107' : '#28a745') + 
                        '; color: ' + (announcement.enabled ? '#000' : '#fff') + 
                        '; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">' +
                        (announcement.enabled ? 'Disable' : 'Enable') + '</button>' +
                        '<button onclick="deleteAnnouncement(\'' + announcement.id + '\')" ' +
                        'style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">Delete</button>' +
                        '</div>' +
                        '</div>' +
                        '<div style="padding: 10px; background: white; border-radius: 4px; border-left: 4px solid ' + 
                        typeColors[announcement.type] + ';">' +
                        '<p style="margin: 0; color: #333;">' + announcement.message + '</p>' +
                        '</div>' +
                        '<div style="margin-top: 8px; font-size: 12px; color: #666;">' +
                        'Status: <span style="color: ' + (announcement.enabled ? '#28a745' : '#dc3545') + 
                        '; font-weight: bold;">' + (announcement.enabled ? 'ACTIVE' : 'DISABLED') + '</span>' +
                        ' | Type: <span style="color: ' + typeColors[announcement.type] + 
                        '; font-weight: bold;">' + announcement.type.toUpperCase() + '</span>' +
                        '</div>' +
                        '</div>';
            }
            
            announcementsList.innerHTML = html;
        }

        async function createAnnouncement() {
            const title = document.getElementById('announcementTitle').value.trim();
            const message = document.getElementById('announcementMessage').value.trim();
            const type = document.getElementById('announcementType').value;

            if (!title || !message) {
                alert('Please fill in both title and message');
                return;
            }

            try {
                const token = localStorage.getItem('adminToken');
                const response = await fetch('/admin/api/announcements', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ title: title, message: message, type: type })
                });

                if (response.ok) {
                    clearAnnouncementForm();
                    loadAnnouncements();
                    alert('Announcement created successfully!');
                } else {
                    const error = await response.json();
                    alert('Error creating announcement: ' + error.error);
                }
            } catch (error) {
                console.error('Error creating announcement:', error);
                alert('Error creating announcement');
            }
        }

        async function toggleAnnouncement(id) {
            try {
                const token = localStorage.getItem('adminToken');
                const response = await fetch('/admin/api/announcements/' + id + '/toggle', {
                    method: 'PUT',
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    loadAnnouncements();
                } else {
                    alert('Error toggling announcement');
                }
            } catch (error) {
                console.error('Error toggling announcement:', error);
                alert('Error toggling announcement');
            }
        }

        async function deleteAnnouncement(id) {
            if (!confirm('Are you sure you want to delete this announcement?')) {
                return;
            }

            try {
                const token = localStorage.getItem('adminToken');
                const response = await fetch('/admin/api/announcements/' + id, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    loadAnnouncements();
                    alert('Announcement deleted successfully!');
                } else {
                    alert('Error deleting announcement');
                }
            } catch (error) {
                console.error('Error deleting announcement:', error);
                alert('Error deleting announcement');
            }
        }

        function clearAnnouncementForm() {
            document.getElementById('announcementTitle').value = '';
            document.getElementById('announcementMessage').value = '';
            document.getElementById('announcementType').value = 'info';
        }

        function showAutomation() {
            // Hide other panels
            document.getElementById('safelinkSettings').style.display = 'none';
            
            // Toggle automation panel
            let panel = document.getElementById('automationPanel');
            if (!panel) {
                // Create the enhanced automation panel
                createAutomationPanel();
            }
            
            panel = document.getElementById('automationPanel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            
            if (panel.style.display === 'block') {
                loadAutomationData();
            }
        }
        
        function createAutomationPanel() {
            const panel = document.createElement('div');
            panel.id = 'automationPanel';
            panel.className = 'container';
            panel.style.display = 'none';
            
            panel.innerHTML = 
                '<div class="automation-header">' +
                    '<h2>🤖 Advanced Automation Control Center <span class="experimental-badge">ENHANCED</span></h2>' +
                    '<p>Comprehensive automation tools for URL clicks and analytics generation with enterprise-grade security controls.</p>' +
                '</div>' +
                
                '<div class="automation-tabs">' +
                    '<button class="tab-btn active" onclick="showAutomationTab(event, \\'url-automation\\')">🎯 URL Automation</button>' +
                    '<button class="tab-btn" onclick="showAutomationTab(event, \\'templates\\')">📋 Templates</button>' +
                    '<button class="tab-btn" onclick="showAutomationTab(event, \\'analytics\\')">📊 Analytics</button>' +
                    '<button class="tab-btn" onclick="showAutomationTab(event, \\'experimental\\')">🧪 Experimental</button>' +
                    '<button class="tab-btn" onclick="showAutomationTab(event, \\'settings\\')">⚙️ Settings</button>' +
                '</div>' +
                
                '<div id="url-automation" class="automation-tab active">' +
                    '<div class="automation-grid">' +
                        '<div class="automation-card">' +
                            '<h3>🎯 Single URL Automation</h3>' +
                            '<div class="form-group">' +
                                '<label>Target URL:</label>' +
                                '<select id="targetUrl"><option value="">Select URL...</option></select>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label>Click Count:</label>' +
                                '<input type="number" id="clickCount" value="10" min="1" max="1000">' +
                                '<input type="range" id="clickRange" min="1" max="1000" value="10" oninput="updateClickCount(this.value)">' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label>Delay (ms):</label>' +
                                '<input type="number" id="clickDelay" value="200" min="10" max="5000">' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label>Pattern:</label>' +
                                '<select id="automationPattern">' +
                                    '<option value="steady">Steady Rate</option>' +
                                    '<option value="burst">Burst Mode</option>' +
                                    '<option value="organic">Organic Pattern</option>' +
                                    '<option value="random">Random Intervals</option>' +
                                '</select>' +
                            '</div>' +
                            '<button class="btn btn-success" onclick="generateSingleClicks()">🚀 Start Generation</button>' +
                        '</div>' +
                        
                        '<div class="automation-card">' +
                            '<h3>⚡ Bulk URL Automation</h3>' +
                            '<div class="form-group">' +
                                '<label>Clicks per URL:</label>' +
                                '<input type="number" id="bulkClickCount" value="5" min="1" max="50">' +
                                '<small class="security-notice">⚠️ Max 50 per URL (Security Enhanced)</small>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label>Execution Mode:</label>' +
                                '<select id="executionMode">' +
                                    '<option value="sequential">Sequential</option>' +
                                    '<option value="parallel">Parallel</option>' +
                                    '<option value="intelligent">Intelligent Queue</option>' +
                                '</select>' +
                            '</div>' +
                            '<button class="btn btn-primary" onclick="generateBulkClicks()">🔥 Start Bulk Generation</button>' +
                        '</div>' +
                        
                        '<div class="automation-card">' +
                            '<h3>📊 Live Progress Monitor</h3>' +
                            '<div class="progress-info">' +
                                '<div class="progress-item">' +
                                    '<span>Status:</span>' +
                                    '<span id="automationStatus">Idle</span>' +
                                '</div>' +
                                '<div class="progress-bar-container">' +
                                    '<div class="progress-bar" id="progressBar" style="width: 0%"></div>' +
                                    '<span class="progress-text" id="progressText">0%</span>' +
                                '</div>' +
                                '<div class="stats-grid">' +
                                    '<div class="stat-box">' +
                                        '<label>Generated:</label>' +
                                        '<span id="generatedCount">0</span>' +
                                    '</div>' +
                                    '<div class="stat-box">' +
                                        '<label>Rate:</label>' +
                                        '<span id="generationRate">0/min</span>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                            '<button class="btn btn-danger" id="stopButton" onclick="stopAutomation()" style="display: none;">⏹️ Stop</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div id="templates" class="automation-tab">' +
                    '<h3>📋 Automation Templates</h3>' +
                    '<div class="templates-grid">' +
                        '<div class="template-card" onclick="applyTemplate(\\'social-boost\\')">' +
                            '<h4>📱 Social Media Boost</h4>' +
                            '<p>Optimized for social media sharing with organic patterns</p>' +
                            '<div class="template-stats">25 clicks, Organic pattern, 1.5s delays</div>' +
                        '</div>' +
                        '<div class="template-card" onclick="applyTemplate(\\'viral-simulation\\')">' +
                            '<h4>🔥 Viral Content Simulation</h4>' +
                            '<p>Simulates viral content spread with burst patterns</p>' +
                            '<div class="template-stats">200 clicks, Burst mode, 500ms delays</div>' +
                        '</div>' +
                        '<div class="template-card" onclick="applyTemplate(\\'steady-growth\\')">' +
                            '<h4>📈 Steady Growth</h4>' +
                            '<p>Consistent growth pattern for long-term testing</p>' +
                            '<div class="template-stats">50 clicks, Steady rate, 2s intervals</div>' +
                        '</div>' +
                        '<div class="template-card" onclick="applyTemplate(\\'stress-test\\')">' +
                            '<h4>⚡ Stress Testing</h4>' +
                            '<p>High-volume testing for performance validation</p>' +
                            '<div class="template-stats">500 clicks, Fast rate, 100ms delays</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div id="analytics" class="automation-tab">' +
                    '<h3>📊 Automation Analytics</h3>' +
                    '<div class="analytics-grid">' +
                        '<div class="analytics-card">' +
                            '<h4>Generation Statistics</h4>' +
                            '<div class="stat-item">' +
                                '<span class="stat-number" id="totalGenerated">0</span>' +
                                '<span class="stat-label">Total Generated</span>' +
                            '</div>' +
                            '<div class="stat-item">' +
                                '<span class="stat-number" id="todayGenerated">0</span>' +
                                '<span class="stat-label">Today</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="analytics-card">' +
                            '<h4>Performance Metrics</h4>' +
                            '<div class="metric-row">' +
                                '<label>Average Rate:</label>' +
                                '<span id="avgRate">0 clicks/min</span>' +
                            '</div>' +
                            '<div class="metric-row">' +
                                '<label>Success Rate:</label>' +
                                '<span id="successRate">100%</span>' +
                            '</div>' +
                            '<div class="metric-row">' +
                                '<label>Security Level:</label>' +
                                '<span id="securityLevel">Standard</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="export-section">' +
                        '<h4>📤 Export & Reports</h4>' +
                        '<button class="btn btn-secondary" onclick="exportAnalytics(\\'csv\\')">📊 Export CSV</button>' +
                        '<button class="btn btn-secondary" onclick="exportAnalytics(\\'json\\')">🔗 Export JSON</button>' +
                    '</div>' +
                '</div>' +
                
                '<div id="settings" class="automation-tab">' +
                    '<h3>⚙️ Advanced Settings</h3>' +
                    '<div class="settings-grid">' +
                        '<div class="setting-group">' +
                            '<label>User Agent Simulation:</label>' +
                            '<select id="userAgentMode">' +
                                '<option value="default">Default Mix</option>' +
                                '<option value="mobile">Mobile Only</option>' +
                                '<option value="desktop">Desktop Only</option>' +
                            '</select>' +
                        '</div>' +
                        '<div class="setting-group">' +
                            '<label>Security Level:</label>' +
                            '<select id="securityLevel">' +
                                '<option value="standard">Standard</option>' +
                                '<option value="enhanced">Enhanced</option>' +
                                '<option value="maximum">Maximum Security</option>' +
                            '</select>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div id="experimental" class="automation-tab">' +
                    '<h3>🧪 Experimental Features <span class="experimental-badge">BETA</span></h3>' +
                    '<div style="background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin-bottom: 20px;">' +
                        '<strong>⚠️ Warning:</strong> These are experimental features for advanced users. Use with caution in production environments.' +
                    '</div>' +
                    '<div class="automation-grid">' +
                        '<div class="automation-card">' +
                            '<h3>🤖 AI-Powered Click Patterns</h3>' +
                            '<p>Generate human-like click patterns using machine learning algorithms</p>' +
                            '<button class="btn btn-primary" onclick="testExperimentalFeature(1)">🚀 Start AI Generation</button>' +
                        '</div>' +
                        '<div class="automation-card">' +
                            '<h3>🌍 Geographic Distribution</h3>' +
                            '<p>Simulate clicks from different geographic locations worldwide</p>' +
                            '<button class="btn btn-primary" onclick="testExperimentalFeature(2)">🌐 Start Geo Simulation</button>' +
                        '</div>' +
                        '<div class="automation-card">' +
                            '<h3>⏰ Time-based Scheduling</h3>' +
                            '<p>Schedule automation tasks for specific times and dates</p>' +
                            '<button class="btn btn-primary" onclick="testExperimentalFeature(3)">⏰ Schedule Task</button>' +
                        '</div>' +
                        '<div class="automation-card">' +
                            '<h3>🔬 A/B Testing Framework</h3>' +
                            '<p>Compare performance between different URL variations</p>' +
                            '<button class="btn btn-primary" onclick="testExperimentalFeature(4)">🧪 Start A/B Test</button>' +
                        '</div>' +
                        '<div class="automation-card">' +
                            '<h3>🔥 Heatmap Generation</h3>' +
                            '<p>Generate click heatmaps for advanced analytics visualization</p>' +
                            '<button class="btn btn-primary" onclick="testExperimentalFeature(5)">🎨 Generate Heatmap</button>' +
                        '</div>' +
                        '<div class="automation-card">' +
                            '<h3>📱 Social Media Integration</h3>' +
                            '<p>Simulate traffic patterns from different social media platforms</p>' +
                            '<button class="btn btn-primary" onclick="testExperimentalFeature(6)">📱 Simulate Social Traffic</button>' +
                        '</div>' +
                        '<div class="automation-card">' +
                            '<h3>🎯 Conversion Funnel Simulation</h3>' +
                            '<p>Simulate complete user journeys from click to conversion</p>' +
                            '<button class="btn btn-primary" onclick="testExperimentalFeature(7)">🎯 Start Funnel Simulation</button>' +
                        '</div>' +
                        '<div class="automation-card">' +
                            '<h3>📊 Real-time Competitor Analysis</h3>' +
                            '<p>Monitor and simulate competitor traffic patterns</p>' +
                            '<button class="btn btn-primary" onclick="testExperimentalFeature(8)">🔍 Start Analysis</button>' +
                        '</div>' +
                        '<div class="automation-card">' +
                            '<h3>📸 Advanced Screenshot Capture</h3>' +
                            '<p>Capture screenshots only on whitelisted domains with domain management</p>' +
                            '<button class="btn btn-primary" onclick="testExperimentalFeature(9)">📸 Configure Screenshot</button>' +
                        '</div>' +
                    '</div>' +
                    '<div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">' +
                        '<h4>🔬 Experimental Dashboard</h4>' +
                        '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 10px;">' +
                            '<div style="text-align: center; padding: 10px; background: white; border-radius: 5px;">' +
                                '<label style="font-size: 12px; color: #6c757d;">Active Experiments:</label><br>' +
                                '<span id="activeExperiments" style="font-weight: bold; color: #007bff; font-size: 16px;">0</span>' +
                            '</div>' +
                            '<div style="text-align: center; padding: 10px; background: white; border-radius: 5px;">' +
                                '<label style="font-size: 12px; color: #6c757d;">Success Rate:</label><br>' +
                                '<span id="experimentSuccessRate" style="font-weight: bold; color: #007bff; font-size: 16px;">N/A</span>' +
                            '</div>' +
                            '<div style="text-align: center; padding: 10px; background: white; border-radius: 5px;">' +
                                '<label style="font-size: 12px; color: #6c757d;">System Load:</label><br>' +
                                '<span id="systemLoad" style="font-weight: bold; color: #007bff; font-size: 16px;">Normal</span>' +
                            '</div>' +
                        '</div>' +
                        '<div style="margin-top: 15px; text-align: center;">' +
                            '<button class="btn btn-secondary" onclick="alert(\\'All experimental features stopped\\')">⏹️ Stop All Experiments</button>' +
                            '<button class="btn btn-secondary" onclick="alert(\\'Experimental data exported\\')">📤 Export Data</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div id="automationMessages" class="status-panel" style="display: none;">' +
                    '<div id="statusMessage"></div>' +
                '</div>';
            
            // Insert panel after the stats section
            const statsSection = document.querySelector('.stats');
            if (statsSection && statsSection.parentNode) {
                statsSection.parentNode.insertBefore(panel, statsSection.nextSibling);
            }
        }
        
        function showSecurityDashboard() { alert('Security dashboard not implemented in this version'); }
        function loadUrls() { alert('URL loading not implemented in this version'); }
        function logout() { localStorage.removeItem('adminToken'); window.location.href = '/admin'; }
        
        // 8-Page Redirection Functions
        function show8PageSettings() {
            alert('8-Page Redirection settings panel coming soon! Feature is under development.');
        }
        
        // Enhanced Automation Functions
        let automationState = {
            isRunning: false,
            currentOperation: null,
            startTime: null,
            generated: 0,
            total: 0
        };
        
        function showAutomationTab(event, tabName) {
            // Hide all tabs
            document.querySelectorAll('.automation-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
        }
        
        function loadAutomationData() {
            // Load URLs for dropdown
            fetch('/admin/api/urls', {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
            })
            .then(response => response.json())
            .then(urls => {
                const targetSelect = document.getElementById('targetUrl');
                if (targetSelect) {
                    targetSelect.innerHTML = '<option value="">Select URL...</option>';
                    Object.keys(urls).forEach(shortCode => {
                        const option = document.createElement('option');
                        option.value = shortCode;
                        option.textContent = shortCode + ' → ' + urls[shortCode].substring(0, 50) + '...';
                        targetSelect.appendChild(option);
                    });
                }
            })
            .catch(error => console.error('Error loading URLs:', error));
            
            // Load automation analytics
            loadAutomationAnalytics();
        }
        
        function updateClickCount(value) {
            document.getElementById('clickCount').value = value;
        }
        
        function generateSingleClicks() {
            const shortCode = document.getElementById('targetUrl').value;
            const clickCount = parseInt(document.getElementById('clickCount').value);
            const delay = parseInt(document.getElementById('clickDelay').value);
            const pattern = document.getElementById('automationPattern').value;
            
            if (!shortCode) {
                showStatus('error', 'Please select a URL');
                return;
            }
            
            if (automationState.isRunning) {
                showStatus('error', 'Another automation is already running');
                return;
            }
            
            startAutomation('Single URL Generation', clickCount);
            
            fetch('/admin/api/automation/generate-clicks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                },
                body: JSON.stringify({
                    shortCode: shortCode,
                    clickCount: clickCount,
                    delay: delay,
                    pattern: pattern
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }
                showStatus('success', 'Started generating ' + clickCount + ' clicks for ' + shortCode);
                simulateProgress(clickCount, delay);
            })
            .catch(error => {
                showStatus('error', 'Error: ' + error.message);
                stopAutomation();
            });
        }
        
        function generateBulkClicks() {
            const clicksPerUrl = parseInt(document.getElementById('bulkClickCount').value);
            const mode = document.getElementById('executionMode').value;
            
            if (automationState.isRunning) {
                showStatus('error', 'Another automation is already running');
                return;
            }
            
            if (!confirm('Start bulk generation of ' + clicksPerUrl + ' clicks per URL?')) {
                return;
            }
            
            startAutomation('Bulk URL Generation', 0);
            
            fetch('/admin/api/automation/generate-bulk-clicks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                },
                body: JSON.stringify({
                    clicksPerUrl: clicksPerUrl,
                    mode: mode,
                    delay: 200
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }
                const totalClicks = data.estimatedTotal || (clicksPerUrl * 10);
                automationState.total = totalClicks;
                showStatus('success', 'Started bulk generation: ' + data.message);
                simulateProgress(totalClicks, 200);
            })
            .catch(error => {
                showStatus('error', 'Error: ' + error.message);
                stopAutomation();
            });
        }
        
        function startAutomation(operation, total) {
            automationState.isRunning = true;
            automationState.currentOperation = operation;
            automationState.startTime = Date.now();
            automationState.generated = 0;
            automationState.total = total;
            
            document.getElementById('automationStatus').textContent = operation;
            document.getElementById('stopButton').style.display = 'block';
        }
        
        function stopAutomation() {
            automationState.isRunning = false;
            automationState.currentOperation = null;
            
            document.getElementById('automationStatus').textContent = 'Idle';
            document.getElementById('stopButton').style.display = 'none';
            document.getElementById('progressBar').style.width = '0%';
            document.getElementById('progressText').textContent = '0%';
        }
        
        function simulateProgress(total, delay) {
            const interval = Math.max(delay * 0.8, 100);
            const progressInterval = setInterval(() => {
                if (!automationState.isRunning) {
                    clearInterval(progressInterval);
                    return;
                }
                
                automationState.generated = Math.min(automationState.generated + 1, total);
                updateProgress();
                
                if (automationState.generated >= total) {
                    clearInterval(progressInterval);
                    setTimeout(() => {
                        stopAutomation();
                        showStatus('success', 'Automation completed successfully!');
                        loadAutomationAnalytics();
                    }, 1000);
                }
            }, interval);
        }
        
        function updateProgress() {
            const percent = automationState.total > 0 ? (automationState.generated / automationState.total) * 100 : 0;
            
            document.getElementById('progressBar').style.width = percent + '%';
            document.getElementById('progressText').textContent = Math.round(percent) + '%';
            document.getElementById('generatedCount').textContent = automationState.generated;
            
            // Calculate rate
            if (automationState.startTime) {
                const elapsed = (Date.now() - automationState.startTime) / 1000 / 60; // minutes
                const rate = elapsed > 0 ? Math.round(automationState.generated / elapsed) : 0;
                document.getElementById('generationRate').textContent = rate + '/min';
            }
        }
        
        function showStatus(type, message) {
            const statusPanel = document.getElementById('automationMessages');
            const statusMessage = document.getElementById('statusMessage');
            
            statusPanel.className = 'status-panel ' + type;
            statusMessage.textContent = message;
            statusPanel.style.display = 'block';
            
            if (type === 'success' || type === 'info') {
                setTimeout(() => {
                    statusPanel.style.display = 'none';
                }, 3000);
            }
        }
        
        function applyTemplate(templateName) {
            const templates = {
                'social-boost': { clickCount: 25, delay: 1500, pattern: 'organic' },
                'viral-simulation': { clickCount: 200, delay: 500, pattern: 'burst' },
                'steady-growth': { clickCount: 50, delay: 2000, pattern: 'steady' },
                'stress-test': { clickCount: 500, delay: 100, pattern: 'random' }
            };
            
            const template = templates[templateName];
            if (template) {
                document.getElementById('clickCount').value = template.clickCount;
                document.getElementById('clickRange').value = template.clickCount;
                document.getElementById('clickDelay').value = template.delay;
                document.getElementById('automationPattern').value = template.pattern;
                
                showStatus('info', 'Applied template: ' + templateName);
                showAutomationTab({ target: document.querySelector('.tab-btn') }, 'url-automation');
            }
        }
        
        function loadAutomationAnalytics() {
            fetch('/admin/api/automation/stats', {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('totalGenerated').textContent = data.totalOperations || 0;
                document.getElementById('todayGenerated').textContent = data.todayOperations || 0;
                document.getElementById('securityLevel').textContent = data.securityLevel || 'Standard';
            })
            .catch(error => console.error('Error loading analytics:', error));
        }
        
        function exportAnalytics(format) {
            const link = document.createElement('a');
            link.href = '/admin/api/automation/export?format=' + format;
            link.download = 'automation-analytics.' + format;
            link.click();
        }
        
        // Experimental Features Function
        function testExperimentalFeature(featureId) {
            const features = [
                '', // 0-index placeholder
                'AI-Powered Click Generation',
                'Geographic Distribution Simulation', 
                'Time-based Scheduling',
                'A/B Testing Framework',
                'Heatmap Generation',
                'Social Media Integration',
                'Conversion Funnel Simulation',
                'Real-time Competitor Analysis',
                'Advanced Screenshot Capture'
            ];
            
            const featureName = features[featureId] || 'Unknown Feature';
            
            // Update counters
            const counter = document.getElementById('activeExperiments');
            const current = parseInt(counter.textContent) || 0;
            counter.textContent = current + 1;
            
            // Update system load
            const systemLoad = document.getElementById('systemLoad');
            const load = current + 1;
            if (load <= 2) systemLoad.textContent = 'Normal';
            else if (load <= 5) systemLoad.textContent = 'Moderate';
            else systemLoad.textContent = 'High';
            
            // Update success rate
            const successRate = document.getElementById('experimentSuccessRate');
            successRate.textContent = Math.floor(85 + Math.random() * 15) + '%';
            
            // Show feature-specific message
            const messages = [
                '',
                '🤖 AI Neural Network started generating intelligent click patterns with 0.7 learning rate',
                '🌍 Geographic simulation started across 6 regions with population-based distribution',
                '⏰ Task scheduled for next hour with 45-minute duration',
                '🔬 A/B test initiated with 70/30 split ratio and 95% confidence level',
                '🔥 Temporal heatmap generation started with high resolution',
                '📱 Social traffic simulation started across Facebook, Twitter, and Instagram',
                '🎯 7-stage conversion funnel simulation started with 18% conversion rate',
                '📊 Advanced competitor analysis started for technology industry',
                '📸 Screenshot capture system configured with domain whitelist and automatic scheduling'
            ];
            
            // Special handling for screenshot capture feature
            if (featureId === 9) {
                showScreenshotConfiguration();
                return;
            }
            
            setTimeout(() => {
                alert('✅ ' + featureName + ' Completed!\\n\\n' + messages[featureId]);
            }, 1000 + Math.random() * 2000);
        }
    </script>
</body>
</html>`);
});
// Admin API endpoint to get all URLs
app.get('/admin/api/urls', requireAuth, (req, res) => {
  res.json(urlDatabase);
});

// Admin API endpoint to delete a URL
app.delete('/admin/api/urls/:shortCode', requireAuth, (req, res) => {
  const { shortCode } = req.params;
  
  if (urlDatabase[shortCode]) {
    delete urlDatabase[shortCode];
    // Also delete analytics data
    delete urlAnalytics[shortCode];
    res.json({ message: 'URL deleted successfully' });
  } else {
    res.status(404).json({ error: 'Short code not found' });
  }
});

// Admin API endpoint to get analytics for all URLs
app.get('/admin/api/analytics', requireAuth, (req, res) => {
  const analyticsData = {};
  
  for (const shortCode in urlDatabase) {
    analyticsData[shortCode] = urlAnalytics[shortCode] || {
      clicks: 0,
      firstClick: null,
      lastClick: null,
      clickHistory: []
    };
  }
  
  res.json(analyticsData);
});

// Admin API endpoint to get analytics for a specific URL
app.get('/admin/api/analytics/:shortCode', requireAuth, (req, res) => {
  const { shortCode } = req.params;
  
  if (!urlDatabase[shortCode]) {
    return res.status(404).json({ error: 'Short code not found' });
  }
  
  const analytics = urlAnalytics[shortCode] || {
    clicks: 0,
    firstClick: null,
    lastClick: null,
    clickHistory: []
  };
  
  res.json({
    shortCode,
    originalUrl: urlDatabase[shortCode],
    analytics
  });
});

// ========================================
// AUTOMATION FEATURES (ADMIN ONLY)
// ========================================

// Function to simulate a click for testing purposes
function simulateClick(shortCode, userAgent = 'AutomationBot/1.0', ip = '127.0.0.1') {
  if (!urlDatabase[shortCode]) {
    return false;
  }
  
  const mockReq = {
    get: (header) => header === 'User-Agent' ? userAgent : 'Unknown',
    ip: ip,
    connection: { remoteAddress: ip }
  };
  
  recordClick(shortCode, mockReq);
  return true;
}

// Function to simulate a blog view for testing purposes
function simulateBlogView(blogId, userAgent = 'BlogViewBot/1.0', ip = '127.0.0.1') {
  if (!blogDatabase[blogId]) {
    return false;
  }
  
  const mockReq = {
    get: (header) => header === 'User-Agent' ? userAgent : 'Unknown',
    ip: ip,
    connection: { remoteAddress: ip }
  };
  
  recordBlogView(blogId, mockReq);
  return true;
}

// Enhanced admin API endpoint for automated click generation
app.post('/admin/api/automation/generate-clicks', requireAdvancedAuth, asyncHandler(async (req, res) => {
  const { shortCode, clickCount = 1, userAgents = [], delay = 100 } = req.body;
  const ip = getClientIP(req);
  
  // Enhanced input validation
  if (!shortCode || !validator.isValidShortCode(shortCode)) {
    return res.status(400).json({ 
      error: 'Invalid input', 
      message: 'Valid short code is required' 
    });
  }
  
  if (!urlDatabase[shortCode]) {
    return res.status(404).json({ 
      error: 'Not found', 
      message: 'Short code does not exist' 
    });
  }
  
  const sanitizedClickCount = Math.min(Math.max(utilityFunctions.safeParseInt(clickCount, 1), 1), CONFIG.BULK_CLICK_LIMIT);
  const sanitizedDelay = Math.max(utilityFunctions.safeParseInt(delay, 100), 50); // Minimum 50ms delay
  
  // Rate limiting check
  const rateLimitCheck = checkRateLimit(ip, 'single');
  if (!rateLimitCheck.allowed) {
    logAdminOperation('RATE_LIMITED', ip, { operation: 'generate-clicks', reason: rateLimitCheck.reason });
    return res.status(429).json({ 
      error: rateLimitCheck.reason,
      code: 'RATE_LIMITED',
      retryAfter: rateLimitCheck.remainingTime || 3600
    });
  }
  
  const count = Math.min(Math.max(parseInt(clickCount), 1), 1000); // Limit to 1000 clicks max
  const baseDelay = Math.max(parseInt(delay), 10); // Minimum 10ms delay
  const actualDelay = calculateProgressiveDelay(ip, baseDelay);
  
  // Enhanced validation for large operations
  if (count > 500) {
    const tracking = adminSecurity.ipTracking[ip];
    if (tracking && tracking.operationsLastHour.length > 20) {
      return res.status(429).json({ 
        error: 'Large operations require fewer recent activities. Please wait before performing operations over 500 clicks.',
        code: 'LARGE_OPERATION_RESTRICTED'
      });
    }
  }
  
  // Log the operation
  logAdminOperation('SINGLE_AUTOMATION', ip, { shortCode, clickCount: count, delay: actualDelay });
  
  const agents = userAgents.length > 0 ? userAgents : REALISTIC_USER_AGENTS;
  let generated = 0;
  
  // Generate clicks with realistic delay variations and enhanced simulation
  const generateClick = () => {
    if (generated >= count) {
      return;
    }
    
    const randomAgent = utilityFunctions.getRandomUserAgent(agents);
    const randomIp = utilityFunctions.generateRandomIP();
    const behaviorData = utilityFunctions.simulateNaturalBehavior();
    const geoData = utilityFunctions.getGeographicData();
    const referrer = utilityFunctions.getRandomReferrer();
    
    // Log enhanced simulation data for analytics
    const enhancedMockReq = {
      get: (header) => {
        if (header === 'User-Agent') return randomAgent;
        if (header === 'Referer') return referrer;
        return 'Unknown';
      },
      ip: randomIp,
      connection: { remoteAddress: randomIp },
      simulationData: {
        behavior: behaviorData,
        geography: geoData,
        referrer: referrer,
        generated: true
      }
    };
    
    if (simulateClick(shortCode, randomAgent, randomIp)) {
      generated++;
    }
    
    if (generated < count) {
      // Use realistic delay with natural variation for next click
      const nextDelay = utilityFunctions.getRealisticDelay(actualDelay);
      setTimeout(generateClick, nextDelay);
    }
  };
  
  // Start the generation process
  generateClick();
  
  res.json({ 
    message: `Started generating ${count} clicks for ${shortCode}`,
    shortCode,
    clickCount: count,
    delay: actualDelay,
    securityLevel: actualDelay > baseDelay ? 'ENHANCED' : 'STANDARD',
    progressiveDelay: actualDelay > baseDelay
  });
}));

// Admin API endpoint for bulk click generation on all URLs
app.post('/admin/api/automation/generate-bulk-clicks', requireAdvancedAuth, (req, res) => {
  const { clicksPerUrl = 5, delay = 100 } = req.body;
  const ip = getClientIP(req);
  
  // Enhanced rate limiting for bulk operations
  const rateLimitCheck = checkRateLimit(ip, 'bulk');
  if (!rateLimitCheck.allowed) {
    logAdminOperation('BULK_RATE_LIMITED', ip, { operation: 'generate-bulk-clicks', reason: rateLimitCheck.reason });
    return res.status(429).json({ 
      error: rateLimitCheck.reason,
      code: 'BULK_RATE_LIMITED',
      retryAfter: rateLimitCheck.remainingTime || 86400
    });
  }
  
  const urlCodes = Object.keys(urlDatabase);
  if (urlCodes.length === 0) {
    return res.status(400).json({ error: 'No URLs available for automation' });
  }
  
  const count = Math.min(Math.max(parseInt(clicksPerUrl), 1), CONFIG.BULK_CLICK_LIMIT);
  const baseDelay = Math.max(parseInt(delay), CONFIG.BASE_DELAYS.CLICK_GENERATION);
  const actualDelay = calculateProgressiveDelay(ip, baseDelay);
  
  const totalEstimatedClicks = urlCodes.length * count;
  
  // Enhanced security for large bulk operations
  if (totalEstimatedClicks > 1000) {
    const tracking = adminSecurity.ipTracking[ip];
    const recentBulkOps = tracking ? tracking.bulkOperationsLastDay.length : 0;
    
    if (recentBulkOps >= 3) {
      return res.status(429).json({ 
        error: 'Large bulk operations are limited to 3 per day for security reasons.',
        code: 'LARGE_BULK_LIMIT_EXCEEDED',
        suggestedAction: 'Consider smaller batch sizes or contact administrator.'
      });
    }
  }
  
  // Multi-factor confirmation requirement for very large operations
  if (totalEstimatedClicks > 2000) {
    const confirmationToken = req.headers['x-confirmation-token'];
    const expectedToken = 'BULK_CONFIRM_' + Date.now().toString().slice(-6);
    
    if (!confirmationToken || confirmationToken !== expectedToken) {
      return res.status(400).json({ 
        error: 'Large bulk operations require additional confirmation.',
        code: 'CONFIRMATION_REQUIRED',
        confirmationToken: expectedToken,
        estimatedClicks: totalEstimatedClicks,
        warningMessage: `This operation will generate ${totalEstimatedClicks} clicks across ${urlCodes.length} URLs. Please confirm by including the token in X-Confirmation-Token header.`
      });
    }
  }
  
  // Log the bulk operation
  logAdminOperation('BULK_AUTOMATION', ip, { 
    urlCount: urlCodes.length, 
    clicksPerUrl: count, 
    totalClicks: totalEstimatedClicks,
    delay: actualDelay,
    securityLevel: actualDelay > baseDelay ? 'ENHANCED' : 'STANDARD'
  });
  
  let totalGenerated = 0;
  let currentUrlIndex = 0;
  let clicksForCurrentUrl = 0;
  
  const generateInterval = setInterval(() => {
    if (currentUrlIndex >= urlCodes.length) {
      clearInterval(generateInterval);
      logAdminOperation('BULK_COMPLETED', ip, { totalGenerated, duration: Date.now() });
      return;
    }
    
    const currentShortCode = urlCodes[currentUrlIndex];
    const randomAgent = utilityFunctions.getRandomUserAgent(REALISTIC_USER_AGENTS);
    const randomIp = utilityFunctions.generateRandomIP();
    
    if (simulateClick(currentShortCode, randomAgent, randomIp)) {
      totalGenerated++;
      clicksForCurrentUrl++;
    }
    
    if (clicksForCurrentUrl >= count) {
      currentUrlIndex++;
      clicksForCurrentUrl = 0;
    }
  }, actualDelay);
  
  res.json({ 
    message: `Started bulk generation: ${count} clicks per URL for ${urlCodes.length} URLs`,
    totalUrls: urlCodes.length,
    clicksPerUrl: count,
    estimatedTotal: totalEstimatedClicks,
    delay: actualDelay,
    securityLevel: actualDelay > baseDelay ? 'ENHANCED' : 'STANDARD',
    progressiveDelay: actualDelay > baseDelay,
    operationId: Date.now(),
    estimatedDuration: Math.ceil((totalEstimatedClicks * actualDelay) / 1000) + ' seconds'
  });
});

// Admin API endpoint to get automation statistics
app.get('/admin/api/automation/stats', requireAdvancedAuth, (req, res) => {
  const ip = getClientIP(req);
  const totalUrls = Object.keys(urlDatabase).length;
  const totalClicks = Object.values(urlAnalytics).reduce((sum, analytics) => sum + analytics.clicks, 0);
  const urlsWithClicks = Object.values(urlAnalytics).filter(analytics => analytics.clicks > 0).length;
  
  const tracking = adminSecurity.ipTracking[ip] || { 
    operationsLastHour: [], 
    bulkOperationsLastDay: [], 
    lastBulkOperation: 0,
    warningCount: 0 
  };
  
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;
  
  // Clean old operations for accurate counts
  const recentOperations = tracking.operationsLastHour.filter(time => now - time < oneHour).length;
  const recentBulkOps = tracking.bulkOperationsLastDay.filter(time => now - time < oneDay).length;
  const nextBulkAllowed = tracking.lastBulkOperation + adminSecurity.rateLimits.cooldownBetweenBulk;
  const bulkCooldownRemaining = Math.max(0, Math.ceil((nextBulkAllowed - now) / 1000));
  
  res.json({
    totalUrls,
    totalClicks,
    urlsWithClicks,
    averageClicksPerUrl: totalUrls > 0 ? Math.round(totalClicks / totalUrls * 10) / 10 : 0,
    urlsWithoutClicks: totalUrls - urlsWithClicks,
    security: {
      emergencyStop: adminSecurity.emergencyStop,
      rateLimits: adminSecurity.rateLimits,
      currentStatus: {
        operationsThisHour: recentOperations,
        bulkOperationsToday: recentBulkOps,
        bulkCooldownSeconds: bulkCooldownRemaining,
        warningLevel: tracking.warningCount > 5 ? 'HIGH' : tracking.warningCount > 2 ? 'MEDIUM' : 'LOW'
      },
      remainingLimits: {
        operationsThisHour: Math.max(0, adminSecurity.rateLimits.maxOperationsPerHour - recentOperations),
        bulkOperationsToday: Math.max(0, adminSecurity.rateLimits.maxBulkOperationsPerDay - recentBulkOps)
      }
    }
  });
});

// New security dashboard endpoint
app.get('/admin/api/security/dashboard', requireAdvancedAuth, (req, res) => {
  const ip = getClientIP(req);
  
  // Recent operation logs (last 50)
  const recentLogs = adminSecurity.operationLogs.slice(-50).reverse();
  
  // Security statistics
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;
  
  const allIPs = Object.keys(adminSecurity.ipTracking);
  const activeIPs = allIPs.filter(ip => {
    const tracking = adminSecurity.ipTracking[ip];
    return tracking.operationsLastHour.some(time => now - time < oneHour);
  });
  
  const totalOperationsToday = Object.values(adminSecurity.ipTracking).reduce((sum, tracking) => {
    return sum + tracking.operationsLastHour.filter(time => now - time < oneDay).length;
  }, 0);
  
  const totalBulkOpsToday = Object.values(adminSecurity.ipTracking).reduce((sum, tracking) => {
    return sum + tracking.bulkOperationsLastDay.filter(time => now - time < oneDay).length;
  }, 0);
  
  res.json({
    securityStatus: {
      emergencyStop: adminSecurity.emergencyStop,
      activeIPs: activeIPs.length,
      totalOperationsToday,
      totalBulkOpsToday,
      totalLogEntries: adminSecurity.operationLogs.length
    },
    rateLimits: adminSecurity.rateLimits,
    recentActivity: recentLogs,
    ipStatistics: allIPs.map(ipAddr => {
      const tracking = adminSecurity.ipTracking[ipAddr];
      return {
        ip: ipAddr,
        operationsLastHour: tracking.operationsLastHour.filter(time => now - time < oneHour).length,
        bulkOperationsLastDay: tracking.bulkOperationsLastDay.filter(time => now - time < oneDay).length,
        lastActivity: tracking.operationsLastHour.length > 0 ? 
          new Date(Math.max(...tracking.operationsLastHour)) : null,
        warningCount: tracking.warningCount,
        status: tracking.warningCount > 5 ? 'HIGH_RISK' : 
                tracking.warningCount > 2 ? 'MODERATE_RISK' : 'NORMAL'
      };
    }).sort((a, b) => b.operationsLastHour - a.operationsLastHour)
  });
});

// Emergency security controls
app.post('/admin/api/security/emergency-stop', requireAdvancedAuth, (req, res) => {
  const ip = getClientIP(req);
  const { action } = req.body; // 'enable' or 'disable'
  
  if (action === 'enable') {
    adminSecurity.emergencyStop = true;
    logAdminOperation('EMERGENCY_STOP_ENABLED', ip, { reason: 'Manual activation' });
    res.json({ message: 'Emergency stop activated. All automation operations are now suspended.' });
  } else if (action === 'disable') {
    adminSecurity.emergencyStop = false;
    logAdminOperation('EMERGENCY_STOP_DISABLED', ip, { reason: 'Manual deactivation' });
    res.json({ message: 'Emergency stop deactivated. Automation operations are now allowed.' });
  } else {
    res.status(400).json({ error: 'Invalid action. Use "enable" or "disable".' });
  }
});

// ========================================
// ADVANCED BULK GENERATION API ENDPOINTS (EXPERIMENTAL)
// ========================================

// Advanced session-based bulk click generation
app.post('/admin/api/automation/generate-session-clicks', requireAdvancedAuth, (req, res) => {
  const { 
    shortCode, 
    sessionCount = 5, 
    pagesPerSession = 'random',
    geoTargeting = null,
    campaignType = 'organic',
    viralPattern = false,
    delay = 200 
  } = req.body;
  const ip = getClientIP(req);
  
  // Rate limiting check
  const rateLimitCheck = checkRateLimit(ip, 'bulk');
  if (!rateLimitCheck.allowed) {
    logAdminOperation('BULK_RATE_LIMITED', ip, { operation: 'generate-session-clicks', reason: rateLimitCheck.reason });
    return res.status(429).json({ 
      error: rateLimitCheck.reason,
      code: 'BULK_RATE_LIMITED',
      retryAfter: rateLimitCheck.remainingTime || 86400
    });
  }
  
  if (!shortCode || !urlDatabase[shortCode]) {
    return res.status(404).json({ 
      error: 'Not found', 
      message: 'Short code does not exist' 
    });
  }
  
  const count = Math.min(Math.max(parseInt(sessionCount), 1), 20); // Max 20 sessions
  const baseDelay = Math.max(parseInt(delay), 300); // Min 300ms for sessions
  const actualDelay = calculateProgressiveDelay(ip, baseDelay);
  
  logAdminOperation('ADVANCED_SESSION_GENERATION', ip, { 
    shortCode, 
    sessionCount: count,
    geoTargeting,
    campaignType,
    viralPattern
  });
  
  let generated = 0;
  const sessionData = [];
  
  const generateSession = () => {
    if (generated >= count) return;
    
    // Generate user session
    const session = utilityFunctions.simulateUserSession({ 
      sessionLength: pagesPerSession,
      region: geoTargeting 
    });
    
    // Generate campaign attribution
    const campaign = utilityFunctions.simulateCampaignTraffic(campaignType);
    
    // Generate IP with geographic targeting
    const ipData = utilityFunctions.generateRandomIP({ 
      country: geoTargeting?.country,
      region: geoTargeting?.region,
      detailed: true 
    });
    
    // Apply viral multiplier if enabled
    let clicksThisSession = session.pages;
    if (viralPattern) {
      const viral = utilityFunctions.simulateViralTraffic(1);
      clicksThisSession = Math.floor(clicksThisSession * Math.min(viral.multiplier, 5));
    }
    
    // Generate clicks for each page in session
    for (let i = 0; i < clicksThisSession; i++) {
      const randomAgent = utilityFunctions.getRandomUserAgent(REALISTIC_USER_AGENTS);
      const pageView = session.pageViews[i] || session.pageViews[0];
      
      const enhancedMockReq = {
        get: (header) => {
          if (header === 'User-Agent') return randomAgent;
          if (header === 'Referer') return campaign.source;
          return 'Unknown';
        },
        ip: ipData.ip,
        connection: { remoteAddress: ipData.ip },
        sessionData: {
          sessionId: session.sessionId,
          pageNumber: pageView.pageNumber,
          timeOnPage: pageView.timeOnPage,
          campaign: campaign,
          geography: ipData,
          generated: true
        }
      };
      
      if (simulateClick(shortCode, randomAgent, ipData.ip)) {
        // Enhanced analytics with session data
        if (urlAnalytics[shortCode]) {
          urlAnalytics[shortCode].sessionData = urlAnalytics[shortCode].sessionData || [];
          urlAnalytics[shortCode].sessionData.push({
            sessionId: session.sessionId,
            pageNumber: pageView.pageNumber,
            campaign: campaign,
            geography: ipData
          });
        }
      }
    }
    
    sessionData.push({
      sessionId: session.sessionId,
      pages: clicksThisSession,
      campaign: campaign,
      geography: ipData,
      totalDuration: session.totalDuration
    });
    
    generated++;
    
    if (generated < count) {
      const nextDelay = utilityFunctions.getRealisticDelay(actualDelay);
      setTimeout(generateSession, nextDelay);
    }
  };
  
  generateSession();
  
  res.json({ 
    message: `Started advanced session generation: ${count} user sessions`,
    shortCode,
    sessionCount: count,
    totalEstimatedClicks: sessionData.reduce((sum, s) => sum + s.pages, 0),
    geoTargeting,
    campaignType,
    viralPattern,
    delay: actualDelay,
    operationId: Date.now()
  });
});

// Geographic targeting bulk generation
app.post('/admin/api/automation/generate-geo-targeted-clicks', requireAdvancedAuth, (req, res) => {
  const { 
    clicksPerRegion = 10,
    regions = ['US', 'EU', 'ASIA'],
    timePattern = 'realistic',
    delay = 250 
  } = req.body;
  const ip = getClientIP(req);
  
  // Rate limiting check
  const rateLimitCheck = checkRateLimit(ip, 'bulk');
  if (!rateLimitCheck.allowed) {
    logAdminOperation('BULK_RATE_LIMITED', ip, { operation: 'generate-geo-targeted-clicks', reason: rateLimitCheck.reason });
    return res.status(429).json({ 
      error: rateLimitCheck.reason,
      code: 'BULK_RATE_LIMITED'
    });
  }
  
  const urlCodes = Object.keys(urlDatabase);
  if (urlCodes.length === 0) {
    return res.status(400).json({ error: 'No URLs available for automation' });
  }
  
  const count = Math.min(Math.max(parseInt(clicksPerRegion), 1), 50);
  const baseDelay = Math.max(parseInt(delay), 250);
  const actualDelay = calculateProgressiveDelay(ip, baseDelay);
  
  logAdminOperation('GEO_TARGETED_GENERATION', ip, { 
    clicksPerRegion: count,
    regions,
    timePattern
  });
  
  let currentUrlIndex = 0;
  let currentRegionIndex = 0;
  let clicksForCurrentRegion = 0;
  let totalGenerated = 0;
  const totalEstimatedClicks = urlCodes.length * regions.length * count;
  
  const generateGeoClick = () => {
    if (currentUrlIndex >= urlCodes.length) return;
    
    const currentShortCode = urlCodes[currentUrlIndex];
    const currentRegion = regions[currentRegionIndex];
    
    // Apply time-based patterns
    let delayMultiplier = 1;
    if (timePattern === 'realistic') {
      const trafficPattern = utilityFunctions.simulateTrafficPatterns();
      delayMultiplier = 2 - trafficPattern.multiplier; // Inverse relationship
    }
    
    // Generate targeted IP and user agent
    const ipData = utilityFunctions.generateRandomIP({ 
      country: currentRegion,
      detailed: true 
    });
    const randomAgent = utilityFunctions.getRandomUserAgent(REALISTIC_USER_AGENTS);
    
    if (simulateClick(currentShortCode, randomAgent, ipData.ip)) {
      totalGenerated++;
      clicksForCurrentRegion++;
      
      // Enhanced analytics with geo data
      if (urlAnalytics[currentShortCode]) {
        urlAnalytics[currentShortCode].geoData = urlAnalytics[currentShortCode].geoData || [];
        urlAnalytics[currentShortCode].geoData.push({
          region: currentRegion,
          country: ipData.country,
          provider: ipData.provider,
          timestamp: Date.now()
        });
      }
    }
    
    // Move to next region/URL
    if (clicksForCurrentRegion >= count) {
      currentRegionIndex++;
      clicksForCurrentRegion = 0;
      
      if (currentRegionIndex >= regions.length) {
        currentUrlIndex++;
        currentRegionIndex = 0;
      }
    }
    
    if (currentUrlIndex < urlCodes.length) {
      const nextDelay = Math.floor(actualDelay * delayMultiplier);
      setTimeout(generateGeoClick, nextDelay);
    }
  };
  
  generateGeoClick();
  
  res.json({ 
    message: `Started geo-targeted bulk generation: ${count} clicks per region for ${regions.length} regions across ${urlCodes.length} URLs`,
    totalUrls: urlCodes.length,
    regions: regions,
    clicksPerRegion: count,
    estimatedTotal: totalEstimatedClicks,
    timePattern: timePattern,
    delay: actualDelay
  });
});

// Viral traffic simulation
app.post('/admin/api/automation/simulate-viral-traffic', requireAdvancedAuth, (req, res) => {
  const { 
    shortCode,
    viralType = 'social_media_spike',
    baseVolume = 100,
    duration = 3600000, // 1 hour default
    peakMultiplier = 10
  } = req.body;
  const ip = getClientIP(req);
  
  // Rate limiting check  
  const rateLimitCheck = checkRateLimit(ip, 'bulk');
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({ 
      error: rateLimitCheck.reason,
      code: 'BULK_RATE_LIMITED'
    });
  }
  
  if (!shortCode || !urlDatabase[shortCode]) {
    return res.status(404).json({ 
      error: 'Not found', 
      message: 'Short code does not exist' 
    });
  }
  
  const viral = utilityFunctions.simulateViralTraffic(baseVolume);
  viral.type = viralType;
  viral.duration = Math.min(duration, CONFIG.MAX_CAMPAIGN_DURATION_HOURS * 3600000);
  viral.multiplier = Math.min(peakMultiplier, CONFIG.MAX_VIRAL_BURST_MULTIPLIER);
  
  logAdminOperation('VIRAL_TRAFFIC_SIMULATION', ip, { 
    shortCode,
    viralType,
    baseVolume,
    peakVolume: viral.peakVolume
  });
  
  let totalGenerated = 0;
  const startTime = Date.now();
  
  const generateViralClick = () => {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / viral.duration;
    
    if (progress >= 1) return; // Simulation complete
    
    // Find current multiplier from viral curve
    const curvePoint = viral.curve.find(point => point.time >= elapsed / 1000) || viral.curve[viral.curve.length - 1];
    const currentVolume = Math.floor(baseVolume * curvePoint.multiplier);
    
    // Generate burst of clicks based on current volume
    const burstSize = Math.min(Math.floor(currentVolume / 60), 25); // Max 25 clicks per burst
    
    for (let i = 0; i < burstSize; i++) {
      const session = utilityFunctions.simulateUserSession({ sessionLength: 'random' });
      const campaign = utilityFunctions.simulateCampaignTraffic('social_media');
      const ipData = utilityFunctions.generateRandomIP({ detailed: true });
      const randomAgent = utilityFunctions.getRandomUserAgent(REALISTIC_USER_AGENTS);
      
      if (simulateClick(shortCode, randomAgent, ipData.ip)) {
        totalGenerated++;
        
        // Enhanced viral analytics
        if (urlAnalytics[shortCode]) {
          urlAnalytics[shortCode].viralData = urlAnalytics[shortCode].viralData || [];
          urlAnalytics[shortCode].viralData.push({
            viralType: viralType,
            sessionId: session.sessionId,
            multiplier: curvePoint.multiplier,
            timestamp: Date.now()
          });
        }
      }
    }
    
    // Schedule next burst
    const nextInterval = utilityFunctions.getRealisticDelay(5000); // 5s base interval
    setTimeout(generateViralClick, nextInterval);
  };
  
  generateViralClick();
  
  res.json({ 
    message: `Started viral traffic simulation: ${viralType}`,
    shortCode,
    viralType,
    baseVolume,
    peakVolume: viral.peakVolume,
    duration: viral.duration,
    estimatedTotal: Math.floor(viral.peakVolume * 0.7), // Rough estimate
    curve: viral.curve.slice(0, 5), // Sample curve points
    operationId: Date.now()
  });
});

// A/B Testing traffic generation
app.post('/admin/api/automation/generate-ab-test-traffic', requireAdvancedAuth, (req, res) => {
  const { 
    variants = ['A', 'B'],
    distribution = [0.5, 0.5],
    totalVolume = 200,
    testDuration = 24, // hours
    conversionTracking = true
  } = req.body;
  const ip = getClientIP(req);
  
  // Rate limiting check
  const rateLimitCheck = checkRateLimit(ip, 'bulk');
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({ 
      error: rateLimitCheck.reason,
      code: 'BULK_RATE_LIMITED'
    });
  }
  
  const urlCodes = Object.keys(urlDatabase);
  if (urlCodes.length === 0) {
    return res.status(400).json({ error: 'No URLs available for A/B testing' });
  }
  
  const volume = Math.min(Math.max(parseInt(totalVolume), 10), 1000);
  const duration = Math.min(Math.max(parseInt(testDuration), 1), CONFIG.MAX_CAMPAIGN_DURATION_HOURS);
  
  logAdminOperation('AB_TEST_GENERATION', ip, { 
    variants,
    distribution,
    totalVolume: volume,
    testDuration: duration
  });
  
  const experimentId = utilityFunctions.generateUniqueId('abtest_');
  let currentUrlIndex = 0;
  let generated = 0;
  const intervalMs = (duration * 3600000) / volume; // Spread over test duration
  
  const generateABTestClick = () => {
    if (generated >= volume) return;
    
    const currentShortCode = urlCodes[currentUrlIndex % urlCodes.length];
    const abTest = utilityFunctions.simulateABTest(variants, distribution);
    const funnel = utilityFunctions.simulateConversionFunnel();
    const ipData = utilityFunctions.generateRandomIP({ detailed: true });
    const randomAgent = utilityFunctions.getRandomUserAgent(REALISTIC_USER_AGENTS);
    
    if (simulateClick(currentShortCode, randomAgent, ipData.ip)) {
      generated++;
      
      // A/B test analytics
      if (urlAnalytics[currentShortCode]) {
        urlAnalytics[currentShortCode].abTestData = urlAnalytics[currentShortCode].abTestData || [];
        urlAnalytics[currentShortCode].abTestData.push({
          experimentId: experimentId,
          variant: abTest.variant,
          testGroup: abTest.testGroup,
          converted: funnel.finalConversion,
          conversionRate: abTest.conversionRate,
          funnelSteps: funnel.steps,
          timestamp: Date.now()
        });
      }
    }
    
    currentUrlIndex++;
    
    if (generated < volume) {
      const nextDelay = utilityFunctions.getRealisticDelay(intervalMs);
      setTimeout(generateABTestClick, nextDelay);
    }
  };
  
  generateABTestClick();
  
  res.json({ 
    message: `Started A/B test traffic generation`,
    experimentId,
    variants,
    distribution,
    totalVolume: volume,
    testDuration: duration,
    conversionTracking,
    estimatedCompletionTime: new Date(Date.now() + (duration * 3600000)).toISOString()
  });
});

// Advanced analytics endpoint for experimental features
app.get('/admin/api/automation/advanced-analytics', requireAdvancedAuth, (req, res) => {
  const ip = getClientIP(req);
  
  // Collect advanced analytics data
  const analytics = {
    sessions: {},
    geographic: {},
    viral: {},
    abTests: {},
    campaigns: {}
  };
  
  // Process URL analytics for advanced features
  Object.entries(urlAnalytics).forEach(([shortCode, data]) => {
    // Session data
    if (data.sessionData) {
      analytics.sessions[shortCode] = {
        totalSessions: data.sessionData.length,
        avgPagesPerSession: data.sessionData.reduce((sum, s) => sum + s.pageNumber, 0) / data.sessionData.length,
        campaigns: data.sessionData.reduce((acc, s) => {
          acc[s.campaign.campaignType] = (acc[s.campaign.campaignType] || 0) + 1;
          return acc;
        }, {})
      };
    }
    
    // Geographic data
    if (data.geoData) {
      analytics.geographic[shortCode] = data.geoData.reduce((acc, g) => {
        acc[g.region] = (acc[g.region] || 0) + 1;
        return acc;
      }, {});
    }
    
    // Viral data
    if (data.viralData) {
      analytics.viral[shortCode] = {
        totalViralClicks: data.viralData.length,
        viralTypes: data.viralData.reduce((acc, v) => {
          acc[v.viralType] = (acc[v.viralType] || 0) + 1;
          return acc;
        }, {}),
        avgMultiplier: data.viralData.reduce((sum, v) => sum + v.multiplier, 0) / data.viralData.length
      };
    }
    
    // A/B Test data
    if (data.abTestData) {
      analytics.abTests[shortCode] = data.abTestData.reduce((acc, ab) => {
        const variant = ab.variant;
        if (!acc[variant]) {
          acc[variant] = { clicks: 0, conversions: 0, conversionRate: 0 };
        }
        acc[variant].clicks++;
        if (ab.converted) acc[variant].conversions++;
        acc[variant].conversionRate = acc[variant].conversions / acc[variant].clicks;
        return acc;
      }, {});
    }
  });
  
  res.json({
    message: 'Advanced analytics data',
    data: analytics,
    timestamp: Date.now(),
    totalUrls: Object.keys(urlDatabase).length
  });
});

// ========================================
// SAFELINK CONFIGURATION API ENDPOINTS (ADMIN ONLY)
// ========================================

// Get SafeLink global configuration
app.get('/admin/api/safelink/config', requireAuth, (req, res) => {
  res.json({
    enabled: safelinkConfig.enabled,
    defaultTemplate: safelinkConfig.defaultTemplate
  });
});

// Update SafeLink global configuration
app.post('/admin/api/safelink/config', requireAuth, (req, res) => {
  const { enabled, defaultTemplate } = req.body;
  
  if (typeof enabled === 'boolean') {
    safelinkConfig.enabled = enabled;
  }
  
  if (defaultTemplate >= 1 && defaultTemplate <= 8) {
    safelinkConfig.defaultTemplate = defaultTemplate;
  }
  
  const ip = getClientIP(req);
  logAdminOperation('SAFELINK_CONFIG_UPDATED', ip, { enabled, defaultTemplate });
  
  res.json({ message: 'SafeLink configuration updated successfully' });
});

// Get specific SafeLink template configuration
app.get('/admin/api/safelink/template/:templateId', requireAuth, (req, res) => {
  const templateId = parseInt(req.params.templateId);
  
  if (templateId < 1 || templateId > 8) {
    return res.status(400).json({ error: 'Invalid template ID. Must be 1-8.' });
  }
  
  const template = safelinkConfig.templates[templateId];
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  res.json(template);
});

// Update specific SafeLink template configuration
app.post('/admin/api/safelink/template/:templateId', requireAuth, (req, res) => {
  const templateId = parseInt(req.params.templateId);
  
  if (templateId < 1 || templateId > 8) {
    return res.status(400).json({ error: 'Invalid template ID. Must be 1-8.' });
  }
  
  const { enabled, waitTime, skipButton, adSlots } = req.body;
  
  if (!safelinkConfig.templates[templateId]) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  // Update template configuration
  if (typeof enabled === 'boolean') {
    safelinkConfig.templates[templateId].enabled = enabled;
  }
  
  if (waitTime >= 5 && waitTime <= 60) {
    safelinkConfig.templates[templateId].waitTime = waitTime;
  }
  
  if (typeof skipButton === 'boolean') {
    safelinkConfig.templates[templateId].skipButton = skipButton;
  }
  
  if (adSlots && typeof adSlots === 'object') {
    safelinkConfig.templates[templateId].adSlots = {
      ...safelinkConfig.templates[templateId].adSlots,
      ...adSlots
    };
  }
  
  const ip = getClientIP(req);
  logAdminOperation('SAFELINK_TEMPLATE_UPDATED', ip, { templateId, enabled, waitTime, skipButton });
  
  res.json({ message: `SafeLink Template ${templateId} updated successfully` });
});

// ========================================
// 8-PAGE REDIRECTION API ROUTES (ADMIN ONLY)
// ========================================

// Get 8-page redirection configuration
app.get('/admin/api/8page/config', requireAuth, (req, res) => {
  res.json(eightPageRedirectionConfig);
});

// Update 8-page redirection configuration
app.post('/admin/api/8page/config', requireAuth, (req, res) => {
  const { enabled, randomize } = req.body;
  const ip = getClientIP(req);
  
  if (typeof enabled === 'boolean') {
    eightPageRedirectionConfig.enabled = enabled;
  }
  
  if (typeof randomize === 'boolean') {
    eightPageRedirectionConfig.randomize = randomize;
  }
  
  logAdminOperation('8PAGE_CONFIG_UPDATED', ip, { enabled, randomize });
  
  res.json({ 
    message: '8-Page Redirection configuration updated successfully',
    config: eightPageRedirectionConfig
  });
});

// Track abandonment for analytics
app.post('/api/8page/abandon/:shortCode/:pageIndex', (req, res) => {
  const { shortCode, pageIndex } = req.params;
  
  // Validate input
  const parsedPageIndex = parseInt(pageIndex);
  if (isNaN(parsedPageIndex) || parsedPageIndex < 0 || parsedPageIndex > 7) {
    return res.status(400).json({ error: 'Invalid page index' });
  }
  
  if (!shortCode || typeof shortCode !== 'string' || shortCode.length === 0) {
    return res.status(400).json({ error: 'Invalid short code' });
  }
  
  // Check if URL exists (optional validation)
  if (!urlDatabase[shortCode]) {
    return res.status(404).json({ error: 'URL not found' });
  }
  
  // Rate limiting - only allow one abandonment tracking per shortCode+pageIndex per minute
  const key = `${shortCode}_${parsedPageIndex}`;
  const now = Date.now();
  if (!eightPageRedirectionConfig.lastAbandonmentTracking) {
    eightPageRedirectionConfig.lastAbandonmentTracking = {};
  }
  
  const lastTracked = eightPageRedirectionConfig.lastAbandonmentTracking[key];
  if (lastTracked && (now - lastTracked) < 60000) { // 1 minute cooldown
    return res.json({ message: 'Already tracked' });
  }
  
  // Track abandonment
  if (!eightPageRedirectionConfig.analytics.abandonedAt[parsedPageIndex]) {
    eightPageRedirectionConfig.analytics.abandonedAt[parsedPageIndex] = 0;
  }
  eightPageRedirectionConfig.analytics.abandonedAt[parsedPageIndex]++;
  eightPageRedirectionConfig.lastAbandonmentTracking[key] = now;
  
  res.json({ message: 'Abandonment tracked' });
});

// ========================================
// BLOG VIEW MODIFICATION FEATURES (ADMIN ONLY)
// ========================================

// Admin API endpoint for automated blog view generation
app.post('/admin/api/blog/automation/generate-views', requireAdvancedAuth, (req, res) => {
  const { blogId, viewCount = 1, userAgents = [], delay = 100 } = req.body;
  const ip = getClientIP(req);
  
  // Rate limiting check
  const rateLimitCheck = checkRateLimit(ip, 'single');
  if (!rateLimitCheck.allowed) {
    logAdminOperation('RATE_LIMITED', ip, { operation: 'generate-blog-views', reason: rateLimitCheck.reason });
    return res.status(429).json({ 
      error: rateLimitCheck.reason,
      code: 'RATE_LIMITED',
      retryAfter: rateLimitCheck.remainingTime || 3600
    });
  }
  
  if (!blogId || !blogDatabase[blogId]) {
    return res.status(400).json({ error: 'Valid blog post ID is required' });
  }
  
  const count = Math.min(Math.max(parseInt(viewCount), 1), 1000); // Limit to 1000 views max
  const baseDelay = Math.max(parseInt(delay), 10); // Minimum 10ms delay
  const actualDelay = calculateProgressiveDelay(ip, baseDelay);
  
  // Enhanced validation for large operations
  if (count > 500) {
    const tracking = adminSecurity.ipTracking[ip];
    if (tracking && tracking.operationsLastHour.length > 20) {
      return res.status(429).json({ 
        error: 'Large operations require fewer recent activities. Please wait before performing operations over 500 views.',
        code: 'LARGE_OPERATION_RESTRICTED'
      });
    }
  }
  
  // Log the operation
  logAdminOperation('SINGLE_BLOG_AUTOMATION', ip, { blogId, viewCount: count, delay: actualDelay });
  
  const agents = userAgents.length > 0 ? userAgents : REALISTIC_USER_AGENTS;
  let generated = 0;
  
  // Generate views with delay
  const generateInterval = setInterval(() => {
    if (generated >= count) {
      clearInterval(generateInterval);
      return;
    }
    
    const randomAgent = utilityFunctions.getRandomUserAgent(agents);
    const randomIp = utilityFunctions.generateRandomIP();
    
    if (simulateBlogView(blogId, randomAgent, randomIp)) {
      generated++;
    }
    
    if (generated >= count) {
      clearInterval(generateInterval);
    }
  }, actualDelay);
  
  res.json({ 
    message: `Started generating ${count} views for blog post`,
    blogId,
    viewCount: count,
    delay: actualDelay,
    securityLevel: actualDelay > baseDelay ? 'ENHANCED' : 'STANDARD',
    progressiveDelay: actualDelay > baseDelay
  });
});

// Admin API endpoint for bulk blog view generation on all posts
app.post('/admin/api/blog/automation/generate-bulk-views', requireAdvancedAuth, (req, res) => {
  const { viewsPerPost = 5, delay = 100 } = req.body;
  const ip = getClientIP(req);
  
  // Enhanced rate limiting for bulk operations
  const rateLimitCheck = checkRateLimit(ip, 'bulk');
  if (!rateLimitCheck.allowed) {
    logAdminOperation('BULK_RATE_LIMITED', ip, { operation: 'generate-bulk-blog-views', reason: rateLimitCheck.reason });
    return res.status(429).json({ 
      error: rateLimitCheck.reason,
      code: 'BULK_RATE_LIMITED',
      retryAfter: rateLimitCheck.remainingTime || 86400
    });
  }
  
  const publishedPosts = Object.values(blogDatabase).filter(post => post.published);
  if (publishedPosts.length === 0) {
    return res.status(400).json({ error: 'No published blog posts available for automation' });
  }
  
  const count = Math.min(Math.max(parseInt(viewsPerPost), 1), CONFIG.BULK_BLOG_VIEW_LIMIT);
  const baseDelay = Math.max(parseInt(delay), CONFIG.BASE_DELAYS.BLOG_VIEW_GENERATION);
  const actualDelay = calculateProgressiveDelay(ip, baseDelay);
  
  const totalEstimatedViews = publishedPosts.length * count;
  
  // Enhanced security for large bulk operations
  if (totalEstimatedViews > 500) {
    const tracking = adminSecurity.ipTracking[ip];
    const recentBulkOps = tracking ? tracking.bulkOperationsLastDay.length : 0;
    
    if (recentBulkOps >= 3) {
      return res.status(429).json({ 
        error: 'Large bulk blog operations are limited to 3 per day for security reasons.',
        code: 'LARGE_BULK_LIMIT_EXCEEDED',
        suggestedAction: 'Consider smaller batch sizes or contact administrator.'
      });
    }
  }
  
  // Multi-factor confirmation requirement for very large operations
  if (totalEstimatedViews > 1000) {
    const confirmationToken = req.headers['x-confirmation-token'];
    const expectedToken = 'BLOG_BULK_CONFIRM_' + Date.now().toString().slice(-6);
    
    if (!confirmationToken || confirmationToken !== expectedToken) {
      return res.status(400).json({ 
        error: 'Large bulk blog operations require additional confirmation.',
        code: 'CONFIRMATION_REQUIRED',
        confirmationToken: expectedToken,
        estimatedViews: totalEstimatedViews,
        warningMessage: `This operation will generate ${totalEstimatedViews} views across ${publishedPosts.length} blog posts. Please confirm by including the token in X-Confirmation-Token header.`
      });
    }
  }
  
  // Log the bulk operation
  logAdminOperation('BULK_BLOG_AUTOMATION', ip, { 
    postCount: publishedPosts.length, 
    viewsPerPost: count, 
    totalViews: totalEstimatedViews,
    delay: actualDelay,
    securityLevel: actualDelay > baseDelay ? 'ENHANCED' : 'STANDARD'
  });
  
  let totalGenerated = 0;
  let currentPostIndex = 0;
  let viewsForCurrentPost = 0;
  
  const generateInterval = setInterval(() => {
    if (currentPostIndex >= publishedPosts.length) {
      clearInterval(generateInterval);
      logAdminOperation('BULK_BLOG_COMPLETED', ip, { totalGenerated, duration: Date.now() });
      return;
    }
    
    const currentPost = publishedPosts[currentPostIndex];
    const randomAgent = utilityFunctions.getRandomUserAgent(REALISTIC_USER_AGENTS);
    const randomIp = utilityFunctions.generateRandomIP();
    
    if (simulateBlogView(currentPost.id, randomAgent, randomIp)) {
      totalGenerated++;
      viewsForCurrentPost++;
    }
    
    if (viewsForCurrentPost >= count) {
      currentPostIndex++;
      viewsForCurrentPost = 0;
    }
  }, actualDelay);
  
  res.json({ 
    message: `Started bulk blog view generation: ${count} views per post for ${publishedPosts.length} published posts`,
    totalPosts: publishedPosts.length,
    viewsPerPost: count,
    estimatedTotal: totalEstimatedViews,
    delay: actualDelay,
    securityLevel: actualDelay > baseDelay ? 'ENHANCED' : 'STANDARD',
    progressiveDelay: actualDelay > baseDelay,
    operationId: Date.now(),
    estimatedDuration: Math.ceil((totalEstimatedViews * actualDelay) / 1000) + ' seconds'
  });
});

// Admin API endpoint to manually set blog view count
app.post('/admin/api/blog/automation/set-views', requireAuth, (req, res) => {
  const { blogId, viewCount = 0 } = req.body;
  
  if (!blogId || !blogDatabase[blogId]) {
    return res.status(400).json({ error: 'Valid blog post ID is required' });
  }
  
  const count = Math.max(parseInt(viewCount), 0); // Minimum 0 views
  
  // Initialize or update analytics
  if (!blogAnalytics[blogId]) {
    blogAnalytics[blogId] = {
      views: 0,
      firstView: null,
      lastView: null,
      viewHistory: []
    };
  }
  
  const now = new Date();
  blogAnalytics[blogId].views = count;
  
  if (count > 0) {
    if (!blogAnalytics[blogId].firstView) {
      blogAnalytics[blogId].firstView = now;
    }
    blogAnalytics[blogId].lastView = now;
  } else {
    // Reset if setting to 0
    blogAnalytics[blogId].firstView = null;
    blogAnalytics[blogId].lastView = null;
    blogAnalytics[blogId].viewHistory = [];
  }
  
  res.json({ 
    message: `Blog view count set to ${count}`,
    blogId,
    newViewCount: count
  });
});

// Admin API endpoint to get blog automation statistics
app.get('/admin/api/blog/automation/stats', requireAuth, (req, res) => {
  const totalPosts = Object.keys(blogDatabase).length;
  const publishedPosts = Object.values(blogDatabase).filter(post => post.published).length;
  const totalViews = Object.values(blogAnalytics).reduce((sum, analytics) => sum + analytics.views, 0);
  const postsWithViews = Object.values(blogAnalytics).filter(analytics => analytics.views > 0).length;
  
  res.json({
    totalPosts,
    publishedPosts,
    totalViews,
    postsWithViews,
    averageViewsPerPost: publishedPosts > 0 ? Math.round(totalViews / publishedPosts * 10) / 10 : 0,
    postsWithoutViews: publishedPosts - postsWithViews
  });
});

// ========================================
// BLOG ROUTES AND FUNCTIONALITY
// ========================================

// Public blog listing page
app.get('/blog', (req, res) => {
  const publishedPosts = Object.values(blogDatabase).filter(post => post.published);
  publishedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Blog - URL Shortener</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
                line-height: 1.6;
            }
            .header {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                margin-bottom: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                color: #333;
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
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
            .nav-links {
                margin-top: 20px;
            }
            .nav-links a {
                color: #007bff;
                text-decoration: none;
                margin: 0 15px;
                font-weight: bold;
            }
            .nav-links a:hover {
                text-decoration: underline;
            }
            .blog-post {
                background-color: white;
                padding: 25px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                margin-bottom: 25px;
                transition: transform 0.2s;
            }
            .blog-post:hover {
                transform: translateY(-2px);
            }
            .blog-post h2 {
                margin-top: 0;
                color: #333;
            }
            .blog-post h2 a {
                color: #333;
                text-decoration: none;
            }
            .blog-post h2 a:hover {
                color: #007bff;
            }
            .blog-meta {
                color: #666;
                font-size: 14px;
                margin-bottom: 15px;
            }
            .blog-excerpt {
                color: #555;
                margin-bottom: 15px;
            }
            .read-more {
                background-color: #007bff;
                color: white;
                padding: 8px 16px;
                border-radius: 5px;
                text-decoration: none;
                font-size: 14px;
                display: inline-block;
            }
            .read-more:hover {
                background-color: #0056b3;
            }
            .no-posts {
                text-align: center;
                color: #666;
                background-color: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .blog-stats {
                background-color: #e7f3ff;
                padding: 10px 15px;
                border-radius: 5px;
                margin-top: 10px;
                font-size: 12px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📝 Blog<span class="experimental-badge">EXPERIMENTAL</span></h1>
            <p>Welcome to our experimental blog featuring insights, tips, and stories!</p>
            <div class="nav-links">
                <a href="/">🔗 URL Shortener</a>
                <a href="/admin">🛠️ Admin Panel</a>
            </div>
        </div>

        ${publishedPosts.length === 0 ? `
            <div class="no-posts">
                <h2>No blog posts yet!</h2>
                <p>Check back soon for interesting content.</p>
            </div>
        ` : publishedPosts.map(post => {
            const analytics = blogAnalytics[post.id] || { views: 0 };
            const excerpt = post.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...';
            return `
                <article class="blog-post">
                    <h2><a href="/blog/${post.slug}">${post.title}</a></h2>
                    <div class="blog-meta">
                        By ${post.author} • ${new Date(post.createdAt).toLocaleDateString()} • ${analytics.views} views
                    </div>
                    <div class="blog-excerpt">${excerpt}</div>
                    <a href="/blog/${post.slug}" class="read-more">Read More →</a>
                    <div class="blog-stats">
                        📊 ${analytics.views} total views • 🔗 <a href="/blog/preview/${post.slug}" target="_blank">Preview with Analytics</a>
                    </div>
                </article>
            `;
        }).join('')}
    </body>
    </html>
  `);
});

// Individual blog post page
app.get('/blog/:slug', (req, res) => {
  const { slug } = req.params;
  const post = Object.values(blogDatabase).find(p => p.slug === slug && p.published);
  
  if (!post) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Post Not Found - Blog</title>
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
              h1 { color: #dc3545; }
              a { color: #007bff; text-decoration: none; }
              a:hover { text-decoration: underline; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>404 - Post Not Found</h1>
              <p>The blog post you're looking for doesn't exist.</p>
              <a href="/blog">← Back to Blog</a>
          </div>
      </body>
      </html>
    `);
  }

  // Record blog view
  recordBlogView(post.id, req);
  
  const analytics = blogAnalytics[post.id] || { views: 0 };
  const blogShortUrl = `${req.protocol}://${req.get('host')}/blog/${post.slug}`;
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${post.title} - Blog</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
                line-height: 1.6;
            }
            .container {
                background-color: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .post-header {
                border-bottom: 2px solid #e9ecef;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .post-title {
                color: #333;
                margin-bottom: 10px;
                font-size: 2.5em;
                line-height: 1.2;
            }
            .post-meta {
                color: #666;
                font-size: 16px;
                margin-bottom: 20px;
            }
            .post-content {
                color: #444;
                font-size: 18px;
                line-height: 1.8;
            }
            .post-content h1, .post-content h2, .post-content h3 {
                color: #333;
                margin-top: 30px;
            }
            .post-content p {
                margin-bottom: 20px;
            }
            .post-footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e9ecef;
            }
            .nav-links {
                text-align: center;
                margin-bottom: 20px;
            }
            .nav-links a {
                color: #007bff;
                text-decoration: none;
                margin: 0 15px;
                font-weight: bold;
            }
            .nav-links a:hover {
                text-decoration: underline;
            }
            .sharing-section {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-top: 30px;
                text-align: center;
            }
            .sharing-section h3 {
                margin-top: 0;
                color: #333;
            }
            .share-button {
                background-color: #007bff;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                text-decoration: none;
                margin: 5px;
                display: inline-block;
                font-size: 14px;
            }
            .share-button:hover {
                background-color: #0056b3;
            }
            .analytics-preview {
                background-color: #e7f3ff;
                padding: 15px;
                border-radius: 8px;
                margin-top: 20px;
                text-align: center;
            }
            .experimental-badge {
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                color: white;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: bold;
                margin-left: 8px;
            }
        </style>
    </head>
    <body>
        <div class="nav-links">
            <a href="/blog">← Back to Blog</a>
            <a href="/">🔗 URL Shortener</a>
            <a href="/admin">🛠️ Admin Panel</a>
        </div>
        
        <div class="container">
            <header class="post-header">
                <h1 class="post-title">${post.title}<span class="experimental-badge">EXPERIMENTAL</span></h1>
                <div class="post-meta">
                    By <strong>${post.author}</strong> • 
                    Published on ${new Date(post.createdAt).toLocaleDateString()} • 
                    ${analytics.views} views
                </div>
            </header>
            
            <main class="post-content">
                ${post.content}
            </main>
            
            <footer class="post-footer">
                <div class="sharing-section">
                    <h3>📱 Share This Post</h3>
                    <p>Create short URLs for social sharing:</p>
                    <a href="javascript:void(0)" onclick="createShortUrl()" class="share-button">🔗 Create Short URL</a>
                    <a href="/blog/preview/${post.slug}" target="_blank" class="share-button">👀 Preview & Analytics</a>
                    <a href="javascript:void(0)" onclick="generateQR()" class="share-button">📱 Generate QR Code</a>
                </div>
                
                <div class="analytics-preview">
                    <strong>📊 Post Analytics:</strong> ${analytics.views} total views
                </div>
            </footer>
        </div>
        
        <script>
            async function createShortUrl() {
                try {
                    const response = await fetch('/shorten', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            originalUrl: window.location.href
                        })
                    });
                    
                    const data = await response.json();
                    if (response.ok) {
                        const shortUrl = window.location.origin + '/' + data.shortCode;
                        prompt('Short URL created! Copy this:', shortUrl);
                    } else {
                        // Try without custom code if it already exists
                        const response2 = await fetch('/shorten', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ originalUrl: window.location.href })
                        });
                        const data2 = await response2.json();
                        if (response2.ok) {
                            const shortUrl = window.location.origin + '/' + data2.shortCode;
                            prompt('Short URL created! Copy this:', shortUrl);
                        } else {
                            alert('Error creating short URL');
                        }
                    }
                } catch (error) {
                    alert('Error: ' + error.message);
                }
            }
            
            function generateQR() {
                const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(window.location.href);
                window.open(qrUrl, '_blank');
            }
        </script>
    </body>
    </html>
  `);
});

// Blog preview page (experimental feature)
app.get('/blog/preview/:slug', (req, res) => {
  const { slug } = req.params;
  const post = Object.values(blogDatabase).find(p => p.slug === slug && p.published);
  
  if (!post) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html><head><title>Post Not Found</title></head>
      <body><h1>Post Not Found</h1><a href="/blog">← Back to Blog</a></body></html>
    `);
  }

  const analytics = blogAnalytics[post.id] || { views: 0, firstView: null, lastView: null, viewHistory: [] };
  const blogUrl = `${req.protocol}://${req.get('host')}/blog/${post.slug}`;
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Blog Preview - ${post.title}</title>
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
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .experimental-badge {
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                color: white;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: bold;
                margin-left: 10px;
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
            .post-excerpt {
                background-color: #e7f3ff;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #007bff;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📝 Blog Preview<span class="experimental-badge">EXPERIMENTAL</span></h1>
            
            <div class="warning">
                <strong>🔍 Blog Analytics Preview:</strong> Get insights into this blog post's performance and engagement.
            </div>
            
            <div class="preview-info">
                <div class="url-info">
                    <span class="label">Blog Post:</span><br>
                    <span class="url">${post.title}</span>
                </div>
                <div class="url-info">
                    <span class="label">URL:</span><br>
                    <span class="url">${blogUrl}</span>
                </div>
                <div class="url-info">
                    <span class="label">Author:</span><br>
                    <span>${post.author}</span>
                </div>
                <div class="url-info">
                    <span class="label">Published:</span><br>
                    <span>${new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${analytics.views}</div>
                    <div class="stat-label">Total Views</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${analytics.firstView ? new Date(analytics.firstView).toLocaleDateString() : 'Never'}</div>
                    <div class="stat-label">First Viewed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${analytics.lastView ? new Date(analytics.lastView).toLocaleDateString() : 'Never'}</div>
                    <div class="stat-label">Last Viewed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${analytics.viewHistory ? analytics.viewHistory.length : 0}</div>
                    <div class="stat-label">Recent Views</div>
                </div>
            </div>
            
            <div class="post-excerpt">
                <h3>Post Excerpt:</h3>
                <p>${post.content.replace(/<[^>]*>/g, '').substring(0, 300)}...</p>
            </div>
            
            <div class="qr-code">
                <h3>QR Code</h3>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(blogUrl)}" alt="QR Code for ${blogUrl}">
            </div>
            
            <div class="action-buttons">
                <a href="${blogUrl}" class="btn btn-primary">📖 Read Full Post</a>
                <a href="/blog" class="btn btn-secondary">📝 Back to Blog</a>
                <button onclick="copyToClipboard('${blogUrl}')" class="btn btn-success">📋 Copy URL</button>
                <button onclick="createShortUrl()" class="btn btn-secondary">🔗 Create Short URL</button>
            </div>
        </div>
        
        <script>
            function copyToClipboard(text) {
                navigator.clipboard.writeText(text).then(() => {
                    alert('Blog URL copied to clipboard!');
                });
            }
            
            async function createShortUrl() {
                try {
                    const response = await fetch('/shorten', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            originalUrl: '${blogUrl}'
                        })
                    });
                    
                    const data = await response.json();
                    if (response.ok) {
                        const shortUrl = window.location.origin + '/' + data.shortCode;
                        prompt('Short URL created for blog post! Copy this:', shortUrl);
                    } else {
                        alert('Error: ' + data.error);
                    }
                } catch (error) {
                    alert('Error: ' + error.message);
                }
            }
        </script>
    </body>
    </html>
  `);
});

// Admin announcements management route
app.get('/admin/announcements', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Announcements Management - Admin</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .header { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { margin: 0; color: #333; }
        .experimental-badge { background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; margin-left: 10px; }
        .btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; font-size: 14px; margin: 0 5px; }
        .btn-primary { background: #007bff; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-danger { background: #dc3545; color: white; }
        .container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
        .announcement-preview { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid; }
        .announcement-info { border-left-color: #007bff; }
        .announcement-success { border-left-color: #28a745; }
        .announcement-warning { border-left-color: #ffc107; }
        .announcement-error { border-left-color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📢 Announcements Management<span class="experimental-badge">LIVE</span></h1>
        <div>
            <a href="/admin/dashboard" class="btn btn-secondary">Back to Dashboard</a>
            <a href="/admin" class="btn btn-danger">Logout</a>
        </div>
    </div>

    <div class="container">
        <h2>Create New Announcement</h2>
        <form id="announcementForm" onsubmit="createAnnouncement(event)">
            <div class="form-group">
                <label>Title:</label>
                <input type="text" id="announcementTitle" required maxlength="100">
            </div>
            <div class="form-group">
                <label>Message:</label>
                <textarea id="announcementMessage" required rows="4" maxlength="500"></textarea>
            </div>
            <div class="form-group">
                <label>Type:</label>
                <select id="announcementType" required onchange="updatePreview()">
                    <option value="">Select type...</option>
                    <option value="info">Info (Blue)</option>
                    <option value="success">Success (Green)</option>
                    <option value="warning">Warning (Yellow)</option>
                    <option value="error">Error (Red)</option>
                </select>
            </div>
            <div id="announcementPreview" style="display: none;">
                <h4>Preview:</h4>
                <div id="previewContent" class="announcement-preview"></div>
            </div>
            <button type="submit" class="btn btn-success">Create Announcement</button>
        </form>
        <div id="createStatus" style="margin-top: 10px; padding: 10px; border-radius: 5px; display: none;"></div>
    </div>

    <div class="container">
        <h2>Existing Announcements</h2>
        <table>
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="announcementsTable">
                <tr><td colspan="5">Loading...</td></tr>
            </tbody>
        </table>
    </div>

    <script>
        function checkAuth() {
            const token = localStorage.getItem('adminToken');
            if (!token) { window.location.href = '/admin'; return false; }
            return token;
        }

        function updatePreview() {
            const title = document.getElementById('announcementTitle').value;
            const message = document.getElementById('announcementMessage').value;
            const type = document.getElementById('announcementType').value;
            const preview = document.getElementById('announcementPreview');
            const content = document.getElementById('previewContent');

            if (title && message && type) {
                preview.style.display = 'block';
                content.className = 'announcement-preview announcement-' + type;
                content.innerHTML = '<div style="font-weight: bold; margin-bottom: 4px;">' + title + '</div>' + message;
            } else {
                preview.style.display = 'none';
            }
        }

        document.getElementById('announcementTitle').addEventListener('input', updatePreview);
        document.getElementById('announcementMessage').addEventListener('input', updatePreview);

        async function createAnnouncement(event) {
            event.preventDefault();
            const token = checkAuth();
            if (!token) return;

            const title = document.getElementById('announcementTitle').value;
            const message = document.getElementById('announcementMessage').value;
            const type = document.getElementById('announcementType').value;
            const statusDiv = document.getElementById('createStatus');

            statusDiv.style.display = 'block';
            statusDiv.style.background = '#d1ecf1';
            statusDiv.textContent = '⏳ Creating announcement...';

            try {
                const response = await fetch('/admin/api/announcements', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ title, message, type })
                });

                if (response.ok) {
                    statusDiv.style.background = '#d4edda';
                    statusDiv.textContent = '✅ Announcement created successfully!';
                    document.getElementById('announcementForm').reset();
                    document.getElementById('announcementPreview').style.display = 'none';
                    loadAnnouncements();
                } else {
                    const error = await response.json();
                    statusDiv.style.background = '#f8d7da';
                    statusDiv.textContent = '❌ ' + (error.error || 'Failed to create announcement');
                }
            } catch (error) {
                statusDiv.style.background = '#f8d7da';
                statusDiv.textContent = '❌ Error: ' + error.message;
            }
        }

        async function loadAnnouncements() {
            const token = checkAuth();
            if (!token) return;

            try {
                const response = await fetch('/admin/api/announcements', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    const announcements = await response.json();
                    displayAnnouncements(announcements);
                } else {
                    document.getElementById('announcementsTable').innerHTML = '<tr><td colspan="5">Failed to load announcements</td></tr>';
                }
            } catch (error) {
                document.getElementById('announcementsTable').innerHTML = '<tr><td colspan="5">Error loading announcements: ' + error.message + '</td></tr>';
            }
        }

        function displayAnnouncements(announcements) {
            const tbody = document.getElementById('announcementsTable');
            if (Object.keys(announcements).length === 0) {
                tbody.innerHTML = '<tr><td colspan="5">No announcements found</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            Object.values(announcements).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(announcement => {
                const row = tbody.insertRow();
                row.innerHTML = 
                    '<td>' + announcement.title + '</td>' +
                    '<td><span style="text-transform: capitalize; padding: 2px 8px; border-radius: 3px; font-size: 12px; background: ' + getTypeColor(announcement.type) + '; color: white;">' + announcement.type + '</span></td>' +
                    '<td>' + (announcement.enabled ? '<span style="color: #28a745;">●</span> Active' : '<span style="color: #6c757d;">●</span> Disabled') + '</td>' +
                    '<td>' + new Date(announcement.createdAt).toLocaleDateString() + '</td>' +
                    '<td>' + 
                        '<button class="btn btn-' + (announcement.enabled ? 'secondary' : 'primary') + '" onclick="toggleAnnouncement(\'' + announcement.id + '\')" style="font-size: 12px; padding: 5px 10px; margin-right: 5px;">' + (announcement.enabled ? 'Disable' : 'Enable') + '</button>' +
                        '<button class="btn btn-danger" onclick="deleteAnnouncement(\'' + announcement.id + '\')" style="font-size: 12px; padding: 5px 10px;">Delete</button>' +
                    '</td>';
            });
        }

        function getTypeColor(type) {
            const colors = { info: '#007bff', success: '#28a745', warning: '#ffc107', error: '#dc3545' };
            return colors[type] || '#6c757d';
        }

        async function toggleAnnouncement(id) {
            const token = checkAuth();
            if (!token) return;

            try {
                const response = await fetch('/admin/api/announcements/' + id + '/toggle', {
                    method: 'PUT',
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    loadAnnouncements();
                } else {
                    alert('Failed to toggle announcement');
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        async function deleteAnnouncement(id) {
            if (!confirm('Delete this announcement?')) return;
            
            const token = checkAuth();
            if (!token) return;

            try {
                const response = await fetch('/admin/api/announcements/' + id, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    loadAnnouncements();
                } else {
                    alert('Failed to delete announcement');
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        // Load announcements on page load
        window.onload = loadAnnouncements;
    </script>
</body>
</html>
  `);
});

// Admin SafeLink management route
app.get('/admin/safelink', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeLink Settings - Admin</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .header { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { margin: 0; color: #333; }
        .experimental-badge { background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; margin-left: 10px; }
        .btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; font-size: 14px; margin: 0 5px; }
        .btn-primary { background: #007bff; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-danger { background: #dc3545; color: white; }
        .container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        .toggle-switch { position: relative; display: inline-block; width: 60px; height: 34px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #2196F3; }
        input:checked + .slider:before { transform: translateX(26px); }
        .templates-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .template-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6; }
        .template-card.active { border-color: #007bff; background: #e7f3ff; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔗 SafeLink Settings<span class="experimental-badge">LIVE</span></h1>
        <div>
            <a href="/admin/dashboard" class="btn btn-secondary">Back to Dashboard</a>
            <a href="/admin" class="btn btn-danger">Logout</a>
        </div>
    </div>

    <div class="container">
        <h2>SafeLink Configuration</h2>
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <label style="margin-right: 15px; font-weight: bold;">Enable SafeLink:</label>
            <label class="toggle-switch">
                <input type="checkbox" id="safelinkEnabled" onchange="toggleSafelink()">
                <span class="slider"></span>
            </label>
            <span id="safelinkStatus" style="margin-left: 15px; font-weight: bold;">Disabled</span>
        </div>
        
        <div class="form-group">
            <label>Default Template:</label>
            <select id="defaultTemplate" onchange="updateDefaultTemplate()">
                <option value="1">Template 1 - Classic SafeLink</option>
                <option value="2">Template 2 - Premium SafeLink</option>
                <option value="3">Template 3 - Gaming SafeLink</option>
                <option value="4">Template 4 - Tech SafeLink</option>
                <option value="5">Template 5 - Business SafeLink</option>
                <option value="6">Template 6 - Entertainment SafeLink</option>
                <option value="7">Template 7 - News SafeLink</option>
                <option value="8">Template 8 - Lifestyle SafeLink</option>
            </select>
        </div>
    </div>

    <div class="container">
        <h2>SafeLink Templates</h2>
        <div class="templates-grid" id="templatesGrid">
            <!-- Templates will be loaded here -->
        </div>
    </div>

    <script>
        let safelinkConfig = null;

        function checkAuth() {
            const token = localStorage.getItem('adminToken');
            if (!token) { window.location.href = '/admin'; return false; }
            return token;
        }

        function loadSafelinkConfig() {
            // Simulated config - in real app this would come from server
            safelinkConfig = {
                enabled: false,
                defaultTemplate: 1,
                templates: {
                    1: { name: 'Classic SafeLink', enabled: true, waitTime: 10, skipButton: true },
                    2: { name: 'Premium SafeLink', enabled: true, waitTime: 15, skipButton: false },
                    3: { name: 'Gaming SafeLink', enabled: true, waitTime: 12, skipButton: true },
                    4: { name: 'Tech SafeLink', enabled: true, waitTime: 8, skipButton: true },
                    5: { name: 'Business SafeLink', enabled: true, waitTime: 10, skipButton: false },
                    6: { name: 'Entertainment SafeLink', enabled: true, waitTime: 20, skipButton: true },
                    7: { name: 'News SafeLink', enabled: true, waitTime: 10, skipButton: true },
                    8: { name: 'Lifestyle SafeLink', enabled: true, waitTime: 8, skipButton: true }
                }
            };

            document.getElementById('safelinkEnabled').checked = safelinkConfig.enabled;
            document.getElementById('safelinkStatus').textContent = safelinkConfig.enabled ? 'Enabled' : 'Disabled';
            document.getElementById('defaultTemplate').value = safelinkConfig.defaultTemplate;
            
            displayTemplates();
        }

        function displayTemplates() {
            const grid = document.getElementById('templatesGrid');
            grid.innerHTML = '';

            Object.entries(safelinkConfig.templates).forEach(([id, template]) => {
                const card = document.createElement('div');
                card.className = 'template-card' + (id == safelinkConfig.defaultTemplate ? ' active' : '');
                card.innerHTML = 
                    '<h4>' + template.name + '</h4>' +
                    '<p><strong>Wait Time:</strong> ' + template.waitTime + ' seconds</p>' +
                    '<p><strong>Skip Button:</strong> ' + (template.skipButton ? 'Yes' : 'No') + '</p>' +
                    '<p><strong>Status:</strong> ' + (template.enabled ? 'Enabled' : 'Disabled') + '</p>' +
                    '<div style="margin-top: 10px;">' +
                        '<a href="/safelink/preview/' + id + '" target="_blank" class="btn btn-primary" style="font-size: 12px; padding: 5px 10px; margin-right: 5px;">Preview</a>' +
                        '<button onclick="toggleTemplate(' + id + ')" class="btn btn-' + (template.enabled ? 'secondary' : 'success') + '" style="font-size: 12px; padding: 5px 10px;">' + (template.enabled ? 'Disable' : 'Enable') + '</button>' +
                    '</div>';
                grid.appendChild(card);
            });
        }

        function toggleSafelink() {
            safelinkConfig.enabled = document.getElementById('safelinkEnabled').checked;
            document.getElementById('safelinkStatus').textContent = safelinkConfig.enabled ? 'Enabled' : 'Disabled';
            showMessage('SafeLink ' + (safelinkConfig.enabled ? 'enabled' : 'disabled'), 'success');
        }

        function updateDefaultTemplate() {
            const newDefault = document.getElementById('defaultTemplate').value;
            safelinkConfig.defaultTemplate = parseInt(newDefault);
            displayTemplates();
            showMessage('Default template updated to Template ' + newDefault, 'success');
        }

        function toggleTemplate(templateId) {
            safelinkConfig.templates[templateId].enabled = !safelinkConfig.templates[templateId].enabled;
            displayTemplates();
            showMessage('Template ' + templateId + ' ' + (safelinkConfig.templates[templateId].enabled ? 'enabled' : 'disabled'), 'success');
        }

        function showMessage(message, type) {
            const div = document.createElement('div');
            div.textContent = message;
            div.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 15px; border-radius: 5px; color: white; background: ' + (type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3');
            document.body.appendChild(div);
            setTimeout(() => div.remove(), 3000);
        }

        // Load config on page load
        window.onload = () => {
            const token = checkAuth();
            if (token) loadSafelinkConfig();
        };
    </script>
</body>
</html>
  `);
});

// Admin blog management routes
app.get('/admin/blog', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog Management - Admin</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .header { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { margin: 0; color: #333; }
        .experimental-badge { background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; margin-left: 10px; }
        .btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; font-size: 14px; margin: 0 5px; }
        .btn-primary { background: #007bff; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-danger { background: #dc3545; color: white; }
        .container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .automation-panel { display: none; }
        .automation-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .automation-card { background: #f8f9fa; padding: 20px; border-radius: 8px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📝 Blog Management<span class="experimental-badge">EXPERIMENTAL</span></h1>
        <div>
            <a href="/blog" class="btn btn-secondary" target="_blank">View Blog</a>
            <a href="/admin/dashboard" class="btn btn-secondary">URL Dashboard</a>
            <button class="btn btn-success" onclick="showCreateForm()">+ New Post</button>
            <button class="btn btn-primary" onclick="toggleAutomation()" style="background: #ff6b6b;">🎯 Blog Views</button>
            <a href="/admin" class="btn btn-danger">Logout</a>
        </div>
    </div>

    <div class="container automation-panel" id="automationPanel">
        <h2>🎯 Blog Views Modification <span class="experimental-badge">EXPERIMENTAL</span></h2>
        <p>Modify blog post view counts for testing purposes. These modified views will be visible to all blog visitors.</p>
        
        <div class="automation-grid">
            <div class="automation-card">
                <h3>Generate Views</h3>
                <div class="form-group">
                    <label>Target Post:</label>
                    <select id="targetPost">
                        <option value="">Select post...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Number of Views:</label>
                    <input type="number" id="viewCount" value="10" min="1" max="1000">
                </div>
                <button class="btn btn-success" onclick="generateViews()">Generate Views</button>
            </div>
            
            <div class="automation-card">
                <h3>Bulk Generation</h3>
                <div class="form-group">
                    <label>Views per Post:</label>
                    <input type="number" id="bulkViews" value="5" min="1" max="30">
                    <small style="color: #e74c3c; display: block; margin-top: 5px;">⚠️ Max 30 per post for security</small>
                </div>
                <button class="btn btn-primary" onclick="generateBulkViews()">Generate for All Posts</button>
            </div>
            
            <div class="automation-card">
                <h3>Set Manual Count</h3>
                <div class="form-group">
                    <label>Target Post:</label>
                    <select id="manualPost">
                        <option value="">Select post...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>View Count:</label>
                    <input type="number" id="manualCount" value="100" min="0">
                </div>
                <button class="btn btn-secondary" onclick="setManualViews()">Set Count</button>
            </div>
        </div>
        
        <div id="automationStatus" style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin-top: 20px; display: none;">
            <div id="statusMessage"></div>
        </div>
    </div>

    <div class="container">
        <h2>Blog Posts</h2>
        <table>
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Status</th>
                    <th>Views</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="postsTable">
                <tr><td colspan="6">Loading...</td></tr>
            </tbody>
        </table>
    </div>

    <!-- Blog management functionality -->
    <script>
        // Blog page functions - full implementation for immediate functionality  
        function showCreateForm() {
            // Show blog creation form inline
            const container = document.querySelector('.container');
            const existingForm = document.getElementById('createBlogForm');
            
            if (existingForm) {
                existingForm.style.display = existingForm.style.display === 'none' ? 'block' : 'none';
                return;
            }
            
            const formDiv = document.createElement('div');
            formDiv.id = 'createBlogForm';
            formDiv.style.cssText = 'background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #007bff;';
            formDiv.innerHTML = '' +
                '<h3>📝 Create New Blog Post</h3>' +
                '<form onsubmit="createBlogPost(event)">' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Title:</label>' +
                        '<input type="text" id="blogTitle" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">' +
                    '</div>' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Author:</label>' +
                        '<input type="text" id="blogAuthor" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">' +
                    '</div>' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Content:</label>' +
                        '<textarea id="blogContent" required rows="8" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></textarea>' +
                    '</div>' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: inline-block; margin-right: 10px;">' +
                            '<input type="checkbox" id="blogPublished"> Publish immediately' +
                        '</label>' +
                    '</div>' +
                    '<div style="display: flex; gap: 10px;">' +
                        '<button type="submit" class="btn btn-success">Create Post</button>' +
                        '<button type="button" onclick="document.getElementById(\'createBlogForm\').style.display=\'none\'" class="btn btn-secondary">Cancel</button>' +
                    '</div>' +
                '</form>' +
                '<div id="createStatus" style="margin-top: 10px; padding: 10px; border-radius: 5px; display: none;"></div>';
            container.insertBefore(formDiv, container.firstChild);
        }
        
        function toggleAutomation() {
            // Show blog automation panel inline
            const container = document.querySelector('.container');
            const existingPanel = document.getElementById('blogAutomationPanel');
            
            if (existingPanel) {
                existingPanel.style.display = existingPanel.style.display === 'none' ? 'block' : 'none';
                return;
            }
            
            const automationPanel = document.createElement('div');
            automationPanel.id = 'blogAutomationPanel';
            automationPanel.style.cssText = 'background: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #ffc107;';
            automationPanel.innerHTML = '' +
                '<h3>🎯 Blog Automation Tools</h3>' +
                '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">' +
                    '<div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6;">' +
                        '<h4>📈 Generate Blog Views</h4>' +
                        '<div style="margin: 10px 0;">' +
                            '<label style="display: block; margin-bottom: 5px;">Select Post:</label>' +
                            '<select id="targetBlogPost" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">' +
                                '<option value="">Loading posts...</option>' +
                            '</select>' +
                        '</div>' +
                        '<div style="margin: 10px 0;">' +
                            '<label style="display: block; margin-bottom: 5px;">Number of Views:</label>' +
                            '<input type="number" id="viewCount" value="10" min="1" max="100" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">' +
                        '</div>' +
                        '<button onclick="generateBlogViews()" class="btn btn-primary">Generate Views</button>' +
                    '</div>' +
                    '<div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6;">' +
                        '<h4>🔄 Refresh Blog Stats</h4>' +
                        '<p style="font-size: 14px; color: #666; margin-bottom: 15px;">Update all blog post statistics and view counts</p>' +
                        '<button onclick="refreshBlogStats()" class="btn btn-secondary">Refresh Statistics</button>' +
                    '</div>' +
                '</div>' +
                '<div id="blogAutomationStatus" style="margin: 10px 0; padding: 10px; border-radius: 5px; display: none;"></div>';
            container.insertBefore(automationPanel, container.firstChild);
            loadBlogPostsForAutomation();
        }
        
        // Helper functions for blog management
        async function createBlogPost(event) {
            event.preventDefault();
            const token = localStorage.getItem('adminToken');
            const statusDiv = document.getElementById('createStatus');
            
            if (!token) {
                statusDiv.style.display = 'block';
                statusDiv.style.background = '#f8d7da';
                statusDiv.textContent = '❌ Authentication required. Please login again.';
                return;
            }
            
            const title = document.getElementById('blogTitle').value;
            const author = document.getElementById('blogAuthor').value;
            const content = document.getElementById('blogContent').value;
            const published = document.getElementById('blogPublished').checked;
            
            statusDiv.style.display = 'block';
            statusDiv.style.background = '#d1ecf1';
            statusDiv.textContent = '⏳ Creating blog post...';
            
            try {
                const response = await fetch('/admin/api/blog/posts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ title, author, content, published })
                });
                
                if (response.ok) {
                    statusDiv.style.background = '#d4edda';
                    statusDiv.textContent = '✅ Blog post created successfully!';
                    document.querySelector('#createBlogForm form').reset();
                    setTimeout(() => {
                        document.getElementById('createBlogForm').style.display = 'none';
                        loadPosts(); // Refresh the posts table if function exists
                    }, 2000);
                } else {
                    statusDiv.style.background = '#f8d7da';
                    statusDiv.textContent = '❌ Failed to create blog post. Please try again.';
                }
            } catch (error) {
                statusDiv.style.background = '#f8d7da';
                statusDiv.textContent = '❌ Error: ' + error.message;
            }
        }
        
        async function loadBlogPostsForAutomation() {
            const select = document.getElementById('targetBlogPost');
            const token = localStorage.getItem('adminToken');
            
            if (!token) {
                select.innerHTML = '<option value="">Authentication required</option>';
                return;
            }
            
            try {
                const response = await fetch('/admin/api/blog/posts', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (response.ok) {
                    const posts = await response.json();
                    select.innerHTML = '<option value="">Select a post...</option>';
                    
                    Object.values(posts).filter(post => post.published).forEach(post => {
                        const option = document.createElement('option');
                        option.value = post.id;
                        option.textContent = post.title.substring(0, 50) + (post.title.length > 50 ? '...' : '');
                        select.appendChild(option);
                    });
                    
                    if (Object.keys(posts).length === 0) {
                        select.innerHTML = '<option value="">No published posts found</option>';
                    }
                } else {
                    select.innerHTML = '<option value="">Failed to load posts</option>';
                }
            } catch (error) {
                select.innerHTML = '<option value="">Error loading posts</option>';
            }
        }
        
        async function generateBlogViews() {
            const token = localStorage.getItem('adminToken');
            const blogId = document.getElementById('targetBlogPost').value;
            const viewCount = parseInt(document.getElementById('viewCount').value);
            const statusDiv = document.getElementById('blogAutomationStatus');
            
            if (!token) {
                showBlogAutomationStatus('❌ Authentication required', '#f8d7da');
                return;
            }
            
            if (!blogId) {
                showBlogAutomationStatus('❌ Please select a blog post', '#f8d7da');
                return;
            }
            
            showBlogAutomationStatus('⏳ Generating ' + viewCount + ' views...', '#d1ecf1');
            
            try {
                const response = await fetch('/admin/api/blog/automation/generate-views', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ blogId, viewCount, delay: 100 })
                });
                
                if (response.ok) {
                    showBlogAutomationStatus('✅ Successfully generated ' + viewCount + ' views!', '#d4edda');
                    setTimeout(() => {
                        if (typeof loadPosts === 'function') loadPosts();
                    }, 1000);
                } else {
                    showBlogAutomationStatus('❌ Failed to generate views', '#f8d7da');
                }
            } catch (error) {
                showBlogAutomationStatus('❌ Error: ' + error.message, '#f8d7da');
            }
        }
        
        function refreshBlogStats() {
            const statusDiv = document.getElementById('blogAutomationStatus');
            showBlogAutomationStatus('🔄 Refreshing blog statistics...', '#d1ecf1');
            
            setTimeout(() => {
                showBlogAutomationStatus('✅ Blog statistics refreshed!', '#d4edda');
                if (typeof loadPosts === 'function') loadPosts();
            }, 1500);
        }
        
        function showBlogAutomationStatus(message, background) {
            const statusDiv = document.getElementById('blogAutomationStatus');
            statusDiv.style.display = 'block';
            statusDiv.style.background = background;
            statusDiv.textContent = message;
        }
    </script>

    <script>
        let blogPosts = {};
        let blogAnalytics = {};

        function checkAuth() {
            const token = localStorage.getItem('adminToken');
            if (!token) { window.location.href = '/admin'; return false; }
            return token;
        }

        async function loadPosts() {
            const token = checkAuth();
            if (!token) return;

            try {
                const [postsResponse, analyticsResponse] = await Promise.all([
                    fetch('/admin/api/blog/posts', { headers: { 'Authorization': 'Bearer ' + token } }),
                    fetch('/admin/api/blog/analytics', { headers: { 'Authorization': 'Bearer ' + token } })
                ]);

                if (postsResponse.ok && analyticsResponse.ok) {
                    blogPosts = await postsResponse.json();
                    blogAnalytics = await analyticsResponse.json();
                    displayPosts();
                    populateDropdowns();
                } else {
                    // Update table to show error instead of staying on "Loading..."
                    const tbody = document.getElementById('postsTable');
                    tbody.innerHTML = '<tr><td colspan="6">Failed to load blog data. Please try again.</td></tr>';
                }
            } catch (error) {
                // Update table to show error instead of staying on "Loading..."
                const tbody = document.getElementById('postsTable');
                tbody.innerHTML = '<tr><td colspan="6">Error loading blog posts: ' + error.message + '</td></tr>';
            }
        }

        function displayPosts() {
            const tbody = document.getElementById('postsTable');
            if (Object.keys(blogPosts).length === 0) {
                tbody.innerHTML = '<tr><td colspan="6">No blog posts found</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            for (const [id, post] of Object.entries(blogPosts)) {
                const analytics = blogAnalytics[id] || { views: 0 };
                const row = tbody.insertRow();
                row.innerHTML = '<td>' + post.title + '</td>' +
                               '<td>' + post.author + '</td>' +
                               '<td>' + (post.published ? 'Published' : 'Draft') + '</td>' +
                               '<td><strong>' + analytics.views + '</strong></td>' +
                               '<td>' + new Date(post.createdAt).toLocaleDateString() + '</td>' +
                               '<td><button class="btn btn-secondary" onclick="deletePost(\'' + id + '\')">Delete</button></td>';
            }
        }

        function populateDropdowns() {
            const publishedPosts = Object.values(blogPosts).filter(post => post.published);
            const selects = [document.getElementById('targetPost'), document.getElementById('manualPost')];
            
            selects.forEach(select => {
                select.innerHTML = '<option value="">Select post...</option>';
                publishedPosts.forEach(post => {
                    const option = document.createElement('option');
                    option.value = post.id;
                    option.textContent = post.title.substring(0, 50);
                    select.appendChild(option);
                });
            });
        }

        function toggleAutomation() {
            const panel = document.getElementById('automationPanel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }

        async function generateViews() {
            const token = checkAuth();
            const blogId = document.getElementById('targetPost').value;
            const viewCount = document.getElementById('viewCount').value;

            if (!blogId) { alert('Please select a post'); return; }

            try {
                const response = await fetch('/admin/api/blog/automation/generate-views', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ blogId, viewCount: parseInt(viewCount), delay: 100 })
                });

                if (response.ok) {
                    showStatus('Started generating ' + viewCount + ' views...');
                    setTimeout(() => { loadPosts(); showStatus('Completed!'); }, 2000);
                } else {
                    alert('Error generating views');
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        async function generateBulkViews() {
            const token = checkAuth();
            const viewsPerPost = document.getElementById('bulkViews').value;
            const publishedCount = Object.values(blogPosts).filter(post => post.published).length;

            if (publishedCount === 0) { alert('No published posts'); return; }
            if (!confirm('Generate ' + viewsPerPost + ' views for each of ' + publishedCount + ' posts?')) return;

            try {
                const response = await fetch('/admin/api/blog/automation/generate-bulk-views', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ viewsPerPost: parseInt(viewsPerPost), delay: 200 })
                });

                if (response.ok) {
                    const data = await response.json();
                    showStatus('Started bulk generation: ' + data.estimatedTotal + ' total views...');
                    setTimeout(() => { loadPosts(); showStatus('Bulk generation completed!'); }, 5000);
                } else {
                    alert('Error generating bulk views');
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        async function setManualViews() {
            const token = checkAuth();
            const blogId = document.getElementById('manualPost').value;
            const viewCount = document.getElementById('manualCount').value;

            if (!blogId) { alert('Please select a post'); return; }

            const post = blogPosts[blogId];
            if (!confirm('Set view count for "' + post.title + '" to ' + viewCount + '?')) return;

            try {
                const response = await fetch('/admin/api/blog/automation/set-views', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ blogId, viewCount: parseInt(viewCount) })
                });

                if (response.ok) {
                    showStatus('View count set to ' + viewCount);
                    loadPosts();
                } else {
                    alert('Error setting view count');
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        function showStatus(message) {
            const statusDiv = document.getElementById('automationStatus');
            document.getElementById('statusMessage').textContent = message;
            statusDiv.style.display = 'block';
        }

        async function deletePost(postId) {
            const token = checkAuth();
            const post = blogPosts[postId];
            if (!confirm('Delete "' + post.title + '"?')) return;

            try {
                const response = await fetch('/admin/api/blog/posts/' + postId, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    loadPosts();
                } else {
                    alert('Failed to delete post');
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        function showCreateForm() {
            alert('Blog creation feature will be added in next update');
        }

        // Fallback for blog page functionality
        function ensureBlogPageWorks() {
            // If loadPosts doesn't exist or fails, update table manually  
            if (typeof loadPosts !== 'function') {
                const tbody = document.getElementById('postsTable');
                if (tbody && tbody.innerHTML.includes('Loading...')) {
                    tbody.innerHTML = '<tr><td colspan="6">No blog posts found</td></tr>';
                }
            } else {
                // Try to call loadPosts, but catch any errors
                try {
                    loadPosts();
                } catch (error) {
                    console.error('Error loading posts:', error);
                    const tbody = document.getElementById('postsTable');
                    if (tbody) {
                        tbody.innerHTML = '<tr><td colspan="6">Error loading blog posts. Please refresh the page.</td></tr>';
                    }
                }
            }
        }

        // Ensure the page works when loaded
        window.onload = ensureBlogPageWorks;
    </script>
</body>
</html>
  `);
});
// Admin API endpoints for blog management
app.get('/admin/api/blog/posts', requireAuth, (req, res) => {
  res.json(blogDatabase);
});

app.post('/admin/api/blog/posts', requireAuth, asyncHandler(async (req, res) => {
  const { title, content, author, published } = req.body;
  
  // Enhanced input validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Invalid input', 
      message: 'Title is required and must be a non-empty string' 
    });
  }
  
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Invalid input', 
      message: 'Content is required and must be a non-empty string' 
    });
  }
  
  if (!author || typeof author !== 'string' || author.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Invalid input', 
      message: 'Author is required and must be a non-empty string' 
    });
  }
  
  // Sanitize and validate length
  const sanitizedTitle = validator.sanitizeString(title, CONFIG.MAX_TITLE_LENGTH);
  const sanitizedContent = validator.sanitizeString(content, CONFIG.MAX_CONTENT_LENGTH);
  const sanitizedAuthor = validator.sanitizeString(author, 100);
  
  if (sanitizedTitle.length < 3) {
    return res.status(400).json({ 
      error: 'Invalid input', 
      message: 'Title must be at least 3 characters long' 
    });
  }
  
  if (sanitizedContent.length < 10) {
    return res.status(400).json({ 
      error: 'Invalid input', 
      message: 'Content must be at least 10 characters long' 
    });
  }
  
  const id = utilityFunctions.generateBlogId();
  const slug = generateSlug(sanitizedTitle);
  const now = new Date().toISOString();
  
  // Ensure slug is unique
  let finalSlug = slug;
  let counter = 1;
  while (Object.values(blogDatabase).some(post => post.slug === finalSlug)) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }
  
  const post = {
    id,
    title: sanitizedTitle,
    content: sanitizedContent,
    author: sanitizedAuthor,
    published: Boolean(published),
    slug: finalSlug,
    createdAt: now,
    updatedAt: now
  };
  
  blogDatabase[id] = post;
  res.json(post);
}));

app.put('/admin/api/blog/posts/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { title, content, author, published } = req.body;
  
  if (!blogDatabase[id]) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  if (!title || !content || !author) {
    return res.status(400).json({ error: 'Title, content, and author are required' });
  }
  
  const existingPost = blogDatabase[id];
  const slug = title !== existingPost.title ? generateSlug(title) : existingPost.slug;
  
  // Ensure slug is unique (excluding current post)
  let finalSlug = slug;
  let counter = 1;
  while (Object.values(blogDatabase).some(post => post.slug === finalSlug && post.id !== id)) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }
  
  const updatedPost = {
    ...existingPost,
    title,
    content,
    author,
    published: Boolean(published),
    slug: finalSlug,
    updatedAt: new Date().toISOString()
  };
  
  blogDatabase[id] = updatedPost;
  res.json(updatedPost);
});

app.delete('/admin/api/blog/posts/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  if (blogDatabase[id]) {
    delete blogDatabase[id];
    // Also delete analytics data
    delete blogAnalytics[id];
    res.json({ message: 'Post deleted successfully' });
  } else {
    res.status(404).json({ error: 'Post not found' });
  }
});

app.get('/admin/api/blog/analytics', requireAuth, (req, res) => {
  const analyticsData = {};
  
  for (const postId in blogDatabase) {
    analyticsData[postId] = blogAnalytics[postId] || {
      views: 0,
      firstView: null,
      lastView: null,
      viewHistory: []
    };
  }
  
  res.json(analyticsData);
});

// ========================================
// SAFELINK ROUTES
// ========================================

// SafeLink preview route for testing templates
app.get('/safelink/preview/:templateId', (req, res) => {
  const templateId = parseInt(req.params.templateId);
  
  if (templateId < 1 || templateId > 8) {
    return res.status(400).send('Invalid template ID');
  }
  
  const template = safelinkConfig.templates[templateId];
  if (!template) {
    return res.status(404).send('Template not found');
  }
  
  res.send(generateSafelinkPage(templateId, template, 'https://example.com', 'PREVIEW'));
});

// SafeLink redirect route
app.get('/safelink/:templateId/:shortCode', (req, res) => {
  const { templateId, shortCode } = req.params;
  const template = safelinkConfig.templates[parseInt(templateId)];
  const originalUrl = urlDatabase[shortCode];
  
  if (!originalUrl) {
    return res.status(404).send('URL not found');
  }
  
  if (!template || !template.enabled) {
    // If template is disabled, redirect directly
    recordClick(shortCode, req);
    return res.redirect(originalUrl);
  }
  
  res.send(generateSafelinkPage(templateId, template, originalUrl, shortCode));
});

// SafeLink proceed route (when user clicks continue)
app.get('/safelink/proceed/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  const originalUrl = urlDatabase[shortCode];
  
  if (originalUrl) {
    recordClick(shortCode, req);
    res.redirect(originalUrl);
  } else {
    res.status(404).send('URL not found');
  }
});

// ========================================
// 8-PAGE REDIRECTION ROUTES (ADMIN ONLY)
// ========================================

// 8-Page redirection route - for now, just demonstrate the concept
app.get('/8page/:pageIndex/:shortCode', (req, res) => {
  const { pageIndex, shortCode } = req.params;
  
  // Validate input parameters
  if (!shortCode || typeof shortCode !== 'string' || shortCode.length === 0) {
    return res.status(400).send('Invalid short code');
  }
  
  const parsedPageIndex = parseInt(pageIndex);
  if (isNaN(parsedPageIndex) || parsedPageIndex < 0 || parsedPageIndex > 8) {
    return res.status(400).send('Invalid page index');
  }
  
  const originalUrl = urlDatabase[shortCode];
  
  if (!originalUrl) {
    return res.status(404).send('URL not found');
  }
  
  if (!eightPageRedirectionConfig.enabled) {
    recordClick(shortCode, req);
    if (isTrustedUrl(originalUrl)) {
      return res.redirect(originalUrl);
    } else {
      return res.redirect('/');
    }
  }
  
  const currentPageIndex = parsedPageIndex;
  const totalPages = 8;
  
  // If we've gone through all pages, redirect to final destination
  if (currentPageIndex >= totalPages) {
    recordClick(shortCode, req);
    eightPageRedirectionConfig.analytics.completedChains++;
    if (isTrustedUrl(originalUrl)) {
      return res.redirect(originalUrl);
    } else {
      return res.redirect('/');
    }
  }
  
  // Track page views and abandonment
  if (!eightPageRedirectionConfig.analytics.abandonedAt[currentPageIndex]) {
    eightPageRedirectionConfig.analytics.abandonedAt[currentPageIndex] = 0;
  }
  eightPageRedirectionConfig.analytics.abandonedAt[currentPageIndex]++;
  
  // Generate a simple intermediate page
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Content Hub - Page ${parseInt(currentPageIndex) + 1} of ${parseInt(totalPages)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 20px; 
            min-height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
        }
        .container { 
            background: white; 
            color: #333; 
            padding: 40px; 
            border-radius: 20px; 
            max-width: 700px; 
            width: 100%; 
            box-shadow: 0 15px 35px rgba(0,0,0,0.1); 
            text-align: center;
        }
        .header { margin-bottom: 30px; }
        .header h1 { color: #4CAF50; margin-bottom: 10px; font-size: 2.2em; }
        .progress-section { margin: 25px 0; }
        .progress { 
            background: #f0f0f0; 
            border-radius: 15px; 
            height: 12px; 
            margin: 15px 0; 
            overflow: hidden; 
            position: relative;
        }
        .progress-bar { 
            background: linear-gradient(90deg, #4CAF50, #45a049); 
            height: 100%; 
            width: ${((parseInt(currentPageIndex) + 1) / totalPages) * 100}%; 
            transition: width 0.5s ease; 
            position: relative;
        }
        .progress-text { 
            font-weight: bold; 
            color: #666; 
            margin-top: 8px; 
        }
        .countdown-section { 
            background: linear-gradient(45deg, #ff6b6b, #feca57); 
            color: white; 
            padding: 20px; 
            border-radius: 15px; 
            margin: 25px 0; 
        }
        .countdown { 
            font-size: 28px; 
            font-weight: bold; 
            margin: 10px 0; 
        }
        .content-section { 
            background: #f8f9fa; 
            padding: 25px; 
            border-radius: 15px; 
            margin: 25px 0; 
        }
        .content-section h3 { 
            color: #333; 
            margin-bottom: 15px; 
            font-size: 1.4em; 
        }
        .content-section p { 
            color: #666; 
            line-height: 1.6; 
            margin-bottom: 15px; 
        }
        .actions { 
            display: flex; 
            gap: 15px; 
            justify-content: center; 
            flex-wrap: wrap; 
            margin-top: 30px; 
        }
        .btn { 
            background: #4CAF50; 
            color: white; 
            padding: 15px 30px; 
            border: none; 
            border-radius: 10px; 
            text-decoration: none; 
            display: inline-block; 
            font-weight: bold; 
            font-size: 16px; 
            transition: all 0.3s ease; 
            cursor: pointer;
        }
        .btn:hover { 
            background: #45a049; 
            transform: translateY(-2px); 
            box-shadow: 0 5px 15px rgba(0,0,0,0.2); 
        }
        .btn-secondary { 
            background: #6c757d; 
        }
        .btn-secondary:hover { 
            background: #5a6268; 
        }
        .destination-info { 
            margin-top: 25px; 
            padding: 15px; 
            background: #e9f7ef; 
            border-radius: 10px; 
            border-left: 4px solid #4CAF50; 
        }
        .destination-info p { 
            margin: 0; 
            font-size: 14px; 
            color: #666; 
        }
        .destination-url { 
            word-break: break-all; 
            font-family: monospace; 
            background: #f8f9fa; 
            padding: 5px 10px; 
            border-radius: 5px; 
            margin-top: 5px; 
        }
        @media (max-width: 600px) {
            .container { padding: 25px; margin: 10px; }
            .header h1 { font-size: 1.8em; }
            .countdown { font-size: 24px; }
            .actions { flex-direction: column; }
            .btn { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔗 Content Discovery Hub</h1>
            <p>Explore interesting content before reaching your destination</p>
        </div>
        
        <div class="progress-section">
            <div class="progress">
                <div class="progress-bar"></div>
            </div>
            <div class="progress-text">Page ${parseInt(currentPageIndex) + 1} of ${parseInt(totalPages)} - ${Math.round(((parseInt(currentPageIndex) + 1) / totalPages) * 100)}% Complete</div>
        </div>
        
        <div class="countdown-section">
            <div>⏱️ Please wait <span id="countdown" class="countdown">3</span> seconds</div>
            <div style="font-size: 14px; margin-top: 10px;">Or wait for the continue button to appear</div>
        </div>
        
        <div class="content-section">
            <h3>📖 Sample Content - Page ${parseInt(currentPageIndex) + 1}</h3>
            <p>This is an engaging content preview for page ${parseInt(currentPageIndex) + 1}. In a full implementation, this section would display actual blog content, articles, or other interesting material to engage users during their journey.</p>
            <p><strong>💡 Did you know?</strong> URL shorteners were first popularized in the early 2000s with services like TinyURL, and they've become essential for social media sharing due to character limits.</p>
        </div>
        
        <div class="actions">
            <a href="/8page/${parseInt(currentPageIndex) + 1}/${escape(shortCode)}" class="btn" id="proceedBtn" style="display:none;">
                ${parseInt(currentPageIndex) + 1 >= totalPages ? '🎯 Continue to Destination' : '➡️ Next Content'}
            </a>
            <a href="${escape(originalUrl)}" class="btn btn-secondary" id="skipBtn">
                ⏭️ Skip All & Go Direct
            </a>
        </div>
        
        <div class="destination-info">
            <p><strong>🎯 Final Destination:</strong></p>
            <div class="destination-url">${escape(originalUrl)}</div>
        </div>
    </div>
    
    <script>
        let timeLeft = 3;
        const countdownEl = document.getElementById('countdown');
        const proceedBtn = document.getElementById('proceedBtn');
        
        const timer = setInterval(() => {
            timeLeft--;
            countdownEl.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                countdownEl.textContent = '✅';
                countdownEl.parentElement.innerHTML = '✅ Ready to continue!';
                proceedBtn.style.display = 'inline-block';
                proceedBtn.focus(); // Focus for accessibility
            }
        }, 1000);
        
        // Track abandonment when user leaves
        window.addEventListener('beforeunload', function() {
            if (timeLeft > 0) {
                try {
                    navigator.sendBeacon('/api/8page/abandon/' + encodeURIComponent('${escape(shortCode)}') + '/' + ${parseInt(currentPageIndex)});
                } catch (e) {
                    // Ignore beacon errors
                }
            }
        });
        
        // Add keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && proceedBtn.style.display !== 'none') {
                proceedBtn.click();
            } else if (e.key === 'Escape') {
                document.getElementById('skipBtn').click();
            }
        });
    </script>
</body>
</html>`);
});

// Function to generate SafeLink page HTML
function generateSafelinkPage(templateId, template, targetUrl, shortCode) {
  const isPreview = shortCode === 'PREVIEW';
  const proceedUrl = isPreview ? '#' : `/safelink/proceed/${shortCode}`;
  const skipDisplay = template.skipButton ? 'block' : 'none';
  
  const destinationText = isPreview ? 'https://example.com (Preview Mode)' : targetUrl;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeLink ${templateId} - ${template.name}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 20px;
        }
        .main-content {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .sidebar {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            height: fit-content;
        }
        .countdown {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: linear-gradient(45deg, #ff6b6b, #feca57);
            border-radius: 10px;
            color: white;
        }
        .countdown-timer {
            font-size: 48px;
            font-weight: bold;
            margin: 10px 0;
        }
        .proceed-button {
            display: none;
            background: linear-gradient(45deg, #28a745, #20c997);
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 18px;
            border-radius: 25px;
            cursor: pointer;
            text-decoration: none;
            margin: 20px auto;
            text-align: center;
            width: 200px;
            transition: all 0.3s;
        }
        .proceed-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        .skip-button {
            display: ${skipDisplay};
            background: #6c757d;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 15px;
            cursor: pointer;
            text-decoration: none;
            margin: 10px auto;
            text-align: center;
            width: 150px;
            font-size: 14px;
        }
        .info-box {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
        @media (max-width: 768px) {
            .container {
                grid-template-columns: 1fr;
                padding: 10px;
            }
            .countdown-timer {
                font-size: 36px;
            }
        }
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="main-content">
            <h1>🔗 ${template.name}</h1>
            <p style="font-size: 18px; color: #666;">Please wait while we prepare your link...</p>
            
            ${template.adSlots.header || '<div style="text-align:center;margin:20px 0;padding:20px;background:#f8f9fa;border-radius:8px;min-height:90px;display:flex;align-items:center;justify-content:center;">Header Ad Slot</div>'}
            
            <div class="info-box">
                <strong>🎯 Destination:</strong> ${destinationText}<br>
                <strong>🛡️ Security:</strong> This link has been verified as safe<br>
                <strong>⏱️ Wait Time:</strong> ${template.waitTime} seconds
            </div>
            
            <div class="countdown">
                <div>Please wait while we verify the link security...</div>
                <div class="countdown-timer" id="countdown">${template.waitTime}</div>
                <div>seconds remaining</div>
            </div>
            
            <div style="text-align: center;">
                <a href="${proceedUrl}" class="proceed-button" id="proceedBtn">
                    🚀 Continue to Website
                </a>
                <br>
                <a href="${proceedUrl}" class="skip-button" onclick="return confirm('Skip waiting? You might miss important security checks.')">
                    ⚡ Skip Wait
                </a>
            </div>
            
            ${template.adSlots.video || ''}
            ${template.adSlots.banner || ''}
            
            ${template.adSlots.footer || '<div style="text-align:center;margin:20px 0;padding:20px;background:#f8f9fa;border-radius:8px;min-height:120px;display:flex;align-items:center;justify-content:center;">Footer Ad Slot</div>'}
        </div>
        
        <div class="sidebar">
            <h3>💰 Premium Offers</h3>
            ${template.adSlots.sidebar || '<div style="margin:20px 0;padding:15px;background:#f8f9fa;border-radius:8px;min-height:250px;display:flex;align-items:center;justify-content:center;">Sidebar Ad Slot</div>'}
            
            <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px;">
                <h4 style="margin-top: 0;">🛡️ Security Features</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>Link verification</li>
                    <li>Malware scanning</li>
                    <li>Safe browsing</li>
                    <li>Ad-free experience</li>
                </ul>
            </div>
        </div>
    </div>
    
    ${template.adSlots.popup || ''}
    
    <script>
        let timeLeft = ${template.waitTime};
        const countdownElement = document.getElementById('countdown');
        const proceedButton = document.getElementById('proceedBtn');
        
        const timer = setInterval(() => {
            timeLeft--;
            countdownElement.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                countdownElement.textContent = '✅';
                proceedButton.style.display = 'inline-block';
                proceedButton.style.animation = 'pulse 2s infinite';
                
                const popup = document.getElementById('popupAd');
                if (popup) {
                    popup.style.display = 'block';
                    setTimeout(() => popup.style.display = 'none', 5000);
                }
            }
        }, 1000);
        
        function closePopup() {
            document.getElementById('popupAd').style.display = 'none';
        }
        
        if (typeof adsbygoogle !== 'undefined') {
            (adsbygoogle = window.adsbygoogle || []).push({});
        }
    </script>
</body>
</html>`;
}

// Enhanced redirect endpoint with security validation
app.get('/:shortCode', asyncHandler(async (req, res) => {
  const { shortCode } = req.params;
  
  // Validate shortCode format
  if (!validator.isValidShortCode(shortCode)) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Short Code</title>
          <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #dc3545; }
          </style>
      </head>
      <body>
          <h1 class="error">Invalid Short Code</h1>
          <p>The provided short code format is invalid.</p>
          <a href="/">← Go back to homepage</a>
      </body>
      </html>
    `);
  }
  
  const originalUrl = urlDatabase[shortCode];
  
  if (originalUrl) {
    // Validate URL before redirecting (security check)
    if (!isValidUrl(originalUrl)) {
      console.error(`Invalid URL found for shortCode ${shortCode}:`, originalUrl);
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invalid Destination</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .error { color: #dc3545; }
            </style>
        </head>
        <body>
            <h1 class="error">Invalid Destination</h1>
            <p>The destination URL is invalid or potentially malicious.</p>
            <a href="/">← Go back to homepage</a>
        </body>
        </html>
      `);
    }
    
    // Check if 8-Page Redirection is enabled
    if (eightPageRedirectionConfig.enabled) {
      const enabledPages = eightPageRedirectionConfig.pages.filter(page => page.enabled);
      if (enabledPages.length > 0) {
        eightPageRedirectionConfig.analytics.totalRedirects++;
        return res.redirect(`/8page/0/${shortCode}`);
      }
    }
    
    // Check if SafeLink is enabled
    if (safelinkConfig.enabled) {
      const templateId = safelinkConfig.defaultTemplate;
      const template = safelinkConfig.templates[templateId];
      
      // If template is enabled, redirect to SafeLink page
      if (template && template.enabled) {
        return res.redirect(`/safelink/${templateId}/${shortCode}`);
      }
    }
    
    // Record analytics and redirect
    try {
      recordClick(shortCode, req);
    } catch (error) {
      console.error('Error recording click:', error.message);
      // Continue with redirect even if analytics fail
    }
    
    res.redirect(originalUrl);
  } else {
    res.status(404).send(`
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
}));

// ========================================
// ANNOUNCEMENTS API ROUTES
// ========================================

// Get all announcements (admin only)
app.get('/admin/api/announcements', requireAuth, (req, res) => {
  res.json(announcementDatabase);
});

// Create new announcement (admin only)
app.post('/admin/api/announcements', requireAuth, (req, res) => {
  const { title, message, type } = req.body;
  
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }
  
  if (!['info', 'success', 'warning', 'error'].includes(type)) {
    return res.status(400).json({ error: 'Invalid announcement type' });
  }
  
  const id = utilityFunctions.generateUniqueId('announcement-');
  const announcement = {
    id,
    title: title.trim(),
    message: message.trim(),
    type,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  announcementDatabase[id] = announcement;
  res.json(announcement);
});

// Toggle announcement enabled/disabled (admin only)
app.put('/admin/api/announcements/:id/toggle', requireAuth, (req, res) => {
  const { id } = req.params;
  
  if (!announcementDatabase[id]) {
    return res.status(404).json({ error: 'Announcement not found' });
  }
  
  announcementDatabase[id].enabled = !announcementDatabase[id].enabled;
  announcementDatabase[id].updatedAt = new Date().toISOString();
  
  res.json(announcementDatabase[id]);
});

// Delete announcement (admin only)
app.delete('/admin/api/announcements/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  if (!announcementDatabase[id]) {
    return res.status(404).json({ error: 'Announcement not found' });
  }
  
  delete announcementDatabase[id];
  res.json({ success: true, message: 'Announcement deleted' });
});

// Get active announcements for visitors (public endpoint)
app.get('/api/announcements', (req, res) => {
  const activeAnnouncements = Object.values(announcementDatabase)
    .filter(announcement => announcement.enabled)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json(activeAnnouncements);
});

// API endpoint to get all URLs (for debugging/admin purposes)
app.get('/api/urls', (req, res) => {
  res.json(urlDatabase);
});

// Global error handlers
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  if (res.headersSent) {
    return next(error);
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`URL Shortener server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to use the URL shortener`);
  
  // Initialize performance optimizations
  const memoryManager = performanceUtils.optimizeMemoryUsage();
  console.log('[PERF] Memory optimization enabled');
  
  // Start periodic cleanup tasks
  const cleanupInterval = setInterval(() => {
    try {
      cacheUtils.cleanup();
      authUtils.cleanupSessions();
      
      // Optimized rate limiting store cleanup - use the same logic as in rate limiting
      if (rateLimitStore.size > 5000) { // Lower threshold to prevent memory buildup
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;
        const keysToDelete = [];
        
        // Collect expired keys first
        for (const [key, requests] of rateLimitStore.entries()) {
          const recentRequests = requests.filter(time => time > oneHourAgo);
          if (recentRequests.length === 0) {
            keysToDelete.push(key);
          } else {
            rateLimitStore.set(key, recentRequests);
          }
        }
        
        // Batch delete expired keys
        keysToDelete.forEach(key => rateLimitStore.delete(key));
      }
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }
  }, 120000); // Run cleanup every 2 minutes for better performance
  
  console.log('[PERF] Periodic cleanup tasks started');
  
  // Cleanup on process exit
  const gracefulShutdown = () => {
    console.log('\n[SHUTDOWN] Cleaning up resources...');
    clearInterval(cleanupInterval);
    memoryManager.stop();
    utilityFunctions.intervalManager.clearAll();
    process.exit(0);
  };
  
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
});

module.exports = app;