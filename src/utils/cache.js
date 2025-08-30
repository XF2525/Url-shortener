/**
 * Enhanced multi-level caching system for optimal performance
 */

const { CONFIG } = require('../config/constants');

// Enhanced multi-level caching system
const enhancedCache = {
  analytics: { urlStats: null, blogStats: null, lastUpdated: 0 },
  templates: new Map(),
  staticContent: new Map(),
  responses: new Map()
};

/**
 * Optimized cache management utilities
 */
const cacheUtils = {
  /**
   * Get item from cache
   * @param {string} category - Cache category
   * @param {string} key - Cache key
   * @param {number} duration - Cache duration in ms
   * @returns {*} Cached item or null
   */
  get(category, key, duration = CONFIG.CACHE_DURATIONS.ANALYTICS) {
    const cache = enhancedCache[category];
    if (!cache) return null;
    
    if (cache instanceof Map) {
      const item = cache.get(key);
      return item && (Date.now() - item.timestamp < duration) ? item.data : null;
    }
    
    // Handle special cases like analytics cache
    if (category === 'analytics' && cache.lastUpdated) {
      return (Date.now() - cache.lastUpdated < duration) ? cache[key] : null;
    }
    
    return null;
  },

  /**
   * Set item in cache
   * @param {string} category - Cache category
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   */
  set(category, key, data) {
    const cache = enhancedCache[category];
    if (!cache) return;
    
    if (cache instanceof Map) {
      cache.set(key, { data, timestamp: Date.now() });
      
      // Cleanup old entries if cache gets too large
      if (cache.size > 100) {
        const now = Date.now();
        const entriesArray = Array.from(cache.entries());
        
        // Sort by timestamp (oldest first) and remove expired entries
        entriesArray.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        let deletedCount = 0;
        for (const [cacheKey, item] of entriesArray) {
          if (now - item.timestamp > CONFIG.CACHE_DURATIONS.STATIC_CONTENT * 2) {
            cache.delete(cacheKey);
            deletedCount++;
          }
        }
        
        // If still too large after removing expired entries, remove oldest entries
        if (cache.size > 100) {
          const remainingEntries = Array.from(cache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
          
          const toDelete = remainingEntries.slice(0, cache.size - 80); // Leave room for 20 more entries
          toDelete.forEach(([key]) => cache.delete(key));
          
          console.log(`[CACHE] Cleaned up ${deletedCount + toDelete.length} entries from ${category} cache`);
        }
      }
    } else if (category === 'analytics') {
      cache[key] = data;
      cache.lastUpdated = Date.now();
    }
  },

  /**
   * Clear cache category or specific key
   * @param {string} category - Cache category
   * @param {string} key - Optional specific key to clear
   */
  clear(category, key = null) {
    const cache = enhancedCache[category];
    if (!cache) return;
    
    if (key) {
      if (cache instanceof Map) {
        cache.delete(key);
      } else if (category === 'analytics') {
        delete cache[key];
      }
    } else {
      if (cache instanceof Map) {
        cache.clear();
      } else if (category === 'analytics') {
        Object.keys(cache).forEach(k => {
          if (k !== 'lastUpdated') delete cache[k];
        });
        cache.lastUpdated = 0;
      }
    }
  },

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getStats() {
    return {
      analytics: enhancedCache.analytics.lastUpdated > 0,
      templates: enhancedCache.templates.size,
      staticContent: enhancedCache.staticContent.size,
      responses: enhancedCache.responses.size
    };
  }
};

module.exports = {
  cacheUtils,
  enhancedCache
};