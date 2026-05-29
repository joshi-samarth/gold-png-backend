#!/usr/bin/env node

/**
 * Test Script for GitHub Actions Endpoint
 * Tests the POST /api/cron/fetch-gold endpoint locally
 * 
 * Usage: node test-cron-endpoint.js
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

// Start server
console.log('[TEST] Starting backend server...');
const server = spawn('npm', ['start'], {
    cwd: path.join(__dirname),
    stdio: 'pipe'
});

let serverReady = false;
let attempts = 0;
const maxAttempts = 30; // Wait up to 15 seconds

// Wait for server to be ready
const checkServer = setInterval(() => {
    attempts++;

    const req = http.get('http://localhost:3000/health', (res) => {
        if (res.statusCode === 200) {
            clearInterval(checkServer);
            serverReady = true;
            console.log('[TEST] ✅ Server is ready\n');
            testCronEndpoint();
        }
    }).on('error', () => {
        if (attempts >= maxAttempts) {
            clearInterval(checkServer);
            console.error('[TEST] ❌ Server failed to start');
            process.exit(1);
        }
    });

    req.end();
}, 500);

// Test the cron endpoint
function testCronEndpoint() {
    console.log('[TEST] Testing POST /api/cron/fetch-gold endpoint...\n');

    // Test 1: Missing header (should return 401)
    console.log('[TEST #1] Missing x-cron-secret header');
    testRequest(null, (res, body) => {
        if (res.statusCode === 401) {
            console.log('✅ Returns 401 Unauthorized\n');
            // Test 2: Invalid secret (should return 401)
            testRequest2();
        } else {
            console.log(`❌ Expected 401, got ${res.statusCode}\n`);
            testRequest2();
        }
    });
}

function testRequest(secret, callback) {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/cron/fetch-gold',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        timeout: 10000
    };

    if (secret) {
        options.headers['x-cron-secret'] = secret;
    }

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                callback(res, JSON.parse(data));
            } catch (e) {
                callback(res, data);
            }
        });
    });

    req.on('error', (err) => {
        console.error('❌ Request error:', err.message);
        cleanup();
    });

    req.on('timeout', () => {
        console.error('❌ Request timeout');
        req.destroy();
        cleanup();
    });

    req.end();
}

function testRequest2() {
    console.log('[TEST #2] Invalid x-cron-secret header');
    testRequest('wrong-secret', (res, body) => {
        if (res.statusCode === 401) {
            console.log('✅ Returns 401 Unauthorized\n');
            testRequest3();
        } else {
            console.log(`❌ Expected 401, got ${res.statusCode}\n`);
            testRequest3();
        }
    });
}

function testRequest3() {
    console.log('[TEST #3] Valid x-cron-secret header');
    // Note: This will fail because CRON_SECRET env var might not be set
    // but it should return a different error (not 401)
    testRequest('test-secret', (res, body) => {
        console.log(`Response Status: ${res.statusCode}`);
        console.log('Response Body:', JSON.stringify(body, null, 2));
        console.log('\n[TEST] Note: This test requires CRON_SECRET env var to be set for full success\n');

        cleanup();
    });
}

function cleanup() {
    console.log('[TEST] Cleaning up...');
    server.kill();
    process.exit(0);
}

// Timeout after 30 seconds
setTimeout(() => {
    console.error('[TEST] ❌ Test timeout');
    cleanup();
}, 30000);
