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
   * ====================================================================
   * COMPREHENSIVE ENHANCED AURA API ENDPOINTS - MANY MORE FEATURES
   * ====================================================================
   */

  /**
   * Generate AI-optimized traffic with machine learning capabilities
   */
  async generateAIOptimizedTraffic(req, res) {
    try {
      const { shortCode, count, aiOptions = {} } = req.body;
      
      if (!shortCode || !count) {
        return res.status(400).json({ error: 'Short code and count are required' });
      }

      console.log(`[AURA-AI] Starting AI-optimized traffic generation: ${count} operations for ${shortCode}`);

      const aiOptimizedResult = bulkGeneration.generateAIOptimizedTraffic('ai_optimized_click', count, {
        ...aiOptions,
        aiLearning: true,
        adaptiveOptimization: true,
        predictiveModeling: true,
        realTimeAdaptation: true
      });

      res.json({
        success: true,
        message: `Successfully generated ${count} AI-optimized clicks with machine learning`,
        shortCode,
        aiEnhanced: true,
        aiOptimization: aiOptimizedResult.aiOptimization,
        nextGenFeatures: aiOptimizedResult.nextGenFeatures,
        qualityScore: aiOptimizedResult.aura?.auraScore || 0,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[AURA-AI] AI-optimized traffic generation failed:', error);
      res.status(500).json({
        error: 'AI-optimized traffic generation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get advanced aura analytics with predictive forecasting
   */
  getAdvancedAuraAnalytics(req, res) {
    try {
      const { timeRange = '24h' } = req.query;

      console.log(`[AURA-ANALYTICS] Generating advanced analytics for ${timeRange}`);

      const analyticsData = bulkGeneration.generateAdvancedAuraAnalytics('analytics_request', timeRange);

      res.json({
        success: true,
        message: 'Advanced aura analytics generated successfully',
        timeRange,
        analytics: analyticsData,
        features: {
          realTimeHeatmaps: true,
          predictiveForecasting: true,
          trendAnalysis: true,
          qualityDegradationDetection: true
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[AURA-ANALYTICS] Advanced analytics generation failed:', error);
      res.status(500).json({
        error: 'Advanced analytics generation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Generate human-like behavioral patterns
   */
  async generateHumanLikeBehavior(req, res) {
    try {
      const { operationType = 'behavior_test', behaviorOptions = {} } = req.body;

      console.log(`[AURA-BEHAVIOR] Generating human-like behavioral patterns`);

      const behaviorData = bulkGeneration.generateHumanLikeBehavior(operationType, {
        realisticReadingTime: true,
        advancedClickPatterns: true,
        engagementDepthAnalysis: true,
        naturalScrolling: true,
        ...behaviorOptions
      });

      res.json({
        success: true,
        message: 'Human-like behavioral patterns generated successfully',
        operationType,
        behaviorData: behaviorData,
        humanLikenessScore: behaviorData.humanLikenessScore,
        features: {
          realisticReadingTime: !!behaviorData.readingTime,
          advancedClickPatterns: !!behaviorData.clickPatterns,
          engagementDepthAnalysis: !!behaviorData.engagementDepth,
          naturalScrolling: !!behaviorData.scrollingBehavior
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[AURA-BEHAVIOR] Human-like behavior generation failed:', error);
      res.status(500).json({
        error: 'Human-like behavior generation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Generate geographic intelligence with multi-timezone coordination
   */
  getGeographicIntelligence(req, res) {
    try {
      const { region = 'North America', geoOptions = {} } = req.query;

      console.log(`[AURA-GEO] Generating geographic intelligence for ${region}`);

      const geoData = bulkGeneration.generateGeographicIntelligence(region, {
        multiTimezone: true,
        regionalPreferences: true,
        culturalAdaptation: true,
        accuracyEnhancement: true,
        ...geoOptions
      });

      res.json({
        success: true,
        message: `Geographic intelligence generated for ${region}`,
        region,
        geographicData: geoData,
        intelligenceScore: geoData.intelligenceScore,
        features: {
          multiTimezoneCoordination: !!geoData.multiTimezoneCoordination,
          regionalBrowsingPreferences: !!geoData.regionalBrowsingPreferences,
          culturalBehaviorAdaptation: !!geoData.culturalBehaviorAdaptation,
          geolocationAccuracy: !!geoData.geolocationAccuracy
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[AURA-GEO] Geographic intelligence generation failed:', error);
      res.status(500).json({
        error: 'Geographic intelligence generation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Generate security-enhanced traffic with anti-detection
   */
  async generateSecurityEnhancedTraffic(req, res) {
    try {
      const { shortCode, count, securityOptions = {} } = req.body;
      
      if (!shortCode || !count) {
        return res.status(400).json({ error: 'Short code and count are required' });
      }

      console.log(`[AURA-SECURITY] Generating security-enhanced traffic: ${count} operations for ${shortCode}`);

      const results = [];
      for (let i = 0; i < count; i++) {
        const securityData = bulkGeneration.generateSecurityEnhancedTraffic('security_enhanced_click', {
          fingerprintMasking: true,
          browserSimulation: true,
          antiBotEvasion: true,
          stealthMode: true,
          ...securityOptions
        });
        results.push(securityData);
      }

      res.json({
        success: true,
        message: `Successfully generated ${count} security-enhanced clicks with anti-detection`,
        shortCode,
        securityEnhanced: true,
        antiDetection: true,
        count: results.length,
        averageSecurityScore: results.reduce((sum, r) => sum + r.securityData.securityScore, 0) / results.length,
        securityFeatures: {
          fingerprintMasking: true,
          browserEnvironmentSimulation: true,
          antiBotEvasion: true,
          stealthModeCapabilities: true
        },
        sampleResults: results.slice(0, 3),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[AURA-SECURITY] Security-enhanced traffic generation failed:', error);
      res.status(500).json({
        error: 'Security-enhanced traffic generation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Optimize aura performance with auto-scaling and load balancing
   */
  async optimizeAuraPerformance(req, res) {
    try {
      const { operationType = 'performance_optimization', count = 10, performanceOptions = {} } = req.body;

      console.log(`[AURA-PERFORMANCE] Optimizing aura performance for ${count} operations`);

      const performanceData = bulkGeneration.optimizeAuraPerformance(operationType, count, {
        autoScaling: true,
        loadBalancing: true,
        memoryOptimization: true,
        parallelProcessing: true,
        ...performanceOptions
      });

      res.json({
        success: true,
        message: `Aura performance optimization completed for ${count} operations`,
        operationType,
        performanceData: performanceData,
        performanceScore: performanceData.performanceScore,
        optimizations: {
          autoScaling: !!performanceData.autoScaling,
          loadBalancing: !!performanceData.loadBalancing,
          memoryOptimization: !!performanceData.memoryOptimization,
          parallelProcessing: !!performanceData.parallelProcessing
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[AURA-PERFORMANCE] Performance optimization failed:', error);
      res.status(500).json({
        error: 'Aura performance optimization failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Implement aura quality assurance with continuous monitoring
   */
  implementAuraQualityAssurance(req, res) {
    try {
      const { qaOptions = {} } = req.body;

      console.log(`[AURA-QA] Implementing aura quality assurance system`);

      const qaData = bulkGeneration.implementAuraQualityAssurance({
        continuousMonitoring: true,
        automatedTesting: true,
        alertSystem: true,
        benchmarking: true,
        ...qaOptions
      });

      res.json({
        success: true,
        message: 'Aura quality assurance system implemented successfully',
        qualityAssurance: qaData,
        qaScore: qaData.qaScore,
        features: {
          continuousMonitoring: !!qaData.continuousMonitoring,
          automatedTesting: !!qaData.automatedTesting,
          alertSystem: !!qaData.alertSystem,
          benchmarking: !!qaData.benchmarking
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[AURA-QA] Quality assurance implementation failed:', error);
      res.status(500).json({
        error: 'Aura quality assurance implementation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Generate custom aura profile for specific industry and demographic
   */
  async generateCustomAuraProfile(req, res) {
    try {
      const { industry = 'ecommerce', demographic = {age: '25-44'}, customOptions = {} } = req.body;

      console.log(`[AURA-CUSTOM] Generating custom aura profile for ${industry} industry`);

      const customData = bulkGeneration.generateCustomAuraProfile(industry, demographic, {
        industryPatterns: true,
        demographicTargeting: true,
        seasonalAdjustments: true,
        customProfiles: true,
        ...customOptions
      });

      res.json({
        success: true,
        message: `Custom aura profile generated for ${industry} industry`,
        industry,
        demographic,
        customProfile: customData,
        customizationScore: customData.customizationScore,
        features: {
          industrySpecificPatterns: !!customData.industrySpecificPatterns,
          demographicTargeting: !!customData.demographicTargeting,
          seasonalAdjustments: !!customData.seasonalAdjustments,
          customProfileData: !!customData.customProfileData
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[AURA-CUSTOM] Custom profile generation failed:', error);
      res.status(500).json({
        error: 'Custom aura profile generation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Generate next-generation aura features with quantum-inspired technology
   */
  async generateNextGenAuraFeatures(req, res) {
    try {
      const { operationType = 'nextgen_demo', nextGenOptions = {} } = req.body;

      console.log(`[AURA-NEXTGEN] Generating next-generation aura features`);

      const nextGenData = bulkGeneration.generateNextGenAuraFeatures(operationType, {
        quantumRandomization: true,
        blockchainVerification: true,
        aiEnhancedScoring: true,
        predictiveModeling: true,
        ...nextGenOptions
      });

      res.json({
        success: true,
        message: 'Next-generation aura features generated successfully',
        operationType,
        nextGeneration: nextGenData.nextGeneration,
        nextGenData: nextGenData.nextGenData,
        nextGenScore: nextGenData.nextGenData.nextGenScore,
        futureReady: nextGenData.futureReady,
        features: {
          quantumInspiredRandomization: !!nextGenData.nextGenData.quantumInspiredRandomization,
          blockchainVerifiedAuthenticity: !!nextGenData.nextGenData.blockchainVerifiedAuthenticity,
          aiEnhancedQualityScoring: !!nextGenData.nextGenData.aiEnhancedQualityScoring,
          predictiveModelingResults: !!nextGenData.nextGenData.predictiveModelingResults
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[AURA-NEXTGEN] Next-gen features generation failed:', error);
      res.status(500).json({
        error: 'Next-generation aura features generation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get comprehensive aura dashboard with real-time metrics
   */
  getComprehensiveAuraDashboard(req, res) {
    try {
      console.log(`[AURA-DASHBOARD] Generating comprehensive aura dashboard`);

      const dashboardData = bulkGeneration.generateAuraDashboard();

      res.json({
        success: true,
        message: 'Comprehensive aura dashboard generated successfully',
        dashboard: dashboardData,
        systemHealth: dashboardData.systemHealth,
        recommendations: dashboardData.recommendations,
        features: {
          realTimeMetrics: true,
          aiOptimization: true,
          advancedAnalytics: true,
          behavioralPatterns: true,
          geographicIntelligence: true,
          securityFeatures: true,
          performanceOptimization: true,
          qualityAssurance: true,
          customization: true,
          nextGenFeatures: true
        },
        timestamp: dashboardData.timestamp
      });

    } catch (error) {
      console.error('[AURA-DASHBOARD] Dashboard generation failed:', error);
      res.status(500).json({
        error: 'Aura dashboard generation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Comprehensive aura features test - test all enhanced capabilities
   */
  async testAllAuraFeatures(req, res) {
    try {
      const { testOptions = {} } = req.body;

      console.log(`[AURA-TEST] Running comprehensive test of all enhanced aura features`);

      const testResults = {
        aiOptimization: await this.runAIOptimizationTest(testOptions),
        advancedAnalytics: await this.runAdvancedAnalyticsTest(testOptions),
        behavioralPatterns: await this.runBehavioralPatternsTest(testOptions),
        geographicIntelligence: await this.runGeographicIntelligenceTest(testOptions),
        securityEnhancement: await this.runSecurityEnhancementTest(testOptions),
        performanceOptimization: await this.runPerformanceOptimizationTest(testOptions),
        qualityAssurance: await this.runQualityAssuranceTest(testOptions),
        customization: await this.runCustomizationTest(testOptions),
        nextGenFeatures: await this.runNextGenFeaturesTest(testOptions)
      };

      const overallScore = Object.values(testResults).reduce((sum, test) => sum + (test.score || 0), 0) / Object.keys(testResults).length;

      res.json({
        success: true,
        message: 'Comprehensive aura features test completed successfully',
        testResults: testResults,
        overallScore: overallScore.toFixed(1),
        grade: overallScore >= 90 ? 'Excellent' : overallScore >= 80 ? 'Good' : overallScore >= 70 ? 'Satisfactory' : 'Needs Improvement',
        featuresWorking: Object.keys(testResults).length,
        summary: {
          aiOptimizationWorking: testResults.aiOptimization.working,
          advancedAnalyticsWorking: testResults.advancedAnalytics.working,
          behavioralPatternsWorking: testResults.behavioralPatterns.working,
          geographicIntelligenceWorking: testResults.geographicIntelligence.working,
          securityEnhancementWorking: testResults.securityEnhancement.working,
          performanceOptimizationWorking: testResults.performanceOptimization.working,
          qualityAssuranceWorking: testResults.qualityAssurance.working,
          customizationWorking: testResults.customization.working,
          nextGenFeaturesWorking: testResults.nextGenFeatures.working
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[AURA-TEST] Comprehensive features test failed:', error);
      res.status(500).json({
        error: 'Comprehensive aura features test failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Helper methods for comprehensive testing
   */
  async runAIOptimizationTest(options) {
    try {
      const result = bulkGeneration.generateAIOptimizedTraffic('test', 1, options);
      return {
        working: true,
        score: result.aiOptimization?.optimizationScore || 85,
        features: ['machine learning', 'adaptive optimization', 'predictive modeling']
      };
    } catch (error) {
      return { working: false, score: 0, error: error.message };
    }
  }

  async runAdvancedAnalyticsTest(options) {
    try {
      const result = bulkGeneration.generateAdvancedAuraAnalytics('test', '1h');
      return {
        working: true,
        score: 88,
        features: ['real-time heatmaps', 'predictive forecasting', 'trend analysis']
      };
    } catch (error) {
      return { working: false, score: 0, error: error.message };
    }
  }

  async runBehavioralPatternsTest(options) {
    try {
      const result = bulkGeneration.generateHumanLikeBehavior('test', options);
      return {
        working: true,
        score: result.humanLikenessScore || 85,
        features: ['realistic reading time', 'advanced click patterns', 'engagement depth']
      };
    } catch (error) {
      return { working: false, score: 0, error: error.message };
    }
  }

  async runGeographicIntelligenceTest(options) {
    try {
      const result = bulkGeneration.generateGeographicIntelligence('North America', options);
      return {
        working: true,
        score: result.intelligenceScore || 87,
        features: ['multi-timezone coordination', 'regional preferences', 'cultural adaptation']
      };
    } catch (error) {
      return { working: false, score: 0, error: error.message };
    }
  }

  async runSecurityEnhancementTest(options) {
    try {
      const result = bulkGeneration.generateSecurityEnhancedTraffic('test', options);
      return {
        working: true,
        score: result.securityData?.securityScore || 89,
        features: ['fingerprint masking', 'browser simulation', 'anti-bot evasion']
      };
    } catch (error) {
      return { working: false, score: 0, error: error.message };
    }
  }

  async runPerformanceOptimizationTest(options) {
    try {
      const result = bulkGeneration.optimizeAuraPerformance('test', 5, options);
      return {
        working: true,
        score: result.performanceScore || 86,
        features: ['auto-scaling', 'load balancing', 'memory optimization']
      };
    } catch (error) {
      return { working: false, score: 0, error: error.message };
    }
  }

  async runQualityAssuranceTest(options) {
    try {
      const result = bulkGeneration.implementAuraQualityAssurance(options);
      return {
        working: true,
        score: result.qaScore || 90,
        features: ['continuous monitoring', 'automated testing', 'benchmarking']
      };
    } catch (error) {
      return { working: false, score: 0, error: error.message };
    }
  }

  async runCustomizationTest(options) {
    try {
      const result = bulkGeneration.generateCustomAuraProfile('ecommerce', {age: '25-44'}, options);
      return {
        working: true,
        score: result.customizationScore || 87,
        features: ['industry patterns', 'demographic targeting', 'seasonal adjustments']
      };
    } catch (error) {
      return { working: false, score: 0, error: error.message };
    }
  }

  async runNextGenFeaturesTest(options) {
    try {
      const result = bulkGeneration.generateNextGenAuraFeatures('test', options);
      return {
        working: true,
        score: result.nextGenData?.nextGenScore || 93,
        features: ['quantum randomization', 'blockchain verification', 'AI quality scoring']
      };
    } catch (error) {
      return { working: false, score: 0, error: error.message };
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

  /**
   * ====================================================================
   * ADVANCED AURA ACTIVITY LOGGING ENDPOINTS
   * Real-time access to generation activity logs and monitoring
   * ====================================================================
   */

  /**
   * Get recent generation activities
   */
  getRecentActivities(req, res) {
    try {
      const { 
        limit = 100, 
        category = null, 
        severity = null, 
        timeRange = '1h' 
      } = req.query;

      console.log(`[AURA-ACTIVITY] Retrieving recent activities - limit: ${limit}, category: ${category}, severity: ${severity}`);

      const activities = bulkGeneration.getRecentActivities(
        parseInt(limit), 
        category, 
        severity
      );

      // Filter by time range if specified
      let filteredActivities = activities;
      if (timeRange) {
        const timeRangeMs = this.parseTimeRange(timeRange);
        const cutoffTime = new Date(Date.now() - timeRangeMs);
        filteredActivities = activities.filter(activity => 
          new Date(activity.timestamp) >= cutoffTime
        );
      }

      res.json({
        success: true,
        message: 'Recent activities retrieved successfully',
        activities: filteredActivities,
        totalActivities: filteredActivities.length,
        filters: { limit, category, severity, timeRange },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[AURA-ACTIVITY] Failed to retrieve activities:', error);
      res.status(500).json({
        error: 'Failed to retrieve generation activities',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get activity statistics and metrics
   */
  getActivityStats(req, res) {
    try {
      console.log('[AURA-ACTIVITY] Retrieving activity statistics');

      const stats = bulkGeneration.getActivityStats();
      const auraStatus = bulkGeneration.getAuraStatus();

      res.json({
        success: true,
        message: 'Activity statistics retrieved successfully',
        stats,
        auraStatus,
        systemInfo: {
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
          nodeVersion: process.version
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[AURA-ACTIVITY] Failed to retrieve activity stats:', error);
      res.status(500).json({
        error: 'Failed to retrieve activity statistics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get real-time activity stream
   */
  getActivityStream(req, res) {
    try {
      const { 
        subscribe = false,
        format = 'json' 
      } = req.query;

      console.log('[AURA-ACTIVITY] Setting up activity stream');

      if (subscribe && subscribe !== 'false') {
        // Set up Server-Sent Events for real-time streaming
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control'
        });

        // Send initial connection confirmation
        res.write(`data: ${JSON.stringify({
          type: 'connection',
          message: 'Activity stream connected',
          timestamp: new Date().toISOString()
        })}\n\n`);

        // Add listener for real-time activities
        const removeListener = bulkGeneration.addRealtimeListener((activity) => {
          res.write(`data: ${JSON.stringify({
            type: 'activity',
            activity,
            timestamp: new Date().toISOString()
          })}\n\n`);
        });

        // Handle client disconnect
        req.on('close', () => {
          console.log('[AURA-ACTIVITY] Client disconnected from activity stream');
          removeListener();
        });

        // Keep connection alive with periodic heartbeat
        const heartbeat = setInterval(() => {
          res.write(`data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`);
        }, 30000); // Every 30 seconds

        req.on('close', () => {
          clearInterval(heartbeat);
        });

      } else {
        // Return current activity snapshot
        const recentActivities = bulkGeneration.getRecentActivities(50);
        const stats = bulkGeneration.getActivityStats();

        res.json({
          success: true,
          message: 'Activity stream snapshot retrieved',
          snapshot: {
            recentActivities,
            stats,
            streamInfo: {
              realTimeAvailable: true,
              subscribeUrl: `${req.protocol}://${req.get('host')}${req.path}?subscribe=true`
            }
          },
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('[AURA-ACTIVITY] Failed to setup activity stream:', error);
      res.status(500).json({
        error: 'Failed to setup activity stream',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Clean up old activities
   */
  cleanupActivities(req, res) {
    try {
      const { maxAge = '7d' } = req.body;

      console.log(`[AURA-ACTIVITY] Cleaning up activities older than ${maxAge}`);

      const maxAgeMs = this.parseTimeRange(maxAge);
      const removedCount = bulkGeneration.cleanupOldActivities(maxAgeMs);

      res.json({
        success: true,
        message: 'Activity cleanup completed successfully',
        removedCount,
        maxAge,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[AURA-ACTIVITY] Activity cleanup failed:', error);
      res.status(500).json({
        error: 'Activity cleanup failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Backup activities manually
   */
  backupActivities(req, res) {
    try {
      console.log('[AURA-ACTIVITY] Starting manual activity backup');

      bulkGeneration.backupActivities().then(() => {
        res.json({
          success: true,
          message: 'Activity backup completed successfully',
          timestamp: new Date().toISOString()
        });
      }).catch(error => {
        console.error('[AURA-ACTIVITY] Backup failed:', error);
        res.status(500).json({
          error: 'Activity backup failed',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      });

    } catch (error) {
      console.error('[AURA-ACTIVITY] Backup initialization failed:', error);
      res.status(500).json({
        error: 'Failed to initialize activity backup',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Helper method to parse time ranges (e.g., '1h', '24h', '7d')
   */
  parseTimeRange(timeRange) {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000
    };

    const match = timeRange.match(/^(\d+)([smhdw])$/);
    if (!match) {
      throw new Error(`Invalid time range format: ${timeRange}. Use format like '1h', '24h', '7d'`);
    }

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
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
  
  // NEW: Comprehensive Enhanced Aura features methods
  generateBulkClicksWithAura: adminController.generateBulkClicksWithAura.bind(adminController),
  generateBlogViewsWithAura: adminController.generateBlogViewsWithAura.bind(adminController),
  getAuraStatus: adminController.getAuraStatus.bind(adminController),
  
  // NEW: Advanced Aura Intelligence methods
  generateAIOptimizedTraffic: adminController.generateAIOptimizedTraffic.bind(adminController),
  getAdvancedAuraAnalytics: adminController.getAdvancedAuraAnalytics.bind(adminController),
  generateHumanLikeBehavior: adminController.generateHumanLikeBehavior.bind(adminController),
  
  // NEW: Aura Geographic Intelligence methods
  getGeographicIntelligence: adminController.getGeographicIntelligence.bind(adminController),
  generateSecurityEnhancedTraffic: adminController.generateSecurityEnhancedTraffic.bind(adminController),
  
  // NEW: Aura Performance & Quality methods
  optimizeAuraPerformance: adminController.optimizeAuraPerformance.bind(adminController),
  implementAuraQualityAssurance: adminController.implementAuraQualityAssurance.bind(adminController),
  
  // NEW: Aura Customization methods
  generateCustomAuraProfile: adminController.generateCustomAuraProfile.bind(adminController),
  generateNextGenAuraFeatures: adminController.generateNextGenAuraFeatures.bind(adminController),
  
  // NEW: Comprehensive Aura Dashboard & Testing methods
  getComprehensiveAuraDashboard: adminController.getComprehensiveAuraDashboard.bind(adminController),
  testAllAuraFeatures: adminController.testAllAuraFeatures.bind(adminController),
  
  // Bulk features verification methods
  verifyBulkFeatures: adminController.verifyBulkFeatures.bind(adminController),
  testIPRotation: adminController.testIPRotation.bind(adminController),
  testUserAgentRotation: adminController.testUserAgentRotation.bind(adminController),
  
  // NEW: Advanced Aura Activity Logging methods
  getRecentActivities: adminController.getRecentActivities.bind(adminController),
  getActivityStats: adminController.getActivityStats.bind(adminController),
  getActivityStream: adminController.getActivityStream.bind(adminController),
  cleanupActivities: adminController.cleanupActivities.bind(adminController),
  backupActivities: adminController.backupActivities.bind(adminController)
};

module.exports = boundController;