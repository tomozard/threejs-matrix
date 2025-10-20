// Voice Service Manager - Coordinates all voice services

import { STTService } from './STTService';
import { ChatService } from './ChatService';
import { TTSService } from './TTSService';
import { WebSocketConfig, ConversationTurn, VoiceState } from '@/types/voice';

export interface VoiceServiceEvents {
  onStateChange: (state: VoiceState) => void;
  onTranscription: (text: string, emotion: string) => void;
  onChatResponse: (text: string, complete: boolean) => void;
  onAudioPlayback: (playing: boolean) => void;
  onError: (service: string, error: string) => void;
  onConnectionChange: (service: string, connected: boolean) => void;
}

export class VoiceServiceManager {
  private sttService: STTService;
  private chatService: ChatService;
  private ttsService: TTSService;
  private currentState: VoiceState = VoiceState.IDLE;
  private connectionStates = {
    stt: false,
    chat: false,
    tts: false
  };

  // Event handlers
  public events: Partial<VoiceServiceEvents> = {};

  constructor(config: WebSocketConfig) {
    this.sttService = new STTService(config);
    this.chatService = new ChatService(config);
    this.ttsService = new TTSService(config);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // STT Service Events
    this.sttService.onTranscription = (text, emotion, confidence) => {
      this.events.onTranscription?.(text, emotion);
      
      // If we get transcription but no text, reset to idle
      if (!text || text.trim() === '') {
        console.log('📝 Empty transcription received - resetting to IDLE');
        this.setState(VoiceState.IDLE);
      }
    };

    this.sttService.onConnectionChange = (connected) => {
      this.connectionStates.stt = connected;
      this.events.onConnectionChange?.('stt', connected);
    };

    this.sttService.onError = (error) => {
      this.events.onError?.('stt', error);
      // Reset to idle on STT error
      if (this.currentState === VoiceState.RECORDING || this.currentState === VoiceState.PROCESSING) {
        this.setState(VoiceState.IDLE);
      }
    };

    // Chat Service Events
    this.chatService.onResponse = (text, complete) => {
      this.events.onChatResponse?.(text, complete);
      
      if (complete) {
        // Automatically generate TTS for complete responses
        this.generateSpeech(text);
      }
    };

    this.chatService.onConnectionChange = (connected) => {
      this.connectionStates.chat = connected;
      this.events.onConnectionChange?.('chat', connected);
    };

    this.chatService.onError = (error) => {
      this.events.onError?.('chat', error);
      // Reset to idle on chat error
      if (this.currentState === VoiceState.PROCESSING) {
        this.setState(VoiceState.IDLE);
      }
    };

    this.chatService.onProcessingChange = (processing) => {
      if (processing) {
        this.setState(VoiceState.PROCESSING);
        
        // Set timeout to prevent getting stuck in processing state
        setTimeout(() => {
          if (this.currentState === VoiceState.PROCESSING) {
            console.warn('⚠️ Processing timeout - resetting to IDLE');
            this.setState(VoiceState.IDLE);
            this.events.onError?.('chat', 'Processing timeout - no response received');
          }
        }, 15000); // 15 second timeout
      } else {
        // Only reset to IDLE if we're currently processing
        if (this.currentState === VoiceState.PROCESSING) {
          this.setState(VoiceState.IDLE);
        }
      }
    };

    // TTS Service Events
    this.ttsService.onPlaybackStart = () => {
      this.setState(VoiceState.PLAYING);
      this.events.onAudioPlayback?.(true);
    };

    this.ttsService.onPlaybackEnd = () => {
      this.setState(VoiceState.IDLE);
      this.events.onAudioPlayback?.(false);
    };

    this.ttsService.onConnectionChange = (connected) => {
      this.connectionStates.tts = connected;
      this.events.onConnectionChange?.('tts', connected);
    };

    this.ttsService.onError = (error) => {
      this.events.onError?.('tts', error);
      // Reset to idle on TTS error
      if (this.currentState === VoiceState.PLAYING) {
        this.setState(VoiceState.IDLE);
      }
    };
  }

  private setState(newState: VoiceState): void {
    if (this.currentState !== newState) {
      this.currentState = newState;
      this.events.onStateChange?.(newState);
    }
  }

  async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.sttService.connect(),
        this.chatService.connect(),
        this.ttsService.connect()
      ]);
    } catch (error) {
      console.error('Failed to initialize voice services:', error);
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    if (this.currentState !== VoiceState.IDLE) {
      console.warn('Cannot start recording: not in idle state');
      return;
    }

    // Check if minimum services are available
    if (!this.hasMinimumServices()) {
      const available = this.getAvailableServices();
      const missing = [];
      if (!available.stt) missing.push('STT');
      if (!available.chat) missing.push('Chat');
      
      throw new Error(`Cannot start recording: Missing required services: ${missing.join(', ')}`);
    }

    try {
      this.setState(VoiceState.RECORDING);
      
      // Start STT service recording with retry logic
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          await this.sttService.startRecording({
            sampleRate: 16000,
            channels: 1,
            format: 'pcm16'
          });
          
          console.log('STT recording started successfully');
          break;
        } catch (error) {
          retryCount++;
          if (retryCount > maxRetries) {
            throw error;
          }
          
          console.warn(`STT recording failed (attempt ${retryCount}/${maxRetries}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          
          // Try to reconnect STT service
          try {
            await this.sttService.retryConnection(1);
          } catch (reconnectError) {
            console.error('Failed to reconnect STT service:', reconnectError);
          }
        }
      }
    } catch (error) {
      this.setState(VoiceState.IDLE);
      this.events.onError?.('recording', error instanceof Error ? error.message : 'Failed to start recording');
      throw error;
    }
  }

  sendAudioChunk(audioData: ArrayBuffer): void {
    if (this.currentState === VoiceState.RECORDING) {
      this.sttService.sendAudioChunk(audioData);
    }
  }

  async stopRecording(): Promise<void> {
    if (this.currentState !== VoiceState.RECORDING) {
      console.warn('Cannot stop recording: not currently recording');
      return;
    }

    try {
      await this.sttService.stopRecording();
      this.setState(VoiceState.PROCESSING);
    } catch (error) {
      this.setState(VoiceState.IDLE);
      throw error;
    }
  }

  async sendChatMessage(
    message: string, 
    history: ConversationTurn[] = []
  ): Promise<void> {
    if (!this.connectionStates.chat) {
      throw new Error('Chat service not connected');
    }

    try {
      await this.chatService.sendMessage(message, history);
    } catch (error) {
      console.error('Failed to send chat message:', error);
      
      // Try to recover by reconnecting chat service
      try {
        console.log('Attempting to reconnect chat service...');
        await this.chatService.retryConnection(1);
        
        // Retry sending the message
        await this.chatService.sendMessage(message, history);
        console.log('Message sent successfully after reconnection');
      } catch (retryError) {
        this.setState(VoiceState.IDLE);
        this.events.onError?.('chat', 'Failed to send message and reconnection failed');
        throw retryError;
      }
    }
  }

  private async generateSpeech(text: string): Promise<void> {
    try {
      await this.ttsService.generateSpeech(text);
    } catch (error) {
      console.error('Failed to generate speech:', error);
      this.setState(VoiceState.IDLE);
    }
  }

  cancelCurrentOperation(): void {
    switch (this.currentState) {
      case VoiceState.RECORDING:
        this.sttService.stopRecording().catch(console.error);
        break;
      case VoiceState.PROCESSING:
        this.chatService.cancelCurrentMessage();
        break;
      case VoiceState.PLAYING:
        this.ttsService.stopPlayback();
        break;
    }
    
    this.setState(VoiceState.IDLE);
  }

  disconnect(): void {
    this.sttService.disconnect();
    this.chatService.disconnect();
    this.ttsService.disconnect();
    
    this.connectionStates = {
      stt: false,
      chat: false,
      tts: false
    };
    
    this.setState(VoiceState.IDLE);
  }

  // Getters
  get state(): VoiceState {
    return this.currentState;
  }

  get isConnected(): boolean {
    return this.connectionStates.stt && 
           this.connectionStates.chat && 
           this.connectionStates.tts;
  }

  get connectionStatus() {
    return { ...this.connectionStates };
  }

  get isRecording(): boolean {
    return this.currentState === VoiceState.RECORDING;
  }

  get isProcessing(): boolean {
    return this.currentState === VoiceState.PROCESSING;
  }

  get isPlaying(): boolean {
    return this.currentState === VoiceState.PLAYING;
  }

  // Service access for advanced usage
  get services() {
    return {
      stt: this.sttService,
      chat: this.chatService,
      tts: this.ttsService
    };
  }

  // Retry all connections with comprehensive error handling
  async retryConnections(): Promise<void> {
    const retryPromises = [];
    const errors: string[] = [];
    
    if (!this.connectionStates.stt) {
      retryPromises.push(
        this.sttService.retryConnection().catch(error => {
          errors.push(`STT: ${error.message}`);
          return null;
        })
      );
    }
    
    if (!this.connectionStates.chat) {
      retryPromises.push(
        this.chatService.retryConnection().catch(error => {
          errors.push(`Chat: ${error.message}`);
          return null;
        })
      );
    }
    
    if (!this.connectionStates.tts) {
      retryPromises.push(
        this.ttsService.retryConnection().catch(error => {
          errors.push(`TTS: ${error.message}`);
          return null;
        })
      );
    }

    await Promise.all(retryPromises);
    
    if (errors.length > 0) {
      throw new Error(`Connection retry failed: ${errors.join(', ')}`);
    }
  }

  // Graceful degradation - check which services are available
  getAvailableServices(): { stt: boolean; chat: boolean; tts: boolean } {
    return {
      stt: this.connectionStates.stt,
      chat: this.connectionStates.chat,
      tts: this.connectionStates.tts
    };
  }

  // Check if minimum required services are available
  hasMinimumServices(): boolean {
    // At minimum, we need STT and Chat for basic voice interaction
    return this.connectionStates.stt && this.connectionStates.chat;
  }
}