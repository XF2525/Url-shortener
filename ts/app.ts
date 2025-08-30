/**
 * Advanced TypeScript URL Shortener Application
 * Enhanced with quantum-powered aura features and experimental capabilities
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { CONFIG } from './config/constants';
import AdvancedTypeScriptController from './controllers/AdvancedController';

// Initialize Express application
const app: Express = express();
const PORT: number = CONFIG.PORT;

// Initialize the advanced TypeScript controller
const advancedController = new AdvancedTypeScriptController();

// Middleware configuration
app.use(express.json({ limit: CONFIG.SECURITY.JSON_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: CONFIG.SECURITY.JSON_LIMIT }));

// Security headers middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // Enhanced security headers with quantum signatures
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  
  // Custom TypeScript aura headers
  Object.entries(CONFIG.SECURITY.ADVANCED_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // Quantum enhancement header
  if (CONFIG.EXPERIMENTAL.enableQuantumFeatures) {
    res.setHeader('X-Quantum-Enhanced', 'true');
    res.setHeader('X-Quantum-Coherence-Level', '95%');
  }
  
  // Cosmic resonance header
  if (CONFIG.EXPERIMENTAL.enableCosmicResonance) {
    res.setHeader('X-Cosmic-Resonance', 'aligned');
    res.setHeader('X-Universal-Harmony', '92%');
  }
  
  next();
});

// Rate limiting middleware (simplified for TypeScript)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

app.use((req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = CONFIG.SECURITY.rateLimiting.windowMs;
  const maxRequests = CONFIG.SECURITY.rateLimiting.maxRequests;
  
  let clientData = rateLimitStore.get(clientIP);
  
  if (!clientData || now > clientData.resetTime) {
    clientData = { count: 0, resetTime: now + windowMs };
    rateLimitStore.set(clientIP, clientData);
  }
  
  clientData.count++;
  
  if (clientData.count > maxRequests) {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
      timestamp: new Date(),
      version: CONFIG.VERSION
    });
    return;
  }
  
  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - clientData.count).toString());
  res.setHeader('X-RateLimit-Reset', new Date(clientData.resetTime).toISOString());
  
  next();
});

// Trust proxy for proper IP detection
app.set('trust proxy', true);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const healthData = {
    status: 'healthy',
    version: CONFIG.VERSION,
    environment: CONFIG.ENVIRONMENT,
    timestamp: new Date(),
    features: {
      auraFeatures: CONFIG.AURA.enabled,
      blogViews: CONFIG.AURA.BLOG_VIEWS.enabled,
      superiorPowers: CONFIG.AURA.SUPERIOR_POWERS.enabled,
      quantumFeatures: CONFIG.EXPERIMENTAL.enableQuantumFeatures,
      cosmicResonance: CONFIG.EXPERIMENTAL.enableCosmicResonance,
      multidimensionalAnalytics: CONFIG.EXPERIMENTAL.enableMultidimensionalAnalytics
    },
    performance: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    }
  };
  
  res.json({
    success: true,
    data: healthData,
    message: 'TypeScript URL Shortener with Advanced Aura Features is operational',
    timestamp: new Date(),
    version: CONFIG.VERSION
  });
});

// TypeScript enhanced routes
app.get('/ts', (req: Request, res: Response) => {
  const welcomeHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TypeScript Advanced Aura Features</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
            }
            .title {
                font-size: 3em;
                margin-bottom: 10px;
                background: linear-gradient(45deg, #FFD700, #FFA500);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .subtitle {
                font-size: 1.2em;
                opacity: 0.9;
            }
            .features-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin: 40px 0;
            }
            .feature-card {
                background: rgba(255, 255, 255, 0.15);
                padding: 30px;
                border-radius: 15px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            .feature-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 12px 40px rgba(31, 38, 135, 0.5);
            }
            .feature-title {
                font-size: 1.4em;
                margin-bottom: 15px;
                color: #FFD700;
            }
            .feature-description {
                opacity: 0.9;
                margin-bottom: 20px;
            }
            .api-section {
                margin-top: 40px;
                padding: 30px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 15px;
            }
            .endpoint {
                background: rgba(255, 255, 255, 0.1);
                padding: 15px;
                margin: 10px 0;
                border-radius: 8px;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            }
            .status-indicators {
                display: flex;
                justify-content: space-around;
                margin: 30px 0;
                flex-wrap: wrap;
            }
            .status-indicator {
                text-align: center;
                padding: 15px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                margin: 5px;
                min-width: 150px;
            }
            .status-value {
                font-size: 1.5em;
                font-weight: bold;
                color: #00FF88;
            }
            .quantum-aura {
                animation: quantumPulse 3s ease-in-out infinite;
            }
            @keyframes quantumPulse {
                0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.3); }
                50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.6); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="title quantum-aura">🚀 TypeScript Advanced Aura Features</h1>
                <p class="subtitle">Quantum-Enhanced URL Shortener with Superior Powers & Experimental Capabilities</p>
            </div>
            
            <div class="status-indicators">
                <div class="status-indicator">
                    <div class="status-value">${CONFIG.VERSION}</div>
                    <div>Version</div>
                </div>
                <div class="status-indicator">
                    <div class="status-value">${CONFIG.EXPERIMENTAL.enableQuantumFeatures ? '✅' : '❌'}</div>
                    <div>Quantum Features</div>
                </div>
                <div class="status-indicator">
                    <div class="status-value">${CONFIG.EXPERIMENTAL.enableCosmicResonance ? '🌟' : '⭐'}</div>
                    <div>Cosmic Resonance</div>
                </div>
                <div class="status-indicator">
                    <div class="status-value">${CONFIG.AURA.SUPERIOR_POWERS.enabled ? '⚡' : '🔌'}</div>
                    <div>Superior Powers</div>
                </div>
            </div>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-title">🧠 Blog Views Generation</div>
                    <div class="feature-description">
                        Advanced blog view simulation with quantum-enhanced reading patterns, 
                        cosmic timing, and multidimensional behavioral modeling.
                    </div>
                    <div class="endpoint">POST /ts/api/blog-views/generate</div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-title">⚡ Superior Powers Aura</div>
                    <div class="feature-description">
                        Neural network powered aura generation with reality manipulation, 
                        quantum algorithms, and cosmic harmonization.
                    </div>
                    <div class="endpoint">POST /ts/api/superior-powers/generate</div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-title">🔮 Quantum Hybrid Content</div>
                    <div class="feature-description">
                        Experimental quantum superposition content generation with 
                        multidimensional analytics and reality anchoring.
                    </div>
                    <div class="endpoint">POST /ts/api/quantum-hybrid/generate</div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-title">🌌 Cosmic Enhanced Content</div>
                    <div class="feature-description">
                        Planetary alignment based content with lunar phase enhancement, 
                        solar activity modulation, and universal harmony.
                    </div>
                    <div class="endpoint">POST /ts/api/cosmic-enhanced/generate</div>
                </div>
            </div>
            
            <div class="api-section">
                <h2>🛠️ API Endpoints</h2>
                <div class="endpoint">GET  /ts/api/status - System status and metrics</div>
                <div class="endpoint">POST /ts/api/blog-views/generate - Generate advanced blog views</div>
                <div class="endpoint">POST /ts/api/superior-powers/generate - Generate Superior Powers aura</div>
                <div class="endpoint">POST /ts/api/quantum-hybrid/generate - Generate quantum hybrid content</div>
                <div class="endpoint">POST /ts/api/cosmic-enhanced/generate - Generate cosmic enhanced content</div>
            </div>
            
            <div style="text-align: center; margin-top: 40px; opacity: 0.8;">
                <p>🌟 Powered by Advanced TypeScript Architecture 🌟</p>
                <p>Quantum-Enhanced • Cosmic-Aligned • Reality-Anchored</p>
            </div>
        </div>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(welcomeHTML);
});

// Advanced TypeScript API Routes
app.get('/ts/api/status', (req: Request, res: Response) => {
  advancedController.getSystemStatus(req, res);
});

app.post('/ts/api/blog-views/generate', (req: Request, res: Response) => {
  advancedController.generateAdvancedBlogViews(req, res);
});

app.post('/ts/api/superior-powers/generate', (req: Request, res: Response) => {
  advancedController.generateSuperiorPowersAura(req, res);
});

app.post('/ts/api/quantum-hybrid/generate', (req: Request, res: Response) => {
  advancedController.generateQuantumHybridContent(req, res);
});

app.post('/ts/api/cosmic-enhanced/generate', (req: Request, res: Response) => {
  advancedController.generateCosmicEnhancedContent(req, res);
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist in the TypeScript enhanced system',
    timestamp: new Date(),
    version: CONFIG.VERSION,
    availableEndpoints: [
      'GET /ts - TypeScript features overview',
      'GET /ts/api/status - System status',
      'POST /ts/api/blog-views/generate - Blog views generation',
      'POST /ts/api/superior-powers/generate - Superior Powers aura',
      'POST /ts/api/quantum-hybrid/generate - Quantum hybrid content',
      'POST /ts/api/cosmic-enhanced/generate - Cosmic enhanced content'
    ]
  });
});

// Error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[TS-APP] Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: CONFIG.ENVIRONMENT === 'development' ? error.message : 'An unexpected error occurred',
    timestamp: new Date(),
    version: CONFIG.VERSION
  });
});

// Start the server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 TypeScript Advanced Aura Features Server Started');
  console.log('================================================');
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`📋 Environment: ${CONFIG.ENVIRONMENT}`);
  console.log(`📦 Version: ${CONFIG.VERSION}`);
  console.log('');
  console.log('✨ Advanced Features Status:');
  console.log(`   🧠 Blog Views Generation: ${CONFIG.AURA.BLOG_VIEWS.enabled ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   ⚡ Superior Powers: ${CONFIG.AURA.SUPERIOR_POWERS.enabled ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   🔮 Quantum Features: ${CONFIG.EXPERIMENTAL.enableQuantumFeatures ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   🌌 Cosmic Resonance: ${CONFIG.EXPERIMENTAL.enableCosmicResonance ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   📊 Multidimensional Analytics: ${CONFIG.EXPERIMENTAL.enableMultidimensionalAnalytics ? '✅ Enabled' : '❌ Disabled'}`);
  console.log('');
  console.log('🛠️ Available Endpoints:');
  console.log('   GET  /ts - TypeScript features overview');
  console.log('   GET  /ts/api/status - System status and metrics');
  console.log('   POST /ts/api/blog-views/generate - Advanced blog views');
  console.log('   POST /ts/api/superior-powers/generate - Superior Powers aura');
  console.log('   POST /ts/api/quantum-hybrid/generate - Quantum hybrid content');
  console.log('   POST /ts/api/cosmic-enhanced/generate - Cosmic enhanced content');
  console.log('');
  console.log('🌟 TypeScript system fully operational with quantum enhancement! 🌟');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, gracefully shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, gracefully shutting down...');
  process.exit(0);
});

export default app;