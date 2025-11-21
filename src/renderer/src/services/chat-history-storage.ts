import { readTextFile, writeTextFile, exists } from './browser-storage';
import { ChatMessage } from '../types/control-room';

const HISTORY_FILE = 'chat/history.json';

export interface ChatHistoryState {
  messages: ChatMessage[];
  lastUpdated: number;
}

class ChatHistoryStorage {
  /**
   * Load chat history from storage
   */
  async loadHistory(): Promise<ChatMessage[]> {
    try {
      const fileExists = await exists(HISTORY_FILE);
      if (!fileExists) {
        return [];
      }

      const content = await readTextFile(HISTORY_FILE);
      const state: ChatHistoryState = JSON.parse(content);
      return state.messages || [];
    } catch (error) {
      console.warn('Failed to load chat history:', error);
      return [];
    }
  }

  /**
   * Save chat history to storage
   */
  async saveHistory(messages: ChatMessage[]): Promise<void> {
    try {
      // Limit history size to avoid performance issues (keep last 500 messages)
      const recentMessages = messages.length > 500 ? messages.slice(-500) : messages;
      
      const state: ChatHistoryState = {
        messages: recentMessages,
        lastUpdated: Date.now()
      };
      
      await writeTextFile(HISTORY_FILE, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }

  /**
   * Clear chat history
   */
  async clearHistory(): Promise<void> {
    try {
      const state: ChatHistoryState = {
        messages: [],
        lastUpdated: Date.now()
      };
      await writeTextFile(HISTORY_FILE, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  }
}

export const chatHistoryStorage = new ChatHistoryStorage();
