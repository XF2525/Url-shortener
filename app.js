const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration constants for efficiency
const CONFIG = {
  HISTORY_LIMIT: 100,
  OPERATIONS_LOG_LIMIT: 1000,
  BULK_CLICK_LIMIT: 50,
  BULK_BLOG_VIEW_LIMIT: 30,
  BASE_DELAYS: {
    CLICK_GENERATION: 200,
    BLOG_VIEW_GENERATION: 300
  },
  TIME_WINDOWS: {
    ONE_HOUR: 60 * 60 * 1000,
    ONE_DAY: 24 * 60 * 60 * 1000
  }
};

// Enhanced utility functions for analytics caching
const analyticsCache = {
  urlStats: null,
  blogStats: null,
  lastUpdated: 0,
  CACHE_DURATION: 10000 // 10 seconds
};

function getCachedAnalytics(type) {
  const now = Date.now();
  if (analyticsCache.lastUpdated + analyticsCache.CACHE_DURATION > now) {
    return analyticsCache[type];
  }
  return null;
}

function setCachedAnalytics(type, data) {
  analyticsCache[type] = data;
  analyticsCache.lastUpdated = Date.now();
}

// In-memory storage for URL mappings
const urlDatabase = {};

// In-memory storage for URL analytics
const urlAnalytics = {};

// In-memory storage for blog posts
const blogDatabase = {};

// In-memory storage for blog analytics
const blogAnalytics = {};

// Advanced security tracking for admin operations
const adminSecurity = {
  sessions: {}, // Track admin sessions with enhanced security
  ipTracking: {}, // Track operations per IP address
  operationLogs: [], // Log all admin operations
  rateLimits: {
    maxOperationsPerHour: 50, // Maximum automation operations per hour per IP
    maxBulkOperationsPerDay: 10, // Maximum bulk operations per day per IP
    cooldownBetweenBulk: 300000, // 5 minutes cooldown between bulk operations
    progressiveDelayFactor: 1.5 // Increase delays for repeated operations
  },
  emergencyStop: false // Emergency stop for all automation
};

// Simple admin credentials (in production, use proper authentication)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Function to generate a random short code
function generateShortCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Function to validate URL
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Unified analytics recording function
function recordAnalytics(database, key, req, eventType = 'interaction') {
  if (!database[key]) {
    const isView = eventType === 'view';
    database[key] = {
      [isView ? 'views' : 'clicks']: 0,
      [isView ? 'firstView' : 'firstClick']: null,
      [isView ? 'lastView' : 'lastClick']: null,
      [isView ? 'viewHistory' : 'clickHistory']: []
    };
  }
  
  const timestamp = new Date();
  const analytics = database[key];
  const isView = eventType === 'view';
  const countKey = isView ? 'views' : 'clicks';
  const firstKey = isView ? 'firstView' : 'firstClick';
  const lastKey = isView ? 'lastView' : 'lastClick';
  const historyKey = isView ? 'viewHistory' : 'clickHistory';
  
  analytics[countKey]++;
  analytics[lastKey] = timestamp;
  
  if (!analytics[firstKey]) {
    analytics[firstKey] = timestamp;
  }
  
  // Store history with memory management
  analytics[historyKey].push({
    timestamp,
    userAgent: req.get('User-Agent') || 'Unknown',
    ip: req.ip || req.connection.remoteAddress || 'Unknown'
  });
  
  if (analytics[historyKey].length > CONFIG.HISTORY_LIMIT) {
    analytics[historyKey].shift();
  }
  
  // Invalidate cache when data changes
  analyticsCache.lastUpdated = 0;
}

// Optimized analytics recording functions
function recordClick(shortCode, req) {
  recordAnalytics(urlAnalytics, shortCode, req, 'click');
}

function recordBlogView(blogId, req) {
  recordAnalytics(blogAnalytics, blogId, req, 'view');
}

// Utility functions
function generateBlogId() {
  return 'blog_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

// Advanced security functions
function getClientIP(req) {
  return req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
}

// Enhanced error handling utilities
function createErrorHandler(operation) {
  return (error, req, res, next) => {
    console.error(`Error in ${operation}:`, error);
    logAdminOperation('ERROR', getClientIP(req), { operation, error: error.message });
    
    if (res.headersSent) {
      return next(error);
    }
    
    sendError(res, error.message || 'Internal server error', error.status || 500);
  };
}

function validateInput(schema, data) {
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    if (rules.required && (!value || value.toString().trim() === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    if (value && rules.type) {
      if (rules.type === 'number' && isNaN(Number(value))) {
        errors.push(`${field} must be a number`);
      }
      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`${field} must be a string`);
      }
    }
    
    if (value && rules.min && Number(value) < rules.min) {
      errors.push(`${field} must be at least ${rules.min}`);
    }
    
    if (value && rules.max && Number(value) > rules.max) {
      errors.push(`${field} must be at most ${rules.max}`);
    }
    
    if (value && rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${field} format is invalid`);
    }
  }
  
  return errors;
}

// Response helper utilities for efficiency
function sendSuccess(res, data, message = 'Success') {
  res.status(200).json({ success: true, message, ...data });
}

function sendError(res, error, status = 400) {
  res.status(status).json({ 
    success: false, 
    error: typeof error === 'string' ? error : error.message || 'Unknown error'
  });
}

function sendJSON(res, data) {
  res.setHeader('Content-Type', 'application/json');
  res.json(data);
}

// Optimized memory management utility
function trimArray(arr, maxLength) {
  if (arr.length > maxLength) {
    arr.splice(0, arr.length - maxLength);
  }
}

// Optimized time-based filtering
function filterByTimeWindow(timestamps, windowMs) {
  const cutoff = Date.now() - windowMs;
  let startIndex = 0;
  
  // Find first valid timestamp using binary search for efficiency
  for (let i = 0; i < timestamps.length; i++) {
    if (timestamps[i] >= cutoff) {
      startIndex = i;
      break;
    }
  }
  
  return timestamps.slice(startIndex);
}

function logAdminOperation(operation, ip, details = {}) {
  const logEntry = {
    timestamp: new Date(),
    operation,
    ip,
    details,
    id: Date.now() + Math.random()
  };
  
  adminSecurity.operationLogs.push(logEntry);
  trimArray(adminSecurity.operationLogs, CONFIG.OPERATIONS_LOG_LIMIT);
  
  return logEntry;
}

function checkRateLimit(ip, operationType) {
  const now = Date.now();
  
  if (!adminSecurity.ipTracking[ip]) {
    adminSecurity.ipTracking[ip] = {
      operationsLastHour: [],
      bulkOperationsLastDay: [],
      lastBulkOperation: 0,
      warningCount: 0
    };
  }
  
  const tracking = adminSecurity.ipTracking[ip];
  
  // Optimized cleanup with efficient filtering
  tracking.operationsLastHour = filterByTimeWindow(tracking.operationsLastHour, CONFIG.TIME_WINDOWS.ONE_HOUR);
  tracking.bulkOperationsLastDay = filterByTimeWindow(tracking.bulkOperationsLastDay, CONFIG.TIME_WINDOWS.ONE_DAY);
  
  // Check rate limits
  if (operationType === 'bulk') {
    // Check cooldown between bulk operations
    if (now - tracking.lastBulkOperation < adminSecurity.rateLimits.cooldownBetweenBulk) {
      const remainingTime = Math.ceil((adminSecurity.rateLimits.cooldownBetweenBulk - (now - tracking.lastBulkOperation)) / 1000);
      return {
        allowed: false,
        reason: `Bulk operation cooldown active. Please wait ${remainingTime} seconds.`,
        remainingTime
      };
    }
    
    // Check daily bulk limit
    if (tracking.bulkOperationsLastDay.length >= adminSecurity.rateLimits.maxBulkOperationsPerDay) {
      return {
        allowed: false,
        reason: `Daily bulk operation limit reached (${adminSecurity.rateLimits.maxBulkOperationsPerDay}). Try again tomorrow.`
      };
    }
    
    tracking.bulkOperationsLastDay.push(now);
    tracking.lastBulkOperation = now;
  }
  
  // Check hourly operation limit
  if (tracking.operationsLastHour.length >= adminSecurity.rateLimits.maxOperationsPerHour) {
    tracking.warningCount++;
    return {
      allowed: false,
      reason: `Hourly operation limit reached (${adminSecurity.rateLimits.maxOperationsPerHour}). Please wait before performing more operations.`
    };
  }
  
  tracking.operationsLastHour.push(now);
  
  return { allowed: true };
}

function calculateProgressiveDelay(ip, baseDelay) {
  const tracking = adminSecurity.ipTracking[ip];
  if (!tracking) return baseDelay;
  
  const recentOperations = tracking.operationsLastHour.length;
  const progressiveFactor = Math.pow(adminSecurity.rateLimits.progressiveDelayFactor, Math.floor(recentOperations / 10));
  
  return Math.min(baseDelay * progressiveFactor, baseDelay * 5); // Max 5x the original delay
}

function requireAdvancedAuth(req, res, next) {
  // Check emergency stop
  if (adminSecurity.emergencyStop) {
    return res.status(503).json({ 
      error: 'All automation operations are temporarily suspended for security reasons.',
      code: 'EMERGENCY_STOP'
    });
  }
  
  // Basic auth check
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Enhanced security checks for automation endpoints
  const ip = getClientIP(req);
  const path = req.path;
  
  // Log the operation attempt
  logAdminOperation('AUTH_CHECK', ip, { path, userAgent: req.get('User-Agent') });
  
  next();
}

// HTML Template utilities for efficiency
function generateHTMLTemplate(title, content, additionalCSS = '', additionalJS = '') {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            ${getCommonCSS()}
            ${additionalCSS}
        </style>
    </head>
    <body>
        ${content}
        <script>
            ${getCommonJS()}
            ${additionalJS}
        </script>
    </body>
    </html>
  `;
}

function getCommonCSS() {
  return `
    body {
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 50px auto;
        padding: 20px;
        background-color: #f5f5f5;
    }
    .container {
        background-color: white;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
        color: #333;
        text-align: center;
        margin-bottom: 30px;
    }
    .experimental-badge {
        background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
        color: white;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 12px;
        font-weight: bold;
        display: inline-block;
        margin-left: 10px;
        animation: pulse 2s infinite;
    }
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
    }
    .form-group {
        margin-bottom: 20px;
    }
    label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
        color: #555;
    }
    input[type="text"], input[type="url"], textarea {
        width: 100%;
        padding: 12px;
        border: 2px solid #ddd;
        border-radius: 5px;
        font-size: 16px;
        box-sizing: border-box;
    }
    button {
        background: linear-gradient(45deg, #4CAF50, #45a049);
        color: white;
        padding: 12px 24px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        transition: all 0.3s ease;
    }
    button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
  `;
}

function getCommonJS() {
  return `
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard!');
        });
    }
    
    function showMessage(message, type = 'info') {
        const div = document.createElement('div');
        div.textContent = message;
        div.style.cssText = \`
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            padding: 15px; border-radius: 5px; color: white;
            background: \${type === 'error' ? '#f44336' : '#4CAF50'};
            animation: slideIn 0.3s ease;
        \`;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }
  `;
}

// Middleware to check admin authentication
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth === `Bearer ${ADMIN_PASSWORD}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Routes

// Home page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>URL Shortener</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 600px;
                margin: 50px auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 30px;
            }
            .experimental-badge {
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                color: white;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: bold;
                display: inline-block;
                margin-left: 10px;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                color: #555;
            }
            input[type="url"], input[type="text"] {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 5px;
                font-size: 16px;
                box-sizing: border-box;
            }
            input[type="url"]:focus, input[type="text"]:focus {
                border-color: #007bff;
                outline: none;
            }
            .custom-code-section {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                border-left: 4px solid #007bff;
            }
            .custom-code-section h3 {
                margin-top: 0;
                color: #007bff;
                font-size: 16px;
            }
            .custom-code-help {
                font-size: 14px;
                color: #666;
                margin-top: 5px;
            }
            button {
                background-color: #007bff;
                color: white;
                padding: 12px 30px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                width: 100%;
            }
            button:hover {
                background-color: #0056b3;
            }
            .result {
                margin-top: 20px;
                padding: 15px;
                background-color: #e7f3ff;
                border-radius: 5px;
                display: none;
            }
            .short-url {
                word-break: break-all;
                font-weight: bold;
                color: #007bff;
            }
            .result-actions {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-top: 15px;
            }
            .result-actions button {
                padding: 8px 16px;
                font-size: 14px;
            }
            .btn-secondary {
                background-color: #6c757d;
            }
            .btn-secondary:hover {
                background-color: #545b62;
            }
            .btn-success {
                background-color: #28a745;
            }
            .btn-success:hover {
                background-color: #218838;
            }
            .custom-badge {
                background-color: #28a745;
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                margin-left: 8px;
            }
            .qr-section {
                text-align: center;
                margin-top: 15px;
                display: none;
            }
            .qr-section img {
                border: 1px solid #ddd;
                border-radius: 8px;
                margin-top: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔗 URL Shortener<span class="experimental-badge">NEW FEATURES!</span></h1>
            
            <!-- Blog Link -->
            <div style="text-align: center; margin-bottom: 20px;">
                <a href="/blog" style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 10px 20px; border-radius: 25px; text-decoration: none; font-weight: bold; display: inline-block;">📝 Visit Our Blog</a>
            </div>
            
            <form id="urlForm">
                <div class="form-group">
                    <label for="originalUrl">Enter URL to shorten:</label>
                    <input type="url" id="originalUrl" name="originalUrl" placeholder="https://example.com" required>
                </div>
                
                <div class="custom-code-section">
                    <h3>🎯 Custom Short Code (Experimental)</h3>
                    <input type="text" id="customCode" name="customCode" placeholder="my-custom-link" maxlength="20">
                    <div class="custom-code-help">
                        Leave empty for auto-generated code, or create your own (3-20 characters, letters and numbers only)
                    </div>
                </div>
                
                <button type="submit">Shorten URL</button>
            </form>
            
            <div id="result" class="result">
                <p>Short URL: <span id="shortUrl" class="short-url"></span><span id="customBadge" class="custom-badge" style="display: none;">CUSTOM</span></p>
                <div class="result-actions">
                    <button onclick="copyToClipboard()" class="btn-success">📋 Copy URL</button>
                    <button onclick="showPreview()" class="btn-secondary">👀 Preview & Analytics</button>
                    <button onclick="showQR()" class="btn-secondary">📱 Show QR Code</button>
                    <button onclick="downloadQR()" class="btn-secondary">💾 Download QR</button>
                </div>
                <div id="qrSection" class="qr-section">
                    <h4>📱 QR Code</h4>
                    <img id="qrImage" alt="QR Code" width="150" height="150">
                </div>
            </div>
        </div>

        <script>
            let currentShortCode = '';
            
            document.getElementById('urlForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const originalUrl = document.getElementById('originalUrl').value;
                const customCode = document.getElementById('customCode').value.trim();
                
                try {
                    const response = await fetch('/shorten', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ originalUrl, customCode: customCode || undefined })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        currentShortCode = data.shortCode;
                        const shortUrl = window.location.origin + '/' + data.shortCode;
                        document.getElementById('shortUrl').textContent = shortUrl;
                        
                        // Show custom badge if it's a custom code
                        const customBadge = document.getElementById('customBadge');
                        if (data.isCustom) {
                            customBadge.style.display = 'inline';
                        } else {
                            customBadge.style.display = 'none';
                        }
                        
                        // Load QR code
                        const qrImage = document.getElementById('qrImage');
                        qrImage.src = \`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=\${encodeURIComponent(shortUrl)}\`;
                        
                        document.getElementById('result').style.display = 'block';
                        document.getElementById('qrSection').style.display = 'none';
                    } else {
                        alert('Error: ' + data.error);
                    }
                } catch (error) {
                    alert('Error: ' + error.message);
                }
            });

            function copyToClipboard() {
                const shortUrl = document.getElementById('shortUrl').textContent;
                navigator.clipboard.writeText(shortUrl).then(() => {
                    alert('Short URL copied to clipboard!');
                });
            }
            
            function showPreview() {
                window.open('/preview/' + currentShortCode, '_blank');
            }
            
            function showQR() {
                const qrSection = document.getElementById('qrSection');
                qrSection.style.display = qrSection.style.display === 'none' ? 'block' : 'none';
            }
            
            function downloadQR() {
                const shortUrl = document.getElementById('shortUrl').textContent;
                const qrUrl = \`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=\${encodeURIComponent(shortUrl)}\`;
                
                const link = document.createElement('a');
                link.href = qrUrl;
                link.download = \`qr-code-\${currentShortCode}.png\`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        </script>
    </body>
    </html>
  `);
});

// Shorten URL endpoint
app.post('/shorten', (req, res) => {
  try {
    const { originalUrl, customCode } = req.body;
    
    // Validate input using utility function
    const validationErrors = validateInput({
      originalUrl: { required: true, type: 'string' }
    }, req.body);
    
    if (validationErrors.length > 0) {
      return sendError(res, validationErrors.join(', '));
    }
    
    // Validate URL
    if (!isValidUrl(originalUrl)) {
      return sendError(res, 'Please provide a valid URL');
    }
    
    // Check if custom code is provided and validate it
    if (customCode) {
      if (!/^[a-zA-Z0-9]{3,20}$/.test(customCode)) {
        return sendError(res, 'Custom code must be 3-20 characters long and contain only letters and numbers');
      }
      
      // Check if custom code already exists
      if (urlDatabase[customCode]) {
        return sendError(res, 'Custom code already exists. Please choose a different one.', 409);
      }
      
      // Use custom code
      urlDatabase[customCode] = originalUrl;
      return sendSuccess(res, { shortCode: customCode, originalUrl, isCustom: true });
    }
    
    // Check if URL already exists (for auto-generated codes only)
    for (const [shortCode, url] of Object.entries(urlDatabase)) {
      if (url === originalUrl) {
        return sendSuccess(res, { shortCode, originalUrl, isCustom: false });
      }
    }
    
    // Generate unique short code
    let shortCode;
    do {
      shortCode = generateShortCode();
    } while (urlDatabase[shortCode]);
    
    // Store the mapping
    urlDatabase[shortCode] = originalUrl;
    
    sendSuccess(res, { shortCode, originalUrl, isCustom: false });
  } catch (error) {
    createErrorHandler('shorten')(error, req, res, () => {});
  }
});

// QR Code generation endpoint
app.get('/qr/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  const originalUrl = urlDatabase[shortCode];
  
  if (!originalUrl) {
    return res.status(404).json({ error: 'Short code not found' });
  }
  
  const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shortUrl)}`;
  
  res.json({ 
    shortCode, 
    originalUrl, 
    shortUrl,
    qrCodeUrl: qrApiUrl 
  });
});

// URL Preview endpoint (before redirect)
app.get('/preview/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  const originalUrl = urlDatabase[shortCode];
  
  if (!originalUrl) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>URL Not Found</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  max-width: 600px;
                  margin: 50px auto;
                  padding: 20px;
                  text-align: center;
                  background-color: #f5f5f5;
              }
              .container {
                  background-color: white;
                  padding: 30px;
                  border-radius: 10px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 {
                  color: #dc3545;
              }
              a {
                  color: #007bff;
                  text-decoration: none;
              }
              a:hover {
                  text-decoration: underline;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>404 - URL Not Found</h1>
              <p>The short URL you're looking for doesn't exist.</p>
              <a href="/">← Go back to create a new short URL</a>
          </div>
      </body>
      </html>
    `);
  }
  
  const analytics = urlAnalytics[shortCode] || { clicks: 0, firstClick: null, lastClick: null };
  const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>URL Preview - ${shortCode}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 30px;
            }
            .preview-info {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            .url-info {
                margin-bottom: 15px;
            }
            .label {
                font-weight: bold;
                color: #555;
            }
            .url {
                word-break: break-all;
                color: #007bff;
            }
            .stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }
            .stat-card {
                background-color: #e9ecef;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
            }
            .stat-number {
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
            }
            .stat-label {
                font-size: 12px;
                color: #666;
                margin-top: 5px;
            }
            .action-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
                flex-wrap: wrap;
            }
            .btn {
                padding: 12px 24px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                text-decoration: none;
                display: inline-block;
                text-align: center;
                transition: background-color 0.3s;
            }
            .btn-primary {
                background-color: #007bff;
                color: white;
            }
            .btn-primary:hover {
                background-color: #0056b3;
            }
            .btn-secondary {
                background-color: #6c757d;
                color: white;
            }
            .btn-secondary:hover {
                background-color: #545b62;
            }
            .btn-success {
                background-color: #28a745;
                color: white;
            }
            .btn-success:hover {
                background-color: #218838;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
            }
            .qr-code {
                text-align: center;
                margin: 20px 0;
            }
            .qr-code img {
                border: 1px solid #ddd;
                border-radius: 8px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔗 URL Preview</h1>
            
            <div class="warning">
                <strong>🛡️ Security Notice:</strong> You are about to visit an external website. Please verify the URL below before proceeding.
            </div>
            
            <div class="preview-info">
                <div class="url-info">
                    <span class="label">Short URL:</span><br>
                    <span class="url">${shortUrl}</span>
                </div>
                <div class="url-info">
                    <span class="label">Destination URL:</span><br>
                    <span class="url">${originalUrl}</span>
                </div>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${analytics.clicks}</div>
                    <div class="stat-label">Total Clicks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${analytics.firstClick ? new Date(analytics.firstClick).toLocaleDateString() : 'Never'}</div>
                    <div class="stat-label">First Clicked</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${analytics.lastClick ? new Date(analytics.lastClick).toLocaleDateString() : 'Never'}</div>
                    <div class="stat-label">Last Clicked</div>
                </div>
            </div>
            
            <div class="qr-code">
                <h3>QR Code</h3>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shortUrl)}" alt="QR Code for ${shortUrl}">
            </div>
            
            <div class="action-buttons">
                <a href="${originalUrl}" class="btn btn-primary">🔗 Continue to Website</a>
                <a href="/${shortCode}" class="btn btn-secondary">➡️ Direct Redirect</a>
                <button onclick="copyToClipboard('${shortUrl}')" class="btn btn-success">📋 Copy Short URL</button>
                <a href="/" class="btn btn-secondary">🏠 Create New URL</a>
            </div>
        </div>
        
        <script>
            function copyToClipboard(text) {
                navigator.clipboard.writeText(text).then(() => {
                    alert('Short URL copied to clipboard!');
                });
            }
        </script>
    </body>
    </html>
  `);
});
app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Login - URL Shortener</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 400px;
                margin: 50px auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 30px;
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                color: #555;
            }
            input[type="password"] {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 5px;
                font-size: 16px;
                box-sizing: border-box;
            }
            input[type="password"]:focus {
                border-color: #007bff;
                outline: none;
            }
            button {
                background-color: #007bff;
                color: white;
                padding: 12px 30px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                width: 100%;
            }
            button:hover {
                background-color: #0056b3;
            }
            .error {
                color: #dc3545;
                margin-top: 10px;
                text-align: center;
            }
            .back-link {
                text-align: center;
                margin-top: 20px;
            }
            .back-link a {
                color: #007bff;
                text-decoration: none;
            }
            .back-link a:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔐 Admin Login</h1>
            <form id="loginForm">
                <div class="form-group">
                    <label for="password">Admin Password:</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <button type="submit">Login</button>
                <div id="error" class="error" style="display: none;"></div>
            </form>
            <div class="back-link">
                <a href="/">← Back to URL Shortener</a>
            </div>
        </div>

        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const password = document.getElementById('password').value;
                
                try {
                    const response = await fetch('/admin/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ password })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        localStorage.setItem('adminToken', data.token);
                        window.location.href = '/admin/dashboard';
                    } else {
                        document.getElementById('error').textContent = data.error;
                        document.getElementById('error').style.display = 'block';
                    }
                } catch (error) {
                    document.getElementById('error').textContent = 'Login failed';
                    document.getElementById('error').style.display = 'block';
                }
            });
        </script>
    </body>
    </html>
  `);
});

// Admin login endpoint
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    res.json({ token: ADMIN_PASSWORD, message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Admin dashboard
app.get('/admin/dashboard', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Dashboard - URL Shortener</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .header {
                background-color: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .header h1 {
                margin: 0;
                color: #333;
            }
            .logout-btn {
                background-color: #dc3545;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                text-decoration: none;
            }
            .logout-btn:hover {
                background-color: #c82333;
            }
            .stats {
                background-color: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                margin-bottom: 20px;
            }
            .stats h2 {
                margin-top: 0;
                color: #333;
            }
            .stat-item {
                display: inline-block;
                margin-right: 30px;
                color: #666;
            }
            .stat-number {
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
            }
            .container {
                background-color: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .search-box {
                margin-bottom: 20px;
            }
            .search-box input {
                width: 300px;
                padding: 10px;
                border: 2px solid #ddd;
                border-radius: 5px;
                font-size: 14px;
            }
            .search-box input:focus {
                border-color: #007bff;
                outline: none;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
            }
            th, td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }
            th {
                background-color: #f8f9fa;
                font-weight: bold;
                color: #333;
            }
            tr:hover {
                background-color: #f8f9fa;
            }
            .delete-btn {
                background-color: #dc3545;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            }
            .delete-btn:hover {
                background-color: #c82333;
            }
            .url-cell {
                max-width: 300px;
                word-break: break-all;
            }
            .short-code {
                font-family: monospace;
                background-color: #e9ecef;
                padding: 2px 6px;
                border-radius: 3px;
            }
            .no-data {
                text-align: center;
                color: #666;
                font-style: italic;
                padding: 40px;
            }
            .refresh-btn {
                background-color: #28a745;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-left: 10px;
            }
            .refresh-btn:hover {
                background-color: #218838;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🛠️ Admin Dashboard</h1>
            <div>
                <a href="/admin/blog" class="refresh-btn" style="background-color: #007bff; margin-right: 10px;">📝 Blog Management</a>
                <button class="refresh-btn" onclick="showAutomation()" style="background-color: #ff6b6b; margin-right: 10px;">🤖 Automation</button>
                <button class="refresh-btn" onclick="showSecurityDashboard()" style="background-color: #e74c3c; margin-right: 10px;">🛡️ Security</button>
                <button class="refresh-btn" onclick="loadUrls()">Refresh</button>
                <a href="/admin" class="logout-btn" onclick="logout()">Logout</a>
            </div>
        </div>

        <div class="stats">
            <h2>Statistics</h2>
            <div class="stat-item">
                <div class="stat-number" id="totalUrls">0</div>
                <div>Total URLs</div>
            </div>
            <div class="stat-item">
                <div class="stat-number" id="totalClicks">0</div>
                <div>Total Clicks</div>
            </div>
            <div class="stat-item">
                <div class="stat-number" id="avgClicks">0</div>
                <div>Avg Clicks/URL</div>
            </div>
        </div>

        <!-- Automation Panel (Hidden by default) -->
        <div class="container" id="automationPanel" style="display: none;">
            <h2>🤖 Click Generation Automation <span style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">EXPERIMENTAL</span></h2>
            <p style="color: #666; margin-bottom: 20px;">Generate automated test clicks for analytics testing and demonstration purposes.</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #333;">Single URL Automation</h3>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Target URL:</label>
                        <select id="automationShortCode" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="">Select URL...</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Number of Clicks:</label>
                        <input type="number" id="clickCount" min="1" max="1000" value="10" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Delay (ms):</label>
                        <input type="number" id="clickDelay" min="10" max="5000" value="100" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <small style="color: #666;">Minimum 10ms between clicks</small>
                    </div>
                    <button onclick="generateSingleClicks()" style="background-color: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; width: 100%;">🎯 Generate Clicks</button>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #333;">Bulk Automation</h3>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Clicks per URL:</label>
                        <input type="number" id="bulkClickCount" min="1" max="50" value="5" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <small style="color: #e74c3c;">⚠️ Reduced to max 50 per URL for enhanced security</small>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Delay (ms):</label>
                        <input type="number" id="bulkDelay" min="50" max="5000" value="200" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <small style="color: #666;">Minimum 50ms for bulk operations</small>
                    </div>
                    <div style="margin-bottom: 15px; padding: 10px; background-color: #e7f3ff; border-radius: 4px; font-size: 14px;">
                        <strong>Bulk Target:</strong> All <span id="bulkUrlCount">0</span> URLs
                    </div>
                    <button onclick="generateBulkClicks()" style="background-color: #ff6b6b; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; width: 100%;">⚡ Generate Bulk Clicks</button>
                </div>
            </div>
            
            <div id="automationStatus" style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: none;">
                <h4 style="margin-top: 0;">Automation Status</h4>
                <div id="statusMessage">Ready to start automation...</div>
            </div>
            
            <div style="text-align: center;">
                <button onclick="hideAutomation()" style="background-color: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Close Automation Panel</button>
            </div>
        </div>

        <!-- Security Dashboard Panel (Hidden by default) -->
        <div class="container" id="securityDashboard" style="display: none;">
            <h2>🛡️ Advanced Security Dashboard <span style="background: linear-gradient(45deg, #e74c3c, #c0392b); color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">EXPERIMENTAL</span></h2>
            <p style="color: #666; margin-bottom: 20px;">Monitor and control bulk automation security features with advanced rate limiting and activity tracking.</p>
            
            <div id="securityStats" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e9ecef;">
                        <div style="font-size: 24px; font-weight: bold; color: #007bff;" id="operationsThisHour">0</div>
                        <div style="font-size: 12px; color: #666;">Operations This Hour</div>
                        <div style="font-size: 10px; color: #999;" id="operationsLimit">/ 50 limit</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e9ecef;">
                        <div style="font-size: 24px; font-weight: bold; color: #28a745;" id="bulkOpsToday">0</div>
                        <div style="font-size: 12px; color: #666;">Bulk Ops Today</div>
                        <div style="font-size: 10px; color: #999;" id="bulkLimit">/ 10 limit</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e9ecef;">
                        <div style="font-size: 24px; font-weight: bold; color: #dc3545;" id="bulkCooldown">0s</div>
                        <div style="font-size: 12px; color: #666;">Bulk Cooldown</div>
                        <div style="font-size: 10px; color: #999;">Until next bulk</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e9ecef;">
                        <div style="font-size: 24px; font-weight: bold; color: #ffc107;" id="warningLevel">LOW</div>
                        <div style="font-size: 12px; color: #666;">Warning Level</div>
                        <div style="font-size: 10px; color: #999;">Security status</div>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                    <h4 style="margin-top: 0; color: #495057;">🚨 Emergency Controls</h4>
                    <p style="font-size: 12px; color: #666; margin-bottom: 15px;">Instantly stop all automation operations across the platform</p>
                    <div style="text-align: center;">
                        <button id="emergencyStopBtn" onclick="toggleEmergencyStop()" style="background-color: #dc3545; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                            🛑 EMERGENCY STOP
                        </button>
                    </div>
                    <div id="emergencyStatus" style="margin-top: 10px; text-align: center; font-size: 12px;"></div>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                    <h4 style="margin-top: 0; color: #495057;">📊 Live Activity Monitor</h4>
                    <p style="font-size: 12px; color: #666; margin-bottom: 15px;">Real-time tracking of automation activities</p>
                    <div id="activityMonitor" style="max-height: 150px; overflow-y: auto; font-family: monospace; font-size: 11px; background: white; padding: 10px; border-radius: 4px; border: 1px solid #e9ecef;">
                        <div style="color: #666;">Monitoring admin activities...</div>
                    </div>
                </div>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin-top: 0; color: #856404;">⚡ Enhanced Security Features Active</h4>
                <ul style="margin-bottom: 0; color: #856404; font-size: 14px;">
                    <li><strong>Progressive Rate Limiting:</strong> Delays increase with frequent usage</li>
                    <li><strong>IP-Based Tracking:</strong> Individual limits per admin session</li>
                    <li><strong>Bulk Operation Cooldowns:</strong> 5-minute delay between large operations</li>
                    <li><strong>Multi-Factor Confirmation:</strong> Required for operations over 2000 items</li>
                    <li><strong>Activity Logging:</strong> All operations tracked with timestamps</li>
                </ul>
            </div>
            
            <div style="text-align: center;">
                <button onclick="refreshSecurityDashboard()" style="background-color: #17a2b8; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">🔄 Refresh Data</button>
                <button onclick="hideSecurityDashboard()" style="background-color: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Close Security Dashboard</button>
            </div>
        </div>

        <div class="container">
            <h2>URL Management</h2>
            <div class="search-box">
                <input type="text" id="searchInput" placeholder="Search URLs..." onkeyup="filterUrls()">
            </div>
            
            <table id="urlsTable">
                <thead>
                    <tr>
                        <th>Short Code</th>
                        <th>Original URL</th>
                        <th>Short URL</th>
                        <th>Clicks</th>
                        <th>Last Click</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="urlsTableBody">
                    <tr>
                        <td colspan="6" class="no-data">Loading...</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <script>
            let urlsData = {};
            let analyticsData = {};

            // Check if user is authenticated
            function checkAuth() {
                const token = localStorage.getItem('adminToken');
                if (!token) {
                    window.location.href = '/admin';
                    return false;
                }
                return token;
            }

            // Load URLs and analytics from server
            async function loadUrls() {
                const token = checkAuth();
                if (!token) return;

                try {
                    // Load URLs
                    const urlsResponse = await fetch('/admin/api/urls', {
                        headers: {
                            'Authorization': 'Bearer ' + token
                        }
                    });

                    // Load analytics
                    const analyticsResponse = await fetch('/admin/api/analytics', {
                        headers: {
                            'Authorization': 'Bearer ' + token
                        }
                    });

                    if (urlsResponse.ok && analyticsResponse.ok) {
                        urlsData = await urlsResponse.json();
                        analyticsData = await analyticsResponse.json();
                        displayUrls(urlsData, analyticsData);
                        updateStats();
                    } else if (urlsResponse.status === 401 || analyticsResponse.status === 401) {
                        logout();
                    } else {
                        alert('Failed to load data');
                    }
                } catch (error) {
                    alert('Error loading data: ' + error.message);
                }
            }

            // Display URLs in table with analytics
            function displayUrls(urls, analytics) {
                const tbody = document.getElementById('urlsTableBody');
                
                if (Object.keys(urls).length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="no-data">No URLs found</td></tr>';
                    return;
                }

                tbody.innerHTML = '';
                for (const [shortCode, originalUrl] of Object.entries(urls)) {
                    const row = tbody.insertRow();
                    const shortUrl = window.location.origin + '/' + shortCode;
                    const analytic = analytics[shortCode] || { clicks: 0, lastClick: null };
                    
                    row.innerHTML = \`
                        <td><span class="short-code">\${shortCode}</span></td>
                        <td class="url-cell">\${originalUrl}</td>
                        <td class="url-cell">\${shortUrl}</td>
                        <td><strong>\${analytic.clicks}</strong></td>
                        <td>\${analytic.lastClick ? new Date(analytic.lastClick).toLocaleDateString() : 'Never'}</td>
                        <td>
                            <button class="delete-btn" onclick="viewAnalytics('\${shortCode}')" style="background-color: #17a2b8; margin-right: 5px;">📊 Analytics</button>
                            <button class="delete-btn" onclick="deleteUrl('\${shortCode}')">Delete</button>
                        </td>
                    \`;
                }
            }

            // Filter URLs based on search
            function filterUrls() {
                const searchTerm = document.getElementById('searchInput').value.toLowerCase();
                const filteredUrls = {};

                for (const [shortCode, originalUrl] of Object.entries(urlsData)) {
                    if (shortCode.toLowerCase().includes(searchTerm) || 
                        originalUrl.toLowerCase().includes(searchTerm)) {
                        filteredUrls[shortCode] = originalUrl;
                    }
                }

                displayUrls(filteredUrls, analyticsData);
            }

            // View analytics for a specific URL
            function viewAnalytics(shortCode) {
                window.open('/preview/' + shortCode, '_blank');
            }

            // Delete URL
            async function deleteUrl(shortCode) {
                if (!confirm('Are you sure you want to delete this URL and its analytics?')) {
                    return;
                }

                const token = checkAuth();
                if (!token) return;

                try {
                    const response = await fetch('/admin/api/urls/' + shortCode, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': 'Bearer ' + token
                        }
                    });

                    if (response.ok) {
                        loadUrls(); // Reload the list
                    } else if (response.status === 401) {
                        logout();
                    } else {
                        alert('Failed to delete URL');
                    }
                } catch (error) {
                    alert('Error deleting URL: ' + error.message);
                }
            }

            // Update statistics
            function updateStats() {
                const totalUrls = Object.keys(urlsData).length;
                const totalClicks = Object.values(analyticsData).reduce((sum, analytics) => sum + analytics.clicks, 0);
                const avgClicks = totalUrls > 0 ? Math.round(totalClicks / totalUrls * 10) / 10 : 0;
                
                document.getElementById('totalUrls').textContent = totalUrls;
                document.getElementById('totalClicks').textContent = totalClicks;
                document.getElementById('avgClicks').textContent = avgClicks;
            }

            // Logout function
            function logout() {
                localStorage.removeItem('adminToken');
                window.location.href = '/admin';
            }

            // Show automation panel
            function showAutomation() {
                document.getElementById('automationPanel').style.display = 'block';
                populateUrlDropdown();
                updateBulkUrlCount();
                document.getElementById('automationPanel').scrollIntoView({ behavior: 'smooth' });
            }

            // Hide automation panel
            function hideAutomation() {
                document.getElementById('automationPanel').style.display = 'none';
            }

            // Populate URL dropdown for automation
            function populateUrlDropdown() {
                const select = document.getElementById('automationShortCode');
                select.innerHTML = '<option value="">Select URL...</option>';
                
                for (const [shortCode, originalUrl] of Object.entries(urlsData)) {
                    const option = document.createElement('option');
                    option.value = shortCode;
                    option.textContent = \`\${shortCode} -> \${originalUrl.substring(0, 50)}\${originalUrl.length > 50 ? '...' : ''}\`;
                    select.appendChild(option);
                }
            }

            // Update bulk URL count
            function updateBulkUrlCount() {
                const count = Object.keys(urlsData).length;
                document.getElementById('bulkUrlCount').textContent = count;
            }

            // Generate clicks for single URL
            async function generateSingleClicks() {
                const token = checkAuth();
                if (!token) return;

                const shortCode = document.getElementById('automationShortCode').value;
                const clickCount = document.getElementById('clickCount').value;
                const delay = document.getElementById('clickDelay').value;

                if (!shortCode) {
                    alert('Please select a URL first');
                    return;
                }

                try {
                    const response = await fetch('/admin/api/automation/generate-clicks', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({
                            shortCode: shortCode,
                            clickCount: parseInt(clickCount),
                            delay: parseInt(delay)
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        showAutomationStatus(\`✅ Started generating \${clickCount} clicks for \${shortCode}. This may take a few moments...\`);
                        
                        // Refresh data after a delay to show updated analytics
                        setTimeout(() => {
                            loadUrls();
                            showAutomationStatus(\`✅ Completed! Generated \${clickCount} clicks for \${shortCode}. Analytics updated.\`);
                        }, parseInt(delay) * parseInt(clickCount) + 2000);
                    } else if (response.status === 401) {
                        logout();
                    } else {
                        const errorData = await response.json();
                        alert('Error: ' + errorData.error);
                    }
                } catch (error) {
                    alert('Error generating clicks: ' + error.message);
                }
            }

            // Generate bulk clicks for all URLs
            async function generateBulkClicks() {
                const token = checkAuth();
                if (!token) return;

                const clicksPerUrl = document.getElementById('bulkClickCount').value;
                const delay = document.getElementById('bulkDelay').value;
                const urlCount = Object.keys(urlsData).length;

                if (urlCount === 0) {
                    alert('No URLs available for bulk automation');
                    return;
                }

                if (!confirm(\`This will generate \${clicksPerUrl} clicks for each of the \${urlCount} URLs (\${urlCount * clicksPerUrl} total clicks). Continue?\`)) {
                    return;
                }

                try {
                    const response = await fetch('/admin/api/automation/generate-bulk-clicks', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({
                            clicksPerUrl: parseInt(clicksPerUrl),
                            delay: parseInt(delay)
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        showAutomationStatus(\`⚡ Started bulk generation: \${clicksPerUrl} clicks per URL for \${urlCount} URLs. Total: \${data.estimatedTotal} clicks. This may take several minutes...\`);
                        
                        // Refresh data after estimated completion time
                        const estimatedTime = urlCount * parseInt(clicksPerUrl) * parseInt(delay) + 5000;
                        setTimeout(() => {
                            loadUrls();
                            showAutomationStatus(\`✅ Bulk automation completed! Generated approximately \${data.estimatedTotal} clicks. Analytics updated.\`);
                        }, estimatedTime);
                    } else if (response.status === 401) {
                        logout();
                    } else {
                        const errorData = await response.json();
                        alert('Error: ' + errorData.error);
                    }
                } catch (error) {
                    alert('Error generating bulk clicks: ' + error.message);
                }
            }

            // Show automation status
            function showAutomationStatus(message) {
                const statusDiv = document.getElementById('automationStatus');
                const messageDiv = document.getElementById('statusMessage');
                messageDiv.textContent = message;
                statusDiv.style.display = 'block';
            }

            // Security dashboard functions
            function showSecurityDashboard() {
                document.getElementById('securityDashboard').style.display = 'block';
                document.getElementById('automationPanel').style.display = 'none';
                loadSecurityData();
                document.getElementById('securityDashboard').scrollIntoView({ behavior: 'smooth' });
            }

            function hideSecurityDashboard() {
                document.getElementById('securityDashboard').style.display = 'none';
            }

            async function loadSecurityData() {
                try {
                    const token = localStorage.getItem('adminToken');
                    const response = await fetch('/admin/api/automation/stats', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        updateSecurityStats(data.security);
                        await loadActivityLogs();
                    }
                } catch (error) {
                    console.error('Error loading security data:', error);
                }
            }

            function updateSecurityStats(security) {
                document.getElementById('operationsThisHour').textContent = security.currentStatus.operationsThisHour;
                document.getElementById('operationsLimit').textContent = '/ ' + security.rateLimits.maxOperationsPerHour + ' limit';
                
                document.getElementById('bulkOpsToday').textContent = security.currentStatus.bulkOperationsToday;
                document.getElementById('bulkLimit').textContent = '/ ' + security.rateLimits.maxBulkOperationsPerDay + ' limit';
                
                document.getElementById('bulkCooldown').textContent = security.currentStatus.bulkCooldownSeconds + 's';
                document.getElementById('warningLevel').textContent = security.currentStatus.warningLevel;
                
                // Update warning level color
                const warningEl = document.getElementById('warningLevel');
                const level = security.currentStatus.warningLevel;
                warningEl.style.color = level === 'HIGH' ? '#dc3545' : level === 'MEDIUM' ? '#ffc107' : '#28a745';
                
                // Update emergency stop button
                const emergencyBtn = document.getElementById('emergencyStopBtn');
                const emergencyStatus = document.getElementById('emergencyStatus');
                if (security.emergencyStop) {
                    emergencyBtn.textContent = '✅ RESUME OPERATIONS';
                    emergencyBtn.style.backgroundColor = '#28a745';
                    emergencyStatus.textContent = '🚫 All automation suspended';
                    emergencyStatus.style.color = '#dc3545';
                } else {
                    emergencyBtn.textContent = '🛑 EMERGENCY STOP';
                    emergencyBtn.style.backgroundColor = '#dc3545';
                    emergencyStatus.textContent = '✅ Operations normal';
                    emergencyStatus.style.color = '#28a745';
                }
            }

            async function loadActivityLogs() {
                try {
                    const token = localStorage.getItem('adminToken');
                    const response = await fetch('/admin/api/security/dashboard', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        updateActivityMonitor(data.recentActivity);
                    }
                } catch (error) {
                    console.error('Error loading activity logs:', error);
                }
            }

            function updateActivityMonitor(activities) {
                const monitor = document.getElementById('activityMonitor');
                if (!activities || activities.length === 0) {
                    monitor.innerHTML = '<div style="color: #666;">No recent activities</div>';
                    return;
                }

                const logEntries = activities.slice(0, 10).map(activity => {
                    const time = new Date(activity.timestamp).toLocaleTimeString();
                    const operation = activity.operation.replace(/_/g, ' ');
                    return '<div style="margin: 2px 0; color: ' + getOperationColor(activity.operation) + '">[' + time + '] ' + operation + '</div>';
                }).join('');
                
                monitor.innerHTML = logEntries;
            }

            function getOperationColor(operation) {
                if (operation.includes('BULK')) return '#dc3545';
                if (operation.includes('RATE_LIMITED')) return '#ffc107';
                if (operation.includes('EMERGENCY')) return '#e74c3c';
                return '#28a745';
            }

            async function toggleEmergencyStop() {
                try {
                    const token = localStorage.getItem('adminToken');
                    const currentBtn = document.getElementById('emergencyStopBtn');
                    const isCurrentlyStopped = currentBtn.textContent.includes('RESUME');
                    
                    const action = isCurrentlyStopped ? 'disable' : 'enable';
                    
                    if (!isCurrentlyStopped) {
                        const confirm = window.confirm('Are you sure you want to EMERGENCY STOP all automation operations? This will immediately suspend all bulk operations across the platform.');
                        if (!confirm) return;
                    }

                    const response = await fetch('/admin/api/security/emergency-stop', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({ action })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        alert(data.message);
                        loadSecurityData(); // Refresh the dashboard
                    } else {
                        const error = await response.json();
                        alert('Error: ' + error.error);
                    }
                } catch (error) {
                    alert('Error toggling emergency stop: ' + error.message);
                }
            }

            function refreshSecurityDashboard() {
                loadSecurityData();
            }

            // Enhanced automation functions with security feedback
            async function generateClicks() {
                const shortCode = document.getElementById('automationShortCode').value;
                const clickCount = document.getElementById('clickCount').value;
                const delay = document.getElementById('delay').value;

                if (!shortCode) {
                    alert('Please select a URL');
                    return;
                }

                try {
                    const token = localStorage.getItem('adminToken');
                    const response = await fetch('/admin/api/automation/generate-clicks', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({
                            shortCode: shortCode,
                            clickCount: parseInt(clickCount),
                            delay: parseInt(delay)
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        let message = '✅ Started generating ' + clickCount + ' clicks for ' + shortCode + '.';
                        if (data.progressiveDelay) {
                            message += ' 🛡️ Enhanced security: Using ' + data.delay + 'ms delay (was ' + delay + 'ms).';
                        }
                        showAutomationStatus(message);
                        
                        // Refresh data after a delay to show updated analytics
                        setTimeout(() => {
                            loadUrls();
                            showAutomationStatus(message + ' ✅ Completed!');
                        }, parseInt(delay) * parseInt(clickCount) + 2000);
                    } else if (response.status === 429) {
                        const errorData = await response.json();
                        alert('🛡️ Security Limit: ' + errorData.error);
                    } else if (response.status === 401) {
                        logout();
                    } else {
                        const errorData = await response.json();
                        alert('Error: ' + errorData.error);
                    }
                } catch (error) {
                    alert('Error generating clicks: ' + error.message);
                }
            }

            // Enhanced bulk clicks with security features
            async function generateBulkClicks() {
                const urlCount = Object.keys(urlDatabase || {}).length;
                if (urlCount === 0) {
                    alert('No URLs available for bulk automation');
                    return;
                }

                const clicksPerUrl = document.getElementById('bulkClickCount').value;
                const delay = document.getElementById('bulkDelay').value;
                const totalEstimated = urlCount * clicksPerUrl;

                // Enhanced confirmation for large operations
                if (totalEstimated > 1000) {
                    const confirm1 = window.confirm('⚠️ Large Operation Warning\\n\\nThis will generate ' + totalEstimated + ' clicks across ' + urlCount + ' URLs.\\n\\nThis may trigger enhanced security measures including:\\n- Increased delays\\n- Rate limiting\\n- Cooldown periods\\n\\nContinue?');
                    if (!confirm1) return;
                    
                    if (totalEstimated > 2000) {
                        const confirm2 = window.confirm('🚨 VERY LARGE OPERATION\\n\\nGenerating ' + totalEstimated + ' clicks requires additional confirmation.\\n\\nThis operation may:\\n- Take several minutes to complete\\n- Trigger security rate limits\\n- Require a confirmation token\\n\\nProceed with extreme caution?');
                        if (!confirm2) return;
                    }
                }

                try {
                    const token = localStorage.getItem('adminToken');
                    let headers = {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    };

                    // For very large operations, we might need a confirmation token
                    let attemptCount = 0;
                    let confirmationToken = null;

                    const attemptBulkOperation = async () => {
                        const requestHeaders = confirmationToken ? 
                            { ...headers, 'X-Confirmation-Token': confirmationToken } : headers;

                        const response = await fetch('/admin/api/automation/generate-bulk-clicks', {
                            method: 'POST',
                            headers: requestHeaders,
                            body: JSON.stringify({
                                clicksPerUrl: parseInt(clicksPerUrl),
                                delay: parseInt(delay)
                            })
                        });

                        if (response.ok) {
                            const data = await response.json();
                            let message = '⚡ Started bulk generation: ' + clicksPerUrl + ' clicks per URL for ' + urlCount + ' URLs. Total: ' + data.estimatedTotal + ' clicks.';
                            if (data.progressiveDelay) {
                                message += ' 🛡️ Enhanced security active.';
                            }
                            message += ' ETA: ' + data.estimatedDuration;
                            showAutomationStatus(message);
                            
                            // Refresh data after estimated completion time
                            const estimatedTime = urlCount * parseInt(clicksPerUrl) * parseInt(delay) + 5000;
                            setTimeout(() => {
                                loadUrls();
                                showAutomationStatus('✅ Bulk automation completed! Generated approximately ' + data.estimatedTotal + ' clicks. Analytics updated.');
                            }, estimatedTime);
                        } else if (response.status === 400) {
                            const errorData = await response.json();
                            if (errorData.code === 'CONFIRMATION_REQUIRED') {
                                confirmationToken = errorData.confirmationToken;
                                const userConfirm = window.confirm('🔐 Multi-Factor Confirmation Required\\n\\n' + errorData.warningMessage + '\\n\\nConfirmation Code: ' + confirmationToken + '\\n\\nProceed with this large operation?');
                                if (userConfirm) {
                                    return attemptBulkOperation(); // Retry with token
                                }
                            } else {
                                alert('Error: ' + errorData.error);
                            }
                        } else if (response.status === 429) {
                            const errorData = await response.json();
                            alert('🛡️ Security Limit: ' + errorData.error + (errorData.suggestedAction ? '\\n\\n' + errorData.suggestedAction : ''));
                        } else if (response.status === 401) {
                            logout();
                        } else {
                            const errorData = await response.json();
                            alert('Error: ' + errorData.error);
                        }
                    };

                    await attemptBulkOperation();
                } catch (error) {
                    alert('Error generating bulk clicks: ' + error.message);
                }
            }

            // Load URLs when page loads
            window.onload = loadUrls;
        </script>
    </body>
    </html>
  `);
});

// Admin API endpoint to get all URLs
app.get('/admin/api/urls', requireAuth, (req, res) => {
  res.json(urlDatabase);
});

// Admin API endpoint to delete a URL
app.delete('/admin/api/urls/:shortCode', requireAuth, (req, res) => {
  const { shortCode } = req.params;
  
  if (urlDatabase[shortCode]) {
    delete urlDatabase[shortCode];
    // Also delete analytics data
    delete urlAnalytics[shortCode];
    res.json({ message: 'URL deleted successfully' });
  } else {
    res.status(404).json({ error: 'Short code not found' });
  }
});

// Admin API endpoint to get analytics for all URLs
app.get('/admin/api/analytics', requireAuth, (req, res) => {
  const analyticsData = {};
  
  for (const shortCode in urlDatabase) {
    analyticsData[shortCode] = urlAnalytics[shortCode] || {
      clicks: 0,
      firstClick: null,
      lastClick: null,
      clickHistory: []
    };
  }
  
  res.json(analyticsData);
});

// Admin API endpoint to get analytics for a specific URL
app.get('/admin/api/analytics/:shortCode', requireAuth, (req, res) => {
  const { shortCode } = req.params;
  
  if (!urlDatabase[shortCode]) {
    return res.status(404).json({ error: 'Short code not found' });
  }
  
  const analytics = urlAnalytics[shortCode] || {
    clicks: 0,
    firstClick: null,
    lastClick: null,
    clickHistory: []
  };
  
  res.json({
    shortCode,
    originalUrl: urlDatabase[shortCode],
    analytics
  });
});

// ========================================
// AUTOMATION FEATURES (ADMIN ONLY)
// ========================================

// Function to simulate a click for testing purposes
function simulateClick(shortCode, userAgent = 'AutomationBot/1.0', ip = '127.0.0.1') {
  if (!urlDatabase[shortCode]) {
    return false;
  }
  
  const mockReq = {
    get: (header) => header === 'User-Agent' ? userAgent : 'Unknown',
    ip: ip,
    connection: { remoteAddress: ip }
  };
  
  recordClick(shortCode, mockReq);
  return true;
}

// Function to simulate a blog view for testing purposes
function simulateBlogView(blogId, userAgent = 'BlogViewBot/1.0', ip = '127.0.0.1') {
  if (!blogDatabase[blogId]) {
    return false;
  }
  
  const mockReq = {
    get: (header) => header === 'User-Agent' ? userAgent : 'Unknown',
    ip: ip,
    connection: { remoteAddress: ip }
  };
  
  recordBlogView(blogId, mockReq);
  return true;
}

// Admin API endpoint for automated click generation
app.post('/admin/api/automation/generate-clicks', requireAdvancedAuth, (req, res) => {
  const { shortCode, clickCount = 1, userAgents = [], delay = 100 } = req.body;
  const ip = getClientIP(req);
  
  // Rate limiting check
  const rateLimitCheck = checkRateLimit(ip, 'single');
  if (!rateLimitCheck.allowed) {
    logAdminOperation('RATE_LIMITED', ip, { operation: 'generate-clicks', reason: rateLimitCheck.reason });
    return res.status(429).json({ 
      error: rateLimitCheck.reason,
      code: 'RATE_LIMITED',
      retryAfter: rateLimitCheck.remainingTime || 3600
    });
  }
  
  if (!shortCode || !urlDatabase[shortCode]) {
    return res.status(400).json({ error: 'Valid short code is required' });
  }
  
  const count = Math.min(Math.max(parseInt(clickCount), 1), 1000); // Limit to 1000 clicks max
  const baseDelay = Math.max(parseInt(delay), 10); // Minimum 10ms delay
  const actualDelay = calculateProgressiveDelay(ip, baseDelay);
  
  // Enhanced validation for large operations
  if (count > 500) {
    const tracking = adminSecurity.ipTracking[ip];
    if (tracking && tracking.operationsLastHour.length > 20) {
      return res.status(429).json({ 
        error: 'Large operations require fewer recent activities. Please wait before performing operations over 500 clicks.',
        code: 'LARGE_OPERATION_RESTRICTED'
      });
    }
  }
  
  // Log the operation
  logAdminOperation('SINGLE_AUTOMATION', ip, { shortCode, clickCount: count, delay: actualDelay });
  
  const defaultUserAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (Android 11; Mobile; rv:93.0) Gecko/93.0 Firefox/93.0'
  ];
  
  const agents = userAgents.length > 0 ? userAgents : defaultUserAgents;
  let generated = 0;
  
  // Generate clicks with delay
  const generateInterval = setInterval(() => {
    if (generated >= count) {
      clearInterval(generateInterval);
      return;
    }
    
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];
    const randomIp = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
    
    if (simulateClick(shortCode, randomAgent, randomIp)) {
      generated++;
    }
    
    if (generated >= count) {
      clearInterval(generateInterval);
    }
  }, actualDelay);
  
  res.json({ 
    message: `Started generating ${count} clicks for ${shortCode}`,
    shortCode,
    clickCount: count,
    delay: actualDelay,
    securityLevel: actualDelay > baseDelay ? 'ENHANCED' : 'STANDARD',
    progressiveDelay: actualDelay > baseDelay
  });
});

// Admin API endpoint for bulk click generation on all URLs
app.post('/admin/api/automation/generate-bulk-clicks', requireAdvancedAuth, (req, res) => {
  const { clicksPerUrl = 5, delay = 100 } = req.body;
  const ip = getClientIP(req);
  
  // Enhanced rate limiting for bulk operations
  const rateLimitCheck = checkRateLimit(ip, 'bulk');
  if (!rateLimitCheck.allowed) {
    logAdminOperation('BULK_RATE_LIMITED', ip, { operation: 'generate-bulk-clicks', reason: rateLimitCheck.reason });
    return res.status(429).json({ 
      error: rateLimitCheck.reason,
      code: 'BULK_RATE_LIMITED',
      retryAfter: rateLimitCheck.remainingTime || 86400
    });
  }
  
  const urlCodes = Object.keys(urlDatabase);
  if (urlCodes.length === 0) {
    return res.status(400).json({ error: 'No URLs available for automation' });
  }
  
  const count = Math.min(Math.max(parseInt(clicksPerUrl), 1), CONFIG.BULK_CLICK_LIMIT);
  const baseDelay = Math.max(parseInt(delay), CONFIG.BASE_DELAYS.CLICK_GENERATION);
  const actualDelay = calculateProgressiveDelay(ip, baseDelay);
  
  const totalEstimatedClicks = urlCodes.length * count;
  
  // Enhanced security for large bulk operations
  if (totalEstimatedClicks > 1000) {
    const tracking = adminSecurity.ipTracking[ip];
    const recentBulkOps = tracking ? tracking.bulkOperationsLastDay.length : 0;
    
    if (recentBulkOps >= 3) {
      return res.status(429).json({ 
        error: 'Large bulk operations are limited to 3 per day for security reasons.',
        code: 'LARGE_BULK_LIMIT_EXCEEDED',
        suggestedAction: 'Consider smaller batch sizes or contact administrator.'
      });
    }
  }
  
  // Multi-factor confirmation requirement for very large operations
  if (totalEstimatedClicks > 2000) {
    const confirmationToken = req.headers['x-confirmation-token'];
    const expectedToken = 'BULK_CONFIRM_' + Date.now().toString().slice(-6);
    
    if (!confirmationToken || confirmationToken !== expectedToken) {
      return res.status(400).json({ 
        error: 'Large bulk operations require additional confirmation.',
        code: 'CONFIRMATION_REQUIRED',
        confirmationToken: expectedToken,
        estimatedClicks: totalEstimatedClicks,
        warningMessage: `This operation will generate ${totalEstimatedClicks} clicks across ${urlCodes.length} URLs. Please confirm by including the token in X-Confirmation-Token header.`
      });
    }
  }
  
  // Log the bulk operation
  logAdminOperation('BULK_AUTOMATION', ip, { 
    urlCount: urlCodes.length, 
    clicksPerUrl: count, 
    totalClicks: totalEstimatedClicks,
    delay: actualDelay,
    securityLevel: actualDelay > baseDelay ? 'ENHANCED' : 'STANDARD'
  });
  
  const defaultUserAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (Android 11; Mobile; rv:93.0) Gecko/93.0 Firefox/93.0'
  ];
  
  let totalGenerated = 0;
  let currentUrlIndex = 0;
  let clicksForCurrentUrl = 0;
  
  const generateInterval = setInterval(() => {
    if (currentUrlIndex >= urlCodes.length) {
      clearInterval(generateInterval);
      logAdminOperation('BULK_COMPLETED', ip, { totalGenerated, duration: Date.now() });
      return;
    }
    
    const currentShortCode = urlCodes[currentUrlIndex];
    const randomAgent = defaultUserAgents[Math.floor(Math.random() * defaultUserAgents.length)];
    const randomIp = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
    
    if (simulateClick(currentShortCode, randomAgent, randomIp)) {
      totalGenerated++;
      clicksForCurrentUrl++;
    }
    
    if (clicksForCurrentUrl >= count) {
      currentUrlIndex++;
      clicksForCurrentUrl = 0;
    }
  }, actualDelay);
  
  res.json({ 
    message: `Started bulk generation: ${count} clicks per URL for ${urlCodes.length} URLs`,
    totalUrls: urlCodes.length,
    clicksPerUrl: count,
    estimatedTotal: totalEstimatedClicks,
    delay: actualDelay,
    securityLevel: actualDelay > baseDelay ? 'ENHANCED' : 'STANDARD',
    progressiveDelay: actualDelay > baseDelay,
    operationId: Date.now(),
    estimatedDuration: Math.ceil((totalEstimatedClicks * actualDelay) / 1000) + ' seconds'
  });
});

// Admin API endpoint to get automation statistics
app.get('/admin/api/automation/stats', requireAdvancedAuth, (req, res) => {
  const ip = getClientIP(req);
  const totalUrls = Object.keys(urlDatabase).length;
  const totalClicks = Object.values(urlAnalytics).reduce((sum, analytics) => sum + analytics.clicks, 0);
  const urlsWithClicks = Object.values(urlAnalytics).filter(analytics => analytics.clicks > 0).length;
  
  const tracking = adminSecurity.ipTracking[ip] || { 
    operationsLastHour: [], 
    bulkOperationsLastDay: [], 
    lastBulkOperation: 0,
    warningCount: 0 
  };
  
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;
  
  // Clean old operations for accurate counts
  const recentOperations = tracking.operationsLastHour.filter(time => now - time < oneHour).length;
  const recentBulkOps = tracking.bulkOperationsLastDay.filter(time => now - time < oneDay).length;
  const nextBulkAllowed = tracking.lastBulkOperation + adminSecurity.rateLimits.cooldownBetweenBulk;
  const bulkCooldownRemaining = Math.max(0, Math.ceil((nextBulkAllowed - now) / 1000));
  
  res.json({
    totalUrls,
    totalClicks,
    urlsWithClicks,
    averageClicksPerUrl: totalUrls > 0 ? Math.round(totalClicks / totalUrls * 10) / 10 : 0,
    urlsWithoutClicks: totalUrls - urlsWithClicks,
    security: {
      emergencyStop: adminSecurity.emergencyStop,
      rateLimits: adminSecurity.rateLimits,
      currentStatus: {
        operationsThisHour: recentOperations,
        bulkOperationsToday: recentBulkOps,
        bulkCooldownSeconds: bulkCooldownRemaining,
        warningLevel: tracking.warningCount > 5 ? 'HIGH' : tracking.warningCount > 2 ? 'MEDIUM' : 'LOW'
      },
      remainingLimits: {
        operationsThisHour: Math.max(0, adminSecurity.rateLimits.maxOperationsPerHour - recentOperations),
        bulkOperationsToday: Math.max(0, adminSecurity.rateLimits.maxBulkOperationsPerDay - recentBulkOps)
      }
    }
  });
});

// New security dashboard endpoint
app.get('/admin/api/security/dashboard', requireAdvancedAuth, (req, res) => {
  const ip = getClientIP(req);
  
  // Recent operation logs (last 50)
  const recentLogs = adminSecurity.operationLogs.slice(-50).reverse();
  
  // Security statistics
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;
  
  const allIPs = Object.keys(adminSecurity.ipTracking);
  const activeIPs = allIPs.filter(ip => {
    const tracking = adminSecurity.ipTracking[ip];
    return tracking.operationsLastHour.some(time => now - time < oneHour);
  });
  
  const totalOperationsToday = Object.values(adminSecurity.ipTracking).reduce((sum, tracking) => {
    return sum + tracking.operationsLastHour.filter(time => now - time < oneDay).length;
  }, 0);
  
  const totalBulkOpsToday = Object.values(adminSecurity.ipTracking).reduce((sum, tracking) => {
    return sum + tracking.bulkOperationsLastDay.filter(time => now - time < oneDay).length;
  }, 0);
  
  res.json({
    securityStatus: {
      emergencyStop: adminSecurity.emergencyStop,
      activeIPs: activeIPs.length,
      totalOperationsToday,
      totalBulkOpsToday,
      totalLogEntries: adminSecurity.operationLogs.length
    },
    rateLimits: adminSecurity.rateLimits,
    recentActivity: recentLogs,
    ipStatistics: allIPs.map(ipAddr => {
      const tracking = adminSecurity.ipTracking[ipAddr];
      return {
        ip: ipAddr,
        operationsLastHour: tracking.operationsLastHour.filter(time => now - time < oneHour).length,
        bulkOperationsLastDay: tracking.bulkOperationsLastDay.filter(time => now - time < oneDay).length,
        lastActivity: tracking.operationsLastHour.length > 0 ? 
          new Date(Math.max(...tracking.operationsLastHour)) : null,
        warningCount: tracking.warningCount,
        status: tracking.warningCount > 5 ? 'HIGH_RISK' : 
                tracking.warningCount > 2 ? 'MODERATE_RISK' : 'NORMAL'
      };
    }).sort((a, b) => b.operationsLastHour - a.operationsLastHour)
  });
});

// Emergency security controls
app.post('/admin/api/security/emergency-stop', requireAdvancedAuth, (req, res) => {
  const ip = getClientIP(req);
  const { action } = req.body; // 'enable' or 'disable'
  
  if (action === 'enable') {
    adminSecurity.emergencyStop = true;
    logAdminOperation('EMERGENCY_STOP_ENABLED', ip, { reason: 'Manual activation' });
    res.json({ message: 'Emergency stop activated. All automation operations are now suspended.' });
  } else if (action === 'disable') {
    adminSecurity.emergencyStop = false;
    logAdminOperation('EMERGENCY_STOP_DISABLED', ip, { reason: 'Manual deactivation' });
    res.json({ message: 'Emergency stop deactivated. Automation operations are now allowed.' });
  } else {
    res.status(400).json({ error: 'Invalid action. Use "enable" or "disable".' });
  }
});

// ========================================
// BLOG VIEW MODIFICATION FEATURES (ADMIN ONLY)
// ========================================

// Admin API endpoint for automated blog view generation
app.post('/admin/api/blog/automation/generate-views', requireAdvancedAuth, (req, res) => {
  const { blogId, viewCount = 1, userAgents = [], delay = 100 } = req.body;
  const ip = getClientIP(req);
  
  // Rate limiting check
  const rateLimitCheck = checkRateLimit(ip, 'single');
  if (!rateLimitCheck.allowed) {
    logAdminOperation('RATE_LIMITED', ip, { operation: 'generate-blog-views', reason: rateLimitCheck.reason });
    return res.status(429).json({ 
      error: rateLimitCheck.reason,
      code: 'RATE_LIMITED',
      retryAfter: rateLimitCheck.remainingTime || 3600
    });
  }
  
  if (!blogId || !blogDatabase[blogId]) {
    return res.status(400).json({ error: 'Valid blog post ID is required' });
  }
  
  const count = Math.min(Math.max(parseInt(viewCount), 1), 1000); // Limit to 1000 views max
  const baseDelay = Math.max(parseInt(delay), 10); // Minimum 10ms delay
  const actualDelay = calculateProgressiveDelay(ip, baseDelay);
  
  // Enhanced validation for large operations
  if (count > 500) {
    const tracking = adminSecurity.ipTracking[ip];
    if (tracking && tracking.operationsLastHour.length > 20) {
      return res.status(429).json({ 
        error: 'Large operations require fewer recent activities. Please wait before performing operations over 500 views.',
        code: 'LARGE_OPERATION_RESTRICTED'
      });
    }
  }
  
  // Log the operation
  logAdminOperation('SINGLE_BLOG_AUTOMATION', ip, { blogId, viewCount: count, delay: actualDelay });
  
  const defaultUserAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (Android 11; Mobile; rv:93.0) Gecko/93.0 Firefox/93.0'
  ];
  
  const agents = userAgents.length > 0 ? userAgents : defaultUserAgents;
  let generated = 0;
  
  // Generate views with delay
  const generateInterval = setInterval(() => {
    if (generated >= count) {
      clearInterval(generateInterval);
      return;
    }
    
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];
    const randomIp = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
    
    if (simulateBlogView(blogId, randomAgent, randomIp)) {
      generated++;
    }
    
    if (generated >= count) {
      clearInterval(generateInterval);
    }
  }, actualDelay);
  
  res.json({ 
    message: `Started generating ${count} views for blog post`,
    blogId,
    viewCount: count,
    delay: actualDelay,
    securityLevel: actualDelay > baseDelay ? 'ENHANCED' : 'STANDARD',
    progressiveDelay: actualDelay > baseDelay
  });
});

// Admin API endpoint for bulk blog view generation on all posts
app.post('/admin/api/blog/automation/generate-bulk-views', requireAdvancedAuth, (req, res) => {
  const { viewsPerPost = 5, delay = 100 } = req.body;
  const ip = getClientIP(req);
  
  // Enhanced rate limiting for bulk operations
  const rateLimitCheck = checkRateLimit(ip, 'bulk');
  if (!rateLimitCheck.allowed) {
    logAdminOperation('BULK_RATE_LIMITED', ip, { operation: 'generate-bulk-blog-views', reason: rateLimitCheck.reason });
    return res.status(429).json({ 
      error: rateLimitCheck.reason,
      code: 'BULK_RATE_LIMITED',
      retryAfter: rateLimitCheck.remainingTime || 86400
    });
  }
  
  const publishedPosts = Object.values(blogDatabase).filter(post => post.published);
  if (publishedPosts.length === 0) {
    return res.status(400).json({ error: 'No published blog posts available for automation' });
  }
  
  const count = Math.min(Math.max(parseInt(viewsPerPost), 1), CONFIG.BULK_BLOG_VIEW_LIMIT);
  const baseDelay = Math.max(parseInt(delay), CONFIG.BASE_DELAYS.BLOG_VIEW_GENERATION);
  const actualDelay = calculateProgressiveDelay(ip, baseDelay);
  
  const totalEstimatedViews = publishedPosts.length * count;
  
  // Enhanced security for large bulk operations
  if (totalEstimatedViews > 500) {
    const tracking = adminSecurity.ipTracking[ip];
    const recentBulkOps = tracking ? tracking.bulkOperationsLastDay.length : 0;
    
    if (recentBulkOps >= 3) {
      return res.status(429).json({ 
        error: 'Large bulk blog operations are limited to 3 per day for security reasons.',
        code: 'LARGE_BULK_LIMIT_EXCEEDED',
        suggestedAction: 'Consider smaller batch sizes or contact administrator.'
      });
    }
  }
  
  // Multi-factor confirmation requirement for very large operations
  if (totalEstimatedViews > 1000) {
    const confirmationToken = req.headers['x-confirmation-token'];
    const expectedToken = 'BLOG_BULK_CONFIRM_' + Date.now().toString().slice(-6);
    
    if (!confirmationToken || confirmationToken !== expectedToken) {
      return res.status(400).json({ 
        error: 'Large bulk blog operations require additional confirmation.',
        code: 'CONFIRMATION_REQUIRED',
        confirmationToken: expectedToken,
        estimatedViews: totalEstimatedViews,
        warningMessage: `This operation will generate ${totalEstimatedViews} views across ${publishedPosts.length} blog posts. Please confirm by including the token in X-Confirmation-Token header.`
      });
    }
  }
  
  // Log the bulk operation
  logAdminOperation('BULK_BLOG_AUTOMATION', ip, { 
    postCount: publishedPosts.length, 
    viewsPerPost: count, 
    totalViews: totalEstimatedViews,
    delay: actualDelay,
    securityLevel: actualDelay > baseDelay ? 'ENHANCED' : 'STANDARD'
  });
  
  const defaultUserAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (Android 11; Mobile; rv:93.0) Gecko/93.0 Firefox/93.0'
  ];
  
  let totalGenerated = 0;
  let currentPostIndex = 0;
  let viewsForCurrentPost = 0;
  
  const generateInterval = setInterval(() => {
    if (currentPostIndex >= publishedPosts.length) {
      clearInterval(generateInterval);
      logAdminOperation('BULK_BLOG_COMPLETED', ip, { totalGenerated, duration: Date.now() });
      return;
    }
    
    const currentPost = publishedPosts[currentPostIndex];
    const randomAgent = defaultUserAgents[Math.floor(Math.random() * defaultUserAgents.length)];
    const randomIp = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
    
    if (simulateBlogView(currentPost.id, randomAgent, randomIp)) {
      totalGenerated++;
      viewsForCurrentPost++;
    }
    
    if (viewsForCurrentPost >= count) {
      currentPostIndex++;
      viewsForCurrentPost = 0;
    }
  }, actualDelay);
  
  res.json({ 
    message: `Started bulk blog view generation: ${count} views per post for ${publishedPosts.length} published posts`,
    totalPosts: publishedPosts.length,
    viewsPerPost: count,
    estimatedTotal: totalEstimatedViews,
    delay: actualDelay,
    securityLevel: actualDelay > baseDelay ? 'ENHANCED' : 'STANDARD',
    progressiveDelay: actualDelay > baseDelay,
    operationId: Date.now(),
    estimatedDuration: Math.ceil((totalEstimatedViews * actualDelay) / 1000) + ' seconds'
  });
});

// Admin API endpoint to manually set blog view count
app.post('/admin/api/blog/automation/set-views', requireAuth, (req, res) => {
  const { blogId, viewCount = 0 } = req.body;
  
  if (!blogId || !blogDatabase[blogId]) {
    return res.status(400).json({ error: 'Valid blog post ID is required' });
  }
  
  const count = Math.max(parseInt(viewCount), 0); // Minimum 0 views
  
  // Initialize or update analytics
  if (!blogAnalytics[blogId]) {
    blogAnalytics[blogId] = {
      views: 0,
      firstView: null,
      lastView: null,
      viewHistory: []
    };
  }
  
  const now = new Date();
  blogAnalytics[blogId].views = count;
  
  if (count > 0) {
    if (!blogAnalytics[blogId].firstView) {
      blogAnalytics[blogId].firstView = now;
    }
    blogAnalytics[blogId].lastView = now;
  } else {
    // Reset if setting to 0
    blogAnalytics[blogId].firstView = null;
    blogAnalytics[blogId].lastView = null;
    blogAnalytics[blogId].viewHistory = [];
  }
  
  res.json({ 
    message: `Blog view count set to ${count}`,
    blogId,
    newViewCount: count
  });
});

// Admin API endpoint to get blog automation statistics
app.get('/admin/api/blog/automation/stats', requireAuth, (req, res) => {
  const totalPosts = Object.keys(blogDatabase).length;
  const publishedPosts = Object.values(blogDatabase).filter(post => post.published).length;
  const totalViews = Object.values(blogAnalytics).reduce((sum, analytics) => sum + analytics.views, 0);
  const postsWithViews = Object.values(blogAnalytics).filter(analytics => analytics.views > 0).length;
  
  res.json({
    totalPosts,
    publishedPosts,
    totalViews,
    postsWithViews,
    averageViewsPerPost: publishedPosts > 0 ? Math.round(totalViews / publishedPosts * 10) / 10 : 0,
    postsWithoutViews: publishedPosts - postsWithViews
  });
});

// ========================================
// BLOG ROUTES AND FUNCTIONALITY
// ========================================

// Public blog listing page
app.get('/blog', (req, res) => {
  const publishedPosts = Object.values(blogDatabase).filter(post => post.published);
  publishedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Blog - URL Shortener</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
                line-height: 1.6;
            }
            .header {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                margin-bottom: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                color: #333;
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .experimental-badge {
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                color: white;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: bold;
                display: inline-block;
                margin-left: 10px;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            .nav-links {
                margin-top: 20px;
            }
            .nav-links a {
                color: #007bff;
                text-decoration: none;
                margin: 0 15px;
                font-weight: bold;
            }
            .nav-links a:hover {
                text-decoration: underline;
            }
            .blog-post {
                background-color: white;
                padding: 25px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                margin-bottom: 25px;
                transition: transform 0.2s;
            }
            .blog-post:hover {
                transform: translateY(-2px);
            }
            .blog-post h2 {
                margin-top: 0;
                color: #333;
            }
            .blog-post h2 a {
                color: #333;
                text-decoration: none;
            }
            .blog-post h2 a:hover {
                color: #007bff;
            }
            .blog-meta {
                color: #666;
                font-size: 14px;
                margin-bottom: 15px;
            }
            .blog-excerpt {
                color: #555;
                margin-bottom: 15px;
            }
            .read-more {
                background-color: #007bff;
                color: white;
                padding: 8px 16px;
                border-radius: 5px;
                text-decoration: none;
                font-size: 14px;
                display: inline-block;
            }
            .read-more:hover {
                background-color: #0056b3;
            }
            .no-posts {
                text-align: center;
                color: #666;
                background-color: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .blog-stats {
                background-color: #e7f3ff;
                padding: 10px 15px;
                border-radius: 5px;
                margin-top: 10px;
                font-size: 12px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📝 Blog<span class="experimental-badge">EXPERIMENTAL</span></h1>
            <p>Welcome to our experimental blog featuring insights, tips, and stories!</p>
            <div class="nav-links">
                <a href="/">🔗 URL Shortener</a>
                <a href="/admin">🛠️ Admin Panel</a>
            </div>
        </div>

        ${publishedPosts.length === 0 ? `
            <div class="no-posts">
                <h2>No blog posts yet!</h2>
                <p>Check back soon for interesting content.</p>
            </div>
        ` : publishedPosts.map(post => {
            const analytics = blogAnalytics[post.id] || { views: 0 };
            const excerpt = post.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...';
            return `
                <article class="blog-post">
                    <h2><a href="/blog/${post.slug}">${post.title}</a></h2>
                    <div class="blog-meta">
                        By ${post.author} • ${new Date(post.createdAt).toLocaleDateString()} • ${analytics.views} views
                    </div>
                    <div class="blog-excerpt">${excerpt}</div>
                    <a href="/blog/${post.slug}" class="read-more">Read More →</a>
                    <div class="blog-stats">
                        📊 ${analytics.views} total views • 🔗 <a href="/blog/preview/${post.slug}" target="_blank">Preview with Analytics</a>
                    </div>
                </article>
            `;
        }).join('')}
    </body>
    </html>
  `);
});

// Individual blog post page
app.get('/blog/:slug', (req, res) => {
  const { slug } = req.params;
  const post = Object.values(blogDatabase).find(p => p.slug === slug && p.published);
  
  if (!post) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Post Not Found - Blog</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  max-width: 600px;
                  margin: 50px auto;
                  padding: 20px;
                  text-align: center;
                  background-color: #f5f5f5;
              }
              .container {
                  background-color: white;
                  padding: 30px;
                  border-radius: 10px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 { color: #dc3545; }
              a { color: #007bff; text-decoration: none; }
              a:hover { text-decoration: underline; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>404 - Post Not Found</h1>
              <p>The blog post you're looking for doesn't exist.</p>
              <a href="/blog">← Back to Blog</a>
          </div>
      </body>
      </html>
    `);
  }

  // Record blog view
  recordBlogView(post.id, req);
  
  const analytics = blogAnalytics[post.id] || { views: 0 };
  const blogShortUrl = `${req.protocol}://${req.get('host')}/blog/${post.slug}`;
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${post.title} - Blog</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
                line-height: 1.6;
            }
            .container {
                background-color: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .post-header {
                border-bottom: 2px solid #e9ecef;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .post-title {
                color: #333;
                margin-bottom: 10px;
                font-size: 2.5em;
                line-height: 1.2;
            }
            .post-meta {
                color: #666;
                font-size: 16px;
                margin-bottom: 20px;
            }
            .post-content {
                color: #444;
                font-size: 18px;
                line-height: 1.8;
            }
            .post-content h1, .post-content h2, .post-content h3 {
                color: #333;
                margin-top: 30px;
            }
            .post-content p {
                margin-bottom: 20px;
            }
            .post-footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e9ecef;
            }
            .nav-links {
                text-align: center;
                margin-bottom: 20px;
            }
            .nav-links a {
                color: #007bff;
                text-decoration: none;
                margin: 0 15px;
                font-weight: bold;
            }
            .nav-links a:hover {
                text-decoration: underline;
            }
            .sharing-section {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-top: 30px;
                text-align: center;
            }
            .sharing-section h3 {
                margin-top: 0;
                color: #333;
            }
            .share-button {
                background-color: #007bff;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                text-decoration: none;
                margin: 5px;
                display: inline-block;
                font-size: 14px;
            }
            .share-button:hover {
                background-color: #0056b3;
            }
            .analytics-preview {
                background-color: #e7f3ff;
                padding: 15px;
                border-radius: 8px;
                margin-top: 20px;
                text-align: center;
            }
            .experimental-badge {
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                color: white;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: bold;
                margin-left: 8px;
            }
        </style>
    </head>
    <body>
        <div class="nav-links">
            <a href="/blog">← Back to Blog</a>
            <a href="/">🔗 URL Shortener</a>
            <a href="/admin">🛠️ Admin Panel</a>
        </div>
        
        <div class="container">
            <header class="post-header">
                <h1 class="post-title">${post.title}<span class="experimental-badge">EXPERIMENTAL</span></h1>
                <div class="post-meta">
                    By <strong>${post.author}</strong> • 
                    Published on ${new Date(post.createdAt).toLocaleDateString()} • 
                    ${analytics.views} views
                </div>
            </header>
            
            <main class="post-content">
                ${post.content}
            </main>
            
            <footer class="post-footer">
                <div class="sharing-section">
                    <h3>📱 Share This Post</h3>
                    <p>Create short URLs for social sharing:</p>
                    <a href="javascript:void(0)" onclick="createShortUrl()" class="share-button">🔗 Create Short URL</a>
                    <a href="/blog/preview/${post.slug}" target="_blank" class="share-button">👀 Preview & Analytics</a>
                    <a href="javascript:void(0)" onclick="generateQR()" class="share-button">📱 Generate QR Code</a>
                </div>
                
                <div class="analytics-preview">
                    <strong>📊 Post Analytics:</strong> ${analytics.views} total views
                </div>
            </footer>
        </div>
        
        <script>
            async function createShortUrl() {
                try {
                    const response = await fetch('/shorten', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            originalUrl: window.location.href
                        })
                    });
                    
                    const data = await response.json();
                    if (response.ok) {
                        const shortUrl = window.location.origin + '/' + data.shortCode;
                        prompt('Short URL created! Copy this:', shortUrl);
                    } else {
                        // Try without custom code if it already exists
                        const response2 = await fetch('/shorten', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ originalUrl: window.location.href })
                        });
                        const data2 = await response2.json();
                        if (response2.ok) {
                            const shortUrl = window.location.origin + '/' + data2.shortCode;
                            prompt('Short URL created! Copy this:', shortUrl);
                        } else {
                            alert('Error creating short URL');
                        }
                    }
                } catch (error) {
                    alert('Error: ' + error.message);
                }
            }
            
            function generateQR() {
                const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(window.location.href);
                window.open(qrUrl, '_blank');
            }
        </script>
    </body>
    </html>
  `);
});

// Blog preview page (experimental feature)
app.get('/blog/preview/:slug', (req, res) => {
  const { slug } = req.params;
  const post = Object.values(blogDatabase).find(p => p.slug === slug && p.published);
  
  if (!post) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html><head><title>Post Not Found</title></head>
      <body><h1>Post Not Found</h1><a href="/blog">← Back to Blog</a></body></html>
    `);
  }

  const analytics = blogAnalytics[post.id] || { views: 0, firstView: null, lastView: null, viewHistory: [] };
  const blogUrl = `${req.protocol}://${req.get('host')}/blog/${post.slug}`;
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Blog Preview - ${post.title}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 30px;
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .experimental-badge {
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                color: white;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: bold;
                margin-left: 10px;
            }
            .preview-info {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            .url-info {
                margin-bottom: 15px;
            }
            .label {
                font-weight: bold;
                color: #555;
            }
            .url {
                word-break: break-all;
                color: #007bff;
            }
            .stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }
            .stat-card {
                background-color: #e9ecef;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
            }
            .stat-number {
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
            }
            .stat-label {
                font-size: 12px;
                color: #666;
                margin-top: 5px;
            }
            .action-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
                flex-wrap: wrap;
            }
            .btn {
                padding: 12px 24px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                text-decoration: none;
                display: inline-block;
                text-align: center;
                transition: background-color 0.3s;
            }
            .btn-primary {
                background-color: #007bff;
                color: white;
            }
            .btn-primary:hover {
                background-color: #0056b3;
            }
            .btn-secondary {
                background-color: #6c757d;
                color: white;
            }
            .btn-secondary:hover {
                background-color: #545b62;
            }
            .btn-success {
                background-color: #28a745;
                color: white;
            }
            .btn-success:hover {
                background-color: #218838;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
            }
            .qr-code {
                text-align: center;
                margin: 20px 0;
            }
            .qr-code img {
                border: 1px solid #ddd;
                border-radius: 8px;
            }
            .post-excerpt {
                background-color: #e7f3ff;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #007bff;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📝 Blog Preview<span class="experimental-badge">EXPERIMENTAL</span></h1>
            
            <div class="warning">
                <strong>🔍 Blog Analytics Preview:</strong> Get insights into this blog post's performance and engagement.
            </div>
            
            <div class="preview-info">
                <div class="url-info">
                    <span class="label">Blog Post:</span><br>
                    <span class="url">${post.title}</span>
                </div>
                <div class="url-info">
                    <span class="label">URL:</span><br>
                    <span class="url">${blogUrl}</span>
                </div>
                <div class="url-info">
                    <span class="label">Author:</span><br>
                    <span>${post.author}</span>
                </div>
                <div class="url-info">
                    <span class="label">Published:</span><br>
                    <span>${new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${analytics.views}</div>
                    <div class="stat-label">Total Views</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${analytics.firstView ? new Date(analytics.firstView).toLocaleDateString() : 'Never'}</div>
                    <div class="stat-label">First Viewed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${analytics.lastView ? new Date(analytics.lastView).toLocaleDateString() : 'Never'}</div>
                    <div class="stat-label">Last Viewed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${analytics.viewHistory ? analytics.viewHistory.length : 0}</div>
                    <div class="stat-label">Recent Views</div>
                </div>
            </div>
            
            <div class="post-excerpt">
                <h3>Post Excerpt:</h3>
                <p>${post.content.replace(/<[^>]*>/g, '').substring(0, 300)}...</p>
            </div>
            
            <div class="qr-code">
                <h3>QR Code</h3>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(blogUrl)}" alt="QR Code for ${blogUrl}">
            </div>
            
            <div class="action-buttons">
                <a href="${blogUrl}" class="btn btn-primary">📖 Read Full Post</a>
                <a href="/blog" class="btn btn-secondary">📝 Back to Blog</a>
                <button onclick="copyToClipboard('${blogUrl}')" class="btn btn-success">📋 Copy URL</button>
                <button onclick="createShortUrl()" class="btn btn-secondary">🔗 Create Short URL</button>
            </div>
        </div>
        
        <script>
            function copyToClipboard(text) {
                navigator.clipboard.writeText(text).then(() => {
                    alert('Blog URL copied to clipboard!');
                });
            }
            
            async function createShortUrl() {
                try {
                    const response = await fetch('/shorten', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            originalUrl: '${blogUrl}'
                        })
                    });
                    
                    const data = await response.json();
                    if (response.ok) {
                        const shortUrl = window.location.origin + '/' + data.shortCode;
                        prompt('Short URL created for blog post! Copy this:', shortUrl);
                    } else {
                        alert('Error: ' + data.error);
                    }
                } catch (error) {
                    alert('Error: ' + error.message);
                }
            }
        </script>
    </body>
    </html>
  `);
});

// Admin blog management routes
app.get('/admin/blog', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog Management - Admin</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .header { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { margin: 0; color: #333; }
        .experimental-badge { background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; margin-left: 10px; }
        .btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; font-size: 14px; margin: 0 5px; }
        .btn-primary { background: #007bff; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-danger { background: #dc3545; color: white; }
        .container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .automation-panel { display: none; }
        .automation-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .automation-card { background: #f8f9fa; padding: 20px; border-radius: 8px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📝 Blog Management<span class="experimental-badge">EXPERIMENTAL</span></h1>
        <div>
            <a href="/blog" class="btn btn-secondary" target="_blank">View Blog</a>
            <a href="/admin/dashboard" class="btn btn-secondary">URL Dashboard</a>
            <button class="btn btn-success" onclick="showCreateForm()">+ New Post</button>
            <button class="btn btn-primary" onclick="toggleAutomation()" style="background: #ff6b6b;">🎯 Blog Views</button>
            <a href="/admin" class="btn btn-danger">Logout</a>
        </div>
    </div>

    <div class="container automation-panel" id="automationPanel">
        <h2>🎯 Blog Views Modification <span class="experimental-badge">EXPERIMENTAL</span></h2>
        <p>Modify blog post view counts for testing purposes. These modified views will be visible to all blog visitors.</p>
        
        <div class="automation-grid">
            <div class="automation-card">
                <h3>Generate Views</h3>
                <div class="form-group">
                    <label>Target Post:</label>
                    <select id="targetPost">
                        <option value="">Select post...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Number of Views:</label>
                    <input type="number" id="viewCount" value="10" min="1" max="1000">
                </div>
                <button class="btn btn-success" onclick="generateViews()">Generate Views</button>
            </div>
            
            <div class="automation-card">
                <h3>Bulk Generation</h3>
                <div class="form-group">
                    <label>Views per Post:</label>
                    <input type="number" id="bulkViews" value="5" min="1" max="30">
                    <small style="color: #e74c3c; display: block; margin-top: 5px;">⚠️ Max 30 per post for security</small>
                </div>
                <button class="btn btn-primary" onclick="generateBulkViews()">Generate for All Posts</button>
            </div>
            
            <div class="automation-card">
                <h3>Set Manual Count</h3>
                <div class="form-group">
                    <label>Target Post:</label>
                    <select id="manualPost">
                        <option value="">Select post...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>View Count:</label>
                    <input type="number" id="manualCount" value="100" min="0">
                </div>
                <button class="btn btn-secondary" onclick="setManualViews()">Set Count</button>
            </div>
        </div>
        
        <div id="automationStatus" style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin-top: 20px; display: none;">
            <div id="statusMessage"></div>
        </div>
    </div>

    <div class="container">
        <h2>Blog Posts</h2>
        <table>
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Status</th>
                    <th>Views</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="postsTable">
                <tr><td colspan="6">Loading...</td></tr>
            </tbody>
        </table>
    </div>

    <script>
        let blogPosts = {};
        let blogAnalytics = {};

        function checkAuth() {
            const token = localStorage.getItem('adminToken');
            if (!token) { window.location.href = '/admin'; return false; }
            return token;
        }

        async function loadPosts() {
            const token = checkAuth();
            if (!token) return;

            try {
                const [postsResponse, analyticsResponse] = await Promise.all([
                    fetch('/admin/api/blog/posts', { headers: { 'Authorization': 'Bearer ' + token } }),
                    fetch('/admin/api/blog/analytics', { headers: { 'Authorization': 'Bearer ' + token } })
                ]);

                if (postsResponse.ok && analyticsResponse.ok) {
                    blogPosts = await postsResponse.json();
                    blogAnalytics = await analyticsResponse.json();
                    displayPosts();
                    populateDropdowns();
                } else {
                    alert('Failed to load blog data');
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        function displayPosts() {
            const tbody = document.getElementById('postsTable');
            if (Object.keys(blogPosts).length === 0) {
                tbody.innerHTML = '<tr><td colspan="6">No blog posts found</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            for (const [id, post] of Object.entries(blogPosts)) {
                const analytics = blogAnalytics[id] || { views: 0 };
                const row = tbody.insertRow();
                row.innerHTML = '<td>' + post.title + '</td>' +
                               '<td>' + post.author + '</td>' +
                               '<td>' + (post.published ? 'Published' : 'Draft') + '</td>' +
                               '<td><strong>' + analytics.views + '</strong></td>' +
                               '<td>' + new Date(post.createdAt).toLocaleDateString() + '</td>' +
                               '<td><button class="btn btn-secondary" onclick="deletePost(\'' + id + '\')">Delete</button></td>';
            }
        }

        function populateDropdowns() {
            const publishedPosts = Object.values(blogPosts).filter(post => post.published);
            const selects = [document.getElementById('targetPost'), document.getElementById('manualPost')];
            
            selects.forEach(select => {
                select.innerHTML = '<option value="">Select post...</option>';
                publishedPosts.forEach(post => {
                    const option = document.createElement('option');
                    option.value = post.id;
                    option.textContent = post.title.substring(0, 50);
                    select.appendChild(option);
                });
            });
        }

        function toggleAutomation() {
            const panel = document.getElementById('automationPanel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }

        async function generateViews() {
            const token = checkAuth();
            const blogId = document.getElementById('targetPost').value;
            const viewCount = document.getElementById('viewCount').value;

            if (!blogId) { alert('Please select a post'); return; }

            try {
                const response = await fetch('/admin/api/blog/automation/generate-views', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ blogId, viewCount: parseInt(viewCount), delay: 100 })
                });

                if (response.ok) {
                    showStatus('Started generating ' + viewCount + ' views...');
                    setTimeout(() => { loadPosts(); showStatus('Completed!'); }, 2000);
                } else {
                    alert('Error generating views');
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        async function generateBulkViews() {
            const token = checkAuth();
            const viewsPerPost = document.getElementById('bulkViews').value;
            const publishedCount = Object.values(blogPosts).filter(post => post.published).length;

            if (publishedCount === 0) { alert('No published posts'); return; }
            if (!confirm('Generate ' + viewsPerPost + ' views for each of ' + publishedCount + ' posts?')) return;

            try {
                const response = await fetch('/admin/api/blog/automation/generate-bulk-views', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ viewsPerPost: parseInt(viewsPerPost), delay: 200 })
                });

                if (response.ok) {
                    const data = await response.json();
                    showStatus('Started bulk generation: ' + data.estimatedTotal + ' total views...');
                    setTimeout(() => { loadPosts(); showStatus('Bulk generation completed!'); }, 5000);
                } else {
                    alert('Error generating bulk views');
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        async function setManualViews() {
            const token = checkAuth();
            const blogId = document.getElementById('manualPost').value;
            const viewCount = document.getElementById('manualCount').value;

            if (!blogId) { alert('Please select a post'); return; }

            const post = blogPosts[blogId];
            if (!confirm('Set view count for "' + post.title + '" to ' + viewCount + '?')) return;

            try {
                const response = await fetch('/admin/api/blog/automation/set-views', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ blogId, viewCount: parseInt(viewCount) })
                });

                if (response.ok) {
                    showStatus('View count set to ' + viewCount);
                    loadPosts();
                } else {
                    alert('Error setting view count');
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        function showStatus(message) {
            const statusDiv = document.getElementById('automationStatus');
            document.getElementById('statusMessage').textContent = message;
            statusDiv.style.display = 'block';
        }

        async function deletePost(postId) {
            const token = checkAuth();
            const post = blogPosts[postId];
            if (!confirm('Delete "' + post.title + '"?')) return;

            try {
                const response = await fetch('/admin/api/blog/posts/' + postId, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    loadPosts();
                } else {
                    alert('Failed to delete post');
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        function showCreateForm() {
            alert('Blog creation feature will be added in next update');
        }

        window.onload = loadPosts;
    </script>
</body>
</html>
  `);
});
// Admin API endpoints for blog management
app.get('/admin/api/blog/posts', requireAuth, (req, res) => {
  res.json(blogDatabase);
});

app.post('/admin/api/blog/posts', requireAuth, (req, res) => {
  const { title, content, author, published } = req.body;
  
  if (!title || !content || !author) {
    return res.status(400).json({ error: 'Title, content, and author are required' });
  }
  
  const id = generateBlogId();
  const slug = generateSlug(title);
  const now = new Date().toISOString();
  
  // Ensure slug is unique
  let finalSlug = slug;
  let counter = 1;
  while (Object.values(blogDatabase).some(post => post.slug === finalSlug)) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }
  
  const post = {
    id,
    title,
    content,
    author,
    published: Boolean(published),
    slug: finalSlug,
    createdAt: now,
    updatedAt: now
  };
  
  blogDatabase[id] = post;
  res.json(post);
});

app.put('/admin/api/blog/posts/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { title, content, author, published } = req.body;
  
  if (!blogDatabase[id]) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  if (!title || !content || !author) {
    return res.status(400).json({ error: 'Title, content, and author are required' });
  }
  
  const existingPost = blogDatabase[id];
  const slug = title !== existingPost.title ? generateSlug(title) : existingPost.slug;
  
  // Ensure slug is unique (excluding current post)
  let finalSlug = slug;
  let counter = 1;
  while (Object.values(blogDatabase).some(post => post.slug === finalSlug && post.id !== id)) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }
  
  const updatedPost = {
    ...existingPost,
    title,
    content,
    author,
    published: Boolean(published),
    slug: finalSlug,
    updatedAt: new Date().toISOString()
  };
  
  blogDatabase[id] = updatedPost;
  res.json(updatedPost);
});

app.delete('/admin/api/blog/posts/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  if (blogDatabase[id]) {
    delete blogDatabase[id];
    // Also delete analytics data
    delete blogAnalytics[id];
    res.json({ message: 'Post deleted successfully' });
  } else {
    res.status(404).json({ error: 'Post not found' });
  }
});

app.get('/admin/api/blog/analytics', requireAuth, (req, res) => {
  const analyticsData = {};
  
  for (const postId in blogDatabase) {
    analyticsData[postId] = blogAnalytics[postId] || {
      views: 0,
      firstView: null,
      lastView: null,
      viewHistory: []
    };
  }
  
  res.json(analyticsData);
});

// Redirect endpoint
app.get('/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  const originalUrl = urlDatabase[shortCode];
  
  if (originalUrl) {
    // Record the click for analytics
    recordClick(shortCode, req);
    res.redirect(originalUrl);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>URL Not Found</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  max-width: 600px;
                  margin: 50px auto;
                  padding: 20px;
                  text-align: center;
                  background-color: #f5f5f5;
              }
              .container {
                  background-color: white;
                  padding: 30px;
                  border-radius: 10px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 {
                  color: #dc3545;
              }
              a {
                  color: #007bff;
                  text-decoration: none;
              }
              a:hover {
                  text-decoration: underline;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>404 - URL Not Found</h1>
              <p>The short URL you're looking for doesn't exist.</p>
              <a href="/">← Go back to create a new short URL</a>
          </div>
      </body>
      </html>
    `);
  }
});

// API endpoint to get all URLs (for debugging/admin purposes)
app.get('/api/urls', (req, res) => {
  res.json(urlDatabase);
});

// Start server
app.listen(PORT, () => {
  console.log(`URL Shortener server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to use the URL shortener`);
});

module.exports = app;