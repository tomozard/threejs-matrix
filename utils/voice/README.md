# Voice Integration Infrastructure

This directory contains the core infrastructure for AI voice integration with the Matrix Effect application.

## Components

### Types (`types/voice.ts`)
- **VoiceState**: Enumeration of voice interaction states
- **VoiceInteractionState**: Interface for current voice interaction status
- **ConversationTurn**: Interface for conversation history entries
- **AudioManager**: Interface for audio processing operations
- **WebSocketManager**: Interface for WebSocket communication
- **VisualEffectParams**: Interface for Matrix effect visual parameters

### WebSocket Utilities (`utils/websocket.ts`)
- **WebSocketConnection**: Low-level WebSocket wrapper with reconnection logic
- **WebSocketManager**: High-level manager for STT, TTS, and Chat WebSocket connections
- Features: Automatic reconnection, message queuing, error handling, connection lifecycle management

### Audio Processing (`utils/audio.ts`)
- **AudioProcessor**: Complete audio capture and playback management
- Features: MediaRecorder integration, AudioContext management, PCM16 format conversion, audio buffering

### Conversation Management (`utils/conversation.ts`)
- **ConversationManager**: Manages conversation history and context
- Features: Turn management, context generation, serialization, conversation statistics

### Configuration (`config/voice.ts`)
- Default configurations for WebSocket endpoints, audio settings, visual parameters
- Environment variable support for production deployment
- Error messages and UI configuration constants

## Usage

```typescript
import { 
  WebSocketManager, 
  AudioProcessor, 
  ConversationManager,
  DEFAULT_WEBSOCKET_CONFIG,
  DEFAULT_AUDIO_CONFIG 
} from '@/utils/voice';

// Initialize services
const wsManager = new WebSocketManager(DEFAULT_WEBSOCKET_CONFIG);
const audioProcessor = new AudioProcessor(DEFAULT_AUDIO_CONFIG);
const conversation = new ConversationManager();
```

## Requirements Satisfied

- ✅ Requirement 3.3: WebSocket connections for real-time communication
- ✅ Requirement 4.1: MediaRecorder API for audio capture
- ✅ Requirement 4.5: AudioContext management for audio processing