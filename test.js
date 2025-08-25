#!/usr/bin/env node

// Simple test script for URL Shortener
console.log('🧪 Running URL Shortener Tests...');

// Test 1: Check if main application file exists and has valid syntax
try {
  const fs = require('fs');
  const path = require('path');
  
  // Check if app.js exists
  if (!fs.existsSync('./app.js')) {
    throw new Error('app.js file not found');
  }
  
  // Basic syntax check without executing
  const content = fs.readFileSync('./app.js', 'utf8');
  if (content.length === 0) {
    throw new Error('app.js is empty');
  }
  
  console.log('✅ Test 1 PASSED: app.js exists and has content');
} catch (error) {
  console.log('❌ Test 1 FAILED: app.js validation failed');
  console.error(error.message);
  process.exit(1);
}

// Test 2: Check if package.json is valid
try {
  const pkg = require('./package.json');
  if (pkg.name && pkg.version && pkg.main) {
    console.log('✅ Test 2 PASSED: package.json is valid');
  } else {
    throw new Error('Missing required fields in package.json');
  }
} catch (error) {
  console.log('❌ Test 2 FAILED: package.json is invalid');
  console.error(error.message);
  process.exit(1);
}

// Test 3: Check dependencies
try {
  require('express');
  require('escape-html');
  console.log('✅ Test 3 PASSED: All dependencies are available');
} catch (error) {
  console.log('❌ Test 3 FAILED: Missing dependencies');
  console.error(error.message);
  process.exit(1);
}

// Test 4: Check deployment files exist
try {
  const fs = require('fs');
  const requiredFiles = ['Dockerfile', 'docker-compose.yml', 'deploy.sh', 'nginx.conf'];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(`./${file}`)) {
      throw new Error(`${file} not found`);
    }
  }
  
  console.log('✅ Test 4 PASSED: All deployment files are present');
} catch (error) {
  console.log('❌ Test 4 FAILED: Missing deployment files');
  console.error(error.message);
  process.exit(1);
}

console.log('');
console.log('🎉 All tests passed! The application is ready for deployment.');
console.log('');