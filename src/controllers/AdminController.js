/**
 * Admin controller for dashboard and analytics
 */

const urlShortener = require('../models/UrlShortener');
const templateUtils = require('../views/templates');

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
}

module.exports = new AdminController();