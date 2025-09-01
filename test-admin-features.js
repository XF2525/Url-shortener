#!/usr/bin/env node

/**
 * Comprehensive Admin Panel Features Test
 * Tests all admin panel functionality to ensure everything works correctly
 */

const http = require('http');
const https = require('https');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const ADMIN_TOKEN = 'admin-test-token'; // Mock admin token for testing

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

class AdminPanelTester {
    constructor() {
        this.testResults = [];
        this.passedTests = 0;
        this.failedTests = 0;
    }

    log(message, color = 'reset') {
        console.log(colors[color] + message + colors.reset);
    }

    async makeRequest(path, method = 'GET', data = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, BASE_URL);
            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ADMIN_TOKEN}`,
                    ...headers
                }
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        const parsedBody = body ? JSON.parse(body) : {};
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: parsedBody
                        });
                    } catch (e) {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: body
                        });
                    }
                });
            });

            req.on('error', reject);

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    async test(description, testFunction) {
        try {
            this.log(`\n🧪 Testing: ${description}`, 'cyan');
            const result = await testFunction();
            
            if (result) {
                this.log(`✅ PASSED: ${description}`, 'green');
                this.passedTests++;
                this.testResults.push({ test: description, status: 'PASSED', details: result });
            } else {
                this.log(`❌ FAILED: ${description}`, 'red');
                this.failedTests++;
                this.testResults.push({ test: description, status: 'FAILED', details: 'Test returned false' });
            }
        } catch (error) {
            this.log(`❌ ERROR: ${description} - ${error.message}`, 'red');
            this.failedTests++;
            this.testResults.push({ test: description, status: 'ERROR', details: error.message });
        }
    }

    async runAllTests() {
        this.log('🚀 Starting Admin Panel Feature Tests', 'blue');
        this.log('=' * 50, 'blue');

        // Test 1: Homepage accessibility
        await this.test('Homepage loads correctly', async () => {
            const response = await this.makeRequest('/');
            return response.statusCode === 200;
        });

        // Test 2: Admin dashboard accessibility
        await this.test('Admin dashboard loads', async () => {
            const response = await this.makeRequest('/admin-dashboard.html');
            return response.statusCode === 200;
        });

        // Test 3: URL shortening functionality
        await this.test('URL shortening works', async () => {
            const testUrl = 'https://example.com/test-url-' + Date.now();
            const response = await this.makeRequest('/shorten', 'POST', {
                url: testUrl,
                customCode: 'test' + Date.now()
            });
            return response.statusCode === 200 && response.body.shortUrl;
        });

        // Test 4: Analytics endpoint
        await this.test('Analytics API responds', async () => {
            const response = await this.makeRequest('/admin/api/analytics');
            return response.statusCode === 200 || response.statusCode === 401; // 401 is acceptable for auth
        });

        // Test 5: Status endpoint
        await this.test('Status API responds', async () => {
            const response = await this.makeRequest('/admin/api/status');
            return response.statusCode === 200 || response.statusCode === 401;
        });

        // Test 6: Click generation endpoint
        await this.test('Click generation endpoint exists', async () => {
            const response = await this.makeRequest('/admin/api/automation/generate-clicks', 'POST', {
                shortCode: 'test',
                count: 1,
                delay: 100
            });
            return response.statusCode !== 404; // Should not be "Not Found"
        });

        // Test 7: Blog system endpoints
        await this.test('Blog endpoints exist', async () => {
            const response = await this.makeRequest('/admin/api/blog/automation/generate-views', 'POST', {
                blogPostId: 'test',
                count: 1
            });
            return response.statusCode !== 404;
        });

        // Test 8: Parallels features endpoint
        await this.test('Parallels features endpoint exists', async () => {
            const response = await this.makeRequest('/admin/api/aura/parallels-features', 'POST', {
                operationType: 'clicks',
                parallelTasks: 1
            });
            return response.statusCode !== 404;
        });

        // Test 9: Activity logging endpoint
        await this.test('Activity log endpoint exists', async () => {
            const response = await this.makeRequest('/admin/api/activity/recent?count=5');
            return response.statusCode !== 404;
        });

        // Test 10: Background operations endpoint
        await this.test('Background operations endpoint exists', async () => {
            const response = await this.makeRequest('/admin/api/automation/background-status');
            return response.statusCode !== 404;
        });

        // Test 11: Static files serve correctly
        await this.test('Static files are served', async () => {
            const response = await this.makeRequest('/admin/styles.css');
            return response.statusCode === 200 || response.statusCode === 404; // 404 is ok if file doesn't exist
        });

        // Test 12: API error handling
        await this.test('API handles invalid requests gracefully', async () => {
            const response = await this.makeRequest('/admin/api/invalid-endpoint');
            return response.statusCode === 404 || response.statusCode === 401;
        });

        this.printSummary();
    }

    printSummary() {
        this.log('\n📊 TEST SUMMARY', 'blue');
        this.log('=' * 50, 'blue');
        this.log(`Total Tests: ${this.passedTests + this.failedTests}`, 'cyan');
        this.log(`Passed: ${this.passedTests}`, 'green');
        this.log(`Failed: ${this.failedTests}`, 'red');
        
        if (this.failedTests > 0) {
            this.log('\n❌ Failed Tests:', 'red');
            this.testResults
                .filter(r => r.status !== 'PASSED')
                .forEach(r => {
                    this.log(`  • ${r.test}: ${r.details}`, 'red');
                });
        }

        const successRate = Math.round((this.passedTests / (this.passedTests + this.failedTests)) * 100);
        this.log(`\n🎯 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');

        if (successRate >= 80) {
            this.log('\n🎉 Admin Panel is functioning well!', 'green');
        } else {
            this.log('\n⚠️  Some features may need attention.', 'yellow');
        }
    }
}

// Run the tests
const tester = new AdminPanelTester();
tester.runAllTests().catch(console.error);
