// WebSocket Connection Utilities

import { WebSocketConfig } from '@/types/voice';

export class WebSocketConnection {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectInterval: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private messageQueue: any[] = [];

  // Event handlers
  public onOpen: (() => void) | null = null;
  public onMessage: ((data: any) => void) | null = null;
  public onClose: ((code: number, reason: string) => void) | null = null;
  public onError: ((error: Event) => void) | null = null;

  constructor(
    url: string,
    maxReconnectAttempts = 5,
    reconnectInterval = 1000
  ) {
    this.url = url;
    this.maxReconnectAttempts = maxReconnectAttempts;
    this.reconnectInterval = reconnectInterval;
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.flushMessageQueue();
        this.onOpen?.();
      };

      this.ws.onmessage = (event) => {
        try {
          console.log(`📨 WebSocket message received from ${this.url}:`, event.data);
          const data = JSON.parse(event.data);
          console.log(`📋 Parsed WebSocket data:`, data);
          this.onMessage?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, 'Raw data:', event.data);
        }
      };

      this.ws.onclose = (event) => {
        this.isConnecting = false;
        this.ws = null;
        
        console.log(`WebSocket closed for ${this.url}:`, {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          reconnectAttempts: this.reconnectAttempts
        });
        
        this.onClose?.(event.code, event.reason);
        
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log(`Scheduling reconnect attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`);
          this.scheduleReconnect();
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error(`Max reconnect attempts (${this.maxReconnectAttempts}) reached for ${this.url}`);
        }
      };

      this.ws.onerror = (error) => {
        this.isConnecting = false;
        console.error(`WebSocket error for ${this.url}:`, {
          error,
          readyState: this.ws?.readyState,
          url: this.url,
          reconnectAttempts: this.reconnectAttempts
        });
        this.onError?.(error);
      };

    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(data);
    }
  }

  sendBinary(data: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.warn('Cannot send binary data: WebSocket not connected');
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.messageQueue = [];
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get connectionState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  getWebSocket(): WebSocket {
    if (!this.ws) {
      throw new Error('WebSocket not connected');
    }
    return this.ws;
  }
}

export class WebSocketManager {
  private sttConnection: WebSocketConnection | null = null;
  private ttsConnection: WebSocketConnection | null = null;
  private chatConnection: WebSocketConnection | null = null;
  private config: WebSocketConfig;

  // Event handlers
  public onTranscription: ((text: string, emotion: string) => void) | null = null;
  public onAudioChunk: ((data: string, complete: boolean) => void) | null = null;
  public onChatResponse: ((text: string, complete: boolean) => void) | null = null;
  public onConnectionChange: ((service: string, connected: boolean) => void) | null = null;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  async connectSTT(): Promise<WebSocket> {
    if (!this.sttConnection) {
      this.sttConnection = new WebSocketConnection(
        this.config.sttUrl,
        this.config.maxReconnectAttempts,
        this.config.reconnectInterval
      );

      this.sttConnection.onOpen = () => {
        this.onConnectionChange?.('stt', true);
      };

      this.sttConnection.onClose = () => {
        this.onConnectionChange?.('stt', false);
      };

      this.sttConnection.onMessage = (data) => {
        if (data.type === 'transcription') {
          this.onTranscription?.(data.text, data.emotion || '');
        }
      };

      this.sttConnection.onError = (error) => {
        console.error('STT WebSocket error:', error);
      };
    }

    await this.sttConnection.connect();
    return this.sttConnection.getWebSocket();
  }

  async connectTTS(): Promise<WebSocket> {
    if (!this.ttsConnection) {
      this.ttsConnection = new WebSocketConnection(
        this.config.ttsUrl,
        this.config.maxReconnectAttempts,
        this.config.reconnectInterval
      );

      this.ttsConnection.onOpen = () => {
        this.onConnectionChange?.('tts', true);
      };

      this.ttsConnection.onClose = () => {
        this.onConnectionChange?.('tts', false);
      };

      this.ttsConnection.onMessage = (data) => {
        if (data.type === 'audio_chunk') {
          this.onAudioChunk?.(data.data, data.complete || false);
        }
      };

      this.ttsConnection.onError = (error) => {
        console.error('TTS WebSocket error:', error);
      };
    }

    await this.ttsConnection.connect();
    return this.ttsConnection.getWebSocket();
  }

  async connectChat(): Promise<WebSocket> {
    if (!this.chatConnection) {
      this.chatConnection = new WebSocketConnection(
        this.config.chatUrl,
        this.config.maxReconnectAttempts,
        this.config.reconnectInterval
      );

      this.chatConnection.onOpen = () => {
        this.onConnectionChange?.('chat', true);
      };

      this.chatConnection.onClose = () => {
        this.onConnectionChange?.('chat', false);
      };

      this.chatConnection.onMessage = (data) => {
        if (data.type === 'response') {
          this.onChatResponse?.(data.text, data.complete || false);
        }
      };

      this.chatConnection.onError = (error) => {
        console.error('Chat WebSocket error:', error);
      };
    }

    await this.chatConnection.connect();
    return this.chatConnection.getWebSocket();
  }

  sendAudioData(data: ArrayBuffer): void {
    if (this.sttConnection?.isConnected) {
      this.sttConnection.sendBinary(data);
    } else {
      console.warn('Cannot send audio data: STT not connected');
    }
  }

  sendChatMessage(message: string, history: any[]): void {
    if (this.chatConnection?.isConnected) {
      this.chatConnection.send({
        type: 'message',
        content: message,
        history: history
      });
    } else {
      console.warn('Cannot send chat message: Chat not connected');
    }
  }

  disconnect(): void {
    this.sttConnection?.disconnect();
    this.ttsConnection?.disconnect();
    this.chatConnection?.disconnect();
  }

  get isSTTConnected(): boolean {
    return this.sttConnection?.isConnected ?? false;
  }

  get isTTSConnected(): boolean {
    return this.ttsConnection?.isConnected ?? false;
  }

  get isChatConnected(): boolean {
    return this.chatConnection?.isConnected ?? false;
  }
}