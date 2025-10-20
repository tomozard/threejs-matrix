// Voice Integration Types and Interfaces

export enum VoiceState {
    IDLE = 'idle',
    RECORDING = 'recording',
    PROCESSING = 'processing',
    PLAYING = 'playing'
}

export interface VoiceInteractionState {
    currentState: VoiceState;
    isConnected: boolean;
    error: string | null;
    recordingDuration: number;
}

export interface ConversationTurn {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    emotion?: string;
}

export interface ConversationState {
    history: ConversationTurn[];
    currentTurn: ConversationTurn | null;
    addTurn(turn: ConversationTurn): void;
    getCurrentContext(): ConversationTurn[];
}

export interface VisualEffectParams {
    largeFontProportion: number;  // 0.0 - 1.0
    speedMultiplier: number;      // 0.1 - 5.0
    transitionDuration: number;   // milliseconds
}

export interface AudioManager {
    startRecording(): Promise<void>;
    stopRecording(): Promise<Blob>;
    playAudioChunks(chunks: Uint8Array[]): Promise<void>;
    isRecording: boolean;
    isPlaying: boolean;
}

export interface WebSocketManager {
    connectSTT(): Promise<WebSocket>;
    connectTTS(): Promise<WebSocket>;
    connectChat(): Promise<WebSocket>;
    sendAudioData(data: ArrayBuffer): void;
    sendChatMessage(message: string, history: ConversationTurn[]): void;
    onTranscription: (text: string, emotion: string) => void;
    onAudioChunk: (data: string, complete: boolean) => void;
    onChatResponse: (text: string, complete: boolean) => void;
}

export interface VoiceButtonProps {
    isRecording: boolean;
    isProcessing: boolean;
    onStartRecording: () => void;
    onStopRecording: () => void;
}

// Basic WebSocket Message Types (detailed versions in service files)
export interface BasicSTTMessage {
    type: 'start' | 'audio' | 'stop';
    data?: ArrayBuffer;
}

export interface BasicTTSMessage {
    type: 'generate';
    text: string;
}

export interface BasicChatMessage {
    type: 'message';
    content: string;
    history: ConversationTurn[];
}

// Audio Configuration
export interface AudioConfig {
    sampleRate: number;
    channels: number;
    bitsPerSample: number;
    format: 'pcm16' | 'wav' | 'mp3';
}

// WebSocket Configuration
export interface WebSocketConfig {
    sttUrl: string;
    ttsUrl: string;
    chatUrl: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
    connectionTimeout?: number;
}