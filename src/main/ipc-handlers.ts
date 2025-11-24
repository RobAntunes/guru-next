import { ipcMain, dialog, shell } from 'electron'
import { readFile } from 'fs/promises'
import { join, basename, extname } from 'path'
import { readdir, stat } from 'fs/promises'
import { aiModelService } from './ai-model-service'
import { vectorStoreService } from './vector-store-service'
import { documentIndexer } from './services/document-indexer'
import { webIndexer } from './services/web-indexer'
import { wasmVM } from './wasm-vm'
import { fileStorage } from './file-storage'
import { providerManager } from './services/provider-manager'
import { happenManager } from './services/happen/happen-manager'
import { shadowService } from './services/happen/shadow-service'
import { allTools, executeTool } from './services/ai-tools'
import { getDirectoryFiles, searchFiles } from './file-handlers'
import { memoryService } from './services/memory-service'

export function registerIPCHandlers() {
  // File Handlers
  ipcMain.handle('file:openDialog', async (_, options) => {
    try {
      const result = await dialog.showOpenDialog(options)
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }
      return { success: true, data: result.filePaths }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('file:openFolderDialog', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      return { success: true, data: result.filePaths[0] }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('file:getCwd', async () => {
    try {
      return { success: true, data: process.cwd() }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('file:readContent', async (_, filePath) => {
    try {
      const content = await readFile(filePath, 'utf-8')
      return { success: true, data: content }
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('file:readBase64', async (_, filePath) => {
    try {
      const buffer = await readFile(filePath);
      return { success: true, data: buffer.toString('base64') }
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message }
    }
  });

  ipcMain.handle('file:getInfo', async (_, filePath) => {
    try {
      const stats = await stat(filePath);
      const data = {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile()
      };
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:getDirectoryFiles', async (_, dirPath, recursive) => {
    try {
      const files = await getDirectoryFiles(dirPath, recursive);
      return { success: true, data: files };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:search', async (_, rootDir, query, limit) => {
    try {
      // Default to cwd if no rootDir provided
      const searchRoot = rootDir || process.cwd();
      const files = await searchFiles(searchRoot, query || '', limit || 20);
      return { success: true, data: files };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Document Indexing Handlers
  ipcMain.handle('document:index-file', async (_, filePath) => {
    return await documentIndexer.indexFile(filePath)
  })

  ipcMain.handle('document:index-files', async (_, filePaths) => {
    return await documentIndexer.indexFiles(filePaths)
  })

  // Web Indexer Handler - Supports options object for crawling
  ipcMain.handle('document:index-web', async (_, options) => {
    return await webIndexer.indexWeb(options)
  })

  // Legacy support for simple URL string
  ipcMain.handle('document:index-url', async (_, url) => {
    return await webIndexer.indexWeb({ url, depth: 0 })
  })

  ipcMain.handle('document:search', async (_, { query, fileTypes, maxResults }) => {
    // Fallback to file search if document index is empty or not ready
    try {
      // Just search files in CWD for now to mimic Cursor behavior on unindexed projects
      const files = await searchFiles(process.cwd(), query, maxResults || 10);
      return files.map(f => ({
        id: f.path,
        filePath: f.path,
        fileName: f.name,
        metadata: { title: f.name }
      }));
    } catch (e) {
      return [];
    }
  })

  // AI Handlers
  ipcMain.handle('ai:initialize', async () => {
    return await aiModelService.initialize()
  })

  ipcMain.handle('ai:generateText', async (_, prompt, options) => {
    return await aiModelService.generateText(prompt, options)
  })

  ipcMain.handle('ai:generateEmbedding', async (_, text) => {
    return await aiModelService.generateEmbedding(text)
  })

  // AI Provider Management Handlers
  ipcMain.handle('ai-provider:list', async () => {
    try {
      const providers = await providerManager.listProviders()
      return { success: true, data: providers }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('ai-provider:set-key', async (_, provider, apiKey, model) => {
    try {
      await providerManager.initializeProvider(provider, apiKey)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('ai-provider:check-key', async (_, provider) => {
    try {
      const hasKey = await providerManager.hasApiKey(provider)
      return { success: true, data: hasKey }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('ai-provider:remove-key', async (_, provider) => {
    try {
      await providerManager.removeApiKey(provider)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('ai-provider:get-active', async () => {
    try {
      const providers = await providerManager.listProviders()
      const activeProvider = providers.find(p => p.isConfigured)
      return { success: true, data: activeProvider || null }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Vector Store Handlers
  ipcMain.handle('vector:addDocuments', async (_, kbId, docs) => {
    return await vectorStoreService.addDocuments(kbId, docs)
  })

  ipcMain.handle('vector:search', async (_, kbId, query, options) => {
    return await vectorStoreService.search(kbId, query, options)
  })

  ipcMain.handle('vector:getStats', async (_, kbId) => {
    return await vectorStoreService.getStats(kbId)
  })

  ipcMain.handle('vector:deleteKnowledgeBase', async (_, kbId) => {
    return await vectorStoreService.deleteKnowledgeBase(kbId)
  })

  // Memory Handlers
  ipcMain.handle('memory:add', async (_, memory) => {
    return await memoryService.addMemory(memory)
  })

  ipcMain.handle('memory:search', async (_, { query, limit }) => {
    return await memoryService.searchMemories(query, limit)
  })

  ipcMain.handle('memory:stats', async () => {
    return await memoryService.getStats()
  })

  // Happen Agents & Shadow Mode
  ipcMain.handle('happen:list-agents', () => {
    try {
      const agents = happenManager.getAgents()
      return { success: true, data: agents }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('happen:send-task', async (_, agentId, prompt, contextData) => {
    try {
      const result = await happenManager.dispatchTask(agentId, prompt, contextData)
      // Ensure consistent return format for renderer
      if (result.success && result.output !== undefined && result.data === undefined) {
        return { ...result, data: result.output }
      }
      return result
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('happen:shadow:get-pending', () => {
    try {
      const actions = shadowService.getPendingActions()
      return { success: true, data: actions }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('happen:shadow:approve', async (_, { actionId, modifiedContent }) => {
    return await shadowService.approveAction(actionId, modifiedContent)
  })

  ipcMain.handle('happen:shadow:reject', (_, { actionId }) => {
    return shadowService.rejectAction(actionId)
  })

  ipcMain.handle('happen:shadow:set-mode', (_, { enabled }) => {
    shadowService.setEnabled(enabled)
    return { success: true, enabled }
  })

  // Storage Handlers
  ipcMain.handle('storage:read', async (_, collection, id) => {
    const item = await fileStorage.readFile(collection, id)
    if (!item) return { success: false, error: 'File not found' }
    return { success: true, data: item }
  })

  ipcMain.handle('storage:write', async (_, collection, id, data) => {
    await fileStorage.writeFile(collection, id, data)
    return { success: true }
  })

  ipcMain.handle('storage:delete', async (_, collection, id) => {
    await fileStorage.deleteFile(collection, id)
    return { success: true }
  })

  ipcMain.handle('storage:list', async (_, collection) => {
    const items = await fileStorage.listFiles(collection)
    return { success: true, data: items }
  })

  ipcMain.handle('storage:exists', async (_, collection, id) => {
    const exists = await fileStorage.exists(collection, id)
    return { success: true, data: exists }
  })

  // Chat Handlers
  ipcMain.handle('chat:send-stream', async (event, message, agentId, contextGraph, modelConfig, conversationId) => {
    try {
      console.log('[IPC chat:send-stream] Starting stream:', {
        message: message.substring(0, 50) + '...',
        agentId,
        modelConfig,
        conversationId
      });

      // Use the Happen event bus to dispatch the task to the agent
      // This replaces the old orchestrator pattern
      const result = await happenManager.dispatchTask(
        agentId,
        message,
        {
          contextGraph,
          modelConfig,
          conversationId
        }
      );

      // Send the result as a final update
      event.sender.send('chat:stream-update', {
        type: 'response',
        data: {
          response: result.output || result.data || '',
          conversationId: conversationId || 'default',
          success: result.success
        }
      });

      console.log(`[IPC chat:send-stream] Task completed`);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC chat:send-stream] Stream error:', error);
      event.sender.send('chat:stream-update', {
        type: 'error',
        data: { message: error.message }
      });
      return { success: false, error: error.message };
    }
  });

  // Document Handlers
  ipcMain.handle('document:get-all', async () => {
    const { lanceDBManager } = await import('./storage/lancedb-manager')
    const docs = await lanceDBManager.getAllDocuments()
    return { success: true, data: docs }
  })

  // AI Tools Handlers
  ipcMain.handle('tools:list', async () => {
    try {
      // Return serializable tool definitions (exclude execute function)
      const tools = allTools.map(t => ({ name: t.name, description: t.description, parameters: t.parameters }));
      return { success: true, data: tools };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tools:execute', async (_, toolName, args) => {
    try {
      const result = await executeTool(toolName, args);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}

export function cleanupIPCHandlers() {
  ipcMain.removeHandler('file:openDialog')
  ipcMain.removeHandler('file:openFolderDialog')
  ipcMain.removeHandler('file:getCwd')
  ipcMain.removeHandler('file:readContent')
  ipcMain.removeHandler('file:readBase64')
  ipcMain.removeHandler('file:getInfo')
  ipcMain.removeHandler('file:getDirectoryFiles')
  ipcMain.removeHandler('file:search')
  ipcMain.removeHandler('memory:add')
  ipcMain.removeHandler('memory:search')
  ipcMain.removeHandler('memory:stats')
  // ... cleanup others as needed
  ipcMain.removeHandler('tools:list')
  ipcMain.removeHandler('tools:execute')
}
