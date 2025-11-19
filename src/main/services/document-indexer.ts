/**
 * Document Indexer Service
 * Indexes files and folders into the knowledge base
 */

import { readFile } from 'fs/promises';
import { basename, extname } from 'path';
import { lanceDBManager } from '../storage/lancedb-manager';
const pdf = require('pdf-parse');

interface FileInfo {
  path: string;
  name: string;
  extension: string;
  isDirectory: boolean;
}

export class DocumentIndexer {
  private chunkSize = 1000; // characters per chunk
  private chunkOverlap = 200; // overlap between chunks

  /**
   * Index a single file
   */
  async indexFile(filePath: string): Promise<{ success: boolean; chunks: number; error?: string }> {
    try {
      const fileName = basename(filePath);
      const fileType = extname(filePath).slice(1).toLowerCase() || 'txt';
      let content = '';

      if (fileType === 'pdf') {
        const dataBuffer = await readFile(filePath);
        const data = await pdf(dataBuffer);
        content = data.text;
      } else {
        content = await readFile(filePath, 'utf-8');
      }

      // Skip if file is too large (> 5MB text content)
      if (content.length > 5 * 1024 * 1024) {
        return {
          success: false,
          chunks: 0,
          error: 'File content too large (max 5MB)'
        };
      }

      // Split into chunks
      const chunks = this.chunkText(content);
      const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add each chunk to the knowledge base
      for (let i = 0; i < chunks.length; i++) {
        const chunkId = `chunk-${i}`;
        const chunkContent = chunks[i];

        // Generate a simple embedding (placeholder - in production use proper embeddings)
        const vector = this.generateDummyEmbedding(chunkContent);

        await lanceDBManager.addDocumentChunk({
          document_id: documentId,
          chunk_id: chunkId,
          content: chunkContent,
          vector,
          position: i,
          file_path: filePath,
          file_type: fileType,
          title: fileName,
          chunk_tokens: this.estimateTokens(chunkContent),
          metadata: JSON.stringify({
            file_name: fileName,
            file_type: fileType
          })
        });
      }

      return {
        success: true,
        chunks: chunks.length
      };
    } catch (error: any) {
      console.error('Failed to index file:', error);
      return {
        success: false,
        chunks: 0,
        error: error.message
      };
    }
  }

  /**
   * Index multiple files
   */
  async indexFiles(filePaths: string[]): Promise<{
    success: boolean;
    indexed: number;
    failed: number;
    totalChunks: number;
  }> {
    let indexed = 0;
    let failed = 0;
    let totalChunks = 0;

    for (const filePath of filePaths) {
      const result = await this.indexFile(filePath);
      if (result.success) {
        indexed++;
        totalChunks += result.chunks;
      } else {
        failed++;
      }
    }

    return {
      success: indexed > 0,
      indexed,
      failed,
      totalChunks
    };
  }

  /**
   * Split text into overlapping chunks
   */
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      const chunk = text.slice(start, end);
      chunks.push(chunk);

      // Move forward by chunkSize - overlap
      start += this.chunkSize - this.chunkOverlap;

      // If we're near the end, just take the rest
      if (start + this.chunkSize >= text.length) {
        break;
      }
    }

    return chunks;
  }

  /**
   * Generate a dummy embedding vector (placeholder)
   * In production, use a proper embedding model
   */
  private generateDummyEmbedding(text: string): number[] {
    // Create a 384-dimensional vector (common size for embeddings)
    const dim = 384;
    const vector = new Array(dim).fill(0);

    // Simple hash-based approach for demo purposes
    // In production, use @huggingface/transformers or similar
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = charCode % dim;
      vector[index] += 1 / text.length;
    }

    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / (magnitude || 1));
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

export const documentIndexer = new DocumentIndexer();
