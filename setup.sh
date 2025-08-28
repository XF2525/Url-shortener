#!/bin/bash

# URL Shortener Quick Setup Script
# This script handles the complete setup and start process

echo "🔗 URL Shortener - Quick Setup"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 14+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"
echo "✅ npm $(npm --version) detected"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the project root directory."
    exit 1
fi

echo ""
echo "📦 Installing dependencies..."
if npm install; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "🚀 Starting URL Shortener server..."
echo ""
echo "📍 Server will be available at: http://localhost:3000"
echo "📊 Admin Dashboard: http://localhost:3000/admin (password: admin123)"
echo "🏥 Health Check: http://localhost:3000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start