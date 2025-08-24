const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for URL mappings
const urlDatabase = {};

// In-memory storage for URL analytics
const urlAnalytics = {};

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