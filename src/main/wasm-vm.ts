/**
 * WASM Virtual Machine
 * Secure code execution using WebAssembly with Extism
 */

import { createPlugin, type Plugin, type CallContext } from '@extism/extism';

export interface VMExecutionOptions {
  timeout?: number; // milliseconds
  memoryLimit?: number; // bytes
  allowedHosts?: string[]; // HTTP hosts that can be accessed
  config?: Record<string, string>; // Config passed to the plugin
}

export interface VMExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime: number;
  memoryUsed?: number;
}

export interface WasmModuleSource {
  type: 'file' | 'buffer' | 'url';
  source: string | Buffer;
}

class WasmVM {
  private plugins: Map<string, Plugin> = new Map();

  /**
   * Load a WASM module
   */
  async loadModule(
    moduleId: string,
    source: WasmModuleSource,
    options?: VMExecutionOptions
  ): Promise<void> {
    try {
      let manifest: any;

      if (source.type === 'file') {
        manifest = {
          wasm: [{ path: source.source as string }],
        };
      } else if (source.type === 'buffer') {
        manifest = {
          wasm: [{ data: source.source as Buffer }],
        };
      } else if (source.type === 'url') {
        manifest = {
          wasm: [{ url: source.source as string }],
        };
      }

      // Add allowed hosts for HTTP
      if (options?.allowedHosts && options.allowedHosts.length > 0) {
        manifest.allowed_hosts = options.allowedHosts;
      }

      // Add config
      if (options?.config) {
        manifest.config = options.config;
      }

      // Set memory limit (if supported)
      if (options?.memoryLimit) {
        manifest.memory = {
          max_pages: Math.ceil(options.memoryLimit / 65536), // 64KB per page
        };
      }

      const plugin = await createPlugin(manifest);
      this.plugins.set(moduleId, plugin);

      console.log(`WASM module loaded: ${moduleId}`);
    } catch (error) {
      console.error(`Failed to load WASM module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a function in a loaded WASM module
   */
  async execute(
    moduleId: string,
    functionName: string,
    input?: string | Buffer,
    options?: VMExecutionOptions
  ): Promise<VMExecutionResult> {
    const startTime = Date.now();

    try {
      const plugin = this.plugins.get(moduleId);
      if (!plugin) {
        throw new Error(`Module ${moduleId} not loaded`);
      }

      // Set timeout
      const timeout = options?.timeout || 30000; // 30s default
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeout)
      );

      // Execute with timeout
      const executionPromise = plugin.call(functionName, input || '');
      const output = await Promise.race([executionPromise, timeoutPromise]);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: output.text(),
        executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: error.message || 'Unknown error',
        executionTime,
      };
    }
  }

  /**
   * Execute code from source (requires compilation)
   * This is a helper for languages that can be compiled to WASM on-the-fly
   */
  async executeSource(
    language: 'javascript' | 'python' | 'rust',
    code: string,
    options?: VMExecutionOptions
  ): Promise<VMExecutionResult> {
    // This would require a compilation step
    // For now, this is a placeholder that returns an error
    return {
      success: false,
      error: `Direct ${language} execution not yet implemented. Please provide pre-compiled WASM modules.`,
      executionTime: 0,
    };
  }

  /**
   * Unload a module and free resources
   */
  async unloadModule(moduleId: string): Promise<void> {
    const plugin = this.plugins.get(moduleId);
    if (plugin) {
      await plugin.close();
      this.plugins.delete(moduleId);
      console.log(`WASM module unloaded: ${moduleId}`);
    }
  }

  /**
   * List loaded modules
   */
  listModules(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Check if a module is loaded
   */
  isModuleLoaded(moduleId: string): boolean {
    return this.plugins.has(moduleId);
  }

  /**
   * Cleanup all modules
   */
  async cleanup(): Promise<void> {
    const moduleIds = this.listModules();
    for (const id of moduleIds) {
      await this.unloadModule(id);
    }
    console.log('WASM VM cleaned up');
  }

  /**
   * Get VM capabilities
   */
  getCapabilities() {
    return {
      runtime: 'Extism (WebAssembly)',
      features: [
        'Memory isolation',
        'Resource limits (timeout, memory)',
        'HTTP access control',
        'Multi-language support (via WASM compilation)',
        'Secure sandboxing',
      ],
      supportedLanguages: [
        'Any language that compiles to WASM',
        'JavaScript (via AssemblyScript or others)',
        'Python (via Pyodide)',
        'Rust',
        'C/C++',
        'Go',
        'And many more...',
      ],
    };
  }
}

// Singleton instance
export const wasmVM = new WasmVM();

/**
 * Example usage:
 * 
 * // Load a WASM module
 * await wasmVM.loadModule('my-plugin', {
 *   type: 'file',
 *   source: '/path/to/plugin.wasm'
 * }, {
 *   timeout: 5000,
 *   memoryLimit: 10 * 1024 * 1024, // 10MB
 *   allowedHosts: ['api.example.com']
 * });
 * 
 * // Execute a function
 * const result = await wasmVM.execute('my-plugin', 'process', JSON.stringify({
 *   input: 'hello world'
 * }));
 * 
 * console.log(result.output);
 * 
 * // Unload when done
 * await wasmVM.unloadModule('my-plugin');
 */
