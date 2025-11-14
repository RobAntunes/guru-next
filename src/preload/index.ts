import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // File system operations
  file: {
    openDialog: (options?: any) => ipcRenderer.invoke('file:openDialog', options),
    openFolderDialog: () => ipcRenderer.invoke('file:openFolderDialog'),
    readContent: (filePath: string) => ipcRenderer.invoke('file:readContent', filePath),
    readBase64: (filePath: string) => ipcRenderer.invoke('file:readBase64', filePath),
    getInfo: (filePath: string) => ipcRenderer.invoke('file:getInfo', filePath),
    getDirectoryFiles: (dirPath: string, recursive?: boolean) => 
      ipcRenderer.invoke('file:getDirectoryFiles', dirPath, recursive),
    processUploads: (filePaths: string[]) => ipcRenderer.invoke('file:processUploads', filePaths)
  },
  
  // AI operations (optional, can be disabled if not using AI)
  ai: {
    initialize: () => ipcRenderer.invoke('ai:initialize'),
    generateEmbedding: (text: string) => ipcRenderer.invoke('ai:generateEmbedding', text),
    generateEmbeddingsBatch: (texts: string[]) => ipcRenderer.invoke('ai:generateEmbeddingsBatch', texts),
    generateText: (prompt: string, options?: any) => ipcRenderer.invoke('ai:generateText', prompt, options),
    summarizeText: (text: string, options?: any) => ipcRenderer.invoke('ai:summarizeText', text, options),
    analyzeDocument: (content: string) => ipcRenderer.invoke('ai:analyzeDocument', content),
    extractKeywords: (text: string, candidates: string[], topK?: number) => 
      ipcRenderer.invoke('ai:extractKeywords', text, candidates, topK)
  },
  
  // Vector store operations (optional)
  vector: {
    addDocuments: (knowledgeBaseId: string, documents: any[]) => 
      ipcRenderer.invoke('vector:addDocuments', knowledgeBaseId, documents),
    addDocumentChunked: (knowledgeBaseId: string, documentId: string, text: string, metadata?: any) => 
      ipcRenderer.invoke('vector:addDocumentChunked', knowledgeBaseId, documentId, text, metadata),
    search: (knowledgeBaseId: string, query: string, options?: any) => 
      ipcRenderer.invoke('vector:search', knowledgeBaseId, query, options),
    deleteDocuments: (knowledgeBaseId: string, documentIds: string[]) => 
      ipcRenderer.invoke('vector:deleteDocuments', knowledgeBaseId, documentIds),
    deleteKnowledgeBase: (knowledgeBaseId: string) => 
      ipcRenderer.invoke('vector:deleteKnowledgeBase', knowledgeBaseId),
    getStats: (knowledgeBaseId: string) => 
      ipcRenderer.invoke('vector:getStats', knowledgeBaseId),
    findSimilar: (knowledgeBaseId: string, documentId: string, limit?: number) => 
      ipcRenderer.invoke('vector:findSimilar', knowledgeBaseId, documentId, limit)
  },
  
  // Memory API (legacy)
  memory: {
    add: (memory: any) => ipcRenderer.invoke('memory:add', memory),
    search: (query: string, vector: number[], limit?: number) => 
      ipcRenderer.invoke('memory:search', { query, vector, limit }),
    getStats: () => ipcRenderer.invoke('memory:stats')
  },
  
  // Pattern tracking (legacy)
  pattern: {
    track: (pattern: any) => ipcRenderer.invoke('pattern:track', pattern)
  },
  
  // Insights (legacy)
  insight: {
    generate: () => ipcRenderer.invoke('insight:generate'),
    list: () => ipcRenderer.invoke('insight:list'),
    dismiss: (id: string) => ipcRenderer.invoke('insight:dismiss', id)
  },
  
  // Document operations (legacy)
  document: {
    indexPdf: (filePath: string) => ipcRenderer.invoke('document:index-pdf', filePath),
    search: (query: string, fileTypes?: string[], maxResults?: number) => 
      ipcRenderer.invoke('document:search', { query, fileTypes, maxResults }),
    getChunks: (documentId: string) => ipcRenderer.invoke('document:get-chunks', documentId),
    selectFile: () => ipcRenderer.invoke('document:select-file')
  },
  
  // WASM VM API
  wasm: {
    loadModule: (moduleId: string, source: any, options?: any) =>
      ipcRenderer.invoke('wasm:loadModule', moduleId, source, options),
    
    execute: (moduleId: string, functionName: string, input?: any, options?: any) =>
      ipcRenderer.invoke('wasm:execute', moduleId, functionName, input, options),
    
    unloadModule: (moduleId: string) =>
      ipcRenderer.invoke('wasm:unloadModule', moduleId),
    
    listModules: () =>
      ipcRenderer.invoke('wasm:listModules'),
    
    getCapabilities: () =>
      ipcRenderer.invoke('wasm:getCapabilities')
  },

  // Storage API (replaces localStorage)
  storage: {
    read: (collection: string, id: string) =>
      ipcRenderer.invoke('storage:read', collection, id),
    
    write: (collection: string, id: string, data: any) =>
      ipcRenderer.invoke('storage:write', collection, id, data),
    
    delete: (collection: string, id: string) =>
      ipcRenderer.invoke('storage:delete', collection, id),
    
    list: (collection: string) =>
      ipcRenderer.invoke('storage:list', collection),
    
    exists: (collection: string, id: string) =>
      ipcRenderer.invoke('storage:exists', collection, id),
    
    getStats: () =>
      ipcRenderer.invoke('storage:stats'),
    
    migrate: (localStorageData: Record<string, string>) =>
      ipcRenderer.invoke('storage:migrate', localStorageData)
  },

  // Generic IPC methods (for compatibility)
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data)
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args))
  }
})
