// Voice Integration Utilities - Main Export

export * from '@/types/voice';
export * from '@/utils/websocket';
export * from '@/utils/audio';
export * from '@/utils/conversation';
export * from '@/config/voice';
export * from './AudioManager';
export * from './STTService';
export * from './ChatService';
export * from './TTSService';
export * from './VoiceServiceManager';

// Re-export main classes for convenience
export { WebSocketManager, WebSocketConnection } from '@/utils/websocket';
export { AudioProcessor } from '@/utils/audio';
export { ConversationManager } from '@/utils/conversation';
export { AudioManager } from './AudioManager';
export { STTService } from './STTService';
export { ChatService } from './ChatService';
export { TTSService } from './TTSService';
export { VoiceServiceManager } from './VoiceServiceManager';