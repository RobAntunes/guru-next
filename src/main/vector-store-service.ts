/**
 * Vector Store Service
 * Manages vector storage and semantic search using LanceDB
 */

import { connect, Table, Connection } from '@lancedb/lancedb';
import { join } from 'path';
import { app } from 'electron';
import { aiModelService } from './ai-model-service';

export interface VectorDocument {
  id: string;
  text: string;
  embedding: number[];
  metadata: {
    knowledgeBaseId: string;
    documentId: string;
    groupId?: string;
    chunkIndex?: number;
    totalChunks?: number;
    timestamp: number;
    [key: string]: any;
  };
}

export interface SearchResult {
  id: string;
  text: string;
  score: number;
  metadata: VectorDocument['metadata'];
}

class VectorStoreService {
  private db: Connection | null = null;
  private tables: Map<string, Table> = new Map();
  private isInitialized = false;

  /**
   * Initialize vector database
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const dbPath = join(app.getPath('userData'), 'vector_store');
      this.db = await connect(dbPath);
      this.isInitialized = true;
      console.log('Vector store initialized at:', dbPath);
    } catch (error) {
      console.error('Failed to initialize vector store:', error);
      throw error;
    }
  }

  /**
   * Get or create table for a knowledge base
   */
  private async getTable(knowledgeBaseId: string): Promise<Table> {
    if (!this.db) {
      throw new Error('Vector store not initialized');
    }

    const tableName = `kb_${knowledgeBaseId.replace(/-/g, '_')}`;

    // Check if we already have this table cached
    if (this.tables.has(tableName)) {
      return this.tables.get(tableName)!;
    }

    // Check if table exists
    const tableNames = await this.db.tableNames();
    
    if (tableNames.includes(tableName)) {
      const table = await this.db.openTable(tableName);
      this.tables.set(tableName, table);
      return table;
    }

    // Create new table with schema
    const table = await this.db.createTable(tableName, [
      {
        id: 'sample',
        text: 'sample text',
        embedding: new Array(384).fill(0), // all-MiniLM-L6-v2 produces 384-dim embeddings
        metadata: JSON.stringify({
          knowledgeBaseId,
          documentId: 'sample',
          timestamp: Date.now()
        })
      }
    ]);

    // Delete the sample row
    await table.delete('id = "sample"');

    this.tables.set(tableName, table);
    return table;
  }

  /**
   * Add documents to vector store
   */
  async addDocuments(
    knowledgeBaseId: string,
    documents: Array<{
      id: string;
      text: string;
      metadata?: Record<string, any>;
    }>
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const table = await this.getTable(knowledgeBaseId);

    // Generate embeddings for all documents
    const texts = documents.map(doc => doc.text);
    const embeddings = await aiModelService.generateEmbeddingsBatch(texts);

    // Prepare data for insertion
    const data = documents.map((doc, idx) => ({
      id: doc.id,
      text: doc.text,
      embedding: embeddings[idx].embedding,
      metadata: JSON.stringify({
        knowledgeBaseId,
        documentId: doc.id,
        timestamp: Date.now(),
        ...doc.metadata
      })
    }));

    // Insert into table
    await table.add(data);

    console.log(`Added ${documents.length} documents to knowledge base ${knowledgeBaseId}`);
  }

  /**
   * Chunk large text into smaller pieces for better semantic search
   */
  chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  /**
   * Add document with chunking
   */
  async addDocumentChunked(
    knowledgeBaseId: string,
    documentId: string,
    text: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const chunks = this.chunkText(text);
    
    const documents = chunks.map((chunk, idx) => ({
      id: `${documentId}_chunk_${idx}`,
      text: chunk,
      metadata: {
        ...metadata,
        documentId,
        chunkIndex: idx,
        totalChunks: chunks.length
      }
    }));

    await this.addDocuments(knowledgeBaseId, documents);
  }

  /**
   * Search for similar documents using vector similarity
   */
  async search(
    knowledgeBaseId: string,
    query: string,
    options?: {
      limit?: number;
      filter?: Record<string, any>;
    }
  ): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const table = await this.getTable(knowledgeBaseId);

    // Generate embedding for query
    const queryEmbedding = await aiModelService.generateEmbedding(query);

    // Perform vector search
    const results = await table
      .search(queryEmbedding.embedding)
      .limit(options?.limit || 10)
      .toArray();

    // Parse and format results
    return results.map(row => ({
      id: row.id,
      text: row.text,
      score: row._distance || 0,
      metadata: typeof row.metadata === 'string' 
        ? JSON.parse(row.metadata) 
        : row.metadata
    }));
  }

  /**
   * Delete documents from vector store
   */
  async deleteDocuments(
    knowledgeBaseId: string,
    documentIds: string[]
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const table = await this.getTable(knowledgeBaseId);

    // Delete all chunks for these documents
    for (const docId of documentIds) {
      await table.delete(`id LIKE '${docId}%'`);
    }

    console.log(`Deleted ${documentIds.length} documents from knowledge base ${knowledgeBaseId}`);
  }

  /**
   * Delete entire knowledge base
   */
  async deleteKnowledgeBase(knowledgeBaseId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Vector store not initialized');
    }

    const tableName = `kb_${knowledgeBaseId.replace(/-/g, '_')}`;

    try {
      await this.db.dropTable(tableName);
      this.tables.delete(tableName);
      console.log(`Deleted knowledge base ${knowledgeBaseId} from vector store`);
    } catch (error) {
      console.error(`Failed to delete knowledge base ${knowledgeBaseId}:`, error);
      throw error;
    }
  }

  /**
   * Get statistics for a knowledge base
   */
  async getStats(knowledgeBaseId: string): Promise<{
    totalDocuments: number;
    totalChunks: number;
    storageSize: number;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const table = await this.getTable(knowledgeBaseId);
    const count = await table.countRows();

    // Count unique documents (excluding chunks)
    const allRows = await table.toArray();
    const uniqueDocs = new Set(
      allRows.map(row => {
        const metadata = typeof row.metadata === 'string' 
          ? JSON.parse(row.metadata) 
          : row.metadata;
        return metadata.documentId;
      })
    );

    return {
      totalDocuments: uniqueDocs.size,
      totalChunks: count,
      storageSize: 0 // TODO: Calculate actual storage size
    };
  }

  /**
   * Find similar documents (for document clustering/grouping)
   */
  async findSimilarDocuments(
    knowledgeBaseId: string,
    documentId: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const table = await this.getTable(knowledgeBaseId);

    // Get the document
    const doc = await table
      .filter(`id = '${documentId}' OR id LIKE '${documentId}_chunk_%'`)
      .limit(1)
      .toArray();

    if (doc.length === 0) {
      return [];
    }

    // Use its embedding to find similar documents
    const embedding = doc[0].embedding;

    const results = await table
      .search(embedding)
      .limit(limit + 1) // +1 to exclude self
      .toArray();

    // Filter out the original document and parse results
    return results
      .filter(row => !row.id.startsWith(documentId))
      .map(row => ({
        id: row.id,
        text: row.text,
        score: row._distance || 0,
        metadata: typeof row.metadata === 'string' 
          ? JSON.parse(row.metadata) 
          : row.metadata
      }));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.tables.clear();
    this.db = null;
    this.isInitialized = false;
  }
}

export const vectorStoreService = new VectorStoreService();
