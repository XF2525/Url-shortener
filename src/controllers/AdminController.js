/**
 * Admin controller for dashboard and analytics
 */

const urlShortener = require('../models/UrlShortener');
const templateUtils = require('../views/templates');
const bulkGeneration = require('../utils/bulkGeneration');

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
   * Enhanced Blog View Generation with Advanced Security
   */
  async generateBlogViews(req, res) {
    try {
      const { blogId, viewCount, delay, userAgents } = req.body;
      
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

      console.log(`[BLOG] Starting secure blog view generation: ${viewCount} views for ${blogId} from IP ${securityContext.ip}`);

      // Generate blog views with enhanced security
      const results = [];
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
            generationContext: securityContext
          };

          results.push({
            viewNumber: i + 1,
            timestamp: analyticsData.timestamp,
            ip: analyticsData.ip,
            readTime: analyticsData.behavior.readTime,
            scrollDepth: analyticsData.behavior.scrollDepth,
            sessionId: analyticsData.sessionId
          });

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

      console.log(`[BLOG] Completed secure blog view generation: ${results.length} views for ${blogId}`);

      res.json({
        success: true,
        message: `Successfully generated ${results.length} views for blog ${blogId}`,
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
}

module.exports = new AdminController();