/**
 * Generic AI Provider Interface
 * Supports multiple AI providers (Claude, GPT-4, Gemini, etc.)
 */

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  id: string;
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason: string;
  provider: string;
  model: string;
}

export interface StreamChunk {
  type: 'content' | 'done' | 'error';
  text?: string;
  error?: string;
}

export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIProvider {
  name: string;
  models: string[];

  /**
   * Initialize provider with API key
   */
  initialize(config: AIProviderConfig): Promise<void>;

  /**
   * Check if provider is initialized
   */
  isInitialized(): boolean;

  /**
   * Send a message
   */
  sendMessage(
    messages: AIMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<AIResponse>;

  /**
   * Stream a message
   */
  streamMessage(
    messages: AIMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): AsyncGenerator<StreamChunk>;

  /**
   * Calculate cost for usage
   */
  calculateCost(inputTokens: number, outputTokens: number, model: string): number;

  /**
   * Get default model
   */
  getDefaultModel(): string;
}

/**
 * Provider Registry
 */
class AIProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();
  private activeProvider: string | null = null;

  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): AIProvider | null {
    return this.providers.get(name) || null;
  }

  setActiveProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not registered`);
    }
    this.activeProvider = name;
  }

  getActiveProvider(): AIProvider | null {
    if (!this.activeProvider) return null;
    return this.providers.get(this.activeProvider) || null;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const providerRegistry = new AIProviderRegistry();
