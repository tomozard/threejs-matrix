// Backend Service Testing Utility

export interface BackendTestResult {
  endpoint: string;
  method: string;
  success: boolean;
  status?: number;
  error?: string;
  responseTime?: number;
  details?: any;
}

export async function testHttpEndpoint(
  url: string,
  method: 'GET' | 'POST' = 'GET',
  timeout: number = 5000
): Promise<BackendTestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🌐 Testing HTTP ${method} ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    let responseData;
    try {
      responseData = await response.text();
      if (responseData) {
        responseData = JSON.parse(responseData);
      }
    } catch {
      // Response is not JSON, keep as text
    }
    
    console.log(`${response.ok ? '✅' : '❌'} HTTP ${method} ${url}: ${response.status} (${responseTime}ms)`);
    
    return {
      endpoint: url,
      method,
      success: response.ok,
      status: response.status,
      responseTime,
      details: responseData
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ HTTP ${method} ${url} failed:`, error);
    
    return {
      endpoint: url,
      method,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown HTTP error',
      responseTime
    };
  }
}

export async function testBackendEndpoints(baseUrl: string): Promise<BackendTestResult[]> {
  console.log(`🏥 Testing backend endpoints at: ${baseUrl}`);
  
  const endpoints = [
    { path: '/health', method: 'GET' as const },
    { path: '/docs', method: 'GET' as const },
    { path: '/openapi.json', method: 'GET' as const }
  ];
  
  const results = await Promise.all(
    endpoints.map(({ path, method }) => 
      testHttpEndpoint(`${baseUrl}${path}`, method)
    )
  );
  
  console.log('📊 Backend endpoint test results:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const time = result.responseTime ? ` (${result.responseTime}ms)` : '';
    const statusCode = result.status ? ` [${result.status}]` : '';
    console.log(`  ${status} ${result.method} ${result.endpoint}${statusCode}${time}`);
    if (!result.success && result.error) {
      console.log(`    Error: ${result.error}`);
    }
  });
  
  return results;
}

// Test WebSocket endpoint availability by checking HTTP upgrade
export async function testWebSocketEndpoint(wsUrl: string): Promise<{
  success: boolean;
  error?: string;
  httpStatus?: number;
}> {
  try {
    // Convert WebSocket URL to HTTP for testing
    const httpUrl = wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    console.log(`🔌 Testing WebSocket endpoint availability: ${httpUrl}`);
    
    const response = await fetch(httpUrl, {
      method: 'GET',
      headers: {
        'Connection': 'Upgrade',
        'Upgrade': 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ=='
      }
    });
    
    // WebSocket endpoints should return 426 (Upgrade Required) or 101 (Switching Protocols)
    const isWebSocketEndpoint = response.status === 426 || response.status === 101;
    
    console.log(`${isWebSocketEndpoint ? '✅' : '❌'} WebSocket endpoint ${httpUrl}: ${response.status}`);
    
    return {
      success: isWebSocketEndpoint,
      httpStatus: response.status,
      error: isWebSocketEndpoint ? undefined : `HTTP ${response.status}: ${response.statusText}`
    };
    
  } catch (error) {
    console.error(`❌ WebSocket endpoint test failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown WebSocket test error'
    };
  }
}

// Comprehensive backend health check
export async function comprehensiveBackendTest(config: {
  baseUrl: string;
  sttUrl: string;
  ttsUrl: string;
  chatUrl: string;
}): Promise<{
  backend: BackendTestResult[];
  websockets: { [key: string]: { success: boolean; error?: string; httpStatus?: number } };
  overall: boolean;
  recommendations: string[];
}> {
  console.log('🧪 Running comprehensive backend test...');
  
  // Test HTTP endpoints
  const backendResults = await testBackendEndpoints(config.baseUrl);
  
  // Test WebSocket endpoints
  const wsTests = await Promise.all([
    testWebSocketEndpoint(config.sttUrl).then(result => ({ service: 'STT', ...result })),
    testWebSocketEndpoint(config.ttsUrl).then(result => ({ service: 'TTS', ...result })),
    testWebSocketEndpoint(config.chatUrl).then(result => ({ service: 'Chat', ...result }))
  ]);
  
  const websockets = wsTests.reduce((acc, test) => {
    acc[test.service] = {
      success: test.success,
      error: test.error,
      httpStatus: test.httpStatus
    };
    return acc;
  }, {} as { [key: string]: { success: boolean; error?: string; httpStatus?: number } });
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  const hasHealthEndpoint = backendResults.some(r => r.endpoint.includes('/health') && r.success);
  if (!hasHealthEndpoint) {
    recommendations.push('Backend health endpoint not responding - check if server is running');
  }
  
  const failedWs = wsTests.filter(test => !test.success);
  if (failedWs.length > 0) {
    recommendations.push(`WebSocket endpoints not available: ${failedWs.map(t => t.service).join(', ')}`);
    recommendations.push('Check if WebSocket routes are properly configured in your backend');
  }
  
  const hasAnyConnection = backendResults.some(r => r.success) || wsTests.some(t => t.success);
  if (!hasAnyConnection) {
    recommendations.push('No backend endpoints responding - verify server is running on correct port');
    recommendations.push(`Expected backend at: ${config.baseUrl}`);
  }
  
  const overall = hasHealthEndpoint && wsTests.every(t => t.success);
  
  console.log('📋 Test Summary:');
  console.log(`  Backend HTTP: ${backendResults.filter(r => r.success).length}/${backendResults.length} endpoints OK`);
  console.log(`  WebSocket: ${wsTests.filter(t => t.success).length}/${wsTests.length} endpoints OK`);
  console.log(`  Overall: ${overall ? '✅ Healthy' : '❌ Issues detected'}`);
  
  if (recommendations.length > 0) {
    console.log('💡 Recommendations:');
    recommendations.forEach(rec => console.log(`  - ${rec}`));
  }
  
  return {
    backend: backendResults,
    websockets,
    overall,
    recommendations
  };
}

// Quick connectivity test
export async function quickConnectivityTest(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch {
    try {
      // Fallback: test docs endpoint
      const response = await fetch(`${baseUrl}/docs`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      return response.status < 500; // Accept any non-server-error response
    } catch {
      return false;
    }
  }
}