import pdf from 'pdf-parse';
import { readFile } from 'fs/promises';
import { basename } from 'path';

export interface ParsedDocument {
  text: string;
  pages: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creationDate?: string;
  };
}

export interface DocumentChunk {
  id: string;
  text: string;
  position: number;
  tokens: number;
}

export async function parsePDF(filePath: string): Promise<ParsedDocument> {
  try {
    const dataBuffer = await readFile(filePath);
    const data = await pdf(dataBuffer);
    
    return {
      text: data.text,
      pages: data.numpages,
      metadata: {
        title: data.info?.Title || basename(filePath),
        author: data.info?.Author,
        subject: data.info?.Subject,
        keywords: data.info?.Keywords,
        creationDate: data.info?.CreationDate
      }
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function chunkDocument(text: string, chunkSize = 1000): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let currentChunk = '';
  let chunkIndex = 0;
  
  // Split by paragraphs
  const paragraphs = text.split(/\n\s*\n/);
  
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    
    // If adding this paragraph exceeds chunk size, save current chunk
    if (currentChunk && (currentChunk.length + trimmed.length) > chunkSize) {
      chunks.push({
        id: `chunk-${chunkIndex}`,
        text: currentChunk.trim(),
        position: chunkIndex,
        tokens: estimateTokens(currentChunk)
      });
      chunkIndex++;
      currentChunk = '';
    }
    
    currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
  }
  
  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push({
      id: `chunk-${chunkIndex}`,
      text: currentChunk.trim(),
      position: chunkIndex,
      tokens: estimateTokens(currentChunk)
    });
  }
  
  return chunks;
}

function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

export function generateId(filePath: string): string {
  // Simple hash-based ID
  let hash = 0;
  for (let i = 0; i < filePath.length; i++) {
    const char = filePath.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `doc-${Math.abs(hash).toString(36)}`;
}
