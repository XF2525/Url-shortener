# URL Shortener

A simple URL shortener built with Node.js and Express that allows you to create short URLs for long links.

## Features

- ✨ Clean, responsive web interface
- 🔗 Generate short URLs from long URLs
- 🚀 Instant redirection to original URLs
- 📋 Copy-to-clipboard functionality
- ✅ URL validation
- 🔄 Duplicate URL detection (returns existing short code)
- 📱 Mobile-friendly design
- 🎯 8-page redirection feature with analytics
- 🔒 Enhanced security with XSS protection
- 📊 Admin dashboard with real-time analytics
- 🏥 Health monitoring and status endpoints

## Quick Start

### Prerequisites
- Node.js 14+ and npm 6+
- Optional: Docker and Docker Compose for containerized deployment

### 1. Installation
```bash
git clone https://github.com/XF2525/Url-shortener.git
cd Url-shortener
npm install
```

### 2. Development
```bash
npm run dev
# Visit http://localhost:3000
```

### 3. Production Deployment

#### Option A: Local Deployment (Recommended)
```bash
# Automated deployment with our deployment script
./deploy.sh local

# Or manually:
npm run deploy:local
```

#### Option B: Docker Deployment
```bash
# Using deployment script
./deploy.sh docker

# Or manually:
npm run deploy:docker
```

#### Option C: Docker Compose (Full Stack)
```bash
# Using deployment script (includes nginx reverse proxy)
./deploy.sh docker-compose

# Or manually:
docker-compose up -d
```

## 🚀 Deployment Script

We provide a comprehensive deployment script (`deploy.sh`) that handles:

- ✅ Environment validation
- 📦 Dependency installation
- 🔍 Code validation and testing
- 🏗️ Production builds
- 🚀 Application startup
- 🏥 Health checks
- 🐳 Docker deployments

### Usage Examples:

```bash
# Local deployment (default)
./deploy.sh

# Docker deployment
./deploy.sh docker

# Docker Compose with nginx
./deploy.sh docker-compose

# Stop the application
./deploy.sh stop
```

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the application in production mode |
| `npm run dev` | Start in development mode |
| `npm run prod` | Start in production mode with NODE_ENV=production |
| `npm run build` | Install production dependencies |
| `npm test` | Run tests |
| `npm run lint` | Validate code syntax |
| `npm run validate` | Run both linting and tests |
| `npm run deploy:local` | Build and deploy locally |
| `npm run deploy:docker` | Build and deploy with Docker |
| `npm run health-check` | Check application health |
| `npm run clean` | Clean dependencies and lock files |
| `npm run reinstall` | Clean and reinstall dependencies |

## 🏥 Health Monitoring

The application includes built-in health monitoring:

- **Health Check Endpoint**: `GET /health`
- **Returns**: Application status, uptime, memory usage, version
- **Docker Integration**: Automatic health checks in containerized deployments
- **Nginx Integration**: Health checks through reverse proxy

Example health check response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600.123,
  "memory": {
    "rss": 50331648,
    "heapTotal": 20971520,
    "heapUsed": 18874368,
    "external": 1331072,
    "arrayBuffers": 9898
  },
  "version": "1.0.0",
  "environment": "production"
}
```

## 🐳 Docker Deployment

### Single Container
```bash
docker build -t url-shortener .
docker run -p 3000:3000 url-shortener
```

### Production with Docker Compose
The `docker-compose.yml` includes:
- Main application container
- Nginx reverse proxy (optional)
- Health checks
- Volume management
- Network isolation

```bash
# Start all services
docker-compose up -d

# Start without nginx (just the app)
docker-compose up -d url-shortener

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Usage

### Web Interface
1. Open `http://localhost:3000` in your browser
2. Enter a long URL in the input field
3. Click "Shorten URL"
4. Copy the generated short URL
5. Use the short URL to redirect to the original URL

### Admin Dashboard
- Access: `http://localhost:3000/admin`
- Features: Real-time analytics, URL management, system monitoring
- Default login: (configured in application)

### API Endpoints

#### POST /shorten
Create a short URL from a long URL.

**Request:**
```json
{
  "originalUrl": "https://www.example.com"
}
```

**Response:**
```json
{
  "shortCode": "abc123",
  "originalUrl": "https://www.example.com"
}
```

#### GET /:shortCode
Redirect to the original URL using the short code.

**Example:** `http://localhost:3000/abc123` → redirects to `https://www.example.com`

#### GET /health
Get application health status.

#### GET /admin/api/analytics
Get analytics data (requires authentication).

## 🔒 Security Features

- **XSS Protection**: Input validation and output escaping
- **Rate Limiting**: API endpoint protection
- **HTTPS Support**: SSL/TLS configuration with nginx
- **Security Headers**: Comprehensive HTTP security headers
- **Input Validation**: Parameter validation for all routes
- **Container Security**: Non-root user in Docker containers

## 🌐 Production Considerations

### Environment Variables
- `NODE_ENV`: Set to `production` for production deployment
- `PORT`: Application port (default: 3000)

### Performance Optimization
- Nginx reverse proxy for static content caching
- Rate limiting for API protection
- Memory optimization and cleanup
- Connection pooling and keep-alive

### Monitoring
- Health check endpoints for load balancers
- Application metrics and analytics
- Log management and rotation
- Resource usage monitoring

## Technical Details

- **Framework:** Express.js
- **Storage:** In-memory (URLs are lost when server restarts)
- **Short Code Generation:** Random 6-character alphanumeric strings
- **Port:** 3000 (configurable via PORT environment variable)
- **Node.js Version:** 14+ required

## Example

```bash
# Create a short URL
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://www.google.com"}'

# Response: {"shortCode":"sH5sgc","originalUrl":"https://www.google.com"}

# Use the short URL
curl -I http://localhost:3000/sH5sgc
# Redirects to https://www.google.com

# Check application health
curl http://localhost:3000/health
```

## Development

### Local Development
```bash
npm run dev
```

### Testing
```bash
npm test
npm run validate  # Run linting and tests
```

### Code Quality
The project includes:
- Syntax validation
- Security enhancements
- Performance optimizations
- Error handling
- Memory management

## License

ISC

## Support

For issues and questions:
- Check the health endpoint: `/health`
- Review application logs
- Use the deployment script for automated setup
- Check Docker container logs: `docker-compose logs -f`