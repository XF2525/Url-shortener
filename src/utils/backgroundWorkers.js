/**
 * Background Workers for Continuous Click and View Generation
 * Manages long-running background processes for traffic generation
 */

const urlShortener = require('../models/UrlShortener');
const bulkGeneration = require('./bulkGeneration');

class BackgroundWorkerManager {
  constructor() {
    // Worker state tracking
    this.workers = {
      clickGeneration: {
        active: false,
        interval: null,
        config: null,
        stats: { started: null, totalGenerated: 0, errors: 0 }
      },
      viewGeneration: {
        active: false,
        interval: null,
        config: null,
        stats: { started: null, totalGenerated: 0, errors: 0 }
      }
    };
    
    // Default configurations
    this.defaultConfigs = {
      clickGeneration: {
        intervalMs: 5000, // Generate clicks every 5 seconds
        clicksPerInterval: 1, // 1-3 clicks per interval
        maxClicksPerInterval: 3,
        enableRandomDelay: true,
        delayVariation: 2000, // ±2 seconds
        respectRateLimits: true
      },
      viewGeneration: {
        intervalMs: 8000, // Generate views every 8 seconds
        viewsPerInterval: 1, // 1-2 views per interval
        maxViewsPerInterval: 2,
        enableRandomDelay: true,
        delayVariation: 3000, // ±3 seconds
        respectRateLimits: true,
        enableAds: true,
        adsInteractionRate: 0.7 // 70% of views have ads interactions
      }
    };
    
    // Background process safety limits
    this.safetyLimits = {
      maxMemoryUsagePercent: 90,
      maxConcurrentOperations: 2,
      maxErrorsBeforeStop: 10,
      maxRuntimeHours: 24,
      maxGenerationsPerHour: 500
    };
    
    // Track system health
    this.systemHealth = {
      memoryMonitorInterval: null,
      lastMemoryCheck: null,
      highMemoryWarnings: 0
    };
    
    console.log('[BACKGROUND] Background Worker Manager initialized');
  }

  /**
   * Start continuous click generation worker
   */
  async startClickGeneration(config = {}) {
    try {
      if (this.workers.clickGeneration.active) {
        throw new Error('Click generation worker is already running');
      }

      // Merge with default config
      const finalConfig = { ...this.defaultConfigs.clickGeneration, ...config };
      
      // Validate URLs exist
      const allUrls = urlShortener.getAllUrls();
      if (allUrls.length === 0) {
        throw new Error('No URLs available for click generation');
      }

      console.log(`[BACKGROUND] Starting continuous click generation worker with config:`, finalConfig);
      
      // Initialize worker state
      this.workers.clickGeneration.config = finalConfig;
      this.workers.clickGeneration.stats = {
        started: new Date().toISOString(),
        totalGenerated: 0,
        errors: 0,
        lastGeneration: null
      };

      // Start the worker
      this.workers.clickGeneration.interval = setInterval(async () => {
        await this.generateBackgroundClicks();
      }, finalConfig.intervalMs);

      this.workers.clickGeneration.active = true;
      
      // Start system monitoring if not already running
      this.startSystemMonitoring();
      
      console.log(`[BACKGROUND] Click generation worker started successfully`);
      
      return {
        success: true,
        message: 'Continuous click generation started',
        workerId: 'clickGeneration',
        config: finalConfig,
        stats: this.workers.clickGeneration.stats
      };

    } catch (error) {
      console.error('[BACKGROUND] Failed to start click generation worker:', error);
      throw error;
    }
  }

  /**
   * Start continuous view generation worker
   */
  async startViewGeneration(config = {}) {
    try {
      if (this.workers.viewGeneration.active) {
        throw new Error('View generation worker is already running');
      }

      // Merge with default config
      const finalConfig = { ...this.defaultConfigs.viewGeneration, ...config };
      
      console.log(`[BACKGROUND] Starting continuous view generation worker with config:`, finalConfig);
      
      // Initialize worker state
      this.workers.viewGeneration.config = finalConfig;
      this.workers.viewGeneration.stats = {
        started: new Date().toISOString(),
        totalGenerated: 0,
        errors: 0,
        lastGeneration: null,
        totalAdsInteractions: 0,
        totalAdsRevenue: 0
      };

      // Start the worker
      this.workers.viewGeneration.interval = setInterval(async () => {
        await this.generateBackgroundViews();
      }, finalConfig.intervalMs);

      this.workers.viewGeneration.active = true;
      
      // Start system monitoring if not already running
      this.startSystemMonitoring();
      
      console.log(`[BACKGROUND] View generation worker started successfully`);
      
      return {
        success: true,
        message: 'Continuous view generation started',
        workerId: 'viewGeneration',
        config: finalConfig,
        stats: this.workers.viewGeneration.stats
      };

    } catch (error) {
      console.error('[BACKGROUND] Failed to start view generation worker:', error);
      throw error;
    }
  }

  /**
   * Generate background clicks for random URLs
   */
  async generateBackgroundClicks() {
    const worker = this.workers.clickGeneration;
    
    try {
      if (!worker.active) return;

      // Check system health
      if (!this.isSystemHealthy()) {
        console.warn('[BACKGROUND] Skipping click generation due to system health concerns');
        return;
      }

      const allUrls = urlShortener.getAllUrls();
      if (allUrls.length === 0) {
        console.warn('[BACKGROUND] No URLs available for click generation');
        return;
      }

      // Randomly select URL
      const randomUrl = allUrls[Math.floor(Math.random() * allUrls.length)];
      
      // Determine number of clicks to generate
      const config = worker.config;
      const clicksToGenerate = Math.floor(Math.random() * (config.maxClicksPerInterval - config.clicksPerInterval + 1)) + config.clicksPerInterval;

      console.log(`[BACKGROUND] Generating ${clicksToGenerate} background clicks for ${randomUrl.shortCode}`);

      for (let i = 0; i < clicksToGenerate; i++) {
        // Generate realistic analytics data
        const analyticsData = bulkGeneration.generateSecureAnalyticsData('background_click');
        
        // Register the click
        urlShortener.recordClick(randomUrl.shortCode, {
          ip: analyticsData.ip,
          userAgent: analyticsData.userAgent,
          timestamp: new Date(analyticsData.timestamp),
          sessionId: analyticsData.sessionId,
          behavior: analyticsData.behavior,
          geography: analyticsData.geography,
          referrer: analyticsData.referrer,
          generated: true,
          background: true,
          generationContext: {
            type: 'background_worker',
            workerId: 'clickGeneration',
            timestamp: new Date().toISOString()
          }
        });

        worker.stats.totalGenerated++;
        
        // Add small delay between clicks
        if (i < clicksToGenerate - 1) {
          await this.sleep(Math.random() * 1000 + 500); // 0.5-1.5s between clicks
        }
      }

      worker.stats.lastGeneration = new Date().toISOString();
      
      // Apply random delay if enabled
      if (config.enableRandomDelay) {
        const randomDelay = Math.random() * config.delayVariation - (config.delayVariation / 2);
        if (randomDelay > 0) {
          await this.sleep(randomDelay);
        }
      }

    } catch (error) {
      worker.stats.errors++;
      console.error('[BACKGROUND] Error in background click generation:', error);
      
      // Stop worker if too many errors
      if (worker.stats.errors >= this.safetyLimits.maxErrorsBeforeStop) {
        console.error(`[BACKGROUND] Stopping click generation worker due to ${worker.stats.errors} errors`);
        this.stopWorker('clickGeneration');
      }
    }
  }

  /**
   * Generate background blog views with ads interactions
   */
  async generateBackgroundViews() {
    const worker = this.workers.viewGeneration;
    
    try {
      if (!worker.active) return;

      // Check system health
      if (!this.isSystemHealthy()) {
        console.warn('[BACKGROUND] Skipping view generation due to system health concerns');
        return;
      }

      const config = worker.config;
      
      // Determine number of views to generate
      const viewsToGenerate = Math.floor(Math.random() * (config.maxViewsPerInterval - config.viewsPerInterval + 1)) + config.viewsPerInterval;

      console.log(`[BACKGROUND] Generating ${viewsToGenerate} background blog views`);

      for (let i = 0; i < viewsToGenerate; i++) {
        // Generate realistic blog view analytics
        const analyticsData = bulkGeneration.generateSecureAnalyticsData('background_blog_view');
        
        // Enhanced blog-specific behavior
        analyticsData.behavior = {
          ...analyticsData.behavior,
          readTime: Math.floor(Math.random() * 180000) + 45000, // 45s - 3min
          scrollDepth: Math.floor(Math.random() * 50) + 50, // 50-100%
          engagementScore: Math.random() * 100,
          returnVisitor: Math.random() < 0.25 // 25% return visitors
        };

        // Generate ads interactions if enabled
        let adsInteraction = null;
        if (config.enableAds && Math.random() < config.adsInteractionRate) {
          const adsOptions = {
            enableAds: true,
            adTypes: ['banner', 'native', 'video'],
            maxAdsPerView: 3,
            demographicProfile: null,
            fraudDetection: true,
            experimentalFeatures: true
          };
          
          adsInteraction = bulkGeneration.generateAdvancedAdsInteraction(analyticsData, adsOptions);
          
          if (adsInteraction && adsInteraction.analytics) {
            worker.stats.totalAdsInteractions += adsInteraction.analytics.totalInteractions || 0;
            worker.stats.totalAdsRevenue += adsInteraction.analytics.totalRevenue || 0;
          }
        }

        // Store blog view (simulated - would integrate with actual blog system)
        const blogView = {
          blogId: `blog_${Math.floor(Math.random() * 100) + 1}`, // Random blog ID
          timestamp: analyticsData.timestamp,
          ip: analyticsData.ip,
          userAgent: analyticsData.userAgent,
          sessionId: analyticsData.sessionId,
          behavior: analyticsData.behavior,
          geography: analyticsData.geography,
          referrer: analyticsData.referrer,
          generated: true,
          background: true,
          adsInteraction: adsInteraction,
          generationContext: {
            type: 'background_worker',
            workerId: 'viewGeneration',
            timestamp: new Date().toISOString()
          }
        };

        worker.stats.totalGenerated++;
        
        // Add small delay between views
        if (i < viewsToGenerate - 1) {
          await this.sleep(Math.random() * 2000 + 1000); // 1-3s between views
        }
      }

      worker.stats.lastGeneration = new Date().toISOString();
      
      // Apply random delay if enabled
      if (config.enableRandomDelay) {
        const randomDelay = Math.random() * config.delayVariation - (config.delayVariation / 2);
        if (randomDelay > 0) {
          await this.sleep(randomDelay);
        }
      }

    } catch (error) {
      worker.stats.errors++;
      console.error('[BACKGROUND] Error in background view generation:', error);
      
      // Stop worker if too many errors
      if (worker.stats.errors >= this.safetyLimits.maxErrorsBeforeStop) {
        console.error(`[BACKGROUND] Stopping view generation worker due to ${worker.stats.errors} errors`);
        this.stopWorker('viewGeneration');
      }
    }
  }

  /**
   * Stop a specific worker
   */
  stopWorker(workerId) {
    try {
      const worker = this.workers[workerId];
      if (!worker || !worker.active) {
        return { success: false, message: `Worker ${workerId} is not running` };
      }

      if (worker.interval) {
        clearInterval(worker.interval);
        worker.interval = null;
      }

      worker.active = false;
      const stats = { ...worker.stats };
      stats.stopped = new Date().toISOString();
      
      console.log(`[BACKGROUND] Stopped ${workerId} worker. Final stats:`, stats);
      
      // Stop system monitoring if no workers are active
      this.checkSystemMonitoring();
      
      return {
        success: true,
        message: `Worker ${workerId} stopped successfully`,
        finalStats: stats
      };

    } catch (error) {
      console.error(`[BACKGROUND] Error stopping worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Stop all background workers
   */
  stopAllWorkers() {
    const results = {};
    
    Object.keys(this.workers).forEach(workerId => {
      try {
        results[workerId] = this.stopWorker(workerId);
      } catch (error) {
        results[workerId] = { success: false, error: error.message };
      }
    });
    
    this.stopSystemMonitoring();
    
    console.log('[BACKGROUND] All workers stopped');
    return results;
  }

  /**
   * Get status of all workers
   */
  getWorkersStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      systemHealth: this.getSystemHealth(),
      workers: {}
    };

    Object.entries(this.workers).forEach(([workerId, worker]) => {
      status.workers[workerId] = {
        active: worker.active,
        config: worker.config,
        stats: worker.stats,
        runtime: worker.stats.started ? 
          Math.floor((Date.now() - new Date(worker.stats.started).getTime()) / 1000) : 0
      };
    });

    return status;
  }

  /**
   * Start system health monitoring
   */
  startSystemMonitoring() {
    if (this.systemHealth.memoryMonitorInterval) return;
    
    this.systemHealth.memoryMonitorInterval = setInterval(() => {
      this.checkSystemHealth();
    }, 30000); // Check every 30 seconds
    
    console.log('[BACKGROUND] System health monitoring started');
  }

  /**
   * Stop system health monitoring
   */
  stopSystemMonitoring() {
    if (this.systemHealth.memoryMonitorInterval) {
      clearInterval(this.systemHealth.memoryMonitorInterval);
      this.systemHealth.memoryMonitorInterval = null;
      console.log('[BACKGROUND] System health monitoring stopped');
    }
  }

  /**
   * Check if system monitoring should continue
   */
  checkSystemMonitoring() {
    const hasActiveWorkers = Object.values(this.workers).some(worker => worker.active);
    if (!hasActiveWorkers) {
      this.stopSystemMonitoring();
    }
  }

  /**
   * Check system health
   */
  checkSystemHealth() {
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    this.systemHealth.lastMemoryCheck = {
      timestamp: new Date().toISOString(),
      memoryUsagePercent: memUsagePercent,
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
    };

    if (memUsagePercent > this.safetyLimits.maxMemoryUsagePercent) {
      this.systemHealth.highMemoryWarnings++;
      console.warn(`[BACKGROUND] High memory usage detected: ${memUsagePercent.toFixed(1)}%`);
      
      if (this.systemHealth.highMemoryWarnings >= 3) {
        console.error('[BACKGROUND] Stopping all workers due to persistent high memory usage');
        this.stopAllWorkers();
      }
    } else {
      // Reset warnings if memory is back to normal
      this.systemHealth.highMemoryWarnings = 0;
    }
  }

  /**
   * Check if system is healthy for continued operation
   */
  isSystemHealthy() {
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    return memUsagePercent < this.safetyLimits.maxMemoryUsagePercent;
  }

  /**
   * Get current system health
   */
  getSystemHealth() {
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    return {
      healthy: this.isSystemHealthy(),
      memoryUsage: {
        percent: memUsagePercent,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
      },
      uptime: process.uptime(),
      lastCheck: this.systemHealth.lastMemoryCheck,
      warnings: this.systemHealth.highMemoryWarnings
    };
  }

  /**
   * Graceful shutdown of all workers
   */
  gracefulShutdown() {
    console.log('[BACKGROUND] Initiating graceful shutdown of background workers...');
    
    const results = this.stopAllWorkers();
    this.stopSystemMonitoring();
    
    console.log('[BACKGROUND] Graceful shutdown completed');
    return results;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const backgroundWorkerManager = new BackgroundWorkerManager();

// Export singleton and stop function for graceful shutdown
module.exports = {
  backgroundWorkerManager,
  stopBackgroundWorkers: () => backgroundWorkerManager.gracefulShutdown()
};