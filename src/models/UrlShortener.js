/**
 * URL Shortener Model - Handles all URL shortening business logic
 */

const { CONFIG } = require('../config/constants');
const validator = require('../utils/validation');

class UrlShortenerModel {
  constructor() {
    // In-memory storage (URLs are lost when server restarts)
    this.urlDatabase = new Map();
    this.analytics = new Map();
  }

  /**
   * Generate a random short code
   * @param {number} length - Length of the short code
   * @returns {string} Generated short code
   */
  generateShortCode(length = CONFIG.SHORT_CODE_LENGTH) {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += CONFIG.SHORT_CODE_CHARS.charAt(
        Math.floor(Math.random() * CONFIG.SHORT_CODE_CHARS.length)
      );
    }
    return result;
  }

  /**
   * Create a short URL from a long URL
   * @param {string} originalUrl - The original URL to shorten
   * @returns {object} Result object with success/error and data
   */
  createShortUrl(originalUrl) {
    try {
      // Validate URL
      if (!validator.isValidUrl(originalUrl)) {
        return {
          success: false,
          error: 'Invalid URL format'
        };
      }

      // Check if URL already exists
      for (const [shortCode, data] of this.urlDatabase.entries()) {
        if (data.originalUrl === originalUrl) {
          return {
            success: true,
            data: {
              shortCode,
              originalUrl,
              existingUrl: true
            }
          };
        }
      }

      // Generate unique short code
      let shortCode;
      let attempts = 0;
      do {
        shortCode = this.generateShortCode();
        attempts++;
      } while (this.urlDatabase.has(shortCode) && attempts < 100);

      if (attempts >= 100) {
        return {
          success: false,
          error: 'Unable to generate unique short code'
        };
      }

      // Store URL with analytics data
      const urlData = {
        originalUrl,
        shortCode,
        createdAt: new Date().toISOString(),
        clicks: 0,
        lastAccessed: null
      };

      this.urlDatabase.set(shortCode, urlData);
      this.analytics.set(shortCode, {
        history: [],
        dailyStats: new Map(),
        hourlyStats: new Map()
      });

      return {
        success: true,
        data: {
          shortCode,
          originalUrl,
          createdAt: urlData.createdAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get original URL by short code
   * @param {string} shortCode - The short code
   * @returns {object} Result object with success/error and data
   */
  getOriginalUrl(shortCode) {
    try {
      const urlData = this.urlDatabase.get(shortCode);
      if (!urlData) {
        return {
          success: false,
          error: 'Short URL not found'
        };
      }

      return {
        success: true,
        data: urlData
      };
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Record a click/access to a short URL
   * @param {string} shortCode - The short code
   * @param {object} req - Express request object for analytics
   */
  recordClick(shortCode, req = {}) {
    try {
      const urlData = this.urlDatabase.get(shortCode);
      const analytics = this.analytics.get(shortCode);
      
      if (urlData && analytics) {
        // Update URL data
        urlData.clicks++;
        urlData.lastAccessed = new Date().toISOString();

        // Record analytics
        const timestamp = Date.now();
        const userAgent = req.get ? req.get('User-Agent') : '';
        const ip = this.getClientIP(req);

        analytics.history.push({
          timestamp,
          ip,
          userAgent
        });

        // Limit history size for performance
        if (analytics.history.length > CONFIG.HISTORY_LIMIT) {
          analytics.history.splice(0, analytics.history.length - CONFIG.HISTORY_LIMIT);
        }

        // Update daily and hourly stats
        const date = new Date().toDateString();
        const hour = new Date().getHours();

        analytics.dailyStats.set(date, (analytics.dailyStats.get(date) || 0) + 1);
        analytics.hourlyStats.set(hour, (analytics.hourlyStats.get(hour) || 0) + 1);
      }
    } catch (error) {
      console.error('Error recording click:', error);
    }
  }

  /**
   * Get analytics for a specific short URL
   * @param {string} shortCode - The short code
   * @returns {object} Analytics data
   */
  getAnalytics(shortCode) {
    const urlData = this.urlDatabase.get(shortCode);
    const analytics = this.analytics.get(shortCode);
    
    if (!urlData || !analytics) {
      return null;
    }

    const now = Date.now();
    const oneHour = CONFIG.TIME_WINDOWS.ONE_HOUR;
    const oneDay = CONFIG.TIME_WINDOWS.ONE_DAY;

    const recentClicks = analytics.history.filter(
      click => now - click.timestamp < oneHour
    ).length;

    const dailyClicks = analytics.history.filter(
      click => now - click.timestamp < oneDay
    ).length;

    return {
      shortCode,
      originalUrl: urlData.originalUrl,
      totalClicks: urlData.clicks,
      recentClicks,
      dailyClicks,
      createdAt: urlData.createdAt,
      lastAccessed: urlData.lastAccessed,
      history: analytics.history.slice(-10) // Last 10 clicks
    };
  }

  /**
   * Get all URLs with basic stats
   * @returns {array} Array of URL data
   */
  getAllUrls() {
    const urls = [];
    for (const [shortCode, urlData] of this.urlDatabase.entries()) {
      urls.push({
        shortCode,
        originalUrl: urlData.originalUrl,
        clicks: urlData.clicks,
        createdAt: urlData.createdAt,
        lastAccessed: urlData.lastAccessed
      });
    }
    return urls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Get overall system statistics
   * @returns {object} System statistics
   */
  getSystemStats() {
    const totalUrls = this.urlDatabase.size;
    const totalClicks = Array.from(this.urlDatabase.values())
      .reduce((sum, url) => sum + url.clicks, 0);
    
    const now = Date.now();
    const oneDay = CONFIG.TIME_WINDOWS.ONE_DAY;
    
    let recentUrls = 0;
    let recentClicks = 0;
    
    for (const [shortCode, urlData] of this.urlDatabase.entries()) {
      if (now - new Date(urlData.createdAt).getTime() < oneDay) {
        recentUrls++;
      }
      
      const analytics = this.analytics.get(shortCode);
      if (analytics) {
        recentClicks += analytics.history.filter(
          click => now - click.timestamp < oneDay
        ).length;
      }
    }

    return {
      totalUrls,
      totalClicks,
      recentUrls,
      recentClicks,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get client IP address from request
   * @param {object} req - Express request object
   * @returns {string} Client IP address
   */
  getClientIP(req) {
    return req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           req.headers?.['x-forwarded-for']?.split(',')[0] ||
           'unknown';
  }
}

// Export a singleton instance
module.exports = new UrlShortenerModel();