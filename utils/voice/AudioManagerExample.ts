// AudioManager Usage Example
// This file demonstrates how to use the AudioManager service

import { AudioManager } from './AudioManager';
import { VoiceState } from '@/types/voice';

export class VoiceInteractionExample {
  private audioManager: AudioManager;
  private currentState: VoiceState = VoiceState.IDLE;

  constructor() {
    this.audioManager = new AudioManager();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Recording events
    this.audioManager.onRecordingStart = () => {
      this.currentState = VoiceState.RECORDING;
      console.log('Recording started');
    };

    this.audioManager.onRecordingStop = (audioBlob: Blob) => {
      this.currentState = VoiceState.PROCESSING;
      console.log('Recording stopped, blob size:', audioBlob.size);
    };

    this.audioManager.onRecordingError = (error: Error) => {
      this.currentState = VoiceState.IDLE;
      console.error('Recording error:', error.message);
    };

    // Playback events
    this.audioManager.onPlaybackStart = () => {
      this.currentState = VoiceState.PLAYING;
      console.log('Playback started');
    };

    this.audioManager.onPlaybackEnd = () => {
      this.currentState = VoiceState.IDLE;
      console.log('Playback ended');
    };

    // Audio data events
    this.audioManager.onAudioData = (data: ArrayBuffer) => {
      console.log('Audio data ready for transmission:', data.byteLength, 'bytes');
      // Here you would typically send the data to your WebSocket service
    };

    this.audioManager.onAudioChunkReceived = (chunk: Uint8Array) => {
      console.log('Audio chunk received for playback:', chunk.length, 'bytes');
    };
  }

  // Example: Start voice recording
  async startVoiceRecording(): Promise<void> {
    try {
      // Check microphone access first
      const hasAccess = await this.audioManager.checkMicrophoneAccess();
      if (!hasAccess) {
        const granted = await this.audioManager.requestMicrophonePermission();
        if (!granted) {
          throw new Error('Microphone access denied');
        }
      }

      await this.audioManager.startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }

  // Example: Stop voice recording
  async stopVoiceRecording(): Promise<Blob | null> {
    try {
      if (this.audioManager.isRecording) {
        return await this.audioManager.stopRecording();
      }
      return null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return null;
    }
  }

  // Example: Play TTS response from hex chunks
  async playTTSResponse(hexChunks: string[]): Promise<void> {
    try {
      await this.audioManager.playHexAudioChunks(hexChunks);
    } catch (error) {
      console.error('Failed to play TTS response:', error);
    }
  }

  // Example: Stream TTS chunks as they arrive
  async streamTTSChunk(hexChunk: string): Promise<void> {
    try {
      await this.audioManager.streamHexAudioChunk(hexChunk);
    } catch (error) {
      console.error('Failed to stream TTS chunk:', error);
    }
  }

  // Example: Complete voice interaction flow
  async handleVoiceInteraction(): Promise<void> {
    try {
      // 1. Start recording
      await this.startVoiceRecording();
      
      // 2. Wait for user to finish speaking (in real app, this would be triggered by button release)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 3. Stop recording and get audio
      const audioBlob = await this.stopVoiceRecording();
      
      if (audioBlob) {
        // 4. In a real app, you would send this to STT service via WebSocket
        console.log('Would send audio to STT service:', audioBlob.size, 'bytes');
        
        // 5. Simulate receiving TTS response chunks
        const mockHexChunks = [
          '52494646', // Mock hex audio data
          '57415645', // These would come from your TTS service
          '666d7420'
        ];
        
        // 6. Play the response
        await this.playTTSResponse(mockHexChunks);
      }
    } catch (error) {
      console.error('Voice interaction failed:', error);
    }
  }

  // Get current interaction state
  getCurrentState(): VoiceState {
    return this.currentState;
  }

  // Get recording duration
  getRecordingDuration(): number {
    return this.audioManager.getRecordingDuration();
  }

  // Check if currently recording
  isRecording(): boolean {
    return this.audioManager.isRecording;
  }

  // Check if currently playing
  isPlaying(): boolean {
    return this.audioManager.isPlaying;
  }

  // Cleanup resources
  cleanup(): void {
    this.audioManager.cleanup();
  }
}

// Export for easy testing
export { AudioManager };