import { app } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { ensureDirSync } from 'fs-extra';
import { aiModelService } from '../ai-model-service';
import { vectorStoreService } from '../vector-store-service';

interface Memory {
  id: string;
  type: 'pattern' | 'insight' | 'interaction' | 'preference';
  content: string;
  timestamp: number;
  confidence: number;
  context: string[];
  tags: string[];
  embedding?: number[];
  metadata: any;
}

class MemoryService {
  private memories: Map<string, Memory> = new Map();
  private storagePath: string;
  private isInitialized = false;

  constructor() {
    this.storagePath = join(app.getPath('userData'), 'memory-graph.json');
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      if (existsSync(this.storagePath)) {
        const data = JSON.parse(readFileSync(this.storagePath, 'utf-8'));
        this.memories = new Map(data.map((m: Memory) => [m.id, m]));
      } else {
        ensureDirSync(app.getPath('userData'));
        this.save();
      }
      this.isInitialized = true;
      console.log(`Memory service initialized. Loaded ${this.memories.size} memories.`);
    } catch (error) {
      console.error('Failed to initialize memory service:', error);
      // Start fresh if file is corrupt
      this.memories = new Map();
    }
  }

  private save() {
    try {
      const data = Array.from(this.memories.values());
      writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save memory graph:', error);
    }
  }

  async addMemory(memory: Memory): Promise<{ success: boolean; id: string; error?: string }> {
    if (!this.isInitialized) await this.initialize();

    try {
      // 1. Generate embedding if missing
      if (!memory.embedding) {
        const result = await aiModelService.generateEmbedding(memory.content);
        if (result.success && result.data) {
            memory.embedding = result.data.embedding;
        }
      }

      // 2. Store in in-memory graph (and persist to JSON)
      this.memories.set(memory.id, memory);
      this.save();

      // 3. Index in Vector Store for semantic search
      // We use a specific knowledge base ID for memories: 'user-memory'
      await vectorStoreService.addDocuments('user-memory', [{
        id: memory.id,
        text: memory.content,
        metadata: {
          type: memory.type,
          tags: memory.tags,
          timestamp: memory.timestamp,
          context: memory.context
        }
      }]);

      return { success: true, id: memory.id };
    } catch (error: any) {
      console.error('Error adding memory:', error);
      return { success: false, id: memory.id, error: error.message };
    }
  }

  async searchMemories(query: string, limit: number = 10): Promise<{ success: boolean; data?: Memory[]; error?: string }> {
    if (!this.isInitialized) await this.initialize();

    try {
      // Use vector store for semantic search
      const results = await vectorStoreService.search('user-memory', query, { limit });
      
      // Hydrate results from full memory store
      const memories = results
        .map(r => this.memories.get(r.id))
        .filter(m => m !== undefined) as Memory[];

      return { success: true, data: memories };
    } catch (error: any) {
      console.error('Error searching memories:', error);
      return { success: false, error: error.message };
    }
  }

  async getStats(): Promise<{ success: boolean; data?: any }> {
    if (!this.isInitialized) await this.initialize();
    
    const stats = {
        memories: this.memories.size,
        patterns: Array.from(this.memories.values()).filter(m => m.type === 'pattern').length,
        insights: Array.from(this.memories.values()).filter(m => m.type === 'insight').length,
    };

    return { success: true, data: stats };
  }
}

export const memoryService = new MemoryService();
