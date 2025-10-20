// Conversation State Management

import { ConversationTurn, ConversationState } from '@/types/voice';

export class ConversationManager implements ConversationState {
  private _history: ConversationTurn[] = [];
  private _currentTurn: ConversationTurn | null = null;
  private maxHistoryLength: number;

  constructor(maxHistoryLength = 20) {
    this.maxHistoryLength = maxHistoryLength;
  }

  get history(): ConversationTurn[] {
    return [...this._history];
  }

  get currentTurn(): ConversationTurn | null {
    return this._currentTurn;
  }

  addTurn(turn: ConversationTurn): void {
    // Add the turn to history
    this._history.push(turn);
    
    // Keep history within limits
    if (this._history.length > this.maxHistoryLength) {
      this._history = this._history.slice(-this.maxHistoryLength);
    }
    
    // Update current turn
    this._currentTurn = turn;
  }

  getCurrentContext(): ConversationTurn[] {
    // Return recent conversation history for context
    const contextLength = Math.min(10, this._history.length);
    return this._history.slice(-contextLength);
  }

  addUserMessage(content: string, emotion?: string): ConversationTurn {
    const turn: ConversationTurn = {
      role: 'user',
      content,
      timestamp: Date.now(),
      emotion
    };
    
    this.addTurn(turn);
    return turn;
  }

  addAssistantMessage(content: string): ConversationTurn {
    const turn: ConversationTurn = {
      role: 'assistant',
      content,
      timestamp: Date.now()
    };
    
    this.addTurn(turn);
    return turn;
  }

  clearHistory(): void {
    this._history = [];
    this._currentTurn = null;
  }

  getLastUserMessage(): ConversationTurn | null {
    for (let i = this._history.length - 1; i >= 0; i--) {
      if (this._history[i].role === 'user') {
        return this._history[i];
      }
    }
    return null;
  }

  getLastAssistantMessage(): ConversationTurn | null {
    for (let i = this._history.length - 1; i >= 0; i--) {
      if (this._history[i].role === 'assistant') {
        return this._history[i];
      }
    }
    return null;
  }

  // Serialize conversation for storage
  serialize(): string {
    return JSON.stringify({
      history: this._history,
      currentTurn: this._currentTurn,
      timestamp: Date.now()
    });
  }

  // Deserialize conversation from storage
  static deserialize(data: string): ConversationManager {
    try {
      const parsed = JSON.parse(data);
      const manager = new ConversationManager();
      manager._history = parsed.history || [];
      manager._currentTurn = parsed.currentTurn || null;
      return manager;
    } catch (error) {
      console.error('Failed to deserialize conversation:', error);
      return new ConversationManager();
    }
  }

  // Get conversation statistics
  getStats() {
    const userMessages = this._history.filter(turn => turn.role === 'user').length;
    const assistantMessages = this._history.filter(turn => turn.role === 'assistant').length;
    const totalMessages = this._history.length;
    
    return {
      totalMessages,
      userMessages,
      assistantMessages,
      conversationStarted: this._history.length > 0 ? this._history[0].timestamp : null,
      lastActivity: this._history.length > 0 ? this._history[this._history.length - 1].timestamp : null
    };
  }
}