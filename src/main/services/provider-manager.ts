/**
 * AI Provider Manager
 * Manages multiple AI providers and their configurations
 * This is a wrapper around aiManager that handles persistence via secureStorage
 */

import { aiManager } from './ai-manager';
import { secureStorage } from './secure-storage';

class ProviderManager {
  private readonly API_KEY_PREFIX = 'ai_provider_key_';
  private initialized = false;

  /**
   * Initialize provider manager - load saved keys and configure aiManager
   * This should be called on app startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[ProviderManager] Initializing and loading saved API keys...');
    
    // MIGRATION: Move old 'google' key to 'gemini' (one-time migration)
    const oldGoogleKey = await secureStorage.getItem(`${this.API_KEY_PREFIX}google`);
    if (oldGoogleKey) {
      console.log('[ProviderManager] Migrating old google key to gemini...');
      await secureStorage.setItem(`${this.API_KEY_PREFIX}gemini`, oldGoogleKey);
      await secureStorage.removeItem(`${this.API_KEY_PREFIX}google`);
    }

    // Get all providers from aiManager
    const providers = aiManager.getAllProviders();

    for (const provider of providers) {
      const apiKey = await secureStorage.getItem(`${this.API_KEY_PREFIX}${provider.id}`);
      if (apiKey) {
        console.log(`[ProviderManager] Configuring ${provider.id} with saved key`);
        aiManager.setApiKey(provider.id, apiKey);
      }
    }

    this.initialized = true;
    console.log('[ProviderManager] Initialization complete');
  }

  /**
   * Initialize a provider with API key
   */
  async initializeProvider(providerName: string, apiKey: string): Promise<void> {
    console.log(`[ProviderManager] Setting API key for ${providerName}`);

    // Ensure we're initialized
    await this.initialize();

    // Configure aiManager (runtime)
    aiManager.setApiKey(providerName, apiKey);

    // Save to secureStorage (persistence)
    await secureStorage.setItem(`${this.API_KEY_PREFIX}${providerName}`, apiKey);

    console.log(`[ProviderManager] API key saved for ${providerName}`);
  }

  /**
   * Remove API key for provider
   */
  async removeApiKey(providerName: string): Promise<void> {
    console.log(`[ProviderManager] Removing API key for ${providerName}`);

    // Remove from secureStorage
    await secureStorage.removeItem(`${this.API_KEY_PREFIX}${providerName}`);

    // Remove from aiManager by setting empty key (which will fail isConfigured check)
    const provider = aiManager.getProvider(providerName);
    if (provider) {
      provider.configure(''); // This will set client to null or invalid state
    }

    console.log(`[ProviderManager] API key removed for ${providerName}`);
  }

  /**
   * Check if provider has API key
   */
  async hasApiKey(providerName: string): Promise<boolean> {
    const provider = aiManager.getProvider(providerName);
    return provider ? provider.isConfigured() : false;
  }

  /**
   * List available providers with their configuration status
   */
  async listProviders(): Promise<Array<{ id: string; name: string; models: string[]; isConfigured: boolean }>> {
    // Ensure we're initialized
    await this.initialize();

    const providers = aiManager.getAllProviders();
    return providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      models: provider.models.map(m => m.id),
      isConfigured: provider.isConfigured()
    }));
  }
}

export const providerManager = new ProviderManager();
