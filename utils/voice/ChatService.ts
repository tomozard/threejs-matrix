// Chat WebSocket Service for AI Conversation

import { WebSocketConnection } from '@/utils/websocket';
import { WebSocketConfig, ConversationTurn } from '@/types/voice';

export interface ChatMessage {
  type: 'message' | 'context';
  content: string;
  history?: ConversationTurn[];
  metadata?: {
    emotion?: string;
    context?: string;
    userId?: string;
  };
}

export interface ChatResponse {
  type: 'response' | 'chunk' | 'complete' | 'error';
  text?: string;
  complete?: boolean;
  error?: string;
  metadata?: {
    emotion?: string;
    confidence?: number;
    processingTime?: number;
  };
}

export class ChatService {
  private connection: WebSocketConnection | null = null;
  private currentResponse = '';
  private isProcessing = false;
  private messageQueue: ChatMessage[] = [];
  private processingQueue = false;

  // Event handlers
  public onResponse: ((text: string, complete: boolean) => void) | null = null;
  public onStreamingChunk: ((chunk: string) => void) | null = null;
  public onComplete: ((fullResponse: string) => void) | null = null;
  public onError: ((error: string) => void) | null = null;
  public onConnectionChange: ((connected: boolean) => void) | null = null;
  public onProcessingChange: ((processing: boolean) => void) | null = null;

  constructor(private config: WebSocketConfig) {}

  async connect(): Promise<void> {
    if (this.connection?.isConnected) {
      return;
    }

    this.connection = new WebSocketConnection(
      this.config.chatUrl,
      this.config.maxReconnectAttempts,
      this.config.reconnectInterval
    );

    this.connection.onOpen = () => {
      console.log('Chat WebSocket connected');
      this.onConnectionChange?.(true);
      this.processMessageQueue();
    };

    this.connection.onClose = (code, reason) => {
      console.log('Chat WebSocket disconnected:', code, reason);
      this.onConnectionChange?.(false);
      this.isProcessing = false;
      this.onProcessingChange?.(false);
    };

    this.connection.onMessage = (data: ChatResponse) => {
      this.handleChatResponse(data);
    };

    this.connection.onError = (error) => {
      console.error('Chat WebSocket error:', error);
      this.onError?.('Chat service connection error');
    };

    await this.connection.connect();
  }

  private handleChatResponse(response: ChatResponse): void {
    console.log('💬 Chat Response received:', response);
    
    switch (response.type) {
      case 'chunk':
        if (response.text) {
          console.log('📄 Chat chunk:', response.text);
          this.currentResponse += response.text;
          this.onStreamingChunk?.(response.text);
          this.onResponse?.(this.currentResponse, false);
        }
        break;

      case 'response':
        if (response.text) {
          console.log('💬 Chat response:', response.text, 'Complete:', response.complete);
          this.currentResponse = response.text;
          this.onResponse?.(response.text, response.complete || false);
          
          if (response.complete) {
            this.handleCompletion();
          }
        }
        break;

      case 'complete':
        console.log('✅ Chat completion received');
        this.handleCompletion();
        break;

      case 'error':
        if (response.error) {
          console.error('❌ Chat error:', response.error);
          this.onError?.(response.error);
          this.isProcessing = false;
          this.onProcessingChange?.(false);
        }
        break;

      default:
        console.warn('Unknown chat response type:', response.type);
    }
  }

  private handleCompletion(): void {
    this.isProcessing = false;
    this.onProcessingChange?.(false);
    this.onComplete?.(this.currentResponse);
    this.onResponse?.(this.currentResponse, true);
    this.currentResponse = '';
  }

  async sendMessage(
    content: string, 
    history: ConversationTurn[] = [],
    metadata?: {
      emotion?: string;
      context?: string;
      userId?: string;
    }
  ): Promise<void> {
    const message: ChatMessage = {
      type: 'message',
      content,
      history,
      metadata
    };

    if (this.connection?.isConnected) {
      await this.sendMessageDirect(message);
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
      console.log('Message queued - Chat service not connected');
    }
  }

  private async sendMessageDirect(message: ChatMessage): Promise<void> {
    if (!this.connection?.isConnected) {
      throw new Error('Chat service not connected');
    }

    if (this.isProcessing) {
      console.warn('Previous message still processing, queuing new message');
      this.messageQueue.push(message);
      return;
    }

    try {
      console.log('📤 Sending chat message:', message);
      this.isProcessing = true;
      this.currentResponse = '';
      this.onProcessingChange?.(true);
      
      this.connection.send(message);
      console.log('✅ Chat message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send chat message:', error);
      this.isProcessing = false;
      this.onProcessingChange?.(false);
      throw error;
    }
  }

  private async processMessageQueue(): Promise<void> {
    if (this.processingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    while (this.messageQueue.length > 0 && this.connection?.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          await this.sendMessageDirect(message);
          
          // Wait for current message to complete before sending next
          while (this.isProcessing) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error('Failed to send queued message:', error);
          this.onError?.(`Failed to send message: ${error}`);
        }
      }
    }

    this.processingQueue = false;
  }

  // Send conversation context without expecting a response
  async sendContext(history: ConversationTurn[]): Promise<void> {
    if (!this.connection?.isConnected) {
      console.warn('Cannot send context: Chat service not connected');
      return;
    }

    const contextMessage: ChatMessage = {
      type: 'context',
      content: '',
      history
    };

    this.connection.send(contextMessage);
  }

  // Cancel current processing
  cancelCurrentMessage(): void {
    if (this.isProcessing) {
      this.isProcessing = false;
      this.currentResponse = '';
      this.onProcessingChange?.(false);
      
      // Send cancel signal to server if needed
      if (this.connection?.isConnected) {
        this.connection.send({ type: 'cancel' });
      }
    }
  }

  disconnect(): void {
    this.cancelCurrentMessage();
    this.connection?.disconnect();
    this.connection = null;
    this.messageQueue = [];
    this.processingQueue = false;
  }

  get isConnected(): boolean {
    return this.connection?.isConnected ?? false;
  }

  get processingState(): boolean {
    return this.isProcessing;
  }

  get queueLength(): number {
    return this.messageQueue.length;
  }

  // Clear message queue
  clearQueue(): void {
    this.messageQueue = [];
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
          throw new Error(`Failed to connect to Chat service after ${maxAttempts} attempts`);
        }
        
        const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}