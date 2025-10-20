// Voice Integration Configuration

import { WebSocketConfig, AudioConfig, VisualEffectParams } from '@/types/voice';

// Configuration validation and parsing utilities
const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

// Environment-based configuration with validation
export const getWebSocketConfig = (): WebSocketConfig => {
  const config = {
    sttUrl: process.env.NEXT_PUBLIC_STT_WS_URL || 'ws://localhost:8000/ws/stt',
    ttsUrl: process.env.NEXT_PUBLIC_TTS_WS_URL || 'ws://localhost:8000/ws/tts',
    chatUrl: process.env.NEXT_PUBLIC_CHAT_WS_URL || 'ws://localhost:8000/ws/chat',
    reconnectInterval: parseNumber(process.env.NEXT_PUBLIC_WS_RECONNECT_INTERVAL, 1000),
    maxReconnectAttempts: parseNumber(process.env.NEXT_PUBLIC_WS_MAX_RECONNECT_ATTEMPTS, 5),
    connectionTimeout: parseNumber(process.env.NEXT_PUBLIC_WS_CONNECTION_TIMEOUT, 10000)
  };

  // Validate URLs
  try {
    new URL(config.sttUrl.replace('ws://', 'http://').replace('wss://', 'https://'));
    new URL(config.ttsUrl.replace('ws://', 'http://').replace('wss://', 'https://'));
    new URL(config.chatUrl.replace('ws://', 'http://').replace('wss://', 'https://'));
  } catch (error) {
    console.error('Invalid WebSocket URL configuration:', error);
    throw new Error('Invalid WebSocket URL configuration');
  }

  return config;
};

// Default WebSocket configuration (for backward compatibility)
export const DEFAULT_WEBSOCKET_CONFIG: WebSocketConfig = getWebSocketConfig();

// Environment-based audio configuration
export const getAudioConfig = (): AudioConfig => {
  return {
    sampleRate: parseNumber(process.env.NEXT_PUBLIC_AUDIO_SAMPLE_RATE, 16000),
    channels: parseNumber(process.env.NEXT_PUBLIC_AUDIO_CHANNELS, 1),
    bitsPerSample: parseNumber(process.env.NEXT_PUBLIC_AUDIO_BITS_PER_SAMPLE, 16),
    format: (process.env.NEXT_PUBLIC_AUDIO_FORMAT || 'pcm16') as 'pcm16' | 'wav' | 'mp3'
  };
};

// Default audio configuration (for backward compatibility)
export const DEFAULT_AUDIO_CONFIG: AudioConfig = getAudioConfig();

// Environment-based visual effect parameters
export const getNormalVisualParams = (): VisualEffectParams => ({
  largeFontProportion: parseNumber(process.env.NEXT_PUBLIC_NORMAL_LARGE_FONT_PROPORTION, 0.1),
  speedMultiplier: parseNumber(process.env.NEXT_PUBLIC_NORMAL_SPEED_MULTIPLIER, 1.0),
  transitionDuration: parseNumber(process.env.NEXT_PUBLIC_VISUAL_TRANSITION_DURATION, 500)
});

export const getVoiceActiveVisualParams = (): VisualEffectParams => ({
  largeFontProportion: parseNumber(process.env.NEXT_PUBLIC_VOICE_ACTIVE_LARGE_FONT_PROPORTION, 0.4),
  speedMultiplier: parseNumber(process.env.NEXT_PUBLIC_VOICE_ACTIVE_SPEED_MULTIPLIER, 2.0),
  transitionDuration: parseNumber(process.env.NEXT_PUBLIC_VISUAL_TRANSITION_DURATION, 300)
});

export const getProcessingVisualParams = (): VisualEffectParams => ({
  largeFontProportion: parseNumber(process.env.NEXT_PUBLIC_PROCESSING_LARGE_FONT_PROPORTION, 0.3),
  speedMultiplier: parseNumber(process.env.NEXT_PUBLIC_PROCESSING_SPEED_MULTIPLIER, 1.5),
  transitionDuration: parseNumber(process.env.NEXT_PUBLIC_VISUAL_TRANSITION_DURATION, 200)
});

// Visual effect parameters for different states (for backward compatibility)
export const NORMAL_VISUAL_PARAMS: VisualEffectParams = getNormalVisualParams();
export const VOICE_ACTIVE_VISUAL_PARAMS: VisualEffectParams = getVoiceActiveVisualParams();
export const PROCESSING_VISUAL_PARAMS: VisualEffectParams = getProcessingVisualParams();

// Environment-based voice button configuration
export const getVoiceButtonConfig = () => ({
  size: parseNumber(process.env.NEXT_PUBLIC_VOICE_BUTTON_SIZE, 60),
  position: {
    bottom: parseNumber(process.env.NEXT_PUBLIC_VOICE_BUTTON_BOTTOM_OFFSET, 30),
    centerX: true
  },
  colors: {
    idle: '#00ff00',
    recording: '#ff0000',
    processing: '#ffff00',
    playing: '#00ffff'
  },
  animations: {
    pulseSpeed: 1000,
    glowIntensity: 0.8
  }
});

// Voice button configuration (for backward compatibility)
export const VOICE_BUTTON_CONFIG = getVoiceButtonConfig();

// Environment-based keyboard shortcuts configuration
export const getKeyboardShortcuts = () => ({
  toggleRecording: process.env.NEXT_PUBLIC_VOICE_TOGGLE_KEY || ' ', // Spacebar for voice
  stopRecording: process.env.NEXT_PUBLIC_VOICE_STOP_KEY || 'Escape',
  matrixPause: process.env.NEXT_PUBLIC_MATRIX_PAUSE_KEY || 'KeyP' // P key for Matrix pause/play
});

// Keyboard shortcuts (for backward compatibility)
export const KEYBOARD_SHORTCUTS = getKeyboardShortcuts();

// Environment-based audio processing settings
export const getAudioProcessingConfig = () => ({
  recordingTimeSlice: parseNumber(process.env.NEXT_PUBLIC_AUDIO_RECORDING_TIME_SLICE, 100),
  maxRecordingDuration: parseNumber(process.env.NEXT_PUBLIC_AUDIO_MAX_RECORDING_DURATION, 30000),
  audioBufferSize: parseNumber(process.env.NEXT_PUBLIC_AUDIO_BUFFER_SIZE, 4096),
  playbackLatency: parseNumber(process.env.NEXT_PUBLIC_AUDIO_PLAYBACK_LATENCY, 50)
});

// Audio processing settings (for backward compatibility)
export const AUDIO_PROCESSING = getAudioProcessingConfig();

// Development and debugging configuration
export const getDevelopmentConfig = () => ({
  enableDebugLogging: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING, false),
  enablePerformanceMonitoring: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING, false),
  enableErrorReporting: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING, true),
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
});

// Backend service configuration
export const getBackendConfig = () => ({
  baseUrl: process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:8000',
  apiVersion: 'v1',
  timeout: parseNumber(process.env.NEXT_PUBLIC_API_TIMEOUT, 30000)
});

// Configuration validation
export const validateConfiguration = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  try {
    const wsConfig = getWebSocketConfig();
    const audioConfig = getAudioConfig();
    const backendConfig = getBackendConfig();
    
    // Validate WebSocket URLs
    if (!wsConfig.sttUrl.startsWith('ws://') && !wsConfig.sttUrl.startsWith('wss://')) {
      errors.push('STT WebSocket URL must start with ws:// or wss://');
    }
    
    if (!wsConfig.ttsUrl.startsWith('ws://') && !wsConfig.ttsUrl.startsWith('wss://')) {
      errors.push('TTS WebSocket URL must start with ws:// or wss://');
    }
    
    if (!wsConfig.chatUrl.startsWith('ws://') && !wsConfig.chatUrl.startsWith('wss://')) {
      errors.push('Chat WebSocket URL must start with ws:// or wss://');
    }
    
    // Validate audio configuration
    if (audioConfig.sampleRate < 8000 || audioConfig.sampleRate > 48000) {
      errors.push('Audio sample rate must be between 8000 and 48000 Hz');
    }
    
    if (audioConfig.channels < 1 || audioConfig.channels > 2) {
      errors.push('Audio channels must be 1 (mono) or 2 (stereo)');
    }
    
    if (![8, 16, 24, 32].includes(audioConfig.bitsPerSample)) {
      errors.push('Audio bits per sample must be 8, 16, 24, or 32');
    }
    
    // Validate backend URL
    try {
      new URL(backendConfig.baseUrl);
    } catch {
      errors.push('Backend base URL is not a valid URL');
    }
    
  } catch (error) {
    errors.push(`Configuration validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Error messages
export const ERROR_MESSAGES = {
  microphoneAccess: 'Microphone access denied. Please allow microphone access to use voice features.',
  webSocketConnection: 'Failed to connect to voice services. Please check your connection.',
  audioPlayback: 'Failed to play audio response. Please check your audio settings.',
  recordingFailed: 'Recording failed. Please try again.',
  unsupportedBrowser: 'Your browser does not support the required audio features.',
  configurationInvalid: 'Invalid configuration detected. Please check your environment variables.'
};