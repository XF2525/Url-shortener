/**
 * Bulk Generation Configuration
 * Centralized configuration for all bulk generation features
 */

const CONFIG = {
  // Core limits
  BULK_CLICK_LIMIT: 50,
  BULK_BLOG_VIEW_LIMIT: 3000,
  
  // Advanced limits
  MAX_SESSION_PAGES: 15,
  MAX_CONVERSION_FUNNEL_STEPS: 10,
  MAX_VIRAL_BURST_MULTIPLIER: 50,
  MAX_CAMPAIGN_DURATION_HOURS: 168,
  
  // Enhanced delays with optimized values
  BASE_DELAYS: {
    CLICK_GENERATION: 200,
    BLOG_VIEW_GENERATION: 300,
    SESSION_GENERATION: 500,
    VIRAL_SIMULATION: 5000,
    GEO_TARGETING: 250
  },
  
  // Performance optimization settings
  PERFORMANCE: {
    CACHE_TTL: 60 * 1000, // 1 minute cache TTL
    BATCH_SIZE: 50, // Process in batches for better memory management
    USE_WORKERS: false, // Whether to use worker threads for CPU-intensive tasks
    COMPRESSION_LEVEL: 6, // 0-9, higher = better compression but slower
    MEMORY_OPTIMIZED: true, // Use memory-optimized algorithms
    AUTO_CLEANUP_INTERVAL: 15 * 60 * 1000, // Auto cleanup every 15 minutes
    MAX_ACTIVITIES_STORED: 1000, // Maximum activities to keep in memory
    INDEX_FIELDS: ['category', 'severity', 'timestamp'] // Fields to index
  },
  
  // Geographic targeting options
  GEO_TARGETING: {
    REGIONS: ['US', 'EU', 'ASIA', 'CA', 'AU', 'BR'],
    PROVIDERS: ['google', 'aws', 'microsoft', 'oracle', 'cloudflare'],
    DEFAULT_DISTRIBUTION: {
      US: 0.35,
      EU: 0.30,
      ASIA: 0.20,
      CA: 0.05,
      AU: 0.05,
      BR: 0.05
    }
  },
  
  // Enhanced user agent simulation
  USER_AGENTS: {
    DESKTOP_RATIO: 0.60,
    MOBILE_RATIO: 0.32,
    TABLET_RATIO: 0.08,
    BROWSER_DISTRIBUTION: {
      chrome: 0.65,
      safari: 0.15,
      firefox: 0.10,
      edge: 0.08,
      opera: 0.02
    }
  },
  
  // Viral pattern simulation
  VIRAL_PATTERNS: {
    social_media_spike: { multiplier: 5, duration: 3600000 },
    reddit_frontpage: { multiplier: 15, duration: 7200000 },
    influencer_share: { multiplier: 8, duration: 1800000 },
    viral_video: { multiplier: 25, duration: 14400000 },
    news_mention: { multiplier: 12, duration: 10800000 },
    celebrity_tweet: { multiplier: 30, duration: 900000 }
  },
  
  // A/B testing configuration
  AB_TESTING: {
    MAX_VARIANTS: 4,
    MIN_SAMPLE_SIZE: 100,
    CONFIDENCE_LEVEL: 0.95,
    CONVERSION_RATES: {
      A: 0.02, // Base conversion rate
      B: 0.025, // Improved conversion rate
      C: 0.018, // Worse conversion rate
      D: 0.035 // Significantly better conversion rate
    }
  },
  
  // Security settings
  SECURITY: {
    RATE_LIMIT_OPERATIONS: 50, // Operations per hour
    RATE_LIMIT_BULK: 10, // Bulk operations per day
    PROGRESSIVE_DELAY_FACTOR: 1.5, // Increase delay by this factor for repeated operations
    MAX_DELAY: 5000, // Maximum delay in milliseconds
    AUTO_BLACKLIST_THRESHOLD: 100 // Auto-blacklist after this many operations
  },
  
  // Advanced analytics settings
  ANALYTICS: {
    HEATMAP_RESOLUTION: 100, // Data points for heatmap
    TIME_SERIES_RESOLUTION: 50, // Data points for time series
    STORE_RAW_DATA: false, // Whether to store raw data (memory intensive)
    AGGREGATION_INTERVAL: 3600000, // Aggregate data hourly
    RETENTION_PERIOD: 30 * 24 * 3600000 // Store data for 30 days
  }
};

module.exports = CONFIG;
