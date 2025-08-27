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
    
    // Reverse mapping for efficient URL lookup (performance optimization)
    this.urlToShortCode = new Map();
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

      // Check if URL already exists (efficient O(1) lookup)
      if (this.urlToShortCode.has(originalUrl)) {
        const existingShortCode = this.urlToShortCode.get(originalUrl);
        return {
          success: true,
          data: {
            shortCode: existingShortCode,
            originalUrl,
            existingUrl: true
          }
        };
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
      
      // Maintain reverse mapping for efficiency
      this.urlToShortCode.set(originalUrl, shortCode);
      
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
   * Get URL data by short code
   * @param {string} shortCode - The short code
   * @returns {object|null} URL data or null if not found
   */
  getUrl(shortCode) {
    return this.urlDatabase.get(shortCode) || null;
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
   * Record a click/access to a short URL with enhanced analytics support
   * @param {string} shortCode - The short code
   * @param {object} req - Express request object or enhanced analytics data
   */
  recordClick(shortCode, req = {}) {
    try {
      const urlData = this.urlDatabase.get(shortCode);
      const analytics = this.analytics.get(shortCode);
      
      if (urlData && analytics) {
        // Update URL data
        urlData.clicks++;
        urlData.lastAccessed = new Date().toISOString();

        // Enhanced analytics data handling
        const timestamp = Date.now();
        let userAgent, ip, enhancedData = {};
        
        // Handle both Express request objects and enhanced analytics data
        if (req.get && typeof req.get === 'function') {
          // Traditional Express request object
          userAgent = req.get('User-Agent') || '';
          ip = this.getClientIP(req);
        } else if (req.userAgent && req.ip) {
          // Enhanced analytics data from bulk generation
          userAgent = req.userAgent;
          ip = req.ip;
          enhancedData = {
            sessionId: req.sessionId,
            behavior: req.behavior,
            geography: req.geography,
            referrer: req.referrer,
            generated: req.generated || false,
            generationContext: req.generationContext,
            timestamp: req.timestamp ? new Date(req.timestamp) : new Date()
          };
        } else {
          // Fallback for manual calls
          userAgent = '';
          ip = 'unknown';
        }

        // Create analytics entry with enhanced data
        const analyticsEntry = {
          timestamp,
          ip,
          userAgent,
          ...enhancedData
        };

        analytics.history.push(analyticsEntry);

        // Limit history size for performance (increased for enhanced analytics)
        const historyLimit = CONFIG.HISTORY_LIMIT || 1000;
        if (analytics.history.length > historyLimit) {
          analytics.history.splice(0, analytics.history.length - historyLimit);
        }

        // Update daily and hourly stats
        const date = new Date().toDateString();
        const hour = new Date().getHours();

        analytics.dailyStats.set(date, (analytics.dailyStats.get(date) || 0) + 1);
        analytics.hourlyStats.set(hour, (analytics.hourlyStats.get(hour) || 0) + 1);

        // Enhanced analytics for bulk-generated data
        if (enhancedData.generated) {
          if (!analytics.bulkGenerated) {
            analytics.bulkGenerated = {
              totalGenerated: 0,
              generationSessions: new Map(),
              behaviorStats: {
                totalSessionDuration: 0,
                totalScrollDepth: 0,
                totalClickEvents: 0,
                bounceCount: 0
              }
            };
          }

          analytics.bulkGenerated.totalGenerated++;
          
          // Track generation sessions
          if (enhancedData.sessionId) {
            const sessionData = analytics.bulkGenerated.generationSessions.get(enhancedData.sessionId) || {
              clicks: 0,
              startTime: timestamp,
              lastActivity: timestamp
            };
            
            sessionData.clicks++;
            sessionData.lastActivity = timestamp;
            analytics.bulkGenerated.generationSessions.set(enhancedData.sessionId, sessionData);
          }

          // Aggregate behavior statistics
          if (enhancedData.behavior) {
            const stats = analytics.bulkGenerated.behaviorStats;
            stats.totalSessionDuration += enhancedData.behavior.sessionDuration || 0;
            stats.totalScrollDepth += enhancedData.behavior.scrollDepth || 0;
            stats.totalClickEvents += enhancedData.behavior.clickEvents || 0;
            if (enhancedData.behavior.bounced) {
              stats.bounceCount++;
            }
          }
        }

        // Security and performance monitoring
        if (!analytics.securityMetrics) {
          analytics.securityMetrics = {
            suspiciousActivityCount: 0,
            lastSecurityCheck: timestamp,
            ipDistribution: new Map(),
            userAgentDistribution: new Map()
          };
        }

        // Track IP and User Agent distribution for security
        const ipCount = analytics.securityMetrics.ipDistribution.get(ip) || 0;
        analytics.securityMetrics.ipDistribution.set(ip, ipCount + 1);
        
        const uaCount = analytics.securityMetrics.userAgentDistribution.get(userAgent) || 0;
        analytics.securityMetrics.userAgentDistribution.set(userAgent, uaCount + 1);

        // Detect suspicious activity patterns
        if (ipCount > 50 || uaCount > 100) {
          analytics.securityMetrics.suspiciousActivityCount++;
          console.warn(`[SECURITY] Suspicious activity detected for ${shortCode}: IP ${ip} (${ipCount} clicks), UA pattern (${uaCount} occurrences)`);
        }
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

    // Enhanced analytics with bulk generation and security data
    const result = {
      shortCode,
      originalUrl: urlData.originalUrl,
      totalClicks: urlData.clicks,
      recentClicks,
      dailyClicks,
      createdAt: urlData.createdAt,
      lastAccessed: urlData.lastAccessed,
      history: analytics.history.slice(-10) // Last 10 clicks
    };

    // Add bulk generation analytics if available
    if (analytics.bulkGenerated) {
      const bulkStats = analytics.bulkGenerated;
      result.bulkGeneration = {
        totalGenerated: bulkStats.totalGenerated,
        generatedPercentage: ((bulkStats.totalGenerated / urlData.clicks) * 100).toFixed(2),
        activeSessions: bulkStats.generationSessions.size,
        averageBehavior: {
          sessionDuration: bulkStats.totalGenerated > 0 ? 
            Math.round(bulkStats.behaviorStats.totalSessionDuration / bulkStats.totalGenerated) : 0,
          scrollDepth: bulkStats.totalGenerated > 0 ? 
            Math.round(bulkStats.behaviorStats.totalScrollDepth / bulkStats.totalGenerated) : 0,
          clickEvents: bulkStats.totalGenerated > 0 ? 
            Math.round(bulkStats.behaviorStats.totalClickEvents / bulkStats.totalGenerated) : 0,
          bounceRate: bulkStats.totalGenerated > 0 ? 
            ((bulkStats.behaviorStats.bounceCount / bulkStats.totalGenerated) * 100).toFixed(2) : 0
        }
      };
    }

    // Add security metrics if available
    if (analytics.securityMetrics) {
      const securityStats = analytics.securityMetrics;
      result.security = {
        suspiciousActivityCount: securityStats.suspiciousActivityCount,
        uniqueIPs: securityStats.ipDistribution.size,
        uniqueUserAgents: securityStats.userAgentDistribution.size,
        lastSecurityCheck: new Date(securityStats.lastSecurityCheck).toISOString(),
        topIPs: Array.from(securityStats.ipDistribution.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([ip, count]) => ({ ip, clicks: count })),
        riskLevel: this.calculateRiskLevel(securityStats, urlData.clicks)
      };
    }

    return result;
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
   * Calculate security risk level for a URL based on analytics
   * @param {object} securityStats - Security metrics
   * @param {number} totalClicks - Total clicks for the URL
   * @returns {string} Risk level (low, medium, high, critical)
   */
  calculateRiskLevel(securityStats, totalClicks) {
    let riskScore = 0;
    
    // Check for suspicious activity
    if (securityStats.suspiciousActivityCount > 0) {
      riskScore += securityStats.suspiciousActivityCount * 10;
    }
    
    // Check IP concentration (many clicks from few IPs is suspicious)
    const avgClicksPerIP = totalClicks / securityStats.ipDistribution.size;
    if (avgClicksPerIP > 20) {
      riskScore += Math.min(avgClicksPerIP - 20, 50);
    }
    
    // Check user agent concentration
    const avgClicksPerUA = totalClicks / securityStats.userAgentDistribution.size;
    if (avgClicksPerUA > 30) {
      riskScore += Math.min(avgClicksPerUA - 30, 30);
    }
    
    // Determine risk level
    if (riskScore >= 100) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 20) return 'medium';
    return 'low';
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