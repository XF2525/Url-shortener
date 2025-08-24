const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for URL mappings
const urlDatabase = {};

// In-memory storage for URL analytics
const urlAnalytics = {};

// In-memory storage for blog posts
const blogDatabase = {};

// In-memory storage for blog analytics
const blogAnalytics = {};

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

// Function to record click analytics
function recordClick(shortCode, req) {
  if (!urlAnalytics[shortCode]) {
    urlAnalytics[shortCode] = {
      clicks: 0,
      firstClick: null,
      lastClick: null,
      clickHistory: []
    };
  }
  
  const timestamp = new Date();
  urlAnalytics[shortCode].clicks++;
  urlAnalytics[shortCode].lastClick = timestamp;
  
  if (!urlAnalytics[shortCode].firstClick) {
    urlAnalytics[shortCode].firstClick = timestamp;
  }
  
  // Store click history (limit to last 100 clicks for memory management)
  urlAnalytics[shortCode].clickHistory.push({
    timestamp,
    userAgent: req.get('User-Agent') || 'Unknown',
    ip: req.ip || req.connection.remoteAddress || 'Unknown'
  });
  
  if (urlAnalytics[shortCode].clickHistory.length > 100) {
    urlAnalytics[shortCode].clickHistory.shift();
  }
}

// Function to generate blog post ID
function generateBlogId() {
  return 'blog_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Function to generate blog slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

// Function to record blog view analytics
function recordBlogView(blogId, req) {
  if (!blogAnalytics[blogId]) {
    blogAnalytics[blogId] = {
      views: 0,
      firstView: null,
      lastView: null,
      viewHistory: []
    };
  }
  
  const timestamp = new Date();
  blogAnalytics[blogId].views++;
  blogAnalytics[blogId].lastView = timestamp;
  
  if (!blogAnalytics[blogId].firstView) {
    blogAnalytics[blogId].firstView = timestamp;
  }
  
  // Store view history (limit to last 100 views for memory management)
  blogAnalytics[blogId].viewHistory.push({
    timestamp,
    userAgent: req.get('User-Agent') || 'Unknown',
    ip: req.ip || req.connection.remoteAddress || 'Unknown'
  });
  
  if (blogAnalytics[blogId].viewHistory.length > 100) {
    blogAnalytics[blogId].viewHistory.shift();
  }
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
  const { originalUrl, customCode } = req.body;
  
  // Validate URL
  if (!originalUrl || !isValidUrl(originalUrl)) {
    return res.status(400).json({ error: 'Please provide a valid URL' });
  }
  
  // Check if custom code is provided and validate it
  if (customCode) {
    // Validate custom code (alphanumeric, 3-20 characters)
    if (!/^[a-zA-Z0-9]{3,20}$/.test(customCode)) {
      return res.status(400).json({ 
        error: 'Custom code must be 3-20 characters long and contain only letters and numbers' 
      });
    }
    
    // Check if custom code already exists
    if (urlDatabase[customCode]) {
      return res.status(409).json({ 
        error: 'Custom code already exists. Please choose a different one.' 
      });
    }
    
    // Use custom code
    urlDatabase[customCode] = originalUrl;
    return res.json({ shortCode: customCode, originalUrl, isCustom: true });
  }
  
  // Check if URL already exists (for auto-generated codes only)
  for (const [shortCode, url] of Object.entries(urlDatabase)) {
    if (url === originalUrl) {
      return res.json({ shortCode, originalUrl, isCustom: false });
    }
  }
  
  // Generate unique short code
  let shortCode;
  do {
    shortCode = generateShortCode();
  } while (urlDatabase[shortCode]);
  
  // Store the mapping
  urlDatabase[shortCode] = originalUrl;
  
  res.json({ shortCode, originalUrl, isCustom: false });
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
                        <input type="number" id="bulkClickCount" min="1" max="100" value="5" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
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

// Admin API endpoint for automated click generation
app.post('/admin/api/automation/generate-clicks', requireAuth, (req, res) => {
  const { shortCode, clickCount = 1, userAgents = [], delay = 100 } = req.body;
  
  if (!shortCode || !urlDatabase[shortCode]) {
    return res.status(400).json({ error: 'Valid short code is required' });
  }
  
  const count = Math.min(Math.max(parseInt(clickCount), 1), 1000); // Limit to 1000 clicks max
  const delayMs = Math.max(parseInt(delay), 10); // Minimum 10ms delay
  
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
  }, delayMs);
  
  res.json({ 
    message: `Started generating ${count} clicks for ${shortCode}`,
    shortCode,
    clickCount: count,
    delay: delayMs
  });
});

// Admin API endpoint for bulk click generation on all URLs
app.post('/admin/api/automation/generate-bulk-clicks', requireAuth, (req, res) => {
  const { clicksPerUrl = 5, delay = 100 } = req.body;
  
  const urlCodes = Object.keys(urlDatabase);
  if (urlCodes.length === 0) {
    return res.status(400).json({ error: 'No URLs available for automation' });
  }
  
  const count = Math.min(Math.max(parseInt(clicksPerUrl), 1), 100); // Limit to 100 clicks per URL
  const delayMs = Math.max(parseInt(delay), 50); // Minimum 50ms delay for bulk
  
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
  }, delayMs);
  
  res.json({ 
    message: `Started bulk generation: ${count} clicks per URL for ${urlCodes.length} URLs`,
    totalUrls: urlCodes.length,
    clicksPerUrl: count,
    estimatedTotal: urlCodes.length * count,
    delay: delayMs
  });
});

// Admin API endpoint to get automation statistics
app.get('/admin/api/automation/stats', requireAuth, (req, res) => {
  const totalUrls = Object.keys(urlDatabase).length;
  const totalClicks = Object.values(urlAnalytics).reduce((sum, analytics) => sum + analytics.clicks, 0);
  const urlsWithClicks = Object.values(urlAnalytics).filter(analytics => analytics.clicks > 0).length;
  
  res.json({
    totalUrls,
    totalClicks,
    urlsWithClicks,
    averageClicksPerUrl: totalUrls > 0 ? Math.round(totalClicks / totalUrls * 10) / 10 : 0,
    urlsWithoutClicks: totalUrls - urlsWithClicks
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
            .nav-buttons {
                display: flex;
                gap: 10px;
            }
            .btn {
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                text-decoration: none;
                font-size: 14px;
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
            .btn-danger {
                background-color: #dc3545;
                color: white;
            }
            .btn-danger:hover {
                background-color: #c82333;
            }
            .container {
                background-color: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                margin-bottom: 20px;
            }
            .form-group {
                margin-bottom: 20px;
            }
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                color: #555;
            }
            .form-group input,
            .form-group textarea {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 5px;
                font-size: 16px;
                box-sizing: border-box;
                font-family: Arial, sans-serif;
            }
            .form-group input:focus,
            .form-group textarea:focus {
                border-color: #007bff;
                outline: none;
            }
            .form-group textarea {
                height: 200px;
                resize: vertical;
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
            .post-title {
                font-weight: bold;
                color: #007bff;
            }
            .post-status {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
            }
            .status-published {
                background-color: #d4edda;
                color: #155724;
            }
            .status-draft {
                background-color: #f8d7da;
                color: #721c24;
            }
            .actions {
                display: flex;
                gap: 5px;
            }
            .actions button {
                padding: 4px 8px;
                font-size: 12px;
            }
            .no-data {
                text-align: center;
                color: #666;
                font-style: italic;
                padding: 40px;
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
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📝 Blog Management<span class="experimental-badge">EXPERIMENTAL</span></h1>
            <div class="nav-buttons">
                <a href="/blog" class="btn btn-secondary" target="_blank">View Blog</a>
                <a href="/admin/dashboard" class="btn btn-secondary">URL Dashboard</a>
                <button class="btn btn-success" onclick="showCreateForm()">+ New Post</button>
                <a href="/admin" class="btn btn-danger" onclick="logout()">Logout</a>
            </div>
        </div>

        <div class="stats" id="blogStats">
            <div class="stat-card">
                <div class="stat-number" id="totalPosts">0</div>
                <div class="stat-label">Total Posts</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="publishedPosts">0</div>
                <div class="stat-label">Published</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="totalViews">0</div>
                <div class="stat-label">Total Views</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="avgViews">0</div>
                <div class="stat-label">Avg Views/Post</div>
            </div>
        </div>

        <!-- Create/Edit Post Form -->
        <div class="container" id="postForm" style="display: none;">
            <h2 id="formTitle">Create New Blog Post</h2>
            <form id="blogForm">
                <input type="hidden" id="postId" name="postId">
                <div class="form-group">
                    <label for="title">Post Title:</label>
                    <input type="text" id="title" name="title" required>
                </div>
                <div class="form-group">
                    <label for="content">Content (HTML allowed):</label>
                    <textarea id="content" name="content" required placeholder="Write your blog post content here. HTML tags are supported."></textarea>
                </div>
                <div class="form-group">
                    <label for="author">Author:</label>
                    <input type="text" id="author" name="author" value="Admin" required>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="published" name="published"> Publish immediately
                    </label>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button type="submit" class="btn btn-primary">Save Post</button>
                    <button type="button" class="btn btn-secondary" onclick="hideForm()">Cancel</button>
                </div>
            </form>
        </div>

        <!-- Posts List -->
        <div class="container">
            <h2>Blog Posts</h2>
            <table id="postsTable">
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
                <tbody id="postsTableBody">
                    <tr>
                        <td colspan="6" class="no-data">Loading...</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <script>
            let blogPosts = {};
            let blogAnalytics = {};

            // Check if user is authenticated
            function checkAuth() {
                const token = localStorage.getItem('adminToken');
                if (!token) {
                    window.location.href = '/admin';
                    return false;
                }
                return token;
            }

            // Load blog posts and analytics
            async function loadPosts() {
                const token = checkAuth();
                if (!token) return;

                try {
                    const [postsResponse, analyticsResponse] = await Promise.all([
                        fetch('/admin/api/blog/posts', {
                            headers: { 'Authorization': 'Bearer ' + token }
                        }),
                        fetch('/admin/api/blog/analytics', {
                            headers: { 'Authorization': 'Bearer ' + token }
                        })
                    ]);

                    if (postsResponse.ok && analyticsResponse.ok) {
                        blogPosts = await postsResponse.json();
                        blogAnalytics = await analyticsResponse.json();
                        displayPosts();
                        updateStats();
                    } else if (postsResponse.status === 401 || analyticsResponse.status === 401) {
                        logout();
                    } else {
                        alert('Failed to load blog data');
                    }
                } catch (error) {
                    alert('Error loading blog data: ' + error.message);
                }
            }

            // Display posts in table
            function displayPosts() {
                const tbody = document.getElementById('postsTableBody');
                
                if (Object.keys(blogPosts).length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="no-data">No blog posts found</td></tr>';
                    return;
                }

                tbody.innerHTML = '';
                for (const [id, post] of Object.entries(blogPosts)) {
                    const row = tbody.insertRow();
                    const analytics = blogAnalytics[id] || { views: 0 };
                    
                    row.innerHTML = \`
                        <td><span class="post-title">\${post.title}</span></td>
                        <td>\${post.author}</td>
                        <td><span class="post-status \${post.published ? 'status-published' : 'status-draft'}">\${post.published ? 'Published' : 'Draft'}</span></td>
                        <td><strong>\${analytics.views}</strong></td>
                        <td>\${new Date(post.createdAt).toLocaleDateString()}</td>
                        <td class="actions">
                            <button class="btn btn-primary" onclick="editPost('\${id}')">Edit</button>
                            <button class="btn btn-secondary" onclick="viewPost('\${post.slug}')" \${!post.published ? 'disabled' : ''}>View</button>
                            <button class="btn btn-secondary" onclick="previewPost('\${post.slug}')" \${!post.published ? 'disabled' : ''}>Analytics</button>
                            <button class="btn btn-danger" onclick="deletePost('\${id}')">Delete</button>
                        </td>
                    \`;
                }
            }

            // Update blog statistics
            function updateStats() {
                const totalPosts = Object.keys(blogPosts).length;
                const publishedPosts = Object.values(blogPosts).filter(p => p.published).length;
                const totalViews = Object.values(blogAnalytics).reduce((sum, analytics) => sum + analytics.views, 0);
                const avgViews = publishedPosts > 0 ? Math.round(totalViews / publishedPosts * 10) / 10 : 0;
                
                document.getElementById('totalPosts').textContent = totalPosts;
                document.getElementById('publishedPosts').textContent = publishedPosts;
                document.getElementById('totalViews').textContent = totalViews;
                document.getElementById('avgViews').textContent = avgViews;
            }

            // Show create form
            function showCreateForm() {
                document.getElementById('formTitle').textContent = 'Create New Blog Post';
                document.getElementById('blogForm').reset();
                document.getElementById('postId').value = '';
                document.getElementById('postForm').style.display = 'block';
                document.getElementById('title').focus();
            }

            // Hide form
            function hideForm() {
                document.getElementById('postForm').style.display = 'none';
            }

            // Edit post
            function editPost(postId) {
                const post = blogPosts[postId];
                if (!post) return;

                document.getElementById('formTitle').textContent = 'Edit Blog Post';
                document.getElementById('postId').value = postId;
                document.getElementById('title').value = post.title;
                document.getElementById('content').value = post.content;
                document.getElementById('author').value = post.author;
                document.getElementById('published').checked = post.published;
                document.getElementById('postForm').style.display = 'block';
                document.getElementById('title').focus();
            }

            // View post
            function viewPost(slug) {
                window.open('/blog/' + slug, '_blank');
            }

            // Preview post analytics
            function previewPost(slug) {
                window.open('/blog/preview/' + slug, '_blank');
            }

            // Delete post
            async function deletePost(postId) {
                const post = blogPosts[postId];
                if (!confirm(\`Are you sure you want to delete the post "\${post.title}"?\`)) {
                    return;
                }

                const token = checkAuth();
                if (!token) return;

                try {
                    const response = await fetch('/admin/api/blog/posts/' + postId, {
                        method: 'DELETE',
                        headers: { 'Authorization': 'Bearer ' + token }
                    });

                    if (response.ok) {
                        loadPosts(); // Reload the list
                    } else if (response.status === 401) {
                        logout();
                    } else {
                        alert('Failed to delete post');
                    }
                } catch (error) {
                    alert('Error deleting post: ' + error.message);
                }
            }

            // Submit form
            document.getElementById('blogForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const token = checkAuth();
                if (!token) return;

                const formData = new FormData(e.target);
                const postData = {
                    title: formData.get('title'),
                    content: formData.get('content'),
                    author: formData.get('author'),
                    published: formData.get('published') === 'on'
                };

                const postId = formData.get('postId');
                const method = postId ? 'PUT' : 'POST';
                const url = postId ? '/admin/api/blog/posts/' + postId : '/admin/api/blog/posts';

                try {
                    const response = await fetch(url, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify(postData)
                    });

                    if (response.ok) {
                        hideForm();
                        loadPosts();
                        alert(postId ? 'Post updated successfully!' : 'Post created successfully!');
                    } else if (response.status === 401) {
                        logout();
                    } else {
                        alert('Failed to save post');
                    }
                } catch (error) {
                    alert('Error saving post: ' + error.message);
                }
            });

            // Logout function
            function logout() {
                localStorage.removeItem('adminToken');
                window.location.href = '/admin';
            }

            // Load posts when page loads
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