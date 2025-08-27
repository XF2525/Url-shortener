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
}

module.exports = new BulkGenerationUtils();