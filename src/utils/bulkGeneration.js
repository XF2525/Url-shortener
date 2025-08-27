/**
 * Enhanced Bulk Generation Utilities with Advanced Security
 * Provides secure, efficient bulk click and blog view generation
 */

const crypto = require('crypto');

class BulkGenerationUtils {
  constructor() {
    // Enhanced security configuration
    this.config = {
      // Stricter rate limits
      maxClicksPerRequest: 100,
      maxBlogViewsPerRequest: 500,
      maxBulkOperationsPerHour: 20,
      maxBulkOperationsPerDay: 5,
      
      // Enhanced delays with jitter
      baseDelays: {
        clickGeneration: 250,
        blogViewGeneration: 350
      },
      
      // Security thresholds
      suspiciousActivityThreshold: 10,
      emergencyStopThreshold: 50,
      ipRotationInterval: 1000,
      
      // Memory and performance limits (adjusted for testing environments)
      maxConcurrentOperations: 3,
      memoryUsageThreshold: 0.95, // Increased from 0.8 to 0.95 for testing environments
      processingTimeout: 300000 // 5 minutes
    };

    // Enhanced tracking for security
    this.operationTracking = new Map();
    this.suspiciousIPs = new Set();
    this.emergencyStop = false;
    
    // Realistic IP pools from major cloud providers (enhanced security)
    this.ipPools = {
      google: ['8.8.8.0/24', '8.8.4.0/24', '74.125.0.0/16'],
      aws: ['52.0.0.0/8', '54.0.0.0/8', '3.0.0.0/8'],
      microsoft: ['13.107.0.0/16', '40.0.0.0/8', '104.0.0.0/8'],
      cloudflare: ['1.1.1.0/24', '1.0.0.0/24'],
      domestic: ['203.0.113.0/24', '198.51.100.0/24', '192.0.2.0/24']
    };

    // Enhanced user agent rotation with fingerprint resistance
    this.userAgents = [
      // Desktop Chrome (latest versions)
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      
      // Desktop Firefox
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
      'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
      
      // Safari
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
      
      // Mobile Chrome
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/121.0.6167.138 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
      
      // Edge
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
    ];

    // Advanced Ads Configuration for Experimental Features
    this.adsConfig = {
      // Ad types with different engagement patterns
      adTypes: {
        banner: {
          name: 'Banner Ad',
          viewRate: 0.85, // 85% view rate
          clickRate: 0.012, // 1.2% CTR
          engagementTime: { min: 500, max: 3000 }, // 0.5-3s
          placements: ['header', 'sidebar', 'footer', 'inline'],
          sizes: ['728x90', '300x250', '320x50', '160x600']
        },
        video: {
          name: 'Video Ad',
          viewRate: 0.75, // 75% view rate
          clickRate: 0.025, // 2.5% CTR
          engagementTime: { min: 5000, max: 30000 }, // 5-30s
          placements: ['pre-roll', 'mid-roll', 'post-roll', 'overlay'],
          completionRate: 0.68 // 68% completion rate
        },
        native: {
          name: 'Native Ad',
          viewRate: 0.92, // 92% view rate
          clickRate: 0.018, // 1.8% CTR
          engagementTime: { min: 2000, max: 8000 }, // 2-8s
          placements: ['feed', 'recommendation', 'related-content'],
          blendFactor: 0.95 // How well it blends with content
        },
        popup: {
          name: 'Popup/Interstitial Ad',
          viewRate: 0.95, // 95% view rate (hard to miss)
          clickRate: 0.008, // 0.8% CTR (often unwanted)
          engagementTime: { min: 1000, max: 5000 }, // 1-5s
          placements: ['page-load', 'exit-intent', 'scroll-trigger'],
          closeRate: 0.87 // 87% immediate close rate
        },
        social: {
          name: 'Social Media Ad',
          viewRate: 0.88, // 88% view rate
          clickRate: 0.015, // 1.5% CTR
          engagementTime: { min: 1500, max: 6000 }, // 1.5-6s
          placements: ['feed', 'story', 'sidebar'],
          shareRate: 0.003 // 0.3% share rate
        }
      },

      // Advanced interaction patterns
      interactionTypes: {
        impression: { weight: 1.0, value: 1 },
        view: { weight: 0.85, value: 2 },
        hover: { weight: 0.25, value: 3 },
        click: { weight: 0.015, value: 10 },
        engagement: { weight: 0.08, value: 5 },
        conversion: { weight: 0.002, value: 50 }
      },

      // Realistic engagement patterns based on demographics
      demographics: {
        '18-24': { clickRate: 1.8, videoCompletion: 0.62, mobilePreference: 0.85 },
        '25-34': { clickRate: 1.5, videoCompletion: 0.71, mobilePreference: 0.78 },
        '35-44': { clickRate: 1.2, videoCompletion: 0.75, mobilePreference: 0.65 },
        '45-54': { clickRate: 0.9, videoCompletion: 0.78, mobilePreference: 0.55 },
        '55+': { clickRate: 0.7, videoCompletion: 0.82, mobilePreference: 0.42 }
      },

      // Advanced fraud detection patterns
      fraudDetection: {
        maxClicksPerSession: 3,
        minTimeBetweenClicks: 2000, // 2 seconds
        suspiciousPatterns: {
          rapidClicks: 5, // 5+ clicks in short time
          identicalTimings: 3, // 3+ identical timing patterns
          unusualEngagement: 0.95 // 95%+ engagement (too high)
        }
      }
    };
  }

  /**
   * Enhanced security validation for bulk operations
   */
  validateSecurityContext(req, operationType, requestedCount) {
    const ip = this.getClientIP(req);
    const timestamp = Date.now();
    
    // Check emergency stop
    if (this.emergencyStop) {
      throw new Error('Emergency stop active - all bulk operations suspended');
    }

    // Check suspicious IP
    if (this.suspiciousIPs.has(ip)) {
      throw new Error('IP flagged as suspicious - access denied');
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageRatio = memUsage.heapUsed / memUsage.heapTotal;
    if (memUsageRatio > this.config.memoryUsageThreshold) {
      throw new Error('System under high memory load - operation deferred');
    }

    // Enhanced rate limiting
    this.enforceAdvancedRateLimit(ip, operationType, requestedCount, timestamp);

    return {
      ip,
      timestamp,
      operationType,
      requestedCount,
      sessionId: crypto.randomUUID()
    };
  }

  /**
   * Advanced rate limiting with progressive penalties
   */
  enforceAdvancedRateLimit(ip, operationType, requestedCount, timestamp) {
    if (!this.operationTracking.has(ip)) {
      this.operationTracking.set(ip, {
        operations: [],
        violations: 0,
        lastViolation: null,
        totalRequests: 0,
        totalGenerated: 0
      });
    }

    const tracking = this.operationTracking.get(ip);
    
    // Clean old operations (24 hours)
    tracking.operations = tracking.operations.filter(op => 
      timestamp - op.timestamp < 86400000
    );

    // Check hourly limits
    const hourlyOps = tracking.operations.filter(op => 
      timestamp - op.timestamp < 3600000
    );
    
    if (hourlyOps.length >= this.config.maxBulkOperationsPerHour) {
      tracking.violations++;
      tracking.lastViolation = timestamp;
      
      if (tracking.violations >= 3) {
        this.suspiciousIPs.add(ip);
      }
      
      throw new Error(`Rate limit exceeded: ${this.config.maxBulkOperationsPerHour} operations per hour`);
    }

    // Check daily limits
    if (tracking.operations.length >= this.config.maxBulkOperationsPerDay) {
      throw new Error(`Daily limit exceeded: ${this.config.maxBulkOperationsPerDay} operations per day`);
    }

    // Check request size limits
    const maxAllowed = operationType === 'blog' ? 
      this.config.maxBlogViewsPerRequest : 
      this.config.maxClicksPerRequest;
      
    if (requestedCount > maxAllowed) {
      throw new Error(`Request size too large: max ${maxAllowed} per request`);
    }

    // Progressive delay enforcement for repeated usage
    const recentOps = hourlyOps.length;
    if (recentOps > 5) {
      const penaltyDelay = Math.min(recentOps * 1000, 30000); // Max 30s penalty
      throw new Error(`Rate limit cooldown: wait ${penaltyDelay/1000}s before next operation`);
    }

    // Record the operation
    tracking.operations.push({
      timestamp,
      operationType,
      requestedCount
    });
    tracking.totalRequests++;
    tracking.totalGenerated += requestedCount;
  }

  /**
   * Generate realistic IP address from secure pools
   */
  generateSecureRandomIP() {
    const pools = Object.values(this.ipPools).flat();
    const selectedPool = pools[Math.floor(Math.random() * pools.length)];
    
    // Parse CIDR notation
    const [network, prefix] = selectedPool.split('/');
    const networkParts = network.split('.').map(Number);
    const prefixLength = parseInt(prefix);
    
    // Generate random IP within the subnet
    const hostBits = 32 - prefixLength;
    const maxHosts = Math.pow(2, hostBits) - 2; // Exclude network and broadcast
    const randomHost = Math.floor(Math.random() * maxHosts) + 1;
    
    // Calculate the IP
    let ip = (networkParts[0] << 24) + (networkParts[1] << 16) + 
             (networkParts[2] << 8) + networkParts[3];
    ip += randomHost;
    
    return [
      (ip >>> 24) & 255,
      (ip >>> 16) & 255,
      (ip >>> 8) & 255,
      ip & 255
    ].join('.');
  }

  /**
   * Get random user agent with anti-fingerprinting
   */
  getSecureRandomUserAgent() {
    const agent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    
    // Add slight variations to avoid fingerprinting
    if (Math.random() < 0.1) {
      // Randomly modify minor version numbers
      return agent.replace(/\.\d+\./g, (match) => {
        const version = parseInt(match.slice(1, -1));
        const variation = Math.floor(Math.random() * 5) - 2; // ±2
        return `.${Math.max(0, version + variation)}.`;
      });
    }
    
    return agent;
  }

  /**
   * Generate realistic delay with anti-pattern protection
   */
  getSecureRandomDelay(baseDelay) {
    // Add jitter: ±30% with non-uniform distribution
    const jitterRange = baseDelay * 0.3;
    const jitter = (Math.random() - 0.5) * jitterRange * 2;
    
    // Add micro-delays to avoid pattern detection
    const microJitter = Math.random() * 50;
    
    return Math.max(100, Math.floor(baseDelay + jitter + microJitter));
  }

  /**
   * Create realistic analytics data with enhanced entropy
   */
  generateSecureAnalyticsData(operationType) {
    const timestamp = new Date();
    const sessionId = crypto.randomUUID();
    
    const data = {
      timestamp: timestamp.toISOString(),
      sessionId,
      ip: this.generateSecureRandomIP(),
      userAgent: this.getSecureRandomUserAgent(),
      
      // Enhanced behavioral simulation
      behavior: {
        // Realistic time spent (2-300 seconds)
        sessionDuration: Math.floor(Math.random() * 298000) + 2000,
        
        // Scroll depth (20-100%)
        scrollDepth: Math.floor(Math.random() * 80) + 20,
        
        // Page interactions
        clickEvents: Math.floor(Math.random() * 5),
        
        // Realistic bounce rate simulation
        bounced: Math.random() < 0.3,
        
        // Time patterns (prefer business hours)
        timePattern: this.getRealisticTimePattern(timestamp)
      },
      
      // Geographic simulation
      geography: {
        timezone: this.getRandomTimezone(),
        region: this.getRandomRegion(),
        language: this.getRandomLanguage()
      },
      
      // Referrer simulation with security
      referrer: this.getSecureRandomReferrer(),
      
      // Enhanced security markers
      security: {
        generated: true,
        method: 'bulk_generation',
        operationType,
        entropy: crypto.randomBytes(16).toString('hex')
      }
    };

    return data;
  }

  /**
   * Get realistic time pattern based on current time
   */
  getRealisticTimePattern(timestamp) {
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    
    // Business hours are more likely
    if (hour >= 9 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      return 'business_hours';
    } else if (hour >= 18 && hour <= 23) {
      return 'evening';
    } else if (hour >= 0 && hour <= 6) {
      return 'night';
    } else {
      return 'weekend';
    }
  }

  /**
   * Security-enhanced helper methods
   */
  getRandomTimezone() {
    const timezones = ['UTC', 'PST', 'EST', 'GMT', 'CET', 'JST', 'AEST'];
    return timezones[Math.floor(Math.random() * timezones.length)];
  }

  getRandomRegion() {
    const regions = ['North America', 'Europe', 'Asia', 'Oceania', 'South America'];
    return regions[Math.floor(Math.random() * regions.length)];
  }

  getRandomLanguage() {
    const languages = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'ja-JP', 'zh-CN'];
    return languages[Math.floor(Math.random() * languages.length)];
  }

  getSecureRandomReferrer() {
    const referrers = [
      'https://www.google.com/search',
      'https://www.bing.com/search',
      'https://duckduckgo.com/',
      'https://www.yahoo.com/search',
      'direct',
      'social_media',
      'email_campaign'
    ];
    return referrers[Math.floor(Math.random() * referrers.length)];
  }

  /**
   * Get client IP with security validation
   */
  getClientIP(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : req.connection?.remoteAddress || 'unknown';
    
    // Validate IP format for security
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip) ? ip : 'unknown';
  }

  /**
   * Emergency stop functionality
   */
  activateEmergencyStop(reason) {
    this.emergencyStop = true;
    console.error(`[SECURITY] Emergency stop activated: ${reason}`);
    
    // Log security event
    const securityEvent = {
      timestamp: new Date().toISOString(),
      event: 'emergency_stop_activated',
      reason,
      activeOperations: this.operationTracking.size,
      suspiciousIPs: Array.from(this.suspiciousIPs)
    };
    
    console.error('[SECURITY] Emergency stop details:', securityEvent);
    return securityEvent;
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    return {
      emergencyStop: this.emergencyStop,
      suspiciousIPs: this.suspiciousIPs.size,
      activeTrackingEntries: this.operationTracking.size,
      memoryUsage: process.memoryUsage(),
      systemLoad: process.loadavg ? process.loadavg() : null
    };
  }

  /**
   * Cleanup old tracking data
   */
  performSecurityCleanup() {
    const now = Date.now();
    const cleanupThreshold = 24 * 60 * 60 * 1000; // 24 hours
    
    // Clean operation tracking
    for (const [ip, tracking] of this.operationTracking.entries()) {
      tracking.operations = tracking.operations.filter(op => 
        now - op.timestamp < cleanupThreshold
      );
      
      if (tracking.operations.length === 0 && (!tracking.lastViolation || now - tracking.lastViolation > cleanupThreshold)) {
        this.operationTracking.delete(ip);
      }
    }
    
    // Clean suspicious IPs after 24 hours of good behavior
    // This would need more sophisticated logic in production
    const suspiciousToRemove = [];
    for (const ip of this.suspiciousIPs) {
      const tracking = this.operationTracking.get(ip);
      if (!tracking || (tracking.lastViolation && now - tracking.lastViolation > cleanupThreshold)) {
        suspiciousToRemove.push(ip);
      }
    }
    
    suspiciousToRemove.forEach(ip => this.suspiciousIPs.delete(ip));
    
    console.log(`[SECURITY] Cleanup completed: ${suspiciousToRemove.length} IPs unbanned, ${this.operationTracking.size} active tracking entries`);
  }

  /**
   * ====================================================================
   * EXPERIMENTAL ADS INTERACTION FEATURES
   * Advanced realistic ads interaction simulation for blog views
   * ====================================================================
   */

  /**
   * Generate realistic ads interaction data for blog views
   */
  generateAdvancedAdsInteraction(blogViewData, adsOptions = {}) {
    const {
      enableAds = true,
      adTypes = ['banner', 'native', 'video'],
      maxAdsPerView = 5,
      demographicProfile = null,
      fraudDetection = true
    } = adsOptions;

    if (!enableAds) {
      return { adsEnabled: false, interactions: [] };
    }

    const interactions = [];
    const adsCount = Math.floor(Math.random() * maxAdsPerView) + 1;

    // Determine user demographic profile
    const demographic = demographicProfile || this.getRandomDemographic();
    const demogData = this.adsConfig.demographics[demographic];

    console.log(`[ADS] Generating ${adsCount} ads interactions for demographic: ${demographic}`);

    for (let i = 0; i < adsCount; i++) {
      const adType = adTypes[Math.floor(Math.random() * adTypes.length)];
      const adConfig = this.adsConfig.adTypes[adType];
      
      if (!adConfig) continue;

      const interaction = this.generateSingleAdInteraction(adType, adConfig, demogData, blogViewData);
      
      // Apply fraud detection if enabled
      if (fraudDetection && this.detectSuspiciousAdBehavior(interaction, interactions)) {
        console.warn(`[ADS] Suspicious ad behavior detected, skipping interaction`);
        continue;
      }

      interactions.push(interaction);
    }

    return {
      adsEnabled: true,
      totalAds: interactions.length,
      demographic,
      interactions,
      analytics: this.calculateAdsAnalytics(interactions)
    };
  }

  /**
   * Generate a single realistic ad interaction
   */
  generateSingleAdInteraction(adType, adConfig, demogData, blogViewData) {
    const timestamp = new Date();
    const interactionId = crypto.randomUUID();

    // Determine if ad will be viewed based on view rate
    const isViewed = Math.random() < adConfig.viewRate;
    const viewDuration = isViewed ? 
      Math.floor(Math.random() * (adConfig.engagementTime.max - adConfig.engagementTime.min)) + adConfig.engagementTime.min :
      0;

    // Determine interaction type based on probabilities
    const interactionType = this.determineInteractionType(adConfig, demogData);
    
    // Generate placement and creative details
    const placement = adConfig.placements[Math.floor(Math.random() * adConfig.placements.length)];
    const creative = this.generateAdCreative(adType, adConfig);

    const interaction = {
      interactionId,
      adType,
      timestamp: timestamp.toISOString(),
      placement,
      creative,
      
      // Interaction details
      interaction: {
        type: interactionType,
        viewed: isViewed,
        viewDuration,
        engaged: viewDuration > 2000, // Engaged if viewed > 2s
        clicked: interactionType === 'click',
        converted: interactionType === 'conversion'
      },

      // Technical details
      technical: {
        loadTime: Math.floor(Math.random() * 2000) + 200, // 200ms - 2.2s
        renderTime: Math.floor(Math.random() * 500) + 50, // 50-550ms
        visible: isViewed,
        inViewport: isViewed && Math.random() < 0.9 // 90% in viewport if viewed
      },

      // Engagement metrics
      engagement: {
        hoverTime: interactionType === 'hover' ? Math.floor(Math.random() * 3000) + 500 : 0,
        scrollPastTime: Math.floor(Math.random() * 1000) + 100,
        attentionScore: Math.random() * 100,
        qualityScore: this.calculateAdQualityScore(adType, interactionType, viewDuration)
      },

      // Revenue simulation (CPM/CPC/CPA model)
      revenue: this.calculateAdRevenue(adType, interactionType, demogData),

      // Fraud detection markers
      fraud: {
        suspicious: false,
        riskScore: Math.random() * 30, // Low risk baseline
        patterns: this.generateFraudPatterns()
      },

      // Enhanced analytics
      analytics: {
        sessionId: blogViewData.sessionId,
        pageContext: {
          readTime: blogViewData.behavior?.readTime || 0,
          scrollDepth: blogViewData.behavior?.scrollDepth || 0,
          pageEngagement: blogViewData.behavior?.engagementScore || 0
        },
        userContext: {
          demographic: demogData,
          deviceType: this.detectDeviceType(blogViewData.userAgent),
          browserType: this.detectBrowserType(blogViewData.userAgent)
        }
      }
    };

    return interaction;
  }

  /**
   * Determine interaction type based on ad config and demographics
   */
  determineInteractionType(adConfig, demogData) {
    const rand = Math.random();
    const adjustedClickRate = adConfig.clickRate * (demogData.clickRate / 1.0); // Adjust by demographic

    if (rand < adjustedClickRate * 0.1) return 'conversion'; // 10% of clicks convert
    if (rand < adjustedClickRate) return 'click';
    if (rand < adjustedClickRate * 5) return 'engagement'; // 5x more engagement than clicks
    if (rand < adjustedClickRate * 15) return 'hover'; // 15x more hovers
    if (rand < adConfig.viewRate * 0.9) return 'view'; // 90% of views
    return 'impression';
  }

  /**
   * Generate ad creative details
   */
  generateAdCreative(adType, adConfig) {
    const creative = {
      id: crypto.randomUUID(),
      type: adType,
      campaign: `campaign_${Math.floor(Math.random() * 1000)}`,
      advertiser: this.getRandomAdvertiser(),
    };

    switch (adType) {
      case 'banner':
        creative.size = adConfig.sizes[Math.floor(Math.random() * adConfig.sizes.length)];
        creative.format = 'image';
        break;
      case 'video':
        creative.duration = Math.floor(Math.random() * 25) + 15; // 15-40s
        creative.format = 'video/mp4';
        creative.autoplay = Math.random() < 0.7; // 70% autoplay
        break;
      case 'native':
        creative.title = `Native Ad ${Math.floor(Math.random() * 1000)}`;
        creative.blendScore = adConfig.blendFactor;
        break;
      case 'popup':
        creative.triggerType = adConfig.placements[Math.floor(Math.random() * adConfig.placements.length)];
        creative.modal = true;
        break;
      case 'social':
        creative.socialPlatform = ['facebook', 'twitter', 'instagram', 'linkedin'][Math.floor(Math.random() * 4)];
        break;
    }

    return creative;
  }

  /**
   * Calculate ad quality score based on interaction
   */
  calculateAdQualityScore(adType, interactionType, viewDuration) {
    let baseScore = 50;
    
    // Type bonuses
    const typeBonuses = {
      'conversion': 50,
      'click': 30,
      'engagement': 20,
      'hover': 10,
      'view': 5,
      'impression': 1
    };

    baseScore += typeBonuses[interactionType] || 0;

    // View duration bonus
    if (viewDuration > 5000) baseScore += 20; // 5+ seconds
    else if (viewDuration > 2000) baseScore += 10; // 2+ seconds

    // Ad type adjustments
    if (adType === 'native') baseScore += 10; // Native typically higher quality
    if (adType === 'popup') baseScore -= 15; // Popups typically lower quality

    return Math.min(100, Math.max(0, baseScore + (Math.random() * 20 - 10))); // ±10 variance
  }

  /**
   * Calculate ad revenue based on interaction type and demographics
   */
  calculateAdRevenue(adType, interactionType, demogData) {
    const baseRates = {
      impression: 0.001, // $0.001 CPM
      view: 0.005,       // $0.005 CPV
      hover: 0.01,       // $0.01
      engagement: 0.02,  // $0.02
      click: 0.25,       // $0.25 CPC
      conversion: 2.50   // $2.50 CPA
    };

    const rate = baseRates[interactionType] || 0;
    const demographicMultiplier = demogData.clickRate / 1.0; // Adjust by demographic value
    
    return +(rate * demographicMultiplier * (0.8 + Math.random() * 0.4)).toFixed(4); // ±20% variance
  }

  /**
   * Detect suspicious ad behavior patterns
   */
  detectSuspiciousAdBehavior(interaction, existingInteractions) {
    const fraudConfig = this.adsConfig.fraudDetection;
    
    // Check for too many clicks in session
    const clickCount = existingInteractions.filter(i => i.interaction.clicked).length;
    if (interaction.interaction.clicked && clickCount >= fraudConfig.maxClicksPerSession) {
      return true;
    }

    // Check for rapid successive interactions
    if (existingInteractions.length > 0) {
      const lastInteraction = existingInteractions[existingInteractions.length - 1];
      const timeDiff = new Date(interaction.timestamp) - new Date(lastInteraction.timestamp);
      if (timeDiff < fraudConfig.minTimeBetweenClicks) {
        return true;
      }
    }

    // Check for unusually high engagement patterns
    const engagementRate = existingInteractions.filter(i => i.interaction.engaged).length / (existingInteractions.length || 1);
    if (engagementRate > fraudConfig.suspiciousPatterns.unusualEngagement) {
      return true;
    }

    return false;
  }

  /**
   * Calculate comprehensive ads analytics
   */
  calculateAdsAnalytics(interactions) {
    if (interactions.length === 0) {
      return { totalInteractions: 0 };
    }

    const analytics = {
      totalInteractions: interactions.length,
      
      // Interaction breakdown
      impressions: interactions.filter(i => i.interaction.type === 'impression').length,
      views: interactions.filter(i => i.interaction.viewed).length,
      hovers: interactions.filter(i => i.interaction.type === 'hover').length,
      engagements: interactions.filter(i => i.interaction.engaged).length,
      clicks: interactions.filter(i => i.interaction.clicked).length,
      conversions: interactions.filter(i => i.interaction.converted).length,

      // Performance metrics
      viewRate: interactions.filter(i => i.interaction.viewed).length / interactions.length,
      clickThroughRate: interactions.filter(i => i.interaction.clicked).length / interactions.length,
      conversionRate: interactions.filter(i => i.interaction.converted).length / interactions.length,
      
      // Engagement metrics
      averageViewDuration: interactions.reduce((sum, i) => sum + i.interaction.viewDuration, 0) / interactions.length,
      averageQualityScore: interactions.reduce((sum, i) => sum + i.engagement.qualityScore, 0) / interactions.length,
      
      // Revenue metrics
      totalRevenue: interactions.reduce((sum, i) => sum + i.revenue, 0),
      averageRevenue: interactions.reduce((sum, i) => sum + i.revenue, 0) / interactions.length,
      
      // Technical metrics
      averageLoadTime: interactions.reduce((sum, i) => sum + i.technical.loadTime, 0) / interactions.length,
      viewabilityRate: interactions.filter(i => i.technical.inViewport).length / interactions.length,
      
      // Ad type breakdown
      adTypeBreakdown: this.getAdTypeBreakdown(interactions),
      
      // Fraud metrics
      suspiciousInteractions: interactions.filter(i => i.fraud.suspicious).length,
      averageRiskScore: interactions.reduce((sum, i) => sum + i.fraud.riskScore, 0) / interactions.length
    };

    return analytics;
  }

  /**
   * Get ad type breakdown for analytics
   */
  getAdTypeBreakdown(interactions) {
    const breakdown = {};
    interactions.forEach(interaction => {
      const type = interaction.adType;
      if (!breakdown[type]) {
        breakdown[type] = {
          count: 0,
          clicks: 0,
          revenue: 0,
          averageEngagement: 0
        };
      }
      breakdown[type].count++;
      if (interaction.interaction.clicked) breakdown[type].clicks++;
      breakdown[type].revenue += interaction.revenue;
      breakdown[type].averageEngagement += interaction.engagement.qualityScore;
    });

    // Calculate averages
    Object.keys(breakdown).forEach(type => {
      breakdown[type].averageEngagement /= breakdown[type].count;
      breakdown[type].clickThroughRate = breakdown[type].clicks / breakdown[type].count;
    });

    return breakdown;
  }

  /**
   * Helper methods for ads generation
   */
  getRandomDemographic() {
    const demographics = Object.keys(this.adsConfig.demographics);
    return demographics[Math.floor(Math.random() * demographics.length)];
  }

  getRandomAdvertiser() {
    const advertisers = [
      'TechCorp', 'FashionBrand', 'AutoDealer', 'FinanceApp', 'HealthWellness',
      'TravelSite', 'FoodDelivery', 'GameStudio', 'EdTech', 'EcommercePlus'
    ];
    return advertisers[Math.floor(Math.random() * advertisers.length)];
  }

  detectDeviceType(userAgent) {
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) return 'mobile';
    if (userAgent.includes('iPad') || userAgent.includes('tablet')) return 'tablet';
    return 'desktop';
  }

  detectBrowserType(userAgent) {
    if (userAgent.includes('Chrome')) return 'chrome';
    if (userAgent.includes('Firefox')) return 'firefox';
    if (userAgent.includes('Safari')) return 'safari';
    if (userAgent.includes('Edge')) return 'edge';
    return 'other';
  }

  generateFraudPatterns() {
    return {
      rapidClicks: Math.random() < 0.05, // 5% chance
      identicalTimings: Math.random() < 0.03, // 3% chance
      botLikePattern: Math.random() < 0.02, // 2% chance
      geoAnomaly: Math.random() < 0.01 // 1% chance
    };
  }
}

module.exports = new BulkGenerationUtils();