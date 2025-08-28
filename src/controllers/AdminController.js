/**
 * Admin controller for dashboard and analytics
 */

const urlShortener = require('../models/UrlShortener');
const templateUtils = require('../views/templates');
const bulkGeneration = require('../utils/bulkGeneration');
const { backgroundWorkerManager } = require('../utils/backgroundWorkers');

class AdminController {
  /**
   * Admin dashboard
   */
  getDashboard(req, res) {
    try {
      const stats = urlShortener.getSystemStats();
      const allUrls = urlShortener.getAllUrls();
      
      const content = `
        <div class="container">
          <div class="card">
            <h1>📊 Admin Dashboard</h1>
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">${stats.totalUrls}</div>
                <div class="stat-label">Total URLs</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${stats.totalClicks}</div>
                <div class="stat-label">Total Clicks</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${stats.recentUrls}</div>
                <div class="stat-label">URLs Today</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${stats.recentClicks}</div>
                <div class="stat-label">Clicks Today</div>
              </div>
            </div>
          </div>
          
          <div class="card">
            <h2>📋 Recent URLs</h2>
            <div id="urls-table">
              ${this.generateUrlsTable(allUrls.slice(0, 10))}
            </div>
            <button class="btn btn-primary" onclick="refreshData()">🔄 Refresh</button>
          </div>
        </div>
      `;

      const additionalJS = `
        async function refreshData() {
          try {
            const response = await makeRequest('/admin/api/analytics');
            const urlsTable = document.getElementById('urls-table');
            urlsTable.innerHTML = '${templateUtils.components.loadingSpinner('Refreshing...')}';
            
            // Update the table with new data
            location.reload(); // Simple refresh for now
          } catch (error) {
            showMessage('Failed to refresh data: ' + error.message, 'error');
          }
        }
        
        function copyShortUrl(shortCode) {
          const shortUrl = \`\${window.location.origin}/\${shortCode}\`;
          copyToClipboard(shortUrl);
        }
        
        async function getAnalytics(shortCode) {
          try {
            const response = await makeRequest(\`/admin/api/analytics/\${shortCode}\`);
            alert(\`Analytics for \${shortCode}:\\n\\nTotal Clicks: \${response.totalClicks}\\nRecent Clicks: \${response.recentClicks}\\nDaily Clicks: \${response.dailyClicks}\`);
          } catch (error) {
            showMessage('Failed to get analytics: ' + error.message, 'error');
          }
        }
      `;

      const html = templateUtils.generateHTML(
        'Admin Dashboard - URL Shortener',
        content,
        '',
        additionalJS,
        true,
        'admin'
      );
      
      res.send(html);
    } catch (error) {
      console.error('Admin dashboard error:', error);
      res.status(500).send('Internal server error');
    }
  }

  /**
   * Generate URLs table HTML
   */
  generateUrlsTable(urls) {
    if (urls.length === 0) {
      return '<p>No URLs created yet.</p>';
    }

    let table = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
            <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Short Code</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Original URL</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">Clicks</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">Actions</th>
          </tr>
        </thead>
        <tbody>
    `;

    urls.forEach(url => {
      const shortUrl = url.shortCode;
      const originalUrl = url.originalUrl.length > 50 
        ? url.originalUrl.substring(0, 50) + '...' 
        : url.originalUrl;
      
      table += `
        <tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 12px; border: 1px solid #dee2e6;">
            <code>${shortUrl}</code>
          </td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">
            <a href="${url.originalUrl}" target="_blank" title="${url.originalUrl}">
              ${originalUrl}
            </a>
          </td>
          <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">
            ${url.clicks}
          </td>
          <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">
            <button class="btn btn-success" onclick="copyShortUrl('${shortUrl}')" style="margin-right: 5px; padding: 4px 8px; font-size: 12px;">
              📋 Copy
            </button>
            <button class="btn btn-primary" onclick="getAnalytics('${shortUrl}')" style="padding: 4px 8px; font-size: 12px;">
              📊 Stats
            </button>
          </td>
        </tr>
      `;
    });

    table += '</tbody></table>';
    return table;
  }

  /**
   * Analytics API endpoint
   */
  getAnalytics(req, res) {
    try {
      const shortCode = req.params.shortCode;
      
      if (shortCode) {
        // Get analytics for specific URL
        const analytics = urlShortener.getAnalytics(shortCode);
        
        if (analytics) {
          res.json(analytics);
        } else {
          res.status(404).json({
            error: 'URL not found'
          });
        }
      } else {
        // Get system-wide analytics
        const stats = urlShortener.getSystemStats();
        const allUrls = urlShortener.getAllUrls();
        
        res.json({
          systemStats: stats,
          recentUrls: allUrls.slice(0, 20),
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Analytics API error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * Analytics API endpoint for all URLs
   */
  getAllAnalytics(req, res) {
    try {
      // Get system-wide analytics
      const stats = urlShortener.getSystemStats();
      const allUrls = urlShortener.getAllUrls();
      
      res.json({
        systemStats: stats,
        recentUrls: allUrls.slice(0, 20),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Analytics API error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * System status endpoint
   */
  getSystemStatus(req, res) {
    try {
      const stats = urlShortener.getSystemStats();
      const memoryUsage = process.memoryUsage();
      const securityStats = bulkGeneration.getSecurityStats();
      
      const status = {
        application: {
          status: 'running',
          uptime: process.uptime(),
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        },
        system: {
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
            external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
          },
          cpu: process.cpuUsage()
        },
        database: {
          totalUrls: stats.totalUrls,
          totalClicks: stats.totalClicks,
          recentActivity: {
            urlsToday: stats.recentUrls,
            clicksToday: stats.recentClicks
          }
        },
        security: securityStats,
        timestamp: new Date().toISOString()
      };
      
      res.json(status);
    } catch (error) {
      console.error('System status error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * Enhanced Bulk Click Generation with Advanced Security
   */
  async generateBulkClicks(req, res) {
    try {
      const { shortCode, clickCount, delay, userAgents } = req.body;
      
      // Enhanced security validation
      const securityContext = bulkGeneration.validateSecurityContext(req, 'click', clickCount);
      
      // Input validation
      if (!shortCode) {
        return res.status(400).json({ error: 'Short code is required' });
      }
      
      if (!clickCount || clickCount < 1 || clickCount > bulkGeneration.config.maxClicksPerRequest) {
        return res.status(400).json({ 
          error: `Click count must be between 1 and ${bulkGeneration.config.maxClicksPerRequest}` 
        });
      }

      // Check if URL exists
      const urlData = urlShortener.getUrl(shortCode);
      if (!urlData) {
        return res.status(404).json({ error: 'Short code not found' });
      }

      // Generate clicks with enhanced security
      const results = [];
      const baseDelay = delay || bulkGeneration.config.baseDelays.clickGeneration;
      
      console.log(`[BULK] Starting secure click generation: ${clickCount} clicks for ${shortCode} from IP ${securityContext.ip}`);
      
      for (let i = 0; i < clickCount; i++) {
        try {
          // Generate realistic analytics data
          const analyticsData = bulkGeneration.generateSecureAnalyticsData('click');
          
          // Register the click with enhanced data
          urlShortener.recordClick(shortCode, {
            ip: analyticsData.ip,
            userAgent: analyticsData.userAgent,
            timestamp: new Date(analyticsData.timestamp),
            sessionId: analyticsData.sessionId,
            behavior: analyticsData.behavior,
            geography: analyticsData.geography,
            referrer: analyticsData.referrer,
            generated: true,
            generationContext: securityContext
          });

          results.push({
            clickNumber: i + 1,
            timestamp: analyticsData.timestamp,
            ip: analyticsData.ip,
            userAgent: analyticsData.userAgent.substring(0, 50) + '...',
            sessionId: analyticsData.sessionId
          });

          // Apply secure delay with jitter
          if (i < clickCount - 1) {
            const actualDelay = bulkGeneration.getSecureRandomDelay(baseDelay);
            await new Promise(resolve => setTimeout(resolve, actualDelay));
          }
          
        } catch (error) {
          console.error(`[BULK] Error generating click ${i + 1}:`, error);
          results.push({
            clickNumber: i + 1,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      console.log(`[BULK] Completed secure click generation: ${results.length} clicks for ${shortCode}`);

      res.json({
        success: true,
        message: `Successfully generated ${results.length} clicks for ${shortCode}`,
        shortCode,
        totalClicks: results.length,
        securityContext: {
          sessionId: securityContext.sessionId,
          ip: securityContext.ip,
          timestamp: securityContext.timestamp
        },
        results: results.slice(0, 10), // Return first 10 for debugging
        analytics: urlShortener.getAnalytics(shortCode)
      });

    } catch (error) {
      console.error('[BULK] Bulk click generation error:', error);
      
      // Enhanced error responses for security
      if (error.message.includes('Rate limit') || error.message.includes('Emergency stop')) {
        return res.status(429).json({
          error: error.message,
          type: 'rate_limit',
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        error: 'Bulk click generation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Enhanced Bulk Click Generation for All URLs
   */
  async generateBulkClicksAll(req, res) {
    try {
      const { clicksPerUrl, delay } = req.body;
      
      // Enhanced security validation
      const securityContext = bulkGeneration.validateSecurityContext(req, 'bulk_click', clicksPerUrl);
      
      // Input validation
      if (!clicksPerUrl || clicksPerUrl < 1 || clicksPerUrl > bulkGeneration.config.maxClicksPerRequest) {
        return res.status(400).json({ 
          error: `Clicks per URL must be between 1 and ${bulkGeneration.config.maxClicksPerRequest}` 
        });
      }

      const allUrls = urlShortener.getAllUrls();
      if (allUrls.length === 0) {
        return res.status(400).json({ error: 'No URLs available for bulk generation' });
      }

      console.log(`[BULK] Starting bulk click generation for all URLs: ${clicksPerUrl} clicks each for ${allUrls.length} URLs from IP ${securityContext.ip}`);

      const results = [];
      const baseDelay = delay || bulkGeneration.config.baseDelays.clickGeneration;

      for (const urlData of allUrls) {
        try {
          const urlResults = [];
          
          for (let i = 0; i < clicksPerUrl; i++) {
            // Generate realistic analytics data
            const analyticsData = bulkGeneration.generateSecureAnalyticsData('bulk_click');
            
            // Register the click
            urlShortener.recordClick(urlData.shortCode, {
              ip: analyticsData.ip,
              userAgent: analyticsData.userAgent,
              timestamp: new Date(analyticsData.timestamp),
              sessionId: analyticsData.sessionId,
              behavior: analyticsData.behavior,
              geography: analyticsData.geography,
              referrer: analyticsData.referrer,
              generated: true,
              generationContext: securityContext
            });

            urlResults.push({
              clickNumber: i + 1,
              timestamp: analyticsData.timestamp,
              ip: analyticsData.ip
            });

            // Apply secure delay
            if (i < clicksPerUrl - 1) {
              const actualDelay = bulkGeneration.getSecureRandomDelay(baseDelay);
              await new Promise(resolve => setTimeout(resolve, actualDelay));
            }
          }

          results.push({
            shortCode: urlData.shortCode,
            originalUrl: urlData.originalUrl,
            clicksGenerated: urlResults.length,
            newTotal: urlData.clicks + urlResults.length
          });

        } catch (error) {
          console.error(`[BULK] Error generating clicks for ${urlData.shortCode}:`, error);
          results.push({
            shortCode: urlData.shortCode,
            error: error.message
          });
        }
      }

      console.log(`[BULK] Completed bulk click generation for all URLs: ${results.length} URLs processed`);

      res.json({
        success: true,
        message: `Bulk click generation completed for ${results.length} URLs`,
        totalUrls: allUrls.length,
        clicksPerUrl,
        totalClicksGenerated: results.reduce((sum, r) => sum + (r.clicksGenerated || 0), 0),
        securityContext: {
          sessionId: securityContext.sessionId,
          ip: securityContext.ip,
          timestamp: securityContext.timestamp
        },
        results
      });

    } catch (error) {
      console.error('[BULK] Bulk click generation (all) error:', error);
      
      if (error.message.includes('Rate limit') || error.message.includes('Emergency stop')) {
        return res.status(429).json({
          error: error.message,
          type: 'rate_limit',
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        error: 'Bulk click generation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Enhanced Blog View Generation with Advanced Security AND Experimental Ads Interactions
   */
  async generateBlogViews(req, res) {
    try {
      const { blogId, viewCount, delay, userAgents, adsOptions } = req.body;
      
      // Enhanced security validation
      const securityContext = bulkGeneration.validateSecurityContext(req, 'blog', viewCount);
      
      // Input validation
      if (!blogId) {
        return res.status(400).json({ error: 'Blog ID is required' });
      }
      
      if (!viewCount || viewCount < 1 || viewCount > bulkGeneration.config.maxBlogViewsPerRequest) {
        return res.status(400).json({ 
          error: `View count must be between 1 and ${bulkGeneration.config.maxBlogViewsPerRequest}` 
        });
      }

      console.log(`[BLOG] Starting secure blog view generation with experimental ads: ${viewCount} views for ${blogId} from IP ${securityContext.ip}`);

      // Parse ads options for experimental features
      const defaultAdsOptions = {
        enableAds: true,
        adTypes: ['banner', 'native', 'video'],
        maxAdsPerView: 3,
        demographicProfile: null,
        fraudDetection: true,
        experimentalFeatures: true
      };
      
      const finalAdsOptions = { ...defaultAdsOptions, ...adsOptions };

      // Generate blog views with enhanced security and ads interactions
      const results = [];
      const adsAnalytics = [];
      const baseDelay = delay || bulkGeneration.config.baseDelays.blogViewGeneration;
      
      for (let i = 0; i < viewCount; i++) {
        try {
          // Generate realistic analytics data with blog-specific enhancements
          const analyticsData = bulkGeneration.generateSecureAnalyticsData('blog_view');
          
          // Enhanced blog-specific behavior simulation
          analyticsData.behavior = {
            ...analyticsData.behavior,
            readTime: Math.floor(Math.random() * 180000) + 30000, // 30s - 3min read time
            scrollDepth: Math.floor(Math.random() * 60) + 40, // 40-100% scroll
            engagementScore: Math.random() * 100,
            returnVisitor: Math.random() < 0.3 // 30% return visitors
          };

          // EXPERIMENTAL: Generate advanced ads interactions
          const adsInteraction = bulkGeneration.generateAdvancedAdsInteraction(analyticsData, finalAdsOptions);
          
          // Store blog view analytics (would integrate with actual blog system)
          // For now, simulate storage
          const blogView = {
            blogId,
            timestamp: analyticsData.timestamp,
            ip: analyticsData.ip,
            userAgent: analyticsData.userAgent,
            sessionId: analyticsData.sessionId,
            behavior: analyticsData.behavior,
            geography: analyticsData.geography,
            referrer: analyticsData.referrer,
            generated: true,
            generationContext: securityContext,
            
            // EXPERIMENTAL: Enhanced ads data
            adsInteraction: adsInteraction
          };

          results.push({
            viewNumber: i + 1,
            timestamp: analyticsData.timestamp,
            ip: analyticsData.ip,
            readTime: analyticsData.behavior.readTime,
            scrollDepth: analyticsData.behavior.scrollDepth,
            sessionId: analyticsData.sessionId,
            
            // EXPERIMENTAL: Ads interaction summary
            adsEnabled: adsInteraction.adsEnabled,
            totalAds: adsInteraction.totalAds || 0,
            adsRevenue: adsInteraction.analytics?.totalRevenue || 0,
            adClicks: adsInteraction.analytics?.clicks || 0
          });

          // Collect ads analytics
          if (adsInteraction.adsEnabled) {
            adsAnalytics.push(adsInteraction);
          }

          // Apply secure delay with jitter
          if (i < viewCount - 1) {
            const actualDelay = bulkGeneration.getSecureRandomDelay(baseDelay);
            await new Promise(resolve => setTimeout(resolve, actualDelay));
          }
          
        } catch (error) {
          console.error(`[BLOG] Error generating view ${i + 1}:`, error);
          results.push({
            viewNumber: i + 1,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      console.log(`[BLOG] Completed secure blog view generation with ads: ${results.length} views for ${blogId}`);

      // Calculate comprehensive ads analytics - inline approach
      const totalRevenue = adsAnalytics.reduce((sum, view) => sum + (view.analytics?.totalRevenue || 0), 0);
      const totalClicks = adsAnalytics.reduce((sum, view) => sum + (view.analytics?.clicks || 0), 0);
      const totalInteractions = adsAnalytics.reduce((sum, view) => sum + (view.analytics?.totalInteractions || 0), 0);
      const totalImpressions = adsAnalytics.reduce((sum, view) => sum + (view.analytics?.impressions || 0), 0);
      
      const comprehensiveAdsAnalytics = adsAnalytics.length > 0 ? {
        totalViews: adsAnalytics.length,
        adsEnabled: true,
        totalInteractions,
        totalRevenue: +(totalRevenue.toFixed(4)),
        totalClicks,
        totalImpressions,
        averageCTR: totalImpressions > 0 ? +(totalClicks / totalImpressions).toFixed(4) : 0,
        averageRevenuePerView: +(totalRevenue / adsAnalytics.length).toFixed(4),
        averageAdsPerView: adsAnalytics.reduce((sum, view) => sum + (view.totalAds || 0), 0) / adsAnalytics.length,
        fraudAlerts: adsAnalytics.reduce((sum, view) => sum + (view.analytics?.suspiciousInteractions || 0), 0)
      } : { totalViews: 0, adsEnabled: false };

      res.json({
        success: true,
        message: `Successfully generated ${results.length} views for blog ${blogId} with experimental ads interactions`,
        blogId,
        totalViews: results.length,
        securityContext: {
          sessionId: securityContext.sessionId,
          ip: securityContext.ip,
          timestamp: securityContext.timestamp
        },
        results: results.slice(0, 10), // Return first 10 for debugging
        analytics: {
          averageReadTime: results.reduce((sum, r) => sum + (r.readTime || 0), 0) / results.length,
          averageScrollDepth: results.reduce((sum, r) => sum + (r.scrollDepth || 0), 0) / results.length
        },
        
        // EXPERIMENTAL: Enhanced ads analytics
        experimentalAdsAnalytics: {
          enabled: finalAdsOptions.enableAds,
          configuration: finalAdsOptions,
          summary: comprehensiveAdsAnalytics,
          totalRevenue: comprehensiveAdsAnalytics.totalRevenue || 0,
          totalInteractions: comprehensiveAdsAnalytics.totalInteractions || 0,
          averageCTR: comprehensiveAdsAnalytics.averageCTR || 0,
          fraudDetectionAlerts: comprehensiveAdsAnalytics.fraudAlerts || 0
        }
      });

    } catch (error) {
      console.error('[BLOG] Blog view generation error:', error);
      
      if (error.message.includes('Rate limit') || error.message.includes('Emergency stop')) {
        return res.status(429).json({
          error: error.message,
          type: 'rate_limit',
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        error: 'Blog view generation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * EXPERIMENTAL: New Enhanced Blog Views with Advanced Ads Options API
   */
  async generateAdvancedBlogViewsWithAds(req, res) {
    try {
      const { 
        blogId, 
        viewCount, 
        delay,
        advancedAdsConfig = {} 
      } = req.body;
      
      // Enhanced security validation
      const securityContext = bulkGeneration.validateSecurityContext(req, 'blog_ads', viewCount);
      
      // Input validation
      if (!blogId) {
        return res.status(400).json({ error: 'Blog ID is required' });
      }
      
      if (!viewCount || viewCount < 1 || viewCount > bulkGeneration.config.maxBlogViewsPerRequest) {
        return res.status(400).json({ 
          error: `View count must be between 1 and ${bulkGeneration.config.maxBlogViewsPerRequest}` 
        });
      }

      console.log(`[BLOG-ADS] Starting advanced blog view generation with experimental ads features: ${viewCount} views for ${blogId}`);

      // Advanced ads configuration with experimental features
      const experimentalAdsConfig = {
        enableAds: true,
        adTypes: advancedAdsConfig.adTypes || ['banner', 'native', 'video', 'popup', 'social'],
        maxAdsPerView: Math.min(advancedAdsConfig.maxAdsPerView || 5, 8), // Cap at 8 for safety
        demographicProfile: advancedAdsConfig.demographicProfile || null,
        fraudDetection: advancedAdsConfig.fraudDetection !== false, // Default true
        experimentalFeatures: true,
        
        // EXPERIMENTAL: Advanced targeting options
        targeting: {
          interests: advancedAdsConfig.interests || ['tech', 'lifestyle', 'business'],
          behaviorPatterns: advancedAdsConfig.behaviorPatterns || 'natural',
          devicePreference: advancedAdsConfig.devicePreference || 'mixed',
          geoTargeting: advancedAdsConfig.geoTargeting || false
        },
        
        // EXPERIMENTAL: Advanced interaction simulation
        interactionConfig: {
          clickProbabilityMultiplier: advancedAdsConfig.clickMultiplier || 1.0,
          engagementDepth: advancedAdsConfig.engagementDepth || 'medium',
          viewDurationOverride: advancedAdsConfig.viewDurationOverride || null,
          conversionSimulation: advancedAdsConfig.enableConversions !== false
        }
      };

      // Generate views with experimental ads features
      const results = [];
      const detailedAdsAnalytics = [];
      const baseDelay = delay || bulkGeneration.config.baseDelays.blogViewGeneration;
      
      for (let i = 0; i < viewCount; i++) {
        try {
          // Generate analytics data
          const analyticsData = bulkGeneration.generateSecureAnalyticsData('blog_view_ads');
          
          // Enhanced behavior for ads interaction
          analyticsData.behavior = {
            ...analyticsData.behavior,
            readTime: Math.floor(Math.random() * 240000) + 45000, // 45s - 4min for ads interaction
            scrollDepth: Math.floor(Math.random() * 50) + 50, // 50-100% for ads visibility
            engagementScore: Math.random() * 100,
            returnVisitor: Math.random() < 0.35, // 35% return visitors
            adAwarenesScore: Math.random() * 100 // How likely to notice ads
          };

          // Generate comprehensive ads interactions
          const adsInteraction = bulkGeneration.generateAdvancedAdsInteraction(analyticsData, experimentalAdsConfig);
          
          const viewResult = {
            viewNumber: i + 1,
            timestamp: analyticsData.timestamp,
            ip: analyticsData.ip,
            sessionId: analyticsData.sessionId,
            readTime: analyticsData.behavior.readTime,
            scrollDepth: analyticsData.behavior.scrollDepth,
            adAwareness: analyticsData.behavior.adAwarenesScore,
            
            // Detailed ads metrics
            adsMetrics: {
              enabled: adsInteraction.adsEnabled,
              totalAds: adsInteraction.totalAds || 0,
              totalInteractions: adsInteraction.analytics?.totalInteractions || 0,
              revenue: adsInteraction.analytics?.totalRevenue || 0,
              clicks: adsInteraction.analytics?.clicks || 0,
              viewRate: adsInteraction.analytics?.viewRate || 0,
              ctr: adsInteraction.analytics?.clickThroughRate || 0,
              qualityScore: adsInteraction.analytics?.averageQualityScore || 0,
              fraudRisk: adsInteraction.analytics?.averageRiskScore || 0
            }
          };

          results.push(viewResult);
          
          if (adsInteraction.adsEnabled) {
            detailedAdsAnalytics.push({
              viewNumber: i + 1,
              ...adsInteraction
            });
          }

          // Apply delay
          if (i < viewCount - 1) {
            const actualDelay = bulkGeneration.getSecureRandomDelay(baseDelay);
            await new Promise(resolve => setTimeout(resolve, actualDelay));
          }
          
        } catch (error) {
          console.error(`[BLOG-ADS] Error generating view ${i + 1}:`, error);
          results.push({
            viewNumber: i + 1,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      console.log(`[BLOG-ADS] Completed advanced blog view generation: ${results.length} views with experimental ads`);

      // Calculate analytics - simplified inline approach
      const totalRevenue = detailedAdsAnalytics.reduce((sum, view) => sum + (view.analytics?.totalRevenue || 0), 0);
      const totalClicks = detailedAdsAnalytics.reduce((sum, view) => sum + (view.analytics?.clicks || 0), 0);
      const totalInteractions = detailedAdsAnalytics.reduce((sum, view) => sum + (view.analytics?.totalInteractions || 0), 0);
      const totalImpressions = detailedAdsAnalytics.reduce((sum, view) => sum + (view.analytics?.impressions || 0), 0);
      
      const comprehensiveAdsAnalytics = {
        totalViews: detailedAdsAnalytics.length,
        adsEnabled: true,
        totalInteractions,
        totalRevenue: +(totalRevenue.toFixed(4)),
        totalClicks,
        totalImpressions,
        averageCTR: totalImpressions > 0 ? +(totalClicks / totalImpressions).toFixed(4) : 0,
        averageRevenuePerView: +(totalRevenue / detailedAdsAnalytics.length).toFixed(4),
        averageAdsPerView: detailedAdsAnalytics.reduce((sum, view) => sum + (view.totalAds || 0), 0) / detailedAdsAnalytics.length,
        fraudAlerts: detailedAdsAnalytics.reduce((sum, view) => sum + (view.analytics?.suspiciousInteractions || 0), 0)
      };
      
      // Add basic insights
      const insights = {
        topPerformingAdType: 'banner', // Default for demo
        totalAdsGenerated: detailedAdsAnalytics.reduce((sum, view) => sum + (view.totalAds || 0), 0),
        averageAdsPerView: detailedAdsAnalytics.length > 0 ? detailedAdsAnalytics.reduce((sum, view) => sum + (view.totalAds || 0), 0) / detailedAdsAnalytics.length : 0
      };

      res.json({
        success: true,
        message: `Advanced blog views with experimental ads generated successfully`,
        blogId,
        totalViews: results.length,
        experimentalFeatures: 'enabled',
        securityContext: {
          sessionId: securityContext.sessionId,
          ip: securityContext.ip,
          timestamp: securityContext.timestamp
        },
        
        // Standard analytics
        analytics: {
          averageReadTime: results.reduce((sum, r) => sum + (r.readTime || 0), 0) / results.length,
          averageScrollDepth: results.reduce((sum, r) => sum + (r.scrollDepth || 0), 0) / results.length,
          averageAdAwareness: results.reduce((sum, r) => sum + (r.adAwareness || 0), 0) / results.length
        },
        
        // EXPERIMENTAL: Comprehensive ads analytics
        experimentalAdsAnalytics: {
          configuration: experimentalAdsConfig,
          summary: comprehensiveAdsAnalytics,
          performance: {
            totalRevenue: comprehensiveAdsAnalytics.totalRevenue || 0,
            averageRevenuePerView: (comprehensiveAdsAnalytics.totalRevenue || 0) / results.length,
            totalAdInteractions: comprehensiveAdsAnalytics.totalInteractions || 0,
            overallCTR: comprehensiveAdsAnalytics.averageCTR || 0,
            qualityScore: 75, // Default quality score
            fraudDetectionScore: 95 // Default fraud detection score
          },
          insights: insights,
          recommendations: ['Performance looks good - continue current strategy', 'Consider A/B testing different ad types']
        },
        
        // Sample results for debugging
        sampleResults: results.slice(0, 5),
        sampleAdsData: detailedAdsAnalytics.slice(0, 3)
      });

    } catch (error) {
      console.error('[BLOG-ADS] Advanced blog view generation error:', error);
      
      if (error.message.includes('Rate limit') || error.message.includes('Emergency stop')) {
        return res.status(429).json({
          error: error.message,
          type: 'rate_limit',
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        error: 'Advanced blog view generation with ads failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Calculate comprehensive ads analytics from multiple views
   */
  calculateComprehensiveAdsAnalytics(adsAnalytics) {
    if (!adsAnalytics || adsAnalytics.length === 0) {
      return { totalViews: 0, adsEnabled: false };
    }

    const totalInteractions = adsAnalytics.reduce((sum, view) => sum + (view.analytics?.totalInteractions || 0), 0);
    const totalRevenue = adsAnalytics.reduce((sum, view) => sum + (view.analytics?.totalRevenue || 0), 0);
    const totalClicks = adsAnalytics.reduce((sum, view) => sum + (view.analytics?.clicks || 0), 0);
    const totalImpressions = adsAnalytics.reduce((sum, view) => sum + (view.analytics?.impressions || 0), 0);

    return {
      totalViews: adsAnalytics.length,
      adsEnabled: true,
      totalInteractions,
      totalRevenue: +(totalRevenue.toFixed(4)),
      totalClicks,
      totalImpressions,
      averageCTR: totalImpressions > 0 ? +(totalClicks / totalImpressions).toFixed(4) : 0,
      averageRevenuePerView: +(totalRevenue / adsAnalytics.length).toFixed(4),
      averageAdsPerView: adsAnalytics.reduce((sum, view) => sum + (view.totalAds || 0), 0) / adsAnalytics.length,
      fraudAlerts: adsAnalytics.reduce((sum, view) => sum + (view.analytics?.suspiciousInteractions || 0), 0)
    };
  }

  /**
   * Calculate advanced ads analytics with insights
   */
  calculateAdvancedAdsAnalytics(detailedAdsAnalytics, config, basicAnalytics = null) {
    if (!detailedAdsAnalytics || detailedAdsAnalytics.length === 0) {
      return { enabled: false };
    }

    const allInteractions = detailedAdsAnalytics.flatMap(view => view.interactions || []);
    const analytics = basicAnalytics || bulkGeneration.calculateAdsAnalytics(allInteractions);
    
    // Add advanced insights
    const insights = {
      topPerformingAdType: this.findTopPerformingAdType(analytics.adTypeBreakdown),
      engagementPatterns: this.analyzeEngagementPatterns(allInteractions),
      revenueOptimization: this.analyzeRevenueOptimization(allInteractions),
      demographicInsights: this.analyzeDemographicPerformance(detailedAdsAnalytics)
    };

    return {
      ...analytics,
      insights,
      overallQualityScore: analytics.averageQualityScore || 0,
      fraudDetectionScore: 100 - (analytics.averageRiskScore || 0), // Inverted risk score
      configuration: config
    };
  }

  /**
   * Helper methods for advanced analytics
   */
  findTopPerformingAdType(breakdown) {
    if (!breakdown) return null;
    
    let topType = null;
    let topScore = 0;
    
    Object.entries(breakdown).forEach(([type, data]) => {
      const score = data.revenue * 0.4 + data.clicks * 0.3 + data.averageEngagement * 0.3;
      if (score > topScore) {
        topScore = score;
        topType = type;
      }
    });
    
    return { type: topType, score: topScore.toFixed(2) };
  }

  analyzeEngagementPatterns(interactions) {
    const patterns = {
      peakEngagementTime: null,
      averageEngagementDuration: 0,
      highEngagementTypes: []
    };

    if (interactions.length === 0) return patterns;

    // Calculate average engagement duration
    const engagementDurations = interactions
      .filter(i => i.interaction.engaged)
      .map(i => i.interaction.viewDuration);
    
    patterns.averageEngagementDuration = engagementDurations.length > 0 ?
      engagementDurations.reduce((a, b) => a + b, 0) / engagementDurations.length : 0;

    // Find high engagement ad types
    const typeEngagement = {};
    interactions.forEach(i => {
      if (!typeEngagement[i.adType]) typeEngagement[i.adType] = [];
      typeEngagement[i.adType].push(i.engagement.qualityScore);
    });

    patterns.highEngagementTypes = Object.entries(typeEngagement)
      .map(([type, scores]) => ({
        type,
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length
      }))
      .filter(item => item.averageScore > 70)
      .sort((a, b) => b.averageScore - a.averageScore);

    return patterns;
  }

  analyzeRevenueOptimization(interactions) {
    const optimization = {
      highestRevenueAdType: null,
      revenuePerInteractionType: {},
      optimizationSuggestions: []
    };

    if (interactions.length === 0) return optimization;

    // Revenue per ad type
    const revenueByType = {};
    interactions.forEach(i => {
      if (!revenueByType[i.adType]) revenueByType[i.adType] = [];
      revenueByType[i.adType].push(i.revenue);
    });

    let maxRevenue = 0;
    Object.entries(revenueByType).forEach(([type, revenues]) => {
      const totalRevenue = revenues.reduce((a, b) => a + b, 0);
      if (totalRevenue > maxRevenue) {
        maxRevenue = totalRevenue;
        optimization.highestRevenueAdType = type;
      }
    });

    // Revenue per interaction type
    const revenueByInteraction = {};
    interactions.forEach(i => {
      const intType = i.interaction.type;
      if (!revenueByInteraction[intType]) revenueByInteraction[intType] = [];
      revenueByInteraction[intType].push(i.revenue);
    });

    Object.entries(revenueByInteraction).forEach(([type, revenues]) => {
      optimization.revenuePerInteractionType[type] = {
        count: revenues.length,
        totalRevenue: revenues.reduce((a, b) => a + b, 0),
        averageRevenue: revenues.reduce((a, b) => a + b, 0) / revenues.length
      };
    });

    return optimization;
  }

  analyzeDemographicPerformance(adsAnalytics) {
    const demographics = {};
    
    adsAnalytics.forEach(view => {
      const demo = view.demographic;
      if (demo && !demographics[demo]) {
        demographics[demo] = {
          views: 0,
          totalRevenue: 0,
          totalClicks: 0,
          totalInteractions: 0
        };
      }
      
      if (demo) {
        demographics[demo].views++;
        demographics[demo].totalRevenue += view.analytics?.totalRevenue || 0;
        demographics[demo].totalClicks += view.analytics?.clicks || 0;
        demographics[demo].totalInteractions += view.analytics?.totalInteractions || 0;
      }
    });

    // Calculate performance metrics
    Object.keys(demographics).forEach(demo => {
      const data = demographics[demo];
      data.averageRevenuePerView = data.totalRevenue / data.views;
      data.averageClicksPerView = data.totalClicks / data.views;
      data.averageInteractionsPerView = data.totalInteractions / data.views;
    });

    return demographics;
  }

  /**
   * Generate optimization recommendations based on analytics
   */
  generateAdsOptimizationRecommendations(analytics) {
    const recommendations = [];

    if (!analytics || !analytics.adTypeBreakdown) {
      return ['Insufficient data for recommendations'];
    }

    // CTR recommendations
    if (analytics.clickThroughRate < 0.01) {
      recommendations.push('Consider improving ad creative quality - CTR is below 1%');
    }

    // Revenue optimization
    if (analytics.totalRevenue < 1.0) {
      recommendations.push('Revenue optimization needed - consider premium ad types');
    }

    // Ad type recommendations
    const topAdType = analytics.insights?.topPerformingAdType;
    if (topAdType) {
      recommendations.push(`Focus on ${topAdType.type} ads - showing best performance`);
    }

    // Engagement recommendations
    if (analytics.averageQualityScore < 50) {
      recommendations.push('Improve ad placement and targeting - quality score is low');
    }

    // Fraud detection
    if (analytics.fraudDetectionScore < 80) {
      recommendations.push('Review fraud detection settings - suspicious activity detected');
    }

    return recommendations.length > 0 ? recommendations : ['Performance looks good - continue current strategy'];
  }

  /**
   * Get bulk generation statistics
   */
  getBulkGenerationStats(req, res) {
    try {
      const securityStats = bulkGeneration.getSecurityStats();
      const systemStats = urlShortener.getSystemStats();
      
      res.json({
        security: securityStats,
        system: systemStats,
        configuration: {
          maxClicksPerRequest: bulkGeneration.config.maxClicksPerRequest,
          maxBlogViewsPerRequest: bulkGeneration.config.maxBlogViewsPerRequest,
          maxBulkOperationsPerHour: bulkGeneration.config.maxBulkOperationsPerHour,
          maxBulkOperationsPerDay: bulkGeneration.config.maxBulkOperationsPerDay
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Bulk generation stats error:', error);
      res.status(500).json({
        error: 'Failed to get bulk generation statistics'
      });
    }
  }

  /**
   * Emergency stop for all bulk operations
   */
  emergencyStopBulkOperations(req, res) {
    try {
      const { reason } = req.body;
      const securityEvent = bulkGeneration.activateEmergencyStop(reason || 'Manual emergency stop');
      
      res.json({
        success: true,
        message: 'Emergency stop activated - all bulk operations suspended',
        securityEvent,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Emergency stop error:', error);
      res.status(500).json({
        error: 'Failed to activate emergency stop'
      });
    }
  }

  /**
   * Perform security cleanup
   */
  performSecurityCleanup(req, res) {
    try {
      bulkGeneration.performSecurityCleanup();
      const stats = bulkGeneration.getSecurityStats();
      
      res.json({
        success: true,
        message: 'Security cleanup completed',
        currentStats: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Security cleanup error:', error);
      res.status(500).json({
        error: 'Failed to perform security cleanup'
      });
    }
  }

  /**
   * Start continuous background click generation
   */
  async startBackgroundClicks(req, res) {
    try {
      const { config = {} } = req.body;
      
      // Enhanced security validation
      const securityContext = bulkGeneration.validateSecurityContext(req, 'background_clicks', 0);
      
      console.log(`[BACKGROUND] Starting continuous click generation from IP ${securityContext.ip}`);
      
      const result = await backgroundWorkerManager.startClickGeneration(config);
      
      res.json({
        ...result,
        securityContext: {
          sessionId: securityContext.sessionId,
          ip: securityContext.ip,
          timestamp: securityContext.timestamp
        },
        message: 'Continuous background click generation started successfully',
        instructions: 'The worker will now generate clicks continuously in the background until stopped'
      });

    } catch (error) {
      console.error('[BACKGROUND] Failed to start background clicks:', error);
      
      if (error.message.includes('already running')) {
        return res.status(409).json({
          error: 'Background click generation is already running',
          suggestion: 'Use /admin/api/automation/background-status to check current status'
        });
      }
      
      res.status(500).json({
        error: 'Failed to start background click generation',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Start continuous background view generation
   */
  async startBackgroundViews(req, res) {
    try {
      const { config = {} } = req.body;
      
      // Enhanced security validation
      const securityContext = bulkGeneration.validateSecurityContext(req, 'background_views', 0);
      
      console.log(`[BACKGROUND] Starting continuous view generation from IP ${securityContext.ip}`);
      
      const result = await backgroundWorkerManager.startViewGeneration(config);
      
      res.json({
        ...result,
        securityContext: {
          sessionId: securityContext.sessionId,
          ip: securityContext.ip,
          timestamp: securityContext.timestamp
        },
        message: 'Continuous background view generation started successfully',
        instructions: 'The worker will now generate blog views with ads interactions continuously in the background until stopped'
      });

    } catch (error) {
      console.error('[BACKGROUND] Failed to start background views:', error);
      
      if (error.message.includes('already running')) {
        return res.status(409).json({
          error: 'Background view generation is already running',
          suggestion: 'Use /admin/api/automation/background-status to check current status'
        });
      }
      
      res.status(500).json({
        error: 'Failed to start background view generation',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Stop background processes
   */
  async stopBackgroundProcesses(req, res) {
    try {
      const { workerId } = req.body;
      
      console.log(`[BACKGROUND] Stopping background processes. WorkerId: ${workerId || 'all'}`);
      
      let results;
      if (workerId) {
        // Stop specific worker
        results = { [workerId]: backgroundWorkerManager.stopWorker(workerId) };
      } else {
        // Stop all workers
        results = backgroundWorkerManager.stopAllWorkers();
      }
      
      res.json({
        success: true,
        message: workerId ? `Worker ${workerId} stopped` : 'All background workers stopped',
        results,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[BACKGROUND] Failed to stop background processes:', error);
      res.status(500).json({
        error: 'Failed to stop background processes',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get background processes status
   */
  getBackgroundStatus(req, res) {
    try {
      const status = backgroundWorkerManager.getWorkersStatus();
      
      res.json({
        success: true,
        status,
        summary: {
          totalActiveWorkers: Object.values(status.workers).filter(w => w.active).length,
          totalWorkers: Object.keys(status.workers).length,
          systemHealthy: status.systemHealth.healthy
        }
      });

    } catch (error) {
      console.error('[BACKGROUND] Failed to get background status:', error);
      res.status(500).json({
        error: 'Failed to get background processes status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * ====================================================================
   * NEW AURA FEATURES API ENDPOINTS
   * Premium traffic generation with enhanced quality scoring
   * ====================================================================
   */

  /**
   * Generate bulk clicks with aura features
   */
  async generateBulkClicksWithAura(req, res) {
    try {
      const { shortCode, clickCount, auraOptions = {} } = req.body;
      
      // Enhanced security validation
      const securityContext = bulkGeneration.validateSecurityContext(req, 'aura_clicks', clickCount);
      
      // Input validation
      if (!shortCode) {
        return res.status(400).json({ error: 'Short code is required' });
      }
      
      if (!clickCount || clickCount < 1 || clickCount > bulkGeneration.config.maxClicksPerRequest) {
        return res.status(400).json({ 
          error: `Click count must be between 1 and ${bulkGeneration.config.maxClicksPerRequest}` 
        });
      }

      // Check if URL exists
      const urlData = urlShortener.getUrl(shortCode);
      if (!urlData) {
        return res.status(404).json({ error: 'Short code not found' });
      }

      console.log(`[AURA] Starting bulk clicks with aura features: ${clickCount} clicks for ${shortCode}`);

      // Generate clicks with aura enhancements
      const auraResult = await bulkGeneration.generateBulkTrafficWithAura('aura_click', clickCount, {
        ...auraOptions,
        auraQualityTarget: auraOptions.qualityTarget || 85,
        enhancedDistribution: true,
        premiumPatterns: true,
        delay: auraOptions.delay || 300
      });

      // Register clicks in URL shortener
      auraResult.results.forEach((result, index) => {
        const analyticsData = bulkGeneration.generateTrafficWithAura('click', 1, auraOptions);
        
        urlShortener.recordClick(shortCode, {
          ip: result.ip,
          userAgent: result.userAgent,
          timestamp: new Date(result.timestamp),
          sessionId: `aura_${index}_${Date.now()}`,
          behavior: analyticsData.behavior,
          geography: analyticsData.geography,
          referrer: analyticsData.referrer,
          generated: true,
          aura: true,
          auraScore: result.auraScore,
          qualityTier: result.qualityTier,
          generationContext: securityContext
        });
      });

      res.json({
        success: true,
        message: `Successfully generated ${clickCount} premium clicks with aura features for ${shortCode}`,
        shortCode,
        auraFeatures: true,
        totalClicks: clickCount,
        auraMetrics: auraResult.auraMetrics,
        securityContext: {
          sessionId: securityContext.sessionId,
          ip: securityContext.ip,
          timestamp: securityContext.timestamp
        },
        enhancedFeatures: auraResult.enhancedFeatures,
        sampleResults: auraResult.results.slice(0, 5),
        analytics: urlShortener.getAnalytics(shortCode)
      });

    } catch (error) {
      console.error('[AURA] Bulk clicks with aura generation error:', error);
      
      if (error.message.includes('Rate limit') || error.message.includes('Emergency stop')) {
        return res.status(429).json({
          error: error.message,
          type: 'rate_limit',
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        error: 'Bulk clicks with aura generation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Generate blog views with aura features
   */
  async generateBlogViewsWithAura(req, res) {
    try {
      const { blogId, viewCount, auraOptions = {} } = req.body;
      
      // Enhanced security validation
      const securityContext = bulkGeneration.validateSecurityContext(req, 'aura_blog', viewCount);
      
      // Input validation
      if (!blogId) {
        return res.status(400).json({ error: 'Blog ID is required' });
      }
      
      if (!viewCount || viewCount < 1 || viewCount > bulkGeneration.config.maxBlogViewsPerRequest) {
        return res.status(400).json({ 
          error: `View count must be between 1 and ${bulkGeneration.config.maxBlogViewsPerRequest}` 
        });
      }

      console.log(`[AURA] Starting blog views with aura features: ${viewCount} views for ${blogId}`);

      // Generate views with aura enhancements and ads
      const auraResult = await bulkGeneration.generateBulkTrafficWithAura('aura_blog_view', viewCount, {
        ...auraOptions,
        auraQualityTarget: auraOptions.qualityTarget || 85,
        enhancedDistribution: true,
        premiumPatterns: true,
        enableAds: true,
        delay: auraOptions.delay || 400
      });

      // Enhanced ads integration for each view
      const adsAnalytics = [];
      auraResult.results.forEach((result, index) => {
        const blogViewData = bulkGeneration.generateTrafficWithAura('blog_view', 1, auraOptions);
        
        // Generate ads interaction for this view
        const adsInteraction = bulkGeneration.generateAdvancedAdsInteraction(blogViewData, {
          enableAds: true,
          adTypes: ['banner', 'native', 'video'],
          maxAdsPerView: 3,
          fraudDetection: true,
          experimentalFeatures: true
        });

        if (adsInteraction.adsEnabled) {
          adsAnalytics.push(adsInteraction);
        }
      });

      // Calculate comprehensive ads analytics
      const totalAdsRevenue = adsAnalytics.reduce((sum, view) => sum + (view.analytics?.totalRevenue || 0), 0);
      const totalAdsClicks = adsAnalytics.reduce((sum, view) => sum + (view.analytics?.clicks || 0), 0);
      const totalAdsInteractions = adsAnalytics.reduce((sum, view) => sum + (view.analytics?.totalInteractions || 0), 0);

      res.json({
        success: true,
        message: `Successfully generated ${viewCount} premium blog views with aura features and ads for ${blogId}`,
        blogId,
        auraFeatures: true,
        totalViews: viewCount,
        auraMetrics: auraResult.auraMetrics,
        securityContext: {
          sessionId: securityContext.sessionId,
          ip: securityContext.ip,
          timestamp: securityContext.timestamp
        },
        enhancedFeatures: auraResult.enhancedFeatures,
        
        // Enhanced ads analytics with aura integration
        premiumAdsAnalytics: {
          enabled: true,
          totalViewsWithAds: adsAnalytics.length,
          totalAdsRevenue: +(totalAdsRevenue.toFixed(4)),
          totalAdsClicks,
          totalAdsInteractions,
          averageRevenuePerView: adsAnalytics.length > 0 ? +(totalAdsRevenue / adsAnalytics.length).toFixed(4) : 0,
          premiumMultiplier: 1.2, // 20% premium for aura features
          qualityScore: auraResult.auraMetrics.averageScore
        },
        
        sampleResults: auraResult.results.slice(0, 5),
        sampleAdsData: adsAnalytics.slice(0, 3)
      });

    } catch (error) {
      console.error('[AURA] Blog views with aura generation error:', error);
      
      if (error.message.includes('Rate limit') || error.message.includes('Emergency stop')) {
        return res.status(429).json({
          error: error.message,
          type: 'rate_limit',
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        error: 'Blog views with aura generation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get aura features status and metrics
   */
  getAuraStatus(req, res) {
    try {
      const auraStatus = bulkGeneration.getAuraStatus();
      
      res.json({
        success: true,
        auraFeatures: auraStatus,
        premiumCapabilities: {
          enhancedIPRotation: true,
          premiumUserAgents: true,
          advancedBehaviorSimulation: true,
          realTimeQualityMonitoring: true,
          auraScoring: true
        },
        systemInfo: {
          timestamp: new Date().toISOString(),
          version: '1.0.0-aura',
          premium: true
        }
      });

    } catch (error) {
      console.error('[AURA] Failed to get aura status:', error);
      res.status(500).json({
        error: 'Failed to get aura status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Verify bulk features functionality (IP rotation, User Agent rotation, etc.)
   */
  async verifyBulkFeatures(req, res) {
    try {
      console.log('[BULK] Starting comprehensive bulk features verification...');
      
      const verificationResults = await bulkGeneration.verifyBulkFeatures();
      
      res.json({
        success: true,
        message: 'Bulk features verification completed',
        verification: verificationResults,
        summary: {
          overallQuality: verificationResults.overallQuality.toFixed(1) + '%',
          qualityGrade: verificationResults.qualityGrade,
          ipRotationWorking: verificationResults.ipRotation.qualityGrade !== 'Needs Improvement',
          userAgentRotationWorking: verificationResults.userAgentRotation.qualityGrade !== 'Needs Improvement',
          auraFeaturesWorking: verificationResults.auraFeatures?.enabled || false
        },
        recommendations: verificationResults.recommendations,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[BULK] Bulk features verification failed:', error);
      res.status(500).json({
        error: 'Bulk features verification failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Test IP rotation specifically
   */
  testIPRotation(req, res) {
    try {
      const { sampleSize = 20 } = req.query;
      const testSize = Math.min(parseInt(sampleSize), 100); // Cap at 100 for safety
      
      console.log(`[BULK] Testing IP rotation with ${testSize} samples...`);
      
      const ipTestResults = bulkGeneration.testIPRotation(testSize);
      
      res.json({
        success: true,
        message: `IP rotation test completed with ${testSize} samples`,
        ipRotationTest: ipTestResults,
        working: ipTestResults.qualityGrade !== 'Needs Improvement',
        summary: {
          uniquenessPercentage: ipTestResults.uniquenessPercentage.toFixed(1) + '%',
          qualityGrade: ipTestResults.qualityGrade,
          providerDiversity: Object.keys(ipTestResults.providerDistribution).length,
          totalProviders: Object.keys(bulkGeneration.ipPools).length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[BULK] IP rotation test failed:', error);
      res.status(500).json({
        error: 'IP rotation test failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Test User Agent rotation specifically
   */
  testUserAgentRotation(req, res) {
    try {
      const { sampleSize = 20 } = req.query;
      const testSize = Math.min(parseInt(sampleSize), 100); // Cap at 100 for safety
      
      console.log(`[BULK] Testing User Agent rotation with ${testSize} samples...`);
      
      const uaTestResults = bulkGeneration.testUserAgentRotation(testSize);
      
      res.json({
        success: true,
        message: `User Agent rotation test completed with ${testSize} samples`,
        userAgentRotationTest: uaTestResults,
        working: uaTestResults.qualityGrade !== 'Needs Improvement',
        summary: {
          uniquenessPercentage: uaTestResults.uniquenessPercentage.toFixed(1) + '%',
          qualityGrade: uaTestResults.qualityGrade,
          browserDiversity: Object.keys(uaTestResults.browserDistribution).length,
          deviceDiversity: Object.keys(uaTestResults.deviceDistribution).length,
          totalUserAgents: bulkGeneration.userAgents.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[BULK] User Agent rotation test failed:', error);
      res.status(500).json({
        error: 'User Agent rotation test failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// Create and export properly bound instance
const adminController = new AdminController();

// Bind all methods to maintain 'this' context
const boundController = {
  getDashboard: adminController.getDashboard.bind(adminController),
  generateUrlsTable: adminController.generateUrlsTable.bind(adminController),
  getAllAnalytics: adminController.getAllAnalytics.bind(adminController),
  getAnalytics: adminController.getAnalytics.bind(adminController),
  getSystemStatus: adminController.getSystemStatus.bind(adminController),
  generateBulkClicks: adminController.generateBulkClicks.bind(adminController),
  generateBulkClicksAll: adminController.generateBulkClicksAll.bind(adminController),
  generateBlogViews: adminController.generateBlogViews.bind(adminController),
  generateAdvancedBlogViewsWithAds: adminController.generateAdvancedBlogViewsWithAds.bind(adminController),
  getBulkGenerationStats: adminController.getBulkGenerationStats.bind(adminController),
  emergencyStopBulkOperations: adminController.emergencyStopBulkOperations.bind(adminController),
  performSecurityCleanup: adminController.performSecurityCleanup.bind(adminController),
  
  // Background worker methods
  startBackgroundClicks: adminController.startBackgroundClicks.bind(adminController),
  startBackgroundViews: adminController.startBackgroundViews.bind(adminController),
  stopBackgroundProcesses: adminController.stopBackgroundProcesses.bind(adminController),
  getBackgroundStatus: adminController.getBackgroundStatus.bind(adminController),
  
  // NEW: Aura features methods
  generateBulkClicksWithAura: adminController.generateBulkClicksWithAura.bind(adminController),
  generateBlogViewsWithAura: adminController.generateBlogViewsWithAura.bind(adminController),
  getAuraStatus: adminController.getAuraStatus.bind(adminController),
  verifyBulkFeatures: adminController.verifyBulkFeatures.bind(adminController),
  testIPRotation: adminController.testIPRotation.bind(adminController),
  testUserAgentRotation: adminController.testUserAgentRotation.bind(adminController)
};

module.exports = boundController;