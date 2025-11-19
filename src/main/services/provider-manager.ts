/**
 * AI Provider Manager
 * Manages multiple AI providers and their configurations
 */

import { providerRegistry, AIProvider, AIMessage, AIResponse, StreamChunk } from './ai-provider';
import { AnthropicProvider } from './providers/anthropic-provider';
import { OpenAIProvider } from './providers/openai-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { secureStorage } from './secure-storage';

class ProviderManager {
  private readonly API_KEY_PREFIX = 'ai_provider_key_';
  private readonly ACTIVE_PROVIDER_KEY = 'active_ai_provider';

  constructor() {
    // Register available providers
    providerRegistry.register(new AnthropicProvider());
    providerRegistry.register(new OpenAIProvider());
    providerRegistry.register(new GeminiProvider());
  }

  /**
   * Initialize a provider with API key
   */
  async initializeProvider(providerName: string, apiKey: string, model?: string): Promise<void> {
    const provider = providerRegistry.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    await provider.initialize({ apiKey, model });

    // Save API key
    await secureStorage.setItem(`${this.API_KEY_PREFIX}${providerName}`, apiKey);

    // Set as active provider
    providerRegistry.setActiveProvider(providerName);
    await secureStorage.setItem(this.ACTIVE_PROVIDER_KEY, providerName);
  }

  /**
   * Load provider from saved configuration
   */
  async loadProvider(providerName?: string): Promise<void> {
    // If no provider specified, use active provider
    let targetProvider = providerName;
    if (!targetProvider) {
      targetProvider = await secureStorage.getItem(this.ACTIVE_PROVIDER_KEY);
    }

    if (!targetProvider) {
      throw new Error('No provider configured');
    }

    const provider = providerRegistry.getProvider(targetProvider);
    if (!provider) {
      throw new Error(`Provider ${targetProvider} not found`);
    }

    // Load API key
    const apiKey = await secureStorage.getItem(`${this.API_KEY_PREFIX}${targetProvider}`);
    if (!apiKey) {
      throw new Error(`No API key found for ${targetProvider}`);
    }

    await provider.initialize({ apiKey });
    providerRegistry.setActiveProvider(targetProvider);
  }

  /**
   * Get active provider
   */
  getActiveProvider(): AIProvider | null {
    return providerRegistry.getActiveProvider();
  }

  /**
   * Check if provider has API key
   */
  async hasApiKey(providerName: string): Promise<boolean> {
    const apiKey = await secureStorage.getItem(`${this.API_KEY_PREFIX}${providerName}`);
    return apiKey !== null;
  }

  /**
   * Remove API key for provider
   */
  async removeApiKey(providerName: string): Promise<void> {
    await secureStorage.removeItem(`${this.API_KEY_PREFIX}${providerName}`);
  }

  /**
   * Get current provider name
   */
  async getActiveProviderName(): Promise<string | null> {
    return await secureStorage.getItem(this.ACTIVE_PROVIDER_KEY);
  }

  /**
   * List available providers
   */
  listProviders(): Array<{ name: string; models: string[] }> {
    const providers = providerRegistry.listProviders();
    return providers.map(name => {
      const provider = providerRegistry.getProvider(name);
      return {
        name,
        models: provider?.models || []
      };
    });
  }

  /**
   * Send message using active provider
   */
  async sendMessage(
    messages: AIMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<AIResponse> {
    const provider = this.getActiveProvider();
    if (!provider) {
      // Try to load saved provider
      await this.loadProvider();
      const retryProvider = this.getActiveProvider();
      if (!retryProvider) {
        throw new Error('No AI provider configured');
      }
      return retryProvider.sendMessage(messages, options);
    }

    return provider.sendMessage(messages, options);
  }

  /**
   * Stream message using active provider
   */
  async *streamMessage(
    messages: AIMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): AsyncGenerator<StreamChunk> {
    const provider = this.getActiveProvider();
    if (!provider) {
      await this.loadProvider();
      const retryProvider = this.getActiveProvider();
      if (!retryProvider) {
        throw new Error('No AI provider configured');
      }
      yield* retryProvider.streamMessage(messages, options);
      return;
    }

    yield* provider.streamMessage(messages, options);
  }

  /**
   * Calculate cost using active provider
   */
  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const provider = this.getActiveProvider();
    if (!provider) {
      return 0;
    }
    return provider.calculateCost(inputTokens, outputTokens, model);
  }
}

export const providerManager = new ProviderManager();
