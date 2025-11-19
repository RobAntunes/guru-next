/**
 * Anthropic Client Service
 * Wrapper for Claude API calls
 */

import Anthropic from '@anthropic-ai/sdk';
import { secureStorage } from './secure-storage';

export interface StreamChunk {
  type: 'content_block_delta' | 'message_stop' | 'error';
  text?: string;
  error?: string;
}

export interface MessageResponse {
  id: string;
  content: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  stopReason: string;
}

class AnthropicClientService {
  private client: Anthropic | null = null;
  private readonly API_KEY_STORAGE_KEY = 'guru_anthropic_api_key';

  /**
   * Initialize client with API key
   */
  async initialize(apiKey?: string): Promise<void> {
    let key = apiKey;

    if (!key) {
      // Try to load from secure storage
      const storedKey = await secureStorage.getItem(this.API_KEY_STORAGE_KEY);
      if (storedKey) {
        key = storedKey;
      }
    }

    if (!key) {
      throw new Error('No API key provided');
    }

    this.client = new Anthropic({
      apiKey: key
    });

    // Save API key to secure storage if provided
    if (apiKey) {
      await secureStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
    }
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Send a message to Claude
   */
  async sendMessage(
    messages: Array<{ role: 'user' | 'assistant'; content: string | any[] }>,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      system?: string;
      tools?: any[];
    }
  ): Promise<MessageResponse & { tool_calls?: any[] }> {
    if (!this.client) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    const response = await this.client.messages.create({
      model: options?.model || 'claude-sonnet-4-20250514',
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature || 1,
      system: options?.system,
      messages: messages as any,
      tools: options?.tools,
    });

    const textContent = response.content.find(c => c.type === 'text');
    const toolCalls = response.content.filter(c => c.type === 'tool_use');

    return {
      id: response.id,
      content: textContent && textContent.type === 'text' ? textContent.text : '',
      tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.input)
        }
      })),
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      },
      stopReason: response.stop_reason || 'unknown'
    };
  }

  /**
   * Stream a message from Claude
   */
  async *streamMessage(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      system?: string;
    }
  ): AsyncGenerator<StreamChunk> {
    if (!this.client) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    try {
      const stream = await this.client.messages.create({
        model: options?.model || 'claude-sonnet-4-20250514',
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature || 1,
        system: options?.system,
        messages: messages,
        stream: true
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            yield {
              type: 'content_block_delta',
              text: event.delta.text
            };
          }
        } else if (event.type === 'message_stop') {
          yield {
            type: 'message_stop'
          };
        }
      }
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Remove stored API key
   */
  async removeApiKey(): Promise<void> {
    await secureStorage.removeItem(this.API_KEY_STORAGE_KEY);
    this.client = null;
  }

  /**
   * Check if API key is stored
   */
  async hasApiKey(): Promise<boolean> {
    const key = await secureStorage.getItem(this.API_KEY_STORAGE_KEY);
    return key !== null;
  }

  /**
   * Calculate cost based on usage
   */
  calculateCost(inputTokens: number, outputTokens: number, model: string = 'claude-sonnet-4-20250514'): number {
    // Pricing per million tokens (as of 2025)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-sonnet-4-20250514': { input: 3, output: 15 },
      'claude-opus-4-20250514': { input: 15, output: 75 },
      'claude-haiku-4-20250301': { input: 0.25, output: 1.25 }
    };

    const modelPricing = pricing[model] || pricing['claude-sonnet-4-20250514'];
    const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

    return inputCost + outputCost;
  }
}

export const anthropicClient = new AnthropicClientService();
