#!/usr/bin/env node

/**
 * WebSocket Connection Test Script
 * Test WebSocket endpoints directly from Node.js
 */

// Load environment variables
require('./load-env');

const WebSocket = require('ws');

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

function testWebSocket(url, serviceName, timeout = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let ws;
    let timeoutId;
    
    const cleanup = () => {
      if (ws) {
        ws.close();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
    
    try {
      log(`🔌 Testing ${serviceName} at ${url}...`, 'blue');
      
      ws = new WebSocket(url);
      
      // Set timeout
      timeoutId = setTimeout(() => {
        cleanup();
        resolve({
          service: serviceName,
          url,
          success: false,
          error: `Connection timeout after ${timeout}ms`,
          responseTime: timeout
        });
      }, timeout);
      
      ws.on('open', () => {
        const responseTime = Date.now() - startTime;
        log(`  ✅ ${serviceName} connected successfully (${responseTime}ms)`, 'green');
        cleanup();
        resolve({
          service: serviceName,
          url,
          success: true,
          responseTime
        });
      });
      
      ws.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        log(`  ❌ ${serviceName} connection failed: ${error.message} (${responseTime}ms)`, 'red');
        cleanup();
        resolve({
          service: serviceName,
          url,
          success: false,
          error: error.message,
          responseTime
        });
      });
      
      ws.on('close', (code, reason) => {
        if (code !== 1000) { // 1000 = normal closure
          const responseTime = Date.now() - startTime;
          log(`  ⚠️ ${serviceName} connection closed unexpectedly: ${code} ${reason} (${responseTime}ms)`, 'yellow');
          cleanup();
          resolve({
            service: serviceName,
            url,
            success: false,
            error: `Connection closed: ${code} ${reason}`,
            responseTime
          });
        }
      });
      
    } catch (error) {
      cleanup();
      resolve({
        service: serviceName,
        url,
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });
    }
  });
}

async function testAllWebSockets() {
  // Read from environment or use defaults matching backend routes
  const sttUrl = process.env.NEXT_PUBLIC_STT_WS_URL || 'ws://localhost:8000/ws/stt';
  const ttsUrl = process.env.NEXT_PUBLIC_TTS_WS_URL || 'ws://localhost:8000/tts/stream';
  const chatUrl = process.env.NEXT_PUBLIC_CHAT_WS_URL || 'ws://localhost:8000/chat/stream';
  
  log('🧪 WebSocket Connection Test', 'blue');
  log('Testing WebSocket endpoints:', 'yellow');
  log(`  STT: ${sttUrl}`, 'reset');
  log(`  TTS: ${ttsUrl}`, 'reset');
  log(`  Chat: ${chatUrl}`, 'reset');
  log('', 'reset');
  
  const endpoints = [
    { url: sttUrl, service: 'STT (Speech-to-Text)' },
    { url: ttsUrl, service: 'TTS (Text-to-Speech)' },
    { url: chatUrl, service: 'Chat (AI Assistant)' }
  ];
  
  const results = [];
  
  // Test each endpoint
  for (const endpoint of endpoints) {
    const result = await testWebSocket(endpoint.url, endpoint.service);
    results.push(result);
  }
  
  log('', 'reset');
  log('📊 WebSocket Test Summary:', 'blue');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  log(`${successful}/${total} WebSocket endpoints connected successfully`, successful === total ? 'green' : 'yellow');
  
  if (successful < total) {
    log('', 'reset');
    log('❌ Failed connections:', 'red');
    results.filter(r => !r.success).forEach(result => {
      log(`  - ${result.service}: ${result.error}`, 'red');
    });
    
    log('', 'reset');
    log('🔍 Troubleshooting WebSocket issues:', 'yellow');
    log('  1. Check if your backend WebSocket routes are properly configured', 'reset');
    log('  2. Verify WebSocket handlers are implemented for each endpoint', 'reset');
    log('  3. Check backend logs for WebSocket connection errors', 'reset');
    log('  4. Ensure CORS is configured for WebSocket connections', 'reset');
    log('  5. Test with a WebSocket client tool (e.g., wscat)', 'reset');
    
    log('', 'reset');
    log('💡 Example backend WebSocket setup (FastAPI):', 'blue');
    log('  @app.websocket("/ws/stt")', 'reset');
    log('  async def websocket_stt(websocket: WebSocket):', 'reset');
    log('      await websocket.accept()', 'reset');
    log('      # Handle STT WebSocket logic', 'reset');
  } else {
    log('✅ All WebSocket endpoints are working correctly!', 'green');
  }
  
  return successful === total;
}

// Check if WebSocket module is available
if (typeof WebSocket === 'undefined') {
  log('❌ WebSocket module not found. Installing ws package...', 'red');
  log('Run: npm install ws', 'yellow');
  process.exit(1);
}

// Run the test
testAllWebSockets()
  .then(allHealthy => {
    process.exit(allHealthy ? 0 : 1);
  })
  .catch(error => {
    log(`❌ WebSocket test failed: ${error.message}`, 'red');
    process.exit(1);
  });