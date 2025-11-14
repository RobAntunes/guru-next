/**
 * IPC Handlers for Electron
 * Bridge between renderer process and main process services
 */

import { ipcMain } from 'electron';
import { aiModelService } from './ai-model-service';
import { vectorStoreService } from './vector-store-service';
import { lanceDBManager } from './storage/lancedb-manager';
import { wasmVM } from './wasm-vm';
import { fileStorage } from './file-storage';
import {
  openFileDialog,
  openFolderDialog,
  readFileContent,
  readFileAsBase64,
  getFileInfo,
  getDirectoryFiles,
  processUploadedFiles
} from './file-handlers';

/**
 * Register all IPC handlers
 */
export function registerIPCHandlers(): void {
  console.log('Registering IPC handlers...');

  // Memory/LanceDB handlers
  ipcMain.handle('memory:stats', async () => {
    try {
      const stats = await lanceDBManager.getStats();
      return { success: true, data: stats };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('memory:add', async (_event, memory: any) => {
    try {
      await lanceDBManager.addMemory(memory);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('memory:search', async (_event, params: { query: string; vector: number[]; limit?: number }) => {
    try {
      const results = await lanceDBManager.searchMemories(params.query, params.vector, params.limit);
      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('pattern:track', async (_event, pattern: any) => {
    try {
      await lanceDBManager.trackPattern(pattern);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('insight:generate', async () => {
    try {
      const insights = await lanceDBManager.generateInsights();
      return { success: true, data: insights };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('insight:list', async () => {
    try {
      const insights = await lanceDBManager.listInsights();
      return { success: true, data: insights };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('insight:dismiss', async (_event, id: string) => {
    try {
      await lanceDBManager.dismissInsight(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('document:index-pdf', async (_event, filePath: string) => {
    try {
      // TODO: Implement PDF indexing
      return { success: false, error: 'Not implemented yet' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('document:search', async (_event, params: any) => {
    try {
      const results = await lanceDBManager.searchDocuments(params.query, params.vector || [], {
        fileTypes: params.fileTypes,
        maxResults: params.maxResults
      });
      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('document:get-chunks', async (_event, documentId: string) => {
    try {
      const chunks = await lanceDBManager.getDocumentChunks(documentId);
      return { success: true, data: chunks };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('document:select-file', async () => {
    try {
      const files = await openFileDialog({ multiple: false });
      return { success: true, data: files?.[0] || null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // File system handlers
  ipcMain.handle('file:openDialog', async (_event, options?: any) => {
    try {
      const files = await openFileDialog(options);
      return { success: true, data: files };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:openFolderDialog', async () => {
    try {
      const folder = await openFolderDialog();
      return { success: true, data: folder };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:readContent', async (_event, filePath: string) => {
    try {
      const content = await readFileContent(filePath);
      return { success: true, data: content };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:readBase64', async (_event, filePath: string) => {
    try {
      const content = await readFileAsBase64(filePath);
      return { success: true, data: content };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:getInfo', async (_event, filePath: string) => {
    try {
      const info = await getFileInfo(filePath);
      return { success: true, data: info };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:getDirectoryFiles', async (_event, dirPath: string, recursive?: boolean) => {
    try {
      const files = await getDirectoryFiles(dirPath, recursive);
      return { success: true, data: files };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:processUploads', async (_event, filePaths: string[]) => {
    try {
      const processed = await processUploadedFiles(filePaths);
      return { success: true, data: processed };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // AI Model Service handlers
  ipcMain.handle('ai:initialize', async () => {
    try {
      await aiModelService.initialize();
      await vectorStoreService.initialize();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai:generateEmbedding', async (_event, text: string) => {
    try {
      const result = await aiModelService.generateEmbedding(text);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai:generateEmbeddingsBatch', async (_event, texts: string[]) => {
    try {
      const results = await aiModelService.generateEmbeddingsBatch(texts);
      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai:generateText', async (_event, prompt: string, options?: any) => {
    try {
      const result = await aiModelService.generateText(prompt, options);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai:summarizeText', async (_event, text: string, options?: any) => {
    try {
      const result = await aiModelService.summarizeText(text, options);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai:analyzeDocument', async (_event, content: string) => {
    try {
      const result = await aiModelService.analyzeDocument(content);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai:extractKeywords', async (_event, text: string, candidates: string[], topK?: number) => {
    try {
      const result = await aiModelService.extractKeywords(text, candidates, topK);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Vector Store handlers
  ipcMain.handle('vector:addDocuments', async (_event, knowledgeBaseId: string, documents: any[]) => {
    try {
      await vectorStoreService.addDocuments(knowledgeBaseId, documents);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('vector:addDocumentChunked', async (_event, knowledgeBaseId: string, documentId: string, text: string, metadata?: any) => {
    try {
      await vectorStoreService.addDocumentChunked(knowledgeBaseId, documentId, text, metadata);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('vector:search', async (_event, knowledgeBaseId: string, query: string, options?: any) => {
    try {
      const results = await vectorStoreService.search(knowledgeBaseId, query, options);
      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('vector:deleteDocuments', async (_event, knowledgeBaseId: string, documentIds: string[]) => {
    try {
      await vectorStoreService.deleteDocuments(knowledgeBaseId, documentIds);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('vector:deleteKnowledgeBase', async (_event, knowledgeBaseId: string) => {
    try {
      await vectorStoreService.deleteKnowledgeBase(knowledgeBaseId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('vector:getStats', async (_event, knowledgeBaseId: string) => {
    try {
      const stats = await vectorStoreService.getStats(knowledgeBaseId);
      return { success: true, data: stats };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('vector:findSimilar', async (_event, knowledgeBaseId: string, documentId: string, limit?: number) => {
    try {
      const results = await vectorStoreService.findSimilarDocuments(knowledgeBaseId, documentId, limit);
      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // WASM VM handlers
  ipcMain.handle('wasm:loadModule', async (_, moduleId: string, source: any, options: any) => {
    try {
      await wasmVM.loadModule(moduleId, source, options);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to load WASM module:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('wasm:execute', async (_, moduleId: string, functionName: string, input: any, options: any) => {
    try {
      const result = await wasmVM.execute(moduleId, functionName, input, options);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Failed to execute WASM function:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('wasm:unloadModule', async (_, moduleId: string) => {
    try {
      await wasmVM.unloadModule(moduleId);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to unload WASM module:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('wasm:listModules', async () => {
    try {
      const modules = wasmVM.listModules();
      return { success: true, data: modules };
    } catch (error: any) {
      console.error('Failed to list WASM modules:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('wasm:getCapabilities', async () => {
    try {
      const capabilities = wasmVM.getCapabilities();
      return { success: true, data: capabilities };
    } catch (error: any) {
      console.error('Failed to get WASM capabilities:', error);
      return { success: false, error: error.message };
    }
  });

  // Storage handlers
  ipcMain.handle('storage:read', async (_, collection: string, id: string) => {
    try {
      const data = await fileStorage.readFile(collection, id);
      return { success: true, data };
    } catch (error: any) {
      console.error('Failed to read from storage:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('storage:write', async (_, collection: string, id: string, data: any) => {
    try {
      await fileStorage.writeFile(collection, id, data);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to write to storage:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('storage:delete', async (_, collection: string, id: string) => {
    try {
      await fileStorage.deleteFile(collection, id);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to delete from storage:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('storage:list', async (_, collection: string) => {
    try {
      const items = await fileStorage.listFiles(collection);
      return { success: true, data: items };
    } catch (error: any) {
      console.error('Failed to list storage items:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('storage:exists', async (_, collection: string, id: string) => {
    try {
      const exists = await fileStorage.exists(collection, id);
      return { success: true, data: exists };
    } catch (error: any) {
      console.error('Failed to check storage existence:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('storage:stats', async () => {
    try {
      const stats = await fileStorage.getStats();
      return { success: true, data: stats };
    } catch (error: any) {
      console.error('Failed to get storage stats:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('storage:migrate', async (_, localStorageData: Record<string, string>) => {
    try {
      await fileStorage.migrateFromLocalStorage(localStorageData);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to migrate localStorage:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('IPC handlers registered successfully');
}

/**
 * Cleanup IPC handlers
 */
export function cleanupIPCHandlers(): void {
  // Remove all IPC handlers
  // File system
  ipcMain.removeHandler('file:openDialog');
  ipcMain.removeHandler('file:openFolderDialog');
  ipcMain.removeHandler('file:readContent');
  ipcMain.removeHandler('file:readBase64');
  ipcMain.removeHandler('file:getInfo');
  ipcMain.removeHandler('file:getDirectoryFiles');
  ipcMain.removeHandler('file:processUploads');
  
  // AI
  ipcMain.removeHandler('ai:initialize');
  ipcMain.removeHandler('ai:generateEmbedding');
  ipcMain.removeHandler('ai:generateEmbeddingsBatch');
  ipcMain.removeHandler('ai:generateText');
  ipcMain.removeHandler('ai:summarizeText');
  ipcMain.removeHandler('ai:analyzeDocument');
  ipcMain.removeHandler('ai:extractKeywords');
  
  // Vector store
  ipcMain.removeHandler('vector:addDocuments');
  ipcMain.removeHandler('vector:addDocumentChunked');
  ipcMain.removeHandler('vector:search');
  ipcMain.removeHandler('vector:deleteDocuments');
  ipcMain.removeHandler('vector:deleteKnowledgeBase');
  ipcMain.removeHandler('vector:getStats');
  ipcMain.removeHandler('vector:findSimilar');
}
