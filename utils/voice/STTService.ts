// Speech-to-Text WebSocket Service

import { WebSocketConnection } from '@/utils/websocket';
import { WebSocketConfig } from '@/types/voice';

export interface STTMessage {
  type: 'start' | 'audio' | 'stop';
  data?: ArrayBuffer;
  config?: {
    sampleRate: number;
    channels: number;
    format: string;
  };
}

export interface STTResponse {
  type: 'transcription' | 'error' | 'status';
  text?: string;
  emotion?: string;
  confidence?: number;
  error?: string;
  status?: 'started' | 'processing' | 'completed';
}

export class STTService {
  private connection: WebSocketConnection | null = null;
  private isRecording = false;
  private audioQueue: ArrayBuffer[] = [];
  private processingQueue = false;

  // Event handlers
  public onTranscription: ((text: string, emotion: string, confidence: number) => void) | null = null;
  public onError: ((error: string) => void) | null = null;
  public onStatusChange: ((status: string) => void) | null = null;
  public onConnectionChange: ((connected: boolean) => void) | null = null;

  constructor(private config: WebSocketConfig) {}

  async connect(): Promise<void> {
    if (this.connection?.isConnected) {
      return;
    }

    this.connection = new WebSocketConnection(
      this.config.sttUrl,
      this.config.maxReconnectAttempts,
      this.config.reconnectInterval
    );

    this.connection.onOpen = () => {
      console.log('STT WebSocket connected');
      this.onConnectionChange?.(true);
      
      // If we were recording before disconnect, restart recording
      if (this.isRecording) {
        console.log('🔄 Restarting STT recording after reconnection...');
        this.startRecording({
          sampleRate: 16000,
          channels: 1,
          format: 'pcm16'
        }).catch(console.error);
      }
    };

    this.connection.onClose = (code, reason) => {
      console.log('STT WebSocket disconnected:', code, reason);
      this.onConnectionChange?.(false);
      this.isRecording = false;
    };

    this.connection.onMessage = (data: STTResponse) => {
      this.handleSTTResponse(data);
    };

    this.connection.onError = (error) => {
      console.error('STT WebSocket error:', error);
      this.onError?.('WebSocket connection error');
    };

    await this.connection.connect();
  }

  private handleSTTResponse(response: STTResponse): void {
    console.log('🎤 STT Response received:', response);
    
    switch (response.type) {
      case 'transcription':
        if (response.text) {
          console.log('📝 STT Transcription:', response.text, 'Confidence:', response.confidence);
          this.onTranscription?.(
            response.text,
            response.emotion || '',
            response.confidence || 0
          );
        } else {
          console.warn('⚠️ STT transcription response has no text');
        }
        break;

      case 'status':
        if (response.status) {
          this.onStatusChange?.(response.status);
        }
        break;

      case 'error':
        if (response.error) {
          this.onError?.(response.error);
        }
        break;

      default:
        console.warn('Unknown STT response type:', response.type);
    }
  }

  async startRecording(audioConfig?: {
    sampleRate: number;
    channels: number;
    format: string;
  }): Promise<void> {
    if (!this.connection?.isConnected) {
      throw new Error('STT service not connected');
    }

    if (this.isRecording) {
      console.warn('Recording already in progress');
      return;
    }

    const startMessage: STTMessage = {
      type: 'start',
      config: audioConfig || {
        sampleRate: 16000,
        channels: 1,
        format: 'pcm16'
      }
    };

    this.connection.send(startMessage);
    this.isRecording = true;
    this.audioQueue = [];
  }

  sendAudioChunk(audioData: ArrayBuffer): void {
    if (!this.connection?.isConnected) {
      console.warn('Cannot send audio: STT not connected');
      // Try to reconnect if disconnected during recording
      if (this.isRecording) {
        console.log('🔄 Attempting to reconnect STT during recording...');
        this.retryConnection(1).catch(console.error);
      }
      return;
    }

    if (!this.isRecording) {
      console.warn('Cannot send audio: Recording not started');
      return;
    }

    // Queue audio data for processing
    this.audioQueue.push(audioData);
    this.processAudioQueue();
  }

  private async processAudioQueue(): Promise<void> {
    if (this.processingQueue || this.audioQueue.length === 0) {
      return;
    }

    console.log(`📦 Processing audio queue: ${this.audioQueue.length} chunks`);
    this.processingQueue = true;
    let totalBytesSent = 0;

    while (this.audioQueue.length > 0) {
      const audioData = this.audioQueue.shift();
      if (audioData && this.connection?.isConnected && this.isRecording) {
        try {
          // Send as binary data for audio chunks
          this.connection.sendBinary(audioData);
          totalBytesSent += audioData.byteLength;
          console.log(`📤 Sent audio chunk: ${audioData.byteLength} bytes (total: ${totalBytesSent})`);
        } catch (error) {
          console.error('Failed to send audio chunk:', error);
          this.onError?.('Failed to send audio data');
        }
      }

      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    console.log(`✅ Audio queue processed: ${totalBytesSent} total bytes sent`);
    this.processingQueue = false;
  }

  async stopRecording(): Promise<void> {
    if (!this.connection?.isConnected) {
      console.warn('Cannot stop recording: STT not connected');
      return;
    }

    if (!this.isRecording) {
      console.warn('Recording not in progress');
      return;
    }

    console.log('🛑 Stopping STT recording...');

    // Process any remaining audio in queue
    await this.processAudioQueue();
    console.log('📦 Audio queue processed');

    const stopMessage: STTMessage = {
      type: 'stop'
    };

    console.log('📤 Sending stop message to STT:', stopMessage);
    this.connection.send(stopMessage);
    this.isRecording = false;
    console.log('✅ STT stop message sent, waiting for transcription...');
  }

  disconnect(): void {
    if (this.isRecording) {
      this.stopRecording().catch(console.error);
    }
    
    this.connection?.disconnect();
    this.connection = null;
    this.audioQueue = [];
    this.processingQueue = false;
  }

  get isConnected(): boolean {
    return this.connection?.isConnected ?? false;
  }

  get recordingState(): boolean {
    return this.isRecording;
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
          throw new Error(`Failed to connect to STT service after ${maxAttempts} attempts`);
        }
        
        const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}