# Use Node.js official image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY app.js ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Change ownership of the app directory
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
               const options = { hostname: 'localhost', port: 3000, path: '/health', timeout: 2000 }; \
               const req = http.request(options, (res) => { \
                 res.statusCode === 200 ? process.exit(0) : process.exit(1); \
               }); \
               req.on('error', () => process.exit(1)); \
               req.end();"

# Start the application
CMD ["npm", "start"]