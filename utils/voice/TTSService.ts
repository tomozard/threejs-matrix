// Text-to-Speech WebSocket Service

import { WebSocketConnection } from '@/utils/websocket';
import { WebSocketConfig } from '@/types/voice';

export interface TTSMessage {
  type: 'generate' | 'cancel';
  text?: string;
  config?: {
    voice?: string;
    speed?: number;
    pitch?: number;
    format?: string;
  };
}

export interface TTSResponse {
  type: 'audio_chunk' | 'complete' | 'error' | 'status';
  data?: string; // Base64 or hex encoded audio data
  complete?: boolean;
  error?: string;
  status?: 'started' | 'generating' | 'completed';
  metadata?: {
    duration?: number;
    format?: string;
    sampleRate?: number;
  };
}

export class TTSService {
  private connection: WebSocketConnection | null = null;
  private audioBuffer: Uint8Array[] = [];
  private isGenerating = false;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;

  // Event handlers
  public onAudioChunk: ((data: Uint8Array) => void) | null = null;
  public onAudioComplete: ((audioData: Uint8Array[]) => void) | null = null;
  public onPlaybackStart: (() => void) | null = null;
  public onPlaybackEnd: (() => void) | null = null;
  public onError: ((error: string) => void) | null = null;
  public onConnectionChange: ((connected: boolean) => void) | null = null;
  public onGenerationChange: ((generating: boolean) => void) | null = null;

  constructor(private config: WebSocketConfig) {
    this.initializeAudioContext();
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      this.onError?.('Audio playback not supported in this browser');
    }
  }

  async connect(): Promise<void> {
    if (this.connection?.isConnected) {
      return;
    }

    this.connection = new WebSocketConnection(
      this.config.ttsUrl,
      this.config.maxReconnectAttempts,
      this.config.reconnectInterval
    );

    this.connection.onOpen = () => {
      console.log('TTS WebSocket connected');
      this.onConnectionChange?.(true);
    };

    this.connection.onClose = (code, reason) => {
      console.log('TTS WebSocket disconnected:', code, reason);
      this.onConnectionChange?.(false);
      this.isGenerating = false;
      this.onGenerationChange?.(false);
    };

    this.connection.onMessage = (data: TTSResponse) => {
      this.handleTTSResponse(data);
    };

    this.connection.onError = (error) => {
      console.error('TTS WebSocket error:', error);
      console.error('TTS WebSocket URL:', this.config.ttsUrl);
      console.error('TTS WebSocket connectionState:', this.connection?.connectionState);
      
      // Provide more specific error information
      let errorMessage = 'TTS service connection error';
      if (error instanceof Event) {
        errorMessage += ` (${error.type})`;
      }
      
      this.onError?.(errorMessage);
    };

    await this.connection.connect();
  }

  private handleTTSResponse(response: TTSResponse): void {
    console.log('🔊 TTS Response received:', response);
    
    switch (response.type) {
      case 'audio_chunk':
        if (response.data) {
          console.log('🎵 TTS audio chunk received, size:', response.data.length);
          const audioData = this.hexToUint8Array(response.data);
          this.audioBuffer.push(audioData);
          this.onAudioChunk?.(audioData);
          
          // Start playing immediately for streaming
          this.processAudioBuffer();
        }
        break;

      case 'complete':
        console.log('✅ TTS generation complete');
        this.isGenerating = false;
        this.onGenerationChange?.(false);
        this.onAudioComplete?.(this.audioBuffer);
        
        // Ensure all audio is played
        this.processAudioBuffer();
        break;

      case 'status':
        console.log('📊 TTS status:', response.status);
        if (response.status === 'started') {
          this.isGenerating = true;
          this.audioBuffer = [];
          this.onGenerationChange?.(true);
        }
        break;

      case 'error':
        if (response.error) {
          console.error('❌ TTS error:', response.error);
          this.onError?.(response.error);
          this.isGenerating = false;
          this.onGenerationChange?.(false);
        }
        break;

      default:
        console.warn('Unknown TTS response type:', response.type);
    }
  }

  private hexToUint8Array(hexString: string): Uint8Array {
    // Remove any whitespace and ensure even length
    const cleanHex = hexString.replace(/\s/g, '');
    const length = cleanHex.length / 2;
    const result = new Uint8Array(length);
    
    for (let i = 0; i < length; i++) {
      result[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }
    
    return result;
  }

  private async processAudioBuffer(): Promise<void> {
    if (!this.audioContext || this.audioBuffer.length === 0) {
      return;
    }

    try {
      // Process each chunk individually for streaming playback
      for (const chunk of this.audioBuffer) {
        const audioBuffer = await this.createAudioBuffer(chunk);
        if (audioBuffer) {
          this.audioQueue.push(audioBuffer);
        }
      }
      
      // Clear processed buffer
      this.audioBuffer = [];
      
      // Start playback if not already playing
      if (!this.isPlaying) {
        this.playNextInQueue();
      }
    } catch (error) {
      console.error('Failed to process audio buffer:', error);
      this.onError?.('Failed to process audio data');
    }
  }

  private async createAudioBuffer(audioData: Uint8Array): Promise<AudioBuffer | null> {
    if (!this.audioContext) {
      return null;
    }

    try {
      // Assume PCM16 format (16-bit, 16kHz, mono)
      const sampleRate = 16000;
      const channels = 1;
      const bytesPerSample = 2;
      const samples = audioData.length / bytesPerSample;

      const audioBuffer = this.audioContext.createBuffer(channels, samples, sampleRate);
      const channelData = audioBuffer.getChannelData(0);

      // Convert 16-bit PCM to float32
      for (let i = 0; i < samples; i++) {
        const sample = (audioData[i * 2] | (audioData[i * 2 + 1] << 8));
        // Convert from signed 16-bit to float32 (-1 to 1)
        channelData[i] = sample < 32768 ? sample / 32768 : (sample - 65536) / 32768;
      }

      return audioBuffer;
    } catch (error) {
      console.error('Failed to create AudioBuffer:', error);
      return null;
    }
  }

  private async playNextInQueue(): Promise<void> {
    if (this.isPlaying || this.audioQueue.length === 0 || !this.audioContext) {
      return;
    }

    this.isPlaying = true;
    this.onPlaybackStart?.();

    const audioBuffer = this.audioQueue.shift()!;
    
    try {
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.audioContext.destination);

      this.currentSource.onended = () => {
        this.isPlaying = false;
        this.currentSource = null;
        
        // Play next in queue or signal completion
        if (this.audioQueue.length > 0) {
          this.playNextInQueue();
        } else {
          this.onPlaybackEnd?.();
        }
      };

      this.currentSource.start();
    } catch (error) {
      console.error('Failed to play audio:', error);
      this.isPlaying = false;
      this.onError?.('Audio playback failed');
    }
  }

  async generateSpeech(
    text: string,
    config?: {
      voice?: string;
      speed?: number;
      pitch?: number;
      format?: string;
    }
  ): Promise<void> {
    if (!this.connection?.isConnected) {
      throw new Error('TTS service not connected');
    }

    if (this.isGenerating) {
      console.warn('TTS generation already in progress');
      return;
    }

    console.log('🎤 Generating TTS for text:', text);

    const message: TTSMessage = {
      type: 'generate',
      text,
      config: config || {
        voice: 'default',
        speed: 1.0,
        pitch: 1.0,
        format: 'pcm16'
      }
    };

    console.log('📤 Sending TTS message:', message);
    this.connection.send(message);
    console.log('✅ TTS generation request sent');
  }

  cancelGeneration(): void {
    if (this.isGenerating && this.connection?.isConnected) {
      const cancelMessage: TTSMessage = {
        type: 'cancel'
      };
      
      this.connection.send(cancelMessage);
      this.isGenerating = false;
      this.onGenerationChange?.(false);
    }
  }

  stopPlayback(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    
    this.isPlaying = false;
    this.audioQueue = [];
  }

  disconnect(): void {
    this.stopPlayback();
    this.cancelGeneration();
    this.connection?.disconnect();
    this.connection = null;
    this.audioBuffer = [];
    this.audioQueue = [];
  }

  get isConnected(): boolean {
    return this.connection?.isConnected ?? false;
  }

  get generatingState(): boolean {
    return this.isGenerating;
  }

  get playingState(): boolean {
    return this.isPlaying;
  }

  get queueLength(): number {
    return this.audioQueue.length;
  }

  // Retry connection with exponential backoff
  async retryConnection(maxAttempts = 3): Promise<void> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        await this.connect();
        return;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to connect to TTS service after ${maxAttempts} attempts`);
        }
        
        const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Resume audio context (required for some browsers)
  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}