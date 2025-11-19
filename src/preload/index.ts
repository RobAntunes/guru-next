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

  // AI operations
  ai: {
    initialize: () => ipcRenderer.invoke('ai:initialize'),
    generateEmbedding: (text: string) => ipcRenderer.invoke('ai:generateEmbedding', text),
    generateEmbeddingsBatch: (texts: string[]) => ipcRenderer.invoke('ai:generateEmbeddingsBatch', texts),
    generateText: (prompt: string, options?: any) => ipcRenderer.invoke('ai:generateText', prompt, options),
    summarizeText: (text: string, options?: any) => ipcRenderer.invoke('ai:summarizeText', text, options),
    analyzeDocument: (content: string) => ipcRenderer.invoke('ai:analyzeDocument', content),
    extractKeywords: (text: string, candidates: string[], topK?: number) =>
      ipcRenderer.invoke('ai:extractKeywords', text, candidates, topK),
    setKey: (providerId: string, key: string) => ipcRenderer.invoke('ai:set-key', providerId, key),
    getProviders: () => ipcRenderer.invoke('ai:get-providers')
  },

  // Vector store operations
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

  // Memory API
  memory: {
    add: (memory: any) => ipcRenderer.invoke('memory:add', memory),
    search: (query: string, vector: number[], limit?: number) =>
      ipcRenderer.invoke('memory:search', { query, vector, limit }),
    getStats: () => ipcRenderer.invoke('memory:stats')
  },

  // Pattern tracking
  pattern: {
    track: (pattern: any) => ipcRenderer.invoke('pattern:track', pattern)
  },

  // Insights
  insight: {
    generate: () => ipcRenderer.invoke('insight:generate'),
    list: () => ipcRenderer.invoke('insight:list'),
    dismiss: (id: string) => ipcRenderer.invoke('insight:dismiss', id)
  },

  // Document operations
  document: {
    indexPdf: (filePath: string) => ipcRenderer.invoke('document:index-pdf', filePath),
    search: (query: string, fileTypes?: string[], maxResults?: number) =>
      ipcRenderer.invoke('document:search', { query, fileTypes, maxResults }),
    getChunks: (documentId: string) => ipcRenderer.invoke('document:get-chunks', documentId),
    getAll: () => ipcRenderer.invoke('document:get-all'),
    delete: (documentId: string) => ipcRenderer.invoke('document:delete', documentId),
    selectFile: () => ipcRenderer.invoke('document:select-file'),
    indexFiles: (filePaths: string[]) => ipcRenderer.invoke('document:index-files', filePaths),
    indexFile: (filePath: string) => ipcRenderer.invoke('document:index-file', filePath)
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

  // Storage API
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

  // Guru Pro: AI Provider Management
  aiProvider: {
    list: () => ipcRenderer.invoke('ai-provider:list'),
    getActive: () => ipcRenderer.invoke('ai-provider:get-active'),
    setKey: (provider: string, apiKey: string, model?: string) =>
      ipcRenderer.invoke('ai-provider:set-key', provider, apiKey, model),
    checkKey: (provider: string) => ipcRenderer.invoke('ai-provider:check-key', provider),
    removeKey: (provider: string) => ipcRenderer.invoke('ai-provider:remove-key', provider)
  },

  // Guru Pro: License Management
  license: {
    activate: (licenseKey: string) => ipcRenderer.invoke('license:activate', licenseKey),
    get: () => ipcRenderer.invoke('license:get'),
    getStatus: () => ipcRenderer.invoke('license:get-status'),
    hasPro: () => ipcRenderer.invoke('license:has-pro'),
    remove: () => ipcRenderer.invoke('license:remove'),
    generateDev: (email: string, monthsPaid?: number) => ipcRenderer.invoke('license:generate-dev', email, monthsPaid),
    generateUnlocked: (email: string) => ipcRenderer.invoke('license:generate-unlocked', email)
  },

  // Chat
  chat: {
    send: (message: string, agentId: string, contextGraph: any, modelConfig?: any) =>
      ipcRenderer.invoke('chat:send', message, agentId, contextGraph, modelConfig),
    sendEnhanced: (message: string, agentId: string, contextGraph: any, modelConfig?: any, conversationId?: string) =>
      ipcRenderer.invoke('chat:send-enhanced', message, agentId, contextGraph, modelConfig, conversationId),
    sendStream: (message: string, agentId: string, contextGraph: any, modelConfig?: any, conversationId?: string) =>
      ipcRenderer.invoke('chat:send-stream', message, agentId, contextGraph, modelConfig, conversationId),
    onStreamUpdate: (callback: (update: any) => void) => {
      const subscription = (_event, update) => callback(update);
      ipcRenderer.on('chat:stream-update', subscription);
      return () => ipcRenderer.removeListener('chat:stream-update', subscription);
    },
    getConversation: (conversationId: string) =>
      ipcRenderer.invoke('chat:get-conversation', conversationId)
  },

  // AI Tools
  tools: {
    list: () => ipcRenderer.invoke('tools:list'),
    execute: (toolName: string, args: any) => ipcRenderer.invoke('tools:execute', toolName, args)
  },

  // Spec Management
  spec: {
    index: (spec: any) => ipcRenderer.invoke('spec:index', spec)
  },

  // Happen Agents & Shadow Mode
  happen: {
    listAgents: () => ipcRenderer.invoke('happen:list-agents'),
    sendTask: (agentId: string, prompt: string, contextData: any) =>
      ipcRenderer.invoke('happen:send-task', agentId, prompt, contextData),
      
    // Shadow Mode
    getPendingShadowActions: () => ipcRenderer.invoke('happen:shadow:get-pending'),
    approveShadowAction: (actionId: string) => ipcRenderer.invoke('happen:shadow:approve', { actionId }),
    rejectShadowAction: (actionId: string) => ipcRenderer.invoke('happen:shadow:reject', { actionId }),
    setShadowMode: (enabled: boolean) => ipcRenderer.invoke('happen:shadow:set-mode', { enabled }),
    onShadowUpdate: (callback: (actions: any[]) => void) => {
        const subscription = (_event, actions) => callback(actions);
        ipcRenderer.on('happen:shadow-update', subscription);
        return () => ipcRenderer.removeListener('happen:shadow-update', subscription);
    }
  },

  // Guru Pro: Task Execution
  task: {
    execute: (config: any) => ipcRenderer.invoke('task:execute', config),
    executeStream: (config: any) => ipcRenderer.invoke('task:execute-stream', config),
    onStreamChunk: (callback: (text: string) => void) =>
      ipcRenderer.on('task:stream-chunk', (_event, text) => callback(text)),
    onStreamComplete: (callback: () => void) =>
      ipcRenderer.on('task:stream-complete', () => callback()),
    onStreamError: (callback: (error: string) => void) =>
      ipcRenderer.on('task:stream-error', (_event, error) => callback(error))
  },

  // Generic IPC methods
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data)
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args))
  }
})
