#!/bin/bash

# URL Shortener Deployment Script
# This script handles building and deploying the URL shortener application

set -e  # Exit on any error

echo "🚀 URL Shortener Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 14+ to continue."
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_success "Node.js detected: $NODE_VERSION"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm to continue."
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    print_success "npm detected: $NPM_VERSION"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed successfully"
}

# Run linting/validation
validate_code() {
    print_status "Validating code..."
    npm run lint
    print_success "Code validation passed"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    npm test
    if [ $? -eq 0 ]; then
        print_success "All tests passed"
    else
        print_warning "Some tests failed, but continuing with deployment"
    fi
}

# Build for production
build_production() {
    print_status "Building for production..."
    npm run build
    print_success "Production build completed"
}

# Start the application
start_application() {
    print_status "Starting URL Shortener application..."
    
    # Check if port 3000 is already in use
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port 3000 is already in use. Stopping existing process..."
        pkill -f "node app.js" || true
        sleep 2
    fi
    
    # Start the application in background
    NODE_ENV=production npm start &
    APP_PID=$!
    
    # Wait a moment for the app to start
    sleep 3
    
    # Check if the application is running
    if kill -0 $APP_PID 2>/dev/null; then
        print_success "Application started successfully (PID: $APP_PID)"
        echo $APP_PID > .app.pid
    else
        print_error "Failed to start application"
        exit 1
    fi
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    # Wait for application to be ready
    sleep 2
    
    # Perform health check
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        print_success "Health check passed - Application is running correctly"
        print_success "🌐 URL Shortener is available at: http://localhost:3000"
    else
        print_error "Health check failed - Application may not be responding"
        exit 1
    fi
}

# Docker deployment
deploy_docker() {
    print_status "Building and deploying with Docker..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker to use container deployment."
        exit 1
    fi
    
    # Build Docker image
    docker build -t url-shortener .
    print_success "Docker image built successfully"
    
    # Stop existing container if running
    docker stop url-shortener-container 2>/dev/null || true
    docker rm url-shortener-container 2>/dev/null || true
    
    # Run new container
    docker run -d --name url-shortener-container -p 3000:3000 url-shortener
    print_success "Docker container started successfully"
    
    # Health check for Docker
    sleep 5
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        print_success "Docker deployment health check passed"
        print_success "🐳 Dockerized URL Shortener is available at: http://localhost:3000"
    else
        print_error "Docker deployment health check failed"
        exit 1
    fi
}

# Docker Compose deployment
deploy_docker_compose() {
    print_status "Deploying with Docker Compose..."
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose to use this deployment method."
        exit 1
    fi
    
    # Stop existing services
    docker-compose down 2>/dev/null || true
    
    # Start services
    docker-compose up -d
    print_success "Docker Compose services started successfully"
    
    # Health check
    sleep 10
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        print_success "Docker Compose deployment health check passed"
        print_success "🐳 URL Shortener is available at: http://localhost:3000"
    else
        print_error "Docker Compose deployment health check failed"
        exit 1
    fi
}

# Main deployment logic
main() {
    echo ""
    print_status "Starting deployment process..."
    
    # Parse command line arguments
    DEPLOYMENT_TYPE=${1:-"local"}
    
    case $DEPLOYMENT_TYPE in
        "local"|"")
            print_status "Deploying locally..."
            check_nodejs
            check_npm
            install_dependencies
            validate_code
            run_tests
            build_production
            start_application
            health_check
            ;;
        "docker")
            print_status "Deploying with Docker..."
            deploy_docker
            ;;
        "docker-compose")
            print_status "Deploying with Docker Compose..."
            deploy_docker_compose
            ;;
        "stop")
            print_status "Stopping application..."
            if [ -f .app.pid ]; then
                APP_PID=$(cat .app.pid)
                if kill -0 $APP_PID 2>/dev/null; then
                    kill $APP_PID
                    rm .app.pid
                    print_success "Application stopped successfully"
                else
                    print_warning "Application was not running"
                fi
            else
                print_warning "No PID file found - application may not be running"
            fi
            ;;
        *)
            print_error "Unknown deployment type: $DEPLOYMENT_TYPE"
            echo "Usage: $0 [local|docker|docker-compose|stop]"
            echo ""
            echo "Deployment options:"
            echo "  local           - Deploy locally with Node.js (default)"
            echo "  docker          - Deploy using Docker container"
            echo "  docker-compose  - Deploy using Docker Compose"
            echo "  stop            - Stop the running application"
            exit 1
            ;;
    esac
    
    echo ""
    print_success "🎉 Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  - Visit http://localhost:3000 to use the URL shortener"
    echo "  - Check health status at http://localhost:3000/health"
    echo "  - Access admin dashboard at http://localhost:3000/admin"
    echo ""
    echo "To stop the application, run: $0 stop"
}

# Run main function
main "$@"