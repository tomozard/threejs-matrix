#!/usr/bin/env node

/**
 * Backend Health Check Script
 * Quick script to test if your backend services are running
 */

const http = require('http');
const https = require('https');

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testHttpEndpoint(url, timeout = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      timeout: timeout
    }, (res) => {
      const responseTime = Date.now() - startTime;
      resolve({
        success: true,
        status: res.statusCode,
        responseTime,
        url
      });
    });
    
    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      resolve({
        success: false,
        error: error.message,
        responseTime,
        url
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout',
        responseTime: timeout,
        url
      });
    });
    
    req.end();
  });
}

async function checkBackend() {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  
  log('🏥 Backend Health Check', 'blue');
  log(`Testing backend at: ${baseUrl}`, 'yellow');
  log('', 'reset');
  
  const endpoints = [
    `${baseUrl}/health`,
    `${baseUrl}/docs`,
    `${baseUrl}/openapi.json`
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    log(`Testing ${endpoint}...`, 'blue');
    const result = await testHttpEndpoint(endpoint);
    results.push(result);
    
    if (result.success) {
      log(`  ✅ ${result.status} (${result.responseTime}ms)`, 'green');
    } else {
      log(`  ❌ ${result.error} (${result.responseTime}ms)`, 'red');
    }
  }
  
  log('', 'reset');
  log('📊 Summary:', 'blue');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  if (successful > 0) {
    log(`✅ ${successful}/${total} endpoints responding`, 'green');
    
    if (successful < total) {
      log('⚠️  Some endpoints are not responding', 'yellow');
      log('💡 This might be normal if your backend doesn\'t implement all endpoints', 'yellow');
    }
    
    log('', 'reset');
    log('🔌 WebSocket endpoints to check manually:', 'blue');
    log(`  - ws://localhost:8000/ws/stt (STT - Speech to Text)`, 'reset');
    log(`  - ws://localhost:8000/tts/stream (TTS - Text to Speech)`, 'reset');
    log(`  - ws://localhost:8000/chat/stream (Chat - AI Assistant)`, 'reset');
    
  } else {
    log('❌ No endpoints responding', 'red');
    log('', 'reset');
    log('🔍 Troubleshooting:', 'yellow');
    log('  1. Check if your backend server is running', 'reset');
    log('  2. Verify the server is listening on port 8000', 'reset');
    log('  3. Check for any error messages in your backend logs', 'reset');
    log('  4. Try: curl http://localhost:8000/health', 'reset');
  }
  
  return successful > 0;
}

// Run the check
checkBackend()
  .then(healthy => {
    process.exit(healthy ? 0 : 1);
  })
  .catch(error => {
    log(`❌ Health check failed: ${error.message}`, 'red');
    process.exit(1);
  });