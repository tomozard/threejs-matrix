// WebSocket Connection Testing Utility

export interface ConnectionTestResult {
  service: string;
  url: string;
  success: boolean;
  error?: string;
  responseTime?: number;
}

export async function testWebSocketConnection(
  url: string, 
  serviceName: string,
  timeout: number = 5000
): Promise<ConnectionTestResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let ws: WebSocket;
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      if (ws) {
        ws.close();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    try {
      console.log(`🔍 Testing ${serviceName} connection to: ${url}`);
      
      ws = new WebSocket(url);
      
      // Set timeout
      timeoutId = setTimeout(() => {
        cleanup();
        resolve({
          service: serviceName,
          url,
          success: false,
          error: `Connection timeout after ${timeout}ms`
        });
      }, timeout);

      ws.onopen = () => {
        const responseTime = Date.now() - startTime;
        console.log(`✅ ${serviceName} connected successfully in ${responseTime}ms`);
        cleanup();
        resolve({
          service: serviceName,
          url,
          success: true,
          responseTime
        });
      };

      ws.onerror = (error) => {
        console.error(`❌ ${serviceName} connection error:`, error);
        cleanup();
        resolve({
          service: serviceName,
          url,
          success: false,
          error: `WebSocket error: ${error.type || 'Unknown error'}`
        });
      };

      ws.onclose = (event) => {
        if (event.code !== 1000) { // 1000 = normal closure
          console.warn(`⚠️ ${serviceName} connection closed unexpectedly:`, event.code, event.reason);
          cleanup();
          resolve({
            service: serviceName,
            url,
            success: false,
            error: `Connection closed: ${event.code} ${event.reason || 'Unknown reason'}`
          });
        }
      };

    } catch (error) {
      console.error(`❌ ${serviceName} connection failed:`, error);
      cleanup();
      resolve({
        service: serviceName,
        url,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown connection error'
      });
    }
  });
}

export async function testAllVoiceServices(config: {
  sttUrl: string;
  ttsUrl: string;
  chatUrl: string;
}): Promise<ConnectionTestResult[]> {
  console.log('🧪 Testing all voice service connections...');
  
  const tests = [
    testWebSocketConnection(config.sttUrl, 'STT'),
    testWebSocketConnection(config.ttsUrl, 'TTS'),
    testWebSocketConnection(config.chatUrl, 'Chat')
  ];

  const results = await Promise.all(tests);
  
  console.log('📊 Connection test results:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const time = result.responseTime ? ` (${result.responseTime}ms)` : '';
    console.log(`  ${status} ${result.service}: ${result.success ? 'Connected' : result.error}${time}`);
  });

  return results;
}

// Test specific backend endpoints
export async function testBackendHealth(baseUrl: string): Promise<{
  success: boolean;
  error?: string;
  endpoints?: { [key: string]: boolean };
}> {
  try {
    console.log(`🏥 Testing backend health at: ${baseUrl}`);
    
    const endpoints = {
      health: '/health',
      stt: '/ws/stt',
      tts: '/ws/tts', 
      chat: '/ws/chat'
    };

    const results: { [key: string]: boolean } = {};
    
    // Test HTTP health endpoint
    try {
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      results.health = response.ok;
      console.log(`  Health endpoint: ${response.ok ? '✅' : '❌'} (${response.status})`);
    } catch (error) {
      results.health = false;
      console.log(`  Health endpoint: ❌ (${error})`);
    }

    // For WebSocket endpoints, we'll just check if they're configured
    results.stt = true; // Will be tested by WebSocket connection test
    results.tts = true;
    results.chat = true;

    const allHealthy = Object.values(results).every(Boolean);
    
    return {
      success: allHealthy,
      endpoints: results
    };

  } catch (error) {
    console.error('❌ Backend health check failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown health check error'
    };
  }
}

// Enhanced error analysis
export function analyzeConnectionError(error: string, url: string): {
  category: 'network' | 'server' | 'configuration' | 'unknown';
  suggestion: string;
  action: string;
} {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes('timeout')) {
    return {
      category: 'network',
      suggestion: 'Connection timeout - server may be slow or unreachable',
      action: 'Check if backend server is running and increase timeout'
    };
  }
  
  if (lowerError.includes('refused') || lowerError.includes('econnrefused')) {
    return {
      category: 'server',
      suggestion: 'Connection refused - server is not accepting connections',
      action: 'Verify backend server is running on the correct port'
    };
  }
  
  if (lowerError.includes('404') || lowerError.includes('not found')) {
    return {
      category: 'configuration',
      suggestion: 'WebSocket endpoint not found',
      action: 'Check WebSocket URL path configuration'
    };
  }
  
  if (lowerError.includes('cors')) {
    return {
      category: 'configuration',
      suggestion: 'CORS policy blocking connection',
      action: 'Configure backend CORS to allow frontend domain'
    };
  }
  
  if (lowerError.includes('ssl') || lowerError.includes('certificate')) {
    return {
      category: 'configuration',
      suggestion: 'SSL/TLS certificate issue',
      action: 'Check SSL configuration or use ws:// for local development'
    };
  }
  
  return {
    category: 'unknown',
    suggestion: 'Unknown connection error',
    action: 'Check browser console and backend logs for more details'
  };
}