/**
 * Guru Integration Service
 * Bridges Electron renderer with Guru backend APIs
 */

import { invoke } from './browser-storage';

// Types from our Guru APIs
export interface FileAnalysisResult {
  path: string;
  name: string;
  type: string;
  size: number;
  content?: string;
  category: string;
  cognitiveAnalysis?: {
    summary: string;
    keywords: string[];
    insights: string[];
    recommendations: string[];
  };
}

export interface DocumentBatch {
  id: string;
  name: string;
  documents: ProcessedDocument[];
  createdAt: Date;
  totalSize: number;
  documentCount: number;
}

export interface ProcessedDocument {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  content: string;
  contentHash: string;
  category: string;
  addedAt: Date;
  metadata?: Record<string, any>;
  analysis?: any;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  lastUpdated: Date;
  documentCount: number;
  chunkCount: number;
  cognitiveSystemsEnabled: string[];
}

export interface QueryResult {
  query: string;
  answer: string;
  sources: Array<{
    documentName: string;
    chunkContent: string;
    relevanceScore: number;
  }>;
  cognitiveInsights?: string[];
  retrievalMetrics: {
    chunksRetrieved: number;
    avgRelevanceScore: number;
    processingTimeMs: number;
  };
}

class GuruIntegrationService {
  /**
   * Filesystem Analysis
   */
  async analyzeFilesystem(options: {
    targetPath: string;
    recursive?: boolean;
    fileTypes?: string[];
    maxFileSize?: number;
    includeHidden?: boolean;
    analysisDepth?: 'surface' | 'moderate' | 'deep' | 'comprehensive';
  }): Promise<{ files: FileAnalysisResult[]; totalSize: number; fileTypeDistribution: Record<string, number> }> {
    return await invoke('analyze_filesystem', { options });
  }

  async analyzeFilesManual(
    filePaths: string[],
    analysisMode: 'individual' | 'comparative' | 'collective' | 'evolutionary' | 'batch' = 'individual'
  ): Promise<any> {
    return await invoke('analyze_files_manual', { filePaths, analysisMode });
  }

  /**
   * Document Processing
   */
  async uploadDocuments(
    documents: Array<{
      filename: string;
      content: string;
      mimeType?: string;
      encoding?: string;
      isBase64?: boolean;
      category?: string;
      metadata?: Record<string, any>;
    }>,
    options?: {
      analysisMode?: 'comprehensive' | 'focused' | 'comparative';
      enableCognitiveAnalysis?: boolean;
      preserveFiles?: boolean;
      batchName?: string;
    }
  ): Promise<DocumentBatch> {
    return await invoke('upload_documents', { documents, options });
  }

  /**
   * Knowledge Base Management
   */
  async createKnowledgeBase(
    name: string,
    description: string,
    cognitiveSystemsEnabled?: string[]
  ): Promise<KnowledgeBase> {
    return await invoke('create_knowledge_base', { name, description, cognitiveSystemsEnabled });
  }

  async addDocumentsToKnowledgeBase(
    kbName: string,
    documents: Array<{
      filename: string;
      content: string;
      category?: string;
      metadata?: Record<string, any>;
    }>,
    options?: {
      enableCognitiveAnalysis?: boolean;
      chunkDocuments?: boolean;
    }
  ): Promise<{ addedDocuments: any[]; skippedDocuments: string[]; totalChunksCreated: number }> {
    return await invoke('add_documents_to_knowledge_base', { kbName, documents, options });
  }

  async queryKnowledgeBase(
    kbName: string,
    query: string,
    options?: {
      maxResults?: number;
      includeCognitiveInsights?: boolean;
      responseMode?: 'comprehensive' | 'concise' | 'analytical';
    }
  ): Promise<QueryResult> {
    return await invoke('query_knowledge_base', { kbName, query, options });
  }

  async listKnowledgeBases(): Promise<KnowledgeBase[]> {
    return await invoke('list_knowledge_bases');
  }

  async getKnowledgeBaseInfo(kbName: string): Promise<{
    knowledgeBase: KnowledgeBase;
    statistics: {
      totalDocuments: number;
      totalChunks: number;
      totalSizeBytes: number;
      categoryDistribution: Record<string, number>;
      avgDocumentSize: number;
      avgChunksPerDocument: number;
    };
  }> {
    return await invoke('get_knowledge_base_info', { kbName });
  }

  async deleteKnowledgeBase(kbName: string, confirm: boolean = false): Promise<void> {
    return await invoke('delete_knowledge_base', { kbName, confirm });
  }

  async listDocumentsInKnowledgeBase(kbName: string): Promise<Array<{
    id: string;
    filename: string;
    category: string;
    sizeBytes: number;
    wordCount: number;
    addedAt: Date;
    metadata?: any;
  }>> {
    return await invoke('list_documents_in_kb', { kbName });
  }

  async deleteDocumentFromKnowledgeBase(kbName: string, documentId: string): Promise<void> {
    return await invoke('delete_document_from_kb', { kbName, documentId });
  }

  /**
   * File Dialog Helpers
   */
  async openFileDialog(options?: {
    multiple?: boolean;
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<string | string[] | null> {
    
    // Convert filters to format expected by Rust backend
    const filters = options?.filters?.map(f => [f.name, f.extensions] as [string, string[]]);
    
    const result = await invoke<string[] | null>('open_file_dialog', {
      multiple: options?.multiple || false,
      filters
    });
    
    if (!result) return null;
    
    // Return single string if not multiple, array otherwise
    if (!options?.multiple && result.length > 0) {
      return result[0];
    }
    return result;
  }

  async openFolderDialog(): Promise<string | null> {
    
    return await invoke<string | null>('open_folder_dialog');
  }

  /**
   * File Browser Support
   */
  async scanDirectory(dirPath: string): Promise<any> {
    
    return await invoke('scan_directory', { dirPath });
  }

  /**
   * Utility Functions
   */
  async readFileAsBase64(filePath: string): Promise<string> {
    
    return await invoke<string>('read_file_as_base64', { filePath });
  }

  /**
   * Call MCP Tool
   * Invokes an MCP tool through the backend
   */
  async callMCPTool(toolName: string, args: any): Promise<any> {
    return await invoke('call_mcp_tool', { toolName, args });
  }
}

// Export singleton instance
export const guruService = new GuruIntegrationService();