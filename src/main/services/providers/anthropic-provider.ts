/**
 * Anthropic (Claude) Provider Implementation
 */

import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIMessage, AIResponse, StreamChunk, AIProviderConfig } from '../ai-provider';

export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  models = [
    'claude-sonnet-4-5',
    'claude-sonnet-4-',
    'claude-opus-4-1',
    'claude-haiku-4-5'
  ];

  private client: Anthropic | null = null;
  private config: AIProviderConfig | null = null;

  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey
    });
  }

  isInitialized(): boolean {
    return this.client !== null;
  }

  async sendMessage(
    messages: AIMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('Provider not initialized');
    }

    // Convert messages to Anthropic format
    const anthropicMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

    const response = await this.client.messages.create({
      model: options?.model || this.getDefaultModel(),
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature ?? 1,
      system: options?.systemPrompt,
      messages: anthropicMessages
    });

    return {
      id: response.id,
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      },
      stopReason: response.stop_reason || 'unknown',
      provider: this.name,
      model: options?.model || this.getDefaultModel()
    };
  }

  async *streamMessage(
    messages: AIMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): AsyncGenerator<StreamChunk> {
    if (!this.client) {
      throw new Error('Provider not initialized');
    }

    try {
      const anthropicMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }));

      const stream = await this.client.messages.create({
        model: options?.model || this.getDefaultModel(),
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature ?? 1,
        system: options?.systemPrompt,
        messages: anthropicMessages,
        stream: true
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            yield {
              type: 'content',
              text: event.delta.text
            };
          }
        } else if (event.type === 'message_stop') {
          yield {
            type: 'done'
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

  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
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

  getDefaultModel(): string {
    return this.config?.model || 'claude-sonnet-4-20250514';
  }
}
