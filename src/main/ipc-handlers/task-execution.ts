/**
 * Task Execution IPC Handlers
 * Handles AI task execution, license validation, and API key management
 */

import { ipcMain } from 'electron';
import { providerManager } from '../services/provider-manager';
import { licenseValidator } from '../services/license-validator';
import type { TaskConfig } from '../../shared/types/task';
import type { License } from '../../shared/types/license';

export function registerTaskExecutionHandlers(): void {
  console.log('Registering task execution IPC handlers...');

  // AI Provider Management
  ipcMain.handle('ai-provider:list', async () => {
    try {
      const providers = providerManager.listProviders();
      return { success: true, data: providers };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai-provider:get-active', async () => {
    try {
      const providerName = await providerManager.getActiveProviderName();
      return { success: true, data: providerName };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai-provider:set-key', async (_event, provider: string, apiKey: string, model?: string) => {
    try {
      await providerManager.initializeProvider(provider, apiKey, model);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai-provider:check-key', async (_event, provider: string) => {
    try {
      const hasKey = await providerManager.hasApiKey(provider);
      return { success: true, data: hasKey };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai-provider:remove-key', async (_event, provider: string) => {
    try {
      await providerManager.removeApiKey(provider);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // License Management (Rent-to-Own)
  ipcMain.handle('license:activate', async (_event, licenseKey: string) => {
    try {
      const result = await licenseValidator.validateLicense(licenseKey);
      if (result.valid && result.license) {
        await licenseValidator.saveLicense(result.license);
      }
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('license:get', async () => {
    try {
      const license = await licenseValidator.loadLicense();
      return { success: true, data: license };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('license:get-status', async () => {
    try {
      const status = await licenseValidator.getLicenseStatus();
      return { success: true, data: status };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('license:has-pro', async () => {
    try {
      const hasPro = await licenseValidator.hasProAccess();
      return { success: true, data: hasPro };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('license:remove', async () => {
    try {
      await licenseValidator.removeLicense();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Task Execution (Pro Feature)
  ipcMain.handle('task:execute', async (_event, config: TaskConfig) => {
    try {
      // Check Pro license
      const hasPro = await licenseValidator.hasProAccess();
      if (!hasPro) {
        return {
          success: false,
          error: 'Task Runner requires Guru Pro. Activate your license or subscribe at https://guru.lemonsqueezy.com'
        };
      }

      // Initialize client if needed
      if (!anthropicClient.isInitialized()) {
        await anthropicClient.initialize();
      }

      // Build system prompt with context
      const systemPrompt = `You are a code assistant helping with a specific task.

Task: ${config.description}

You have access to the following files and specifications as context. Use them to understand the codebase and complete the task.

When making changes:
1. Provide clear diffs showing before/after
2. List any bash commands that need to be run
3. Explain the changes and potential risks
4. Validate against any provided specs`;

      // Build user message with context
      const contextParts: string[] = [];

      if (config.specs.length > 0) {
        contextParts.push('## Specifications\n' + config.specs.join('\n\n'));
      }

      if (config.contextFiles.length > 0) {
        contextParts.push('## Context Files\n' + config.contextFiles.join('\n\n'));
      }

      const userMessage = contextParts.join('\n\n') + '\n\n## Task\n' + config.description;

      // Execute task
      const response = await providerManager.sendMessage(
        [{ role: 'user', content: userMessage }],
        {
          maxTokens: config.maxTokens,
          systemPrompt: systemPrompt
        }
      );

      // Calculate cost
      const cost = providerManager.calculateCost(
        response.usage.inputTokens,
        response.usage.outputTokens,
        response.model
      );

      return {
        success: true,
        data: {
          id: response.id,
          taskDescription: config.description,
          response: response.content,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            cost
          },
          timestamp: new Date()
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Stream task execution (Pro Feature)
  ipcMain.handle('task:execute-stream', async (event, config: TaskConfig) => {
    try {
      // Check Pro license
      const hasPro = await licenseValidator.hasProAccess();
      if (!hasPro) {
        const errorMsg = 'Task Runner requires Guru Pro. Activate your license or subscribe at https://guru.lemonsqueezy.com';
        event.sender.send('task:stream-error', errorMsg);
        return { success: false, error: errorMsg };
      }

      // Load provider if needed
      const provider = providerManager.getActiveProvider();
      if (!provider) {
        await providerManager.loadProvider();
      }

      // Build prompts (same as above)
      const systemPrompt = `You are a code assistant helping with a specific task.

Task: ${config.description}

You have access to the following files and specifications as context. Use them to understand the codebase and complete the task.

When making changes:
1. Provide clear diffs showing before/after
2. List any bash commands that need to be run
3. Explain the changes and potential risks
4. Validate against any provided specs`;

      const contextParts: string[] = [];
      if (config.specs.length > 0) {
        contextParts.push('## Specifications\n' + config.specs.join('\n\n'));
      }
      if (config.contextFiles.length > 0) {
        contextParts.push('## Context Files\n' + config.contextFiles.join('\n\n'));
      }
      const userMessage = contextParts.join('\n\n') + '\n\n## Task\n' + config.description;

      // Stream response
      const stream = providerManager.streamMessage(
        [{ role: 'user', content: userMessage }],
        {
          maxTokens: config.maxTokens,
          systemPrompt: systemPrompt
        }
      );

      for await (const chunk of stream) {
        if (chunk.type === 'error') {
          event.sender.send('task:stream-error', chunk.error);
          break;
        } else if (chunk.type === 'content') {
          event.sender.send('task:stream-chunk', chunk.text);
        } else if (chunk.type === 'done') {
          event.sender.send('task:stream-complete');
          break;
        }
      }

      return { success: true };
    } catch (error: any) {
      event.sender.send('task:stream-error', error.message);
      return { success: false, error: error.message };
    }
  });

  // Development helper: Generate license keys
  if (process.env.NODE_ENV === 'development') {
    ipcMain.handle('license:generate-dev', async (_event, email: string, monthsPaid: number = 5) => {
      try {
        const licenseKey = licenseValidator.generateLicenseKey(email, monthsPaid, false);
        return { success: true, data: licenseKey };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('license:generate-unlocked', async (_event, email: string) => {
      try {
        const licenseKey = licenseValidator.generateLicenseKey(email, 10, true);
        return { success: true, data: licenseKey };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });
  }
}
