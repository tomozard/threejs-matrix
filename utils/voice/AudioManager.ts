// AudioManager Service - Implements audio capture and playback functionality

import { AudioManager as IAudioManager, AudioConfig } from '@/types/voice';
import { AudioProcessor } from '@/utils/audio';
import { DEFAULT_AUDIO_CONFIG, AUDIO_PROCESSING, ERROR_MESSAGES } from '@/config/voice';

export class AudioManager implements IAudioManager {
  private audioProcessor: AudioProcessor;
  private _isRecording = false;
  private _isPlaying = false;
  private recordingStartTime: number = 0;
  private maxRecordingDuration: number;
  
  // Audio streaming and buffering
  private audioBufferQueue: AudioBuffer[] = [];
  private isProcessingQueue = false;
  private currentPlaybackPromise: Promise<void> | null = null;

  // Event handlers
  public onRecordingStart: (() => void) | null = null;
  public onRecordingStop: ((audioBlob: Blob) => void) | null = null;
  public onRecordingError: ((error: Error) => void) | null = null;
  public onPlaybackStart: (() => void) | null = null;
  public onPlaybackEnd: (() => void) | null = null;
  public onAudioData: ((data: ArrayBuffer) => void) | null = null;
  public onAudioChunkReceived: ((chunk: Uint8Array) => void) | null = null;

  constructor(config?: Partial<AudioConfig>) {
    const audioConfig = { ...DEFAULT_AUDIO_CONFIG, ...config };
    this.audioProcessor = new AudioProcessor(audioConfig);
    this.maxRecordingDuration = AUDIO_PROCESSING.maxRecordingDuration;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.audioProcessor.onRecordingStart = () => {
      this._isRecording = true;
      this.recordingStartTime = Date.now();
      this.onRecordingStart?.();
    };

    this.audioProcessor.onRecordingStop = (audioBlob: Blob) => {
      this._isRecording = false;
      this.onRecordingStop?.(audioBlob);
      
      // Convert blob to PCM16 and emit audio data
      this.processBlobToAudioData(audioBlob);
    };

    this.audioProcessor.onRecordingError = (error: Error) => {
      this._isRecording = false;
      this.onRecordingError?.(error);
    };

    this.audioProcessor.onPlaybackStart = () => {
      this._isPlaying = true;
      this.onPlaybackStart?.();
    };

    this.audioProcessor.onPlaybackEnd = () => {
      this._isPlaying = false;
      this.onPlaybackEnd?.();
    };

    // Real-time audio data streaming
    this.audioProcessor.onRealtimeAudioData = (audioData: ArrayBuffer) => {
      this.onAudioData?.(audioData);
    };
  }

  async startRecording(): Promise<void> {
    if (this._isRecording) {
      throw new Error('Recording is already in progress');
    }

    try {
      // Check for microphone support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(ERROR_MESSAGES.unsupportedBrowser);
      }

      await this.audioProcessor.startRecording();

      // Set up automatic stop after max duration
      setTimeout(() => {
        if (this._isRecording) {
          this.stopRecording().catch(console.error);
        }
      }, this.maxRecordingDuration);

    } catch (error) {
      this._isRecording = false;
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          throw new Error(ERROR_MESSAGES.microphoneAccess);
        }
        throw new Error(`${ERROR_MESSAGES.recordingFailed}: ${error.message}`);
      }
      throw new Error(ERROR_MESSAGES.recordingFailed);
    }
  }

  async stopRecording(): Promise<Blob> {
    if (!this._isRecording) {
      throw new Error('No recording in progress');
    }

    try {
      const audioBlob = await this.audioProcessor.stopRecording();
      return audioBlob;
    } catch (error) {
      this._isRecording = false;
      throw error;
    }
  }

  async playAudioChunks(chunks: Uint8Array[]): Promise<void> {
    if (chunks.length === 0) {
      return;
    }

    try {
      // Process chunks for streaming playback
      for (const chunk of chunks) {
        this.onAudioChunkReceived?.(chunk);
        await this.queueAudioChunk(chunk);
      }
      
      // Start processing the queue if not already processing
      if (!this.isProcessingQueue) {
        await this.processAudioQueue();
      }
    } catch (error) {
      this._isPlaying = false;
      if (error instanceof Error) {
        throw new Error(`${ERROR_MESSAGES.audioPlayback}: ${error.message}`);
      }
      throw new Error(ERROR_MESSAGES.audioPlayback);
    }
  }

  // Convert hex string chunks to Uint8Array for playback
  playHexAudioChunks(hexChunks: string[]): Promise<void> {
    const uint8Chunks = hexChunks.map(hex => this.hexToUint8Array(hex));
    return this.playAudioChunks(uint8Chunks);
  }

  // Stream a single hex audio chunk (for real-time TTS streaming)
  async streamHexAudioChunk(hexChunk: string): Promise<void> {
    const uint8Chunk = this.hexToUint8Array(hexChunk);
    this.onAudioChunkReceived?.(uint8Chunk);
    await this.queueAudioChunk(uint8Chunk);
    
    if (!this.isProcessingQueue) {
      await this.processAudioQueue();
    }
  }

  // Enhanced hex to Uint8Array conversion with validation
  private hexToUint8Array(hexString: string): Uint8Array {
    // Remove any whitespace and validate hex format
    const cleanHex = hexString.replace(/\s/g, '');
    
    if (cleanHex.length % 2 !== 0) {
      throw new Error('Invalid hex string: length must be even');
    }
    
    if (!/^[0-9A-Fa-f]*$/.test(cleanHex)) {
      throw new Error('Invalid hex string: contains non-hex characters');
    }

    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  // Queue audio chunk for streaming playback
  private async queueAudioChunk(chunk: Uint8Array): Promise<void> {
    try {
      // Initialize audio context if needed
      await this.audioProcessor.initializeAudioContext();
      
      // Convert chunk to audio buffer
      const audioBuffer = await this.uint8ArrayToAudioBuffer(chunk);
      if (audioBuffer) {
        this.audioBufferQueue.push(audioBuffer);
      }
    } catch (error) {
      console.error('Failed to queue audio chunk:', error);
    }
  }

  // Process queued audio buffers for seamless playback
  private async processAudioQueue(): Promise<void> {
    if (this.isProcessingQueue || this.audioBufferQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    this._isPlaying = true;
    this.onPlaybackStart?.();

    try {
      while (this.audioBufferQueue.length > 0) {
        const audioBuffer = this.audioBufferQueue.shift()!;
        await this.playAudioBuffer(audioBuffer);
      }
    } catch (error) {
      console.error('Error processing audio queue:', error);
    } finally {
      this.isProcessingQueue = false;
      this._isPlaying = false;
      this.onPlaybackEnd?.();
    }
  }

  // Convert Uint8Array to AudioBuffer
  private async uint8ArrayToAudioBuffer(chunk: Uint8Array): Promise<AudioBuffer | null> {
    try {
      // Ensure audio context is available
      await this.audioProcessor.initializeAudioContext();
      const audioContext = (this.audioProcessor as any).audioContext;
      
      if (!audioContext) {
        throw new Error('AudioContext not available');
      }

      // Convert Uint8Array to ArrayBuffer
      const arrayBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      console.error('Failed to convert Uint8Array to AudioBuffer:', error);
      return null;
    }
  }

  // Play a single audio buffer
  private async playAudioBuffer(audioBuffer: AudioBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const audioContext = (this.audioProcessor as any).audioContext;
        if (!audioContext) {
          reject(new Error('AudioContext not available'));
          return;
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        source.onended = () => resolve();
        source.onerror = (error: Event) => reject(new Error('Audio playback failed'));
        
        source.start();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Stop current playback
  stopPlayback(): void {
    this.audioProcessor.stopPlayback();
    this.clearAudioQueue();
    this.isProcessingQueue = false;
    this._isPlaying = false;
  }

  // Get recording duration in milliseconds
  getRecordingDuration(): number {
    if (!this._isRecording) {
      return 0;
    }
    return Date.now() - this.recordingStartTime;
  }

  // Check if microphone access is available
  async checkMicrophoneAccess(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  // Request microphone permissions
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      await this.audioProcessor.requestMicrophoneAccess();
      return true;
    } catch {
      return false;
    }
  }

  private async processBlobToAudioData(audioBlob: Blob): Promise<void> {
    try {
      const pcm16Data = await this.audioProcessor.blobToPCM16(audioBlob);
      this.onAudioData?.(pcm16Data);
    } catch (error) {
      console.error('Failed to process audio blob to PCM16:', error);
    }
  }

  // Clear audio buffer queue
  clearAudioQueue(): void {
    this.audioBufferQueue = [];
    this.isProcessingQueue = false;
  }

  // Get current queue length for monitoring
  getQueueLength(): number {
    return this.audioBufferQueue.length;
  }

  // Wait for current playback to complete
  async waitForPlaybackComplete(): Promise<void> {
    if (this.currentPlaybackPromise) {
      await this.currentPlaybackPromise;
    }
  }

  // Cleanup resources
  cleanup(): void {
    this.audioProcessor.cleanup();
    this.clearAudioQueue();
    this._isRecording = false;
    this._isPlaying = false;
  }

  // Getters for interface compliance
  get isRecording(): boolean {
    return this._isRecording;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }
}