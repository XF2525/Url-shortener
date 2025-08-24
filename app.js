const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for URL mappings
const urlDatabase = {};

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
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                color: #555;
            }
            input[type="url"] {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 5px;
                font-size: 16px;
                box-sizing: border-box;
            }
            input[type="url"]:focus {
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
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔗 URL Shortener</h1>
            <form id="urlForm">
                <div class="form-group">
                    <label for="originalUrl">Enter URL to shorten:</label>
                    <input type="url" id="originalUrl" name="originalUrl" placeholder="https://example.com" required>
                </div>
                <button type="submit">Shorten URL</button>
            </form>
            <div id="result" class="result">
                <p>Short URL: <span id="shortUrl" class="short-url"></span></p>
                <button onclick="copyToClipboard()">Copy to Clipboard</button>
            </div>
        </div>

        <script>
            document.getElementById('urlForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const originalUrl = document.getElementById('originalUrl').value;
                
                try {
                    const response = await fetch('/shorten', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ originalUrl })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        const shortUrl = window.location.origin + '/' + data.shortCode;
                        document.getElementById('shortUrl').textContent = shortUrl;
                        document.getElementById('result').style.display = 'block';
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
        </script>
    </body>
    </html>
  `);
});

// Shorten URL endpoint
app.post('/shorten', (req, res) => {
  const { originalUrl } = req.body;
  
  // Validate URL
  if (!originalUrl || !isValidUrl(originalUrl)) {
    return res.status(400).json({ error: 'Please provide a valid URL' });
  }
  
  // Check if URL already exists
  for (const [shortCode, url] of Object.entries(urlDatabase)) {
    if (url === originalUrl) {
      return res.json({ shortCode, originalUrl });
    }
  }
  
  // Generate unique short code
  let shortCode;
  do {
    shortCode = generateShortCode();
  } while (urlDatabase[shortCode]);
  
  // Store the mapping
  urlDatabase[shortCode] = originalUrl;
  
  res.json({ shortCode, originalUrl });
});

// Admin login page
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
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="urlsTableBody">
                    <tr>
                        <td colspan="4" class="no-data">Loading...</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <script>
            let urlsData = {};

            // Check if user is authenticated
            function checkAuth() {
                const token = localStorage.getItem('adminToken');
                if (!token) {
                    window.location.href = '/admin';
                    return false;
                }
                return token;
            }

            // Load URLs from server
            async function loadUrls() {
                const token = checkAuth();
                if (!token) return;

                try {
                    const response = await fetch('/admin/api/urls', {
                        headers: {
                            'Authorization': 'Bearer ' + token
                        }
                    });

                    if (response.ok) {
                        urlsData = await response.json();
                        displayUrls(urlsData);
                        updateStats();
                    } else if (response.status === 401) {
                        logout();
                    } else {
                        alert('Failed to load URLs');
                    }
                } catch (error) {
                    alert('Error loading URLs: ' + error.message);
                }
            }

            // Display URLs in table
            function displayUrls(urls) {
                const tbody = document.getElementById('urlsTableBody');
                
                if (Object.keys(urls).length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="no-data">No URLs found</td></tr>';
                    return;
                }

                tbody.innerHTML = '';
                for (const [shortCode, originalUrl] of Object.entries(urls)) {
                    const row = tbody.insertRow();
                    const shortUrl = window.location.origin + '/' + shortCode;
                    
                    row.innerHTML = \`
                        <td><span class="short-code">\${shortCode}</span></td>
                        <td class="url-cell">\${originalUrl}</td>
                        <td class="url-cell">\${shortUrl}</td>
                        <td>
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

                displayUrls(filteredUrls);
            }

            // Delete URL
            async function deleteUrl(shortCode) {
                if (!confirm('Are you sure you want to delete this URL?')) {
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
                document.getElementById('totalUrls').textContent = Object.keys(urlsData).length;
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
    res.json({ message: 'URL deleted successfully' });
  } else {
    res.status(404).json({ error: 'Short code not found' });
  }
});

// Redirect endpoint
app.get('/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  const originalUrl = urlDatabase[shortCode];
  
  if (originalUrl) {
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