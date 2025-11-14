/**
 * Sandbox Service
 * Secure code execution using WebAssembly VM
 */

export interface SandboxExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime: number;
}

export interface SandboxOptions {
  timeout?: number;
  memoryLimit?: number;
  allowedHosts?: string[];
  config?: Record<string, string>;
}

class SandboxService {
  private api: any;

  constructor() {
    this.api = (window as any).api?.wasm;
    if (!this.api) {
      console.warn('WASM API not available');
    }
  }

  /**
   * Load a WASM module
   */
  async loadModule(
    moduleId: string,
    wasmFile: string | Buffer,
    options?: SandboxOptions
  ): Promise<void> {
    if (!this.api) {
      throw new Error('WASM API not available');
    }

    const result = await this.api.loadModule(moduleId, wasmFile, options);
    if (!result.success) {
      throw new Error(result.error || 'Failed to load module');
    }
  }

  /**
   * Execute a function in a loaded WASM module
   */
  async execute(
    moduleId: string,
    functionName: string,
    input?: string,
    options?: SandboxOptions
  ): Promise<SandboxExecutionResult> {
    if (!this.api) {
      throw new Error('WASM API not available');
    }

    const result = await this.api.execute(moduleId, functionName, input, options);
    return result.data || result;
  }

  /**
   * Unload a module
   */
  async unloadModule(moduleId: string): Promise<void> {
    if (!this.api) {
      throw new Error('WASM API not available');
    }

    await this.api.unloadModule(moduleId);
  }

  /**
   * List loaded modules
   */
  async listModules(): Promise<string[]> {
    if (!this.api) {
      throw new Error('WASM API not available');
    }

    const result = await this.api.listModules();
    return result.data || result;
  }

  /**
   * Get sandbox capabilities
   */
  async getCapabilities(): Promise<{
    runtime: string;
    features: string[];
    supportedLanguages: string[];
  }> {
    if (!this.api) {
      return {
        runtime: 'Not available',
        features: [],
        supportedLanguages: []
      };
    }

    const result = await this.api.getCapabilities();
    return result.data || result;
  }
}

export const sandboxService = new SandboxService();
