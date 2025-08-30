/**
 * HTML Template utilities for generating views
 */

const { cacheUtils } = require('../utils/cache');
const { CONFIG } = require('../config/constants');

const templateUtils = {
  /**
   * Common HTML components for reusability
   */
  components: {
    /**
     * Standard navigation component
     * @param {string} currentPage - Current page identifier
     * @returns {string} Navigation HTML
     */
    navigation(currentPage = '') {
      return `
        <nav class="navbar">
          <div class="nav-brand">
            <h2>🔗 URL Shortener</h2>
          </div>
          <div class="nav-links">
            <a href="/" class="${currentPage === 'home' ? 'active' : ''}">Home</a>
            <a href="/admin" class="${currentPage === 'admin' ? 'active' : ''}">Admin</a>
            <a href="/health" class="${currentPage === 'health' ? 'active' : ''}">Health</a>
          </div>
        </nav>
      `;
    },

    /**
     * Experimental badge component
     * @param {string} text - Badge text
     * @returns {string} Badge HTML
     */
    experimentalBadge(text = 'EXPERIMENTAL') {
      const escapeHtml = require('../utils/validation').sanitizeInput;
      return `<span class="experimental-badge">${escapeHtml(text)}</span>`;
    },

    /**
     * Loading spinner component
     * @param {string} text - Loading text
     * @returns {string} Spinner HTML
     */
    loadingSpinner(text = 'Loading...') {
      const escapeHtml = require('../utils/validation').sanitizeInput;
      return `
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>${escapeHtml(text)}</p>
        </div>
      `;
    },

    /**
     * Standard button component
     * @param {string} text - Button text
     * @param {string} onclick - Click handler (must be safe/validated)
     * @param {string} className - CSS class
     * @param {boolean} disabled - Whether button is disabled
     * @returns {string} Button HTML
     */
    button(text, onclick, className = 'btn-primary', disabled = false) {
      const escapeHtml = require('../utils/validation').sanitizeInput;
      // Note: onclick handlers should be validated/sanitized by the caller
      // as they contain JavaScript code that needs to be functional
      return `
        <button 
          class="btn ${escapeHtml(className)}" 
          onclick="${onclick}"
          ${disabled ? 'disabled' : ''}
        >
          ${escapeHtml(text)}
        </button>
      `;
    },

    /**
     * Form group component
     * @param {string} label - Field label
     * @param {string} input - Input HTML (should already be safe)
     * @param {string} helpText - Help text
     * @returns {string} Form group HTML
     */
    formGroup(label, input, helpText = '') {
      const escapeHtml = require('../utils/validation').sanitizeInput;
      return `
        <div class="form-group">
          <label>${escapeHtml(label)}</label>
          ${input}
          ${helpText ? `<small class="help-text">${escapeHtml(helpText)}</small>` : ''}
        </div>
      `;
    }
  },

  /**
   * Optimized template generation with caching
   * @param {string} title - Page title
   * @param {string} content - Page content
   * @param {string} additionalCSS - Additional CSS
   * @param {string} additionalJS - Additional JavaScript
   * @param {boolean} useNav - Whether to include navigation
   * @param {string} currentPage - Current page for navigation
   * @returns {string} Complete HTML page
   */
  generateHTML(title, content, additionalCSS = '', additionalJS = '', useNav = false, currentPage = '') {
    const cacheKey = `template_${title}_${useNav}_${currentPage}`;
    
    // Check template cache
    let cachedTemplate = cacheUtils.get('templates', cacheKey, CONFIG.CACHE_DURATIONS.HTML_TEMPLATES);
    if (cachedTemplate && !additionalCSS && !additionalJS) {
      return cachedTemplate.replace('{{CONTENT}}', content);
    }

    const template = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
              ${this.getOptimizedCSS()}
              ${additionalCSS}
          </style>
      </head>
      <body>
          ${useNav ? this.components.navigation(currentPage) : ''}
          {{CONTENT}}
          <script>
              ${this.getOptimizedJS()}
              ${additionalJS}
          </script>
      </body>
      </html>
    `;

    // Cache base template
    if (!additionalCSS && !additionalJS) {
      cacheUtils.set('templates', cacheKey, template);
    }

    return template.replace('{{CONTENT}}', content);
  },

  /**
   * Optimized CSS with better organization and compression
   * @returns {string} CSS styles
   */
  getOptimizedCSS() {
    // Check static content cache
    const cached = cacheUtils.get('staticContent', 'commonCSS');
    if (cached) return cached;

    const css = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6; color: #333; background: #f5f5f5;
      }
      
      .container { max-width: 800px; margin: 0 auto; padding: 20px; }
      .card { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
      
      .navbar { background: #2c3e50; color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
      .nav-brand h2 { margin: 0; }
      .nav-links a { color: white; text-decoration: none; margin-left: 20px; padding: 8px 16px; border-radius: 4px; transition: background 0.3s; }
      .nav-links a:hover, .nav-links a.active { background: rgba(255,255,255,0.2); }
      
      h1, h2, h3 { color: #2c3e50; margin-bottom: 20px; }
      .form-group { margin-bottom: 20px; }
      label { display: block; margin-bottom: 5px; font-weight: 500; }
      input, textarea, select { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
      
      .btn { padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: 500; text-decoration: none; display: inline-block; text-align: center; transition: all 0.3s; }
      .btn-primary { background: #3498db; color: white; }
      .btn-primary:hover { background: #2980b9; }
      .btn-success { background: #27ae60; color: white; }
      .btn-success:hover { background: #229954; }
      .btn-danger { background: #e74c3c; color: white; }
      .btn-danger:hover { background: #c0392b; }
      .btn:disabled { opacity: 0.6; cursor: not-allowed; }
      
      .result { margin-top: 20px; padding: 15px; border-radius: 4px; }
      .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
      .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
      
      .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
      .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
      .stat-number { font-size: 2em; font-weight: bold; color: #3498db; }
      .stat-label { color: #7f8c8d; margin-top: 5px; }
      
      .loading-spinner { text-align: center; padding: 40px; }
      .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      
      .experimental-badge { background: #e67e22; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
      .help-text { color: #7f8c8d; font-size: 14px; margin-top: 5px; }
      
      @media (max-width: 768px) {
        .container { padding: 10px; }
        .card { padding: 20px; }
        .navbar { flex-direction: column; gap: 10px; }
        .nav-links { display: flex; gap: 10px; }
        .stats-grid { grid-template-columns: 1fr; }
      }
    `;
    
    cacheUtils.set('staticContent', 'commonCSS', css);
    return css;
  },

  /**
   * Optimized JavaScript with common utilities
   * @returns {string} JavaScript code
   */
  getOptimizedJS() {
    // Check static content cache
    const cached = cacheUtils.get('staticContent', 'commonJS');
    if (cached) return cached;

    const js = `
      // Utility functions
      function copyToClipboard(text) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => {
            showMessage('Copied to clipboard!', 'success');
          }).catch(() => {
            fallbackCopyToClipboard(text);
          });
        } else {
          fallbackCopyToClipboard(text);
        }
      }
      
      function fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          showMessage('Copied to clipboard!', 'success');
        } catch (err) {
          showMessage('Failed to copy', 'error');
        }
        document.body.removeChild(textArea);
      }
      
      function showMessage(message, type = 'success') {
        const existing = document.querySelector('.message');
        if (existing) existing.remove();
        
        const div = document.createElement('div');
        div.className = \`message \${type}\`;
        div.textContent = message;
        div.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:4px;z-index:1000;';
        document.body.appendChild(div);
        
        setTimeout(() => div.remove(), 3000);
      }
      
      function makeRequest(url, options = {}) {
        return fetch(url, {
          headers: { 'Content-Type': 'application/json', ...options.headers },
          ...options
        }).then(response => {
          if (!response.ok) {
            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
          }
          return response.json();
        });
      }
    `;
    
    cacheUtils.set('staticContent', 'commonJS', js);
    return js;
  }
};

module.exports = templateUtils;