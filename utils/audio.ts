// Audio Processing Utilities

import { AudioConfig } from '@/types/voice';

export class AudioProcessor {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private isPlaying = false;
  private audioQueue: Uint8Array[] = [];
  private currentSource: AudioBufferSourceNode | null = null;

  // Event handlers
  public onRecordingStart: (() => void) | null = null;
  public onRecordingStop: ((audioBlob: Blob) => void) | null = null;
  public onRecordingError: ((error: Error) => void) | null = null;
  public onPlaybackStart: (() => void) | null = null;
  public onPlaybackEnd: (() => void) | null = null;
  public onRealtimeAudioData: ((audioData: ArrayBuffer) => void) | null = null;

  private config: AudioConfig = {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    format: 'pcm16'
  };

  constructor(config?: Partial<AudioConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  async initializeAudioContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate
      });
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async requestMicrophoneAccess(): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.stream;
    } catch (error) {
      throw new Error(`Failed to access microphone: ${error}`);
    }
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) {
      return;
    }

    try {
      await this.initializeAudioContext();
      
      if (!this.stream) {
        await this.requestMicrophoneAccess();
      }

      this.audioChunks = [];
      
      // Configure MediaRecorder for PCM16 format
      const options: MediaRecorderOptions = {
        mimeType: this.getSupportedMimeType(),
        audioBitsPerSecond: this.config.sampleRate * this.config.bitsPerSample * this.config.channels
      };

      this.mediaRecorder = new MediaRecorder(this.stream!, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          
          // Emit real-time audio data for streaming to STT service
          this.processRealtimeAudioChunk(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.onRecordingStop?.(audioBlob);
        this.isRecording = false;
      };

      this.mediaRecorder.onerror = (event) => {
        const error = new Error(`MediaRecorder error: ${event}`);
        this.onRecordingError?.(error);
        this.isRecording = false;
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      this.onRecordingStart?.();

    } catch (error) {
      this.isRecording = false;
      throw error;
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.isRecording || !this.mediaRecorder) {
        reject(new Error('Not currently recording'));
        return;
      }

      const originalHandler = this.onRecordingStop;
      this.onRecordingStop = (audioBlob: Blob) => {
        this.onRecordingStop = originalHandler;
        resolve(audioBlob);
        originalHandler?.(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  async playAudioChunks(chunks: Uint8Array[]): Promise<void> {
    if (this.isPlaying) {
      // Queue chunks for sequential playback
      this.audioQueue.push(...chunks);
      return;
    }

    try {
      await this.initializeAudioContext();
      this.isPlaying = true;
      this.onPlaybackStart?.();

      // Convert hex chunks to audio buffer and play
      for (const chunk of chunks) {
        await this.playAudioChunk(chunk);
      }

      // Play any queued chunks
      while (this.audioQueue.length > 0) {
        const queuedChunk = this.audioQueue.shift()!;
        await this.playAudioChunk(queuedChunk);
      }

      this.isPlaying = false;
      this.onPlaybackEnd?.();

    } catch (error) {
      this.isPlaying = false;
      throw error;
    }
  }

  private async playAudioChunk(chunk: Uint8Array): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    try {
      // Convert Uint8Array to ArrayBuffer
      const arrayBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer;
      
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Create and play audio source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      this.currentSource = source;
      
      return new Promise((resolve) => {
        source.onended = () => {
          this.currentSource = null;
          resolve();
        };
        source.start();
      });

    } catch (error) {
      console.error('Failed to play audio chunk:', error);
      // Continue with next chunk even if this one fails
    }
  }

  stopPlayback(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.audioQueue = [];
    this.isPlaying = false;
  }

  // Convert hex string to Uint8Array (for backend audio data)
  hexToUint8Array(hexString: string): Uint8Array {
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    return bytes;
  }

  // Convert audio blob to PCM16 ArrayBuffer
  async blobToPCM16(blob: Blob): Promise<ArrayBuffer> {
    const buffer = await blob.arrayBuffer();
    // Create a copy to ensure we have an ArrayBuffer
    const arrayBuffer = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(arrayBuffer).set(new Uint8Array(buffer));
    
    if (!this.audioContext) {
      await this.initializeAudioContext();
    }

    try {
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      return this.audioBufferToPCM16(audioBuffer);
    } catch (error) {
      // If decoding fails, return raw data (might already be PCM)
      return arrayBuffer;
    }
  }

  private audioBufferToPCM16(audioBuffer: AudioBuffer): ArrayBuffer {
    const length = audioBuffer.length * audioBuffer.numberOfChannels;
    const result = new Int16Array(length);
    
    let offset = 0;
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        // Convert float32 (-1 to 1) to int16 (-32768 to 32767)
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        result[offset++] = sample * 0x7FFF;
      }
    }
    
    return result.buffer;
  }

  private async processRealtimeAudioChunk(audioBlob: Blob): Promise<void> {
    try {
      // For real-time streaming, send raw audio data
      const arrayBuffer = await audioBlob.arrayBuffer()
      this.onRealtimeAudioData?.(arrayBuffer);
    } catch (error) {
      console.error('Failed to process realtime audio chunk:', error);
    }
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Fallback
  }

  cleanup(): void {
    this.stopRecording().catch(() => {});
    this.stopPlayback();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  get recordingState(): boolean {
    return this.isRecording;
  }

  get playbackState(): boolean {
    return this.isPlaying;
  }
}