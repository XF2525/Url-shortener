/**
 * Main routes controller for the URL shortener
 */

const urlShortener = require('../models/UrlShortener');
const templateUtils = require('../views/templates');
const validator = require('../utils/validation');

class MainController {
  /**
   * Homepage route
   */
  getHomepage(req, res) {
    try {
      const content = `
        <div class="container">
          <div class="card">
            <h1>🔗 URL Shortener</h1>
            <p>Enter a long URL below to create a short, shareable link.</p>
            
            <form onsubmit="return shortenUrl(event)">
              <div class="form-group">
                <label for="url">Enter URL to shorten:</label>
                <input 
                  type="url" 
                  id="url" 
                  name="url" 
                  placeholder="https://example.com/very/long/url"
                  required
                >
              </div>
              <button type="submit" class="btn btn-primary">Shorten URL</button>
            </form>
            
            <div id="result"></div>
          </div>
        </div>
      `;

      const additionalJS = `
        async function shortenUrl(event) {
          event.preventDefault();
          const form = event.target;
          const url = form.url.value;
          const resultDiv = document.getElementById('result');
          
          try {
            resultDiv.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Creating short URL...</p></div>';
            
            const response = await makeRequest('/shorten', {
              method: 'POST',
              body: JSON.stringify({ originalUrl: url })
            });
            
            if (response.success || response.shortCode) {
              const shortUrl = window.location.origin + '/' + response.shortCode;
              resultDiv.innerHTML = 
                '<div class="result success">' +
                  '<h3>✅ URL Shortened Successfully!</h3>' +
                  '<p><strong>Original URL:</strong> ' + response.originalUrl + '</p>' +
                  '<p><strong>Short URL:</strong> ' +
                    '<a href="' + shortUrl + '" target="_blank">' + shortUrl + '</a>' +
                    '<button class="btn btn-success" onclick="copyToClipboard(\\''+shortUrl+'\\')" style="margin-left: 10px;">' +
                      '📋 Copy' +
                    '</button>' +
                  '</p>' +
                  (response.existingUrl ? '<p><em>Note: This URL was already shortened.</em></p>' : '') +
                '</div>';
            } else {
              throw new Error(response.error || 'Unknown error occurred');
            }
          } catch (error) {
            resultDiv.innerHTML = 
              '<div class="result error">' +
                '<h3>❌ Error</h3>' +
                '<p>' + error.message + '</p>' +
              '</div>';
          }
          return false;
        }
      `;

      const html = templateUtils.generateHTML(
        'URL Shortener', 
        content, 
        '', 
        additionalJS, 
        true, 
        'home'
      );
      
      res.send(html);
    } catch (error) {
      console.error('Homepage error:', error);
      res.status(500).send('Internal server error');
    }
  }

  /**
   * Shorten URL API endpoint with enhanced security
   */
  shortenUrl(req, res) {
    try {
      // Input validation and sanitization
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body'
        });
      }

      let { originalUrl } = req.body;

      // Sanitize input
      if (typeof originalUrl === 'string') {
        originalUrl = originalUrl.trim();
        // Normalize URL to prevent bypass attempts
        originalUrl = validator.normalizeUrl(originalUrl);
      }

      // Enhanced validation
      const errors = validator.validateInput({
        originalUrl: {
          required: true,
          type: 'string',
          format: 'url',
          maxLength: 2000,
          minLength: 10
        }
      }, { originalUrl });

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
      }

      // Additional security checks
      if (!originalUrl || originalUrl.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'URL cannot be empty after normalization'
        });
      }

      // Create short URL
      const result = urlShortener.createShortUrl(originalUrl);
      
      if (result.success) {
        res.json({
          success: true,
          shortCode: result.data.shortCode,
          originalUrl: result.data.originalUrl,
          existingUrl: result.data.existingUrl || false,
          createdAt: result.data.createdAt
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Shorten URL error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Redirect to original URL with enhanced security and validation
   */
  redirectToOriginal(req, res) {
    try {
      const shortCode = req.params.shortCode;

      // Enhanced input validation
      if (!shortCode || typeof shortCode !== 'string') {
        return res.status(404).send(this.getNotFoundPage('Invalid short code'));
      }

      // Sanitize short code to prevent injection attacks
      const sanitizedShortCode = validator.sanitizeInput(shortCode);
      
      // Validate short code format
      if (sanitizedShortCode.length < 4 || sanitizedShortCode.length > 10) {
        return res.status(404).send(this.getNotFoundPage('Invalid short code format'));
      }

      // Additional security check: only allow alphanumeric characters
      if (!/^[a-zA-Z0-9]+$/.test(sanitizedShortCode)) {
        return res.status(404).send(this.getNotFoundPage('Invalid characters in short code'));
      }

      const result = urlShortener.getOriginalUrl(sanitizedShortCode);
      
      if (result.success) {
        try {
          // Record the click for analytics with error handling
          urlShortener.recordClick(sanitizedShortCode, req);
        } catch (analyticsError) {
          // Log but don't fail the redirect
          console.error('Analytics recording error:', analyticsError);
        }
        
        // Validate redirect URL before redirecting
        const originalUrl = result.data.originalUrl;
        if (!validator.isValidUrl(originalUrl)) {
          console.error('Invalid redirect URL detected:', originalUrl);
          return res.status(400).send(this.getNotFoundPage('Invalid redirect URL'));
        }
        
        // Safe redirect to original URL
        res.redirect(originalUrl);
      } else {
        res.status(404).send(this.getNotFoundPage('Short URL not found'));
      }
    } catch (error) {
      console.error('Redirect error:', error);
      res.status(500).send(this.getNotFoundPage('Internal server error'));
    }
  }

  /**
   * Generate consistent 404 page
   */
  getNotFoundPage(message = 'URL not found') {
    return `
      <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
        <h1>🔗 ${validator.sanitizeInput(message)}</h1>
        <p>The short URL you're looking for doesn't exist or has been removed.</p>
        <a href="/" style="color: #3498db; text-decoration: none;">← Go back to homepage</a>
      </div>
    `;
  }

  /**
   * Health check endpoint
   */
  healthCheck(req, res) {
    try {
      const stats = urlShortener.getSystemStats();
      
      const healthStatus = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        stats: {
          totalUrls: stats.totalUrls,
          totalClicks: stats.totalClicks,
          recentUrls: stats.recentUrls,
          recentClicks: stats.recentClicks
        }
      };
      
      res.json(healthStatus);
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: 'Internal server error'
      });
    }
  }
}

// Create and export properly bound instance
const mainController = new MainController();

// Bind all methods to maintain 'this' context
const boundController = {
  getHomepage: mainController.getHomepage.bind(mainController),
  shortenUrl: mainController.shortenUrl.bind(mainController),
  redirectToOriginal: mainController.redirectToOriginal.bind(mainController),
  healthCheck: mainController.healthCheck.bind(mainController)
};

module.exports = boundController;