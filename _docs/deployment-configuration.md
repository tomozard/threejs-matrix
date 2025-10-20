# Voice Integration Deployment Configuration

This document provides guidance for configuring the AI Voice Integration feature for different deployment environments.

## Environment Configuration

### Development Environment

1. **Setup Local Environment**
   ```bash
   # Copy example configuration
   npm run setup-env
   
   # Or manually
   cp .env.example .env.local
   ```

2. **Configure Local Backend**
   ```bash
   # Edit .env.local
   NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:8000
   NEXT_PUBLIC_STT_WS_URL=ws://localhost:8000/ws/stt
   NEXT_PUBLIC_TTS_WS_URL=ws://localhost:8000/ws/tts
   NEXT_PUBLIC_CHAT_WS_URL=ws://localhost:8000/ws/chat
   ```

3. **Enable Development Features**
   ```bash
   NEXT_PUBLIC_ENABLE_DEBUG_LOGGING=true
   NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
   ```

### Production Environment

1. **Configure Production URLs**
   ```bash
   # Use secure WebSocket connections
   NEXT_PUBLIC_BACKEND_BASE_URL=https://your-backend-domain.com
   NEXT_PUBLIC_STT_WS_URL=wss://your-backend-domain.com/ws/stt
   NEXT_PUBLIC_TTS_WS_URL=wss://your-backend-domain.com/ws/tts
   NEXT_PUBLIC_CHAT_WS_URL=wss://your-backend-domain.com/ws/chat
   ```

2. **Optimize for Production**
   ```bash
   # Increase timeouts for network latency
   NEXT_PUBLIC_WS_RECONNECT_INTERVAL=2000
   NEXT_PUBLIC_WS_CONNECTION_TIMEOUT=15000
   
   # Optimize audio processing
   NEXT_PUBLIC_AUDIO_RECORDING_TIME_SLICE=200
   NEXT_PUBLIC_AUDIO_BUFFER_SIZE=2048
   ```

3. **Security Configuration**
   ```bash
   # Disable debug features
   NEXT_PUBLIC_ENABLE_DEBUG_LOGGING=false
   NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=false
   NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
   ```

## Deployment Platforms

### Vercel Deployment

1. **Environment Variables Setup**
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add all `NEXT_PUBLIC_*` variables from `.env.production`

2. **Build Configuration**
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "installCommand": "npm install"
   }
   ```

3. **Domain Configuration**
   - Ensure your backend domain supports CORS for your Vercel domain
   - Configure SSL certificates for WebSocket connections

### Netlify Deployment

1. **Environment Variables**
   - Go to Site Settings → Environment Variables
   - Add production environment variables

2. **Build Settings**
   ```toml
   # netlify.toml
   [build]
     command = "npm run build"
     publish = ".next"
   
   [build.environment]
     NODE_VERSION = "18"
   ```

### Docker Deployment

1. **Dockerfile Configuration**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   RUN npm run build
   
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Environment Variables**
   ```bash
   # docker-compose.yml
   version: '3.8'
   services:
     voice-integration:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NEXT_PUBLIC_BACKEND_BASE_URL=https://your-backend.com
         - NEXT_PUBLIC_STT_WS_URL=wss://your-backend.com/ws/stt
         # ... other variables
   ```

## Backend Integration

### CORS Configuration

Ensure your backend allows requests from your frontend domain:

```python
# FastAPI example
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### WebSocket Security

1. **SSL/TLS Configuration**
   - Use `wss://` for production WebSocket connections
   - Ensure valid SSL certificates
   - Configure proper certificate chain

2. **Authentication** (if required)
   ```typescript
   // Add authentication headers to WebSocket connections
   const wsConfig = {
     ...getWebSocketConfig(),
     headers: {
       'Authorization': `Bearer ${token}`
     }
   };
   ```

## Configuration Validation

### Pre-deployment Validation

```bash
# Validate configuration before deployment
npm run validate-config

# Check specific environment
NODE_ENV=production npm run validate-config
```

### Runtime Validation

The application includes built-in configuration validation:

1. **Automatic Validation**
   - Configuration is validated on application startup
   - Invalid configuration shows error screen with details
   - Provides guidance for fixing configuration issues

2. **Manual Validation**
   ```typescript
   import { validateConfiguration } from '@/config';
   
   const { isValid, errors } = validateConfiguration();
   if (!isValid) {
     console.error('Configuration errors:', errors);
   }
   ```

## Keyboard Shortcuts Configuration

The application supports configurable keyboard shortcuts for better user experience:

### Voice Interaction Shortcuts

```bash
# Voice recording control
NEXT_PUBLIC_VOICE_TOGGLE_KEY=   # Spacebar (default) - Hold to record voice
NEXT_PUBLIC_VOICE_STOP_KEY=Escape  # Escape key - Stop recording immediately
```

### Matrix Effect Shortcuts

```bash
# Matrix animation control  
NEXT_PUBLIC_MATRIX_PAUSE_KEY=KeyP  # P key (default) - Pause/resume Matrix effect
```

### Key Separation

The keyboard shortcuts have been designed to avoid conflicts:
- **Space key**: Dedicated to voice interaction (hold to record)
- **P key**: Controls Matrix effect pause/play
- **Escape key**: Emergency stop for voice recording
- **Arrow keys**: Speed control for Matrix effect

This separation ensures that voice interaction doesn't interfere with Matrix effect controls.

## Performance Optimization

### Audio Processing

1. **Sample Rate Optimization**
   ```bash
   # Lower sample rate for mobile/slower connections
   NEXT_PUBLIC_AUDIO_SAMPLE_RATE=8000
   
   # Higher quality for desktop/fast connections
   NEXT_PUBLIC_AUDIO_SAMPLE_RATE=16000
   ```

2. **Buffer Size Tuning**
   ```bash
   # Smaller buffers for lower latency
   NEXT_PUBLIC_AUDIO_BUFFER_SIZE=2048
   
   # Larger buffers for stability
   NEXT_PUBLIC_AUDIO_BUFFER_SIZE=4096
   ```

### WebSocket Optimization

1. **Connection Management**
   ```bash
   # Aggressive reconnection for unstable networks
   NEXT_PUBLIC_WS_MAX_RECONNECT_ATTEMPTS=5
   NEXT_PUBLIC_WS_RECONNECT_INTERVAL=1000
   
   # Conservative for stable networks
   NEXT_PUBLIC_WS_MAX_RECONNECT_ATTEMPTS=3
   NEXT_PUBLIC_WS_RECONNECT_INTERVAL=2000
   ```

## Monitoring and Debugging

### Production Monitoring

1. **Error Reporting**
   ```bash
   NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
   ```

2. **Performance Monitoring**
   ```bash
   # Enable for performance analysis
   NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
   ```

### Debug Mode

```bash
# Development debugging
NEXT_PUBLIC_ENABLE_DEBUG_LOGGING=true
```

This enables detailed logging for:
- WebSocket connection events
- Audio processing status
- Configuration loading
- Error details

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failures**
   - Check CORS configuration
   - Verify SSL certificates
   - Ensure backend is accessible

2. **Audio Processing Issues**
   - Check microphone permissions
   - Verify audio format compatibility
   - Test with different sample rates

3. **Configuration Errors**
   - Run `npm run validate-config`
   - Check environment variable syntax
   - Verify URL formats

### Health Checks

```typescript
// Add health check endpoint
export async function checkVoiceServices() {
  const config = getWebSocketConfig();
  
  // Test WebSocket connections
  const results = await Promise.allSettled([
    testWebSocketConnection(config.sttUrl),
    testWebSocketConnection(config.ttsUrl),
    testWebSocketConnection(config.chatUrl)
  ]);
  
  return results.map((result, index) => ({
    service: ['STT', 'TTS', 'Chat'][index],
    status: result.status === 'fulfilled' ? 'healthy' : 'unhealthy'
  }));
}
```