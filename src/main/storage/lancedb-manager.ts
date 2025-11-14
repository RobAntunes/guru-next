import * as lancedb from '@lancedb/lancedb';
import { join } from 'path';
import { getLanceDBDir } from '../data-paths.js';

interface Memory {
  id: string;
  type: string;
  layer: 'working' | 'short-term' | 'long-term';
  content: string;
  vector: number[];
  timestamp: number;
  last_accessed: number;
  access_count: number;
  confidence: number;
  relevance_score: number;
  importance: number;
  context: string[];
  related_ids: string[];
  tags: string[];
  metadata: Record<string, any>;
}

interface MemoryEdge {
  id: string;
  source_id: string;
  target_id: string;
  edge_type: 'references' | 'similar_to' | 'leads_to' | 'caused_by' | 'part_of';
  strength: number;
  created_at: number;
  last_reinforced: number;
  metadata: Record<string, any>;
}

interface Pattern {
  id: string;
  pattern_type: string;
  entity_ids: string[];
  frequency: number;
  vector: number[];
  first_seen: number;
  last_seen: number;
  metadata: Record<string, any>;
}

interface Insight {
  id: string;
  insight_text: string;
  category: string;
  vector: number[];
  confidence: number;
  created_at: number;
  dismissed: boolean;
  metadata: Record<string, any>;
}

class LanceDBManager {
  private db: lancedb.Connection | null = null;
  private dbPath: string;

  constructor() {
    // Store in userData directory
    this.dbPath = getLanceDBDir();
    console.log('LanceDB path:', this.dbPath);
  }

  async connect(): Promise<lancedb.Connection> {
    if (!this.db) {
      this.db = await lancedb.connect(this.dbPath);
      await this.initializeTables();
    }
    return this.db;
  }

  private async initializeTables(): Promise<void> {
    const db = await this.connect();
    
    try {
      // Check if tables exist by trying to open them
      await db.openTable('memories');
      await db.openTable('patterns');
      await db.openTable('insights');
      console.log('LanceDB tables already exist');
    } catch (error) {
      // Tables don't exist, create them
      console.log('Creating LanceDB tables...');
      
      // Create memories table with layers
      await db.createTable('memories', [
        {
          id: 'mem-init',
          type: 'system',
          layer: 'long-term',
          content: 'Memory system initialized',
          vector: Array(384).fill(0),
          timestamp: Date.now(),
          last_accessed: Date.now(),
          access_count: 1,
          confidence: 1.0,
          relevance_score: 1.0,
          importance: 1.0,
          context: ['system'],
          related_ids: ['init'],
          tags: ['system', 'init'],
          metadata: JSON.stringify({})
        }
      ]);

      // Create patterns table
      await db.createTable('patterns', [
        {
          id: 'pat-init',
          pattern_type: 'system',
          entity_ids: ['init'],
          frequency: 0,
          vector: Array(384).fill(0),
          first_seen: Date.now(),
          last_seen: Date.now(),
          metadata: JSON.stringify({})
        }
      ]);

      // Create insights table
      await db.createTable('insights', [
        {
          id: 'ins-init',
          insight_text: 'System initialized',
          category: 'system',
          vector: Array(384).fill(0),
          confidence: 1.0,
          created_at: Date.now(),
          dismissed: false,
          metadata: JSON.stringify({})
        }
      ]);

      // Create document_chunks table for indexed documents
      await db.createTable('document_chunks', [
        {
          id: 'chunk-init',
          document_id: 'doc-init',
          chunk_id: 'chunk-0',
          content: 'Document indexing initialized',
          vector: Array(384).fill(0),
          position: 0,
          file_path: 'system',
          file_type: 'system',
          title: 'System Initialization',
          created_at: Date.now(),
          chunk_tokens: 5,
          metadata: JSON.stringify({})
        }
      ]);
      
      console.log('LanceDB tables created successfully');
    }
  }

  async searchMemories(query: string, vector: number[], limit = 10): Promise<Memory[]> {
    const db = await this.connect();
    const table = await db.openTable('memories');

    try {
      // Hybrid search: vector + text
      const results = await table
        .search(vector)
        .select(['id', 'type', 'content', 'timestamp', 'confidence', 'context', 'tags', 'metadata'])
        .limit(limit)
        .execute();

      // Convert to plain objects for IPC serialization
      return results.map((r: any) => ({
        id: r.id,
        type: r.type,
        content: r.content,
        timestamp: r.timestamp,
        confidence: r.confidence,
        context: r.context || [],
        tags: r.tags || [],
        metadata: r.metadata || {}
      }));
    } catch (error) {
      console.error('Error searching memories:', error);
      return [];
    }
  }

  async addMemory(memory: Memory): Promise<void> {
    const db = await this.connect();
    const table = await db.openTable('memories');
    await table.add([memory]);
    console.log('Memory added:', memory.id);
  }

  async trackPattern(pattern: Pattern): Promise<void> {
    const db = await this.connect();
    const table = await db.openTable('patterns');
    
    try {
      // Check if pattern exists and update frequency
      const existing = await table
        .search(pattern.vector)
        .limit(1)
        .execute();
      
      if (existing.length > 0) {
        // Update existing pattern
        pattern.frequency = (existing[0].frequency || 0) + 1;
        pattern.last_seen = Date.now();
      }
      
      await table.add([pattern]);
      console.log('Pattern tracked:', pattern.id);
    } catch (error) {
      console.error('Error tracking pattern:', error);
    }
  }

  async generateInsights(): Promise<Insight[]> {
    const db = await this.connect();
    const memTable = await db.openTable('memories');
    const patTable = await db.openTable('patterns');
    const insightTable = await db.openTable('insights');

    const insights: Insight[] = [];

    try {
      // Get all memories (limited to recent 200)
      const memories = await memTable
        .search(Array(384).fill(0))
        .limit(200)
        .execute() as Memory[];

      if (memories.length === 0) {
        return insights;
      }

      // 1. Usage Pattern Insights
      const typeFrequency = memories.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostCommonType = Object.entries(typeFrequency)
        .sort(([,a], [,b]) => b - a)[0];

      if (mostCommonType && mostCommonType[1] > 5) {
        insights.push({
          id: `ins-${Date.now()}-type`,
          insight_text: `You frequently use ${mostCommonType[0]} features (${mostCommonType[1]} times). Consider creating shortcuts or templates.`,
          category: 'productivity',
          vector: Array(384).fill(0),
          confidence: Math.min(mostCommonType[1] / 20, 0.95),
          created_at: Date.now(),
          dismissed: false,
          metadata: { type: mostCommonType[0], count: mostCommonType[1] }
        });
      }

      // 2. Tag-based Pattern Insights
      const tagFrequency: Record<string, number> = {};
      memories.forEach(m => {
        m.tags?.forEach((tag: string) => {
          tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
        });
      });

      const topTags = Object.entries(tagFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);

      if (topTags.length > 0 && topTags[0][1] > 3) {
        insights.push({
          id: `ins-${Date.now()}-tags`,
          insight_text: `Your most used tags are: ${topTags.map(([tag, count]) => `${tag} (${count})`).join(', ')}. Consider organizing related items.`,
          category: 'organization',
          vector: Array(384).fill(0),
          confidence: 0.8,
          created_at: Date.now(),
          dismissed: false,
          metadata: { top_tags: topTags }
        });
      }

      // 3. Context Clustering - Find related contexts
      const contextGroups: Record<string, number> = {};
      memories.forEach(m => {
        m.context?.forEach((ctx: string) => {
          contextGroups[ctx] = (contextGroups[ctx] || 0) + 1;
        });
      });

      const frequentContexts = Object.entries(contextGroups)
        .filter(([, count]) => count > 5)
        .sort(([,a], [,b]) => b - a);

      if (frequentContexts.length > 0) {
        insights.push({
          id: `ins-${Date.now()}-context`,
          insight_text: `You often work in these contexts: ${frequentContexts.slice(0, 3).map(([ctx]) => ctx).join(', ')}`,
          category: 'workflow',
          vector: Array(384).fill(0),
          confidence: 0.85,
          created_at: Date.now(),
          dismissed: false,
          metadata: { contexts: frequentContexts }
        });
      }

      // 4. Temporal Pattern Insights - Time-based usage
      const now = Date.now();
      const recentMemories = memories.filter(m =>
        now - m.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
      );

      if (recentMemories.length > 10) {
        insights.push({
          id: `ins-${Date.now()}-activity`,
          insight_text: `High activity today! ${recentMemories.length} actions in the last 24 hours. You're on a productive streak.`,
          category: 'motivation',
          vector: Array(384).fill(0),
          confidence: 0.9,
          created_at: Date.now(),
          dismissed: false,
          metadata: { recent_count: recentMemories.length }
        });
      }

      // 5. Confidence-based Insights - Low confidence memories
      const lowConfidenceMemories = memories.filter(m => m.confidence < 0.6);
      if (lowConfidenceMemories.length > 5) {
        insights.push({
          id: `ins-${Date.now()}-review`,
          insight_text: `${lowConfidenceMemories.length} items have low confidence scores. Consider reviewing or re-organizing them.`,
          category: 'quality',
          vector: Array(384).fill(0),
          confidence: 0.75,
          created_at: Date.now(),
          dismissed: false,
          metadata: { low_confidence_count: lowConfidenceMemories.length }
        });
      }

      // 6. Access Pattern Insights - Frequently accessed
      const highAccessMemories = memories
        .filter((m: any) => m.access_count > 3)
        .sort((a: any, b: any) => b.access_count - a.access_count)
        .slice(0, 3);

      if (highAccessMemories.length > 0) {
        insights.push({
          id: `ins-${Date.now()}-popular`,
          insight_text: `You frequently reference ${highAccessMemories.length} items. Consider pinning them for quick access.`,
          category: 'efficiency',
          vector: Array(384).fill(0),
          confidence: 0.85,
          created_at: Date.now(),
          dismissed: false,
          metadata: {
            popular_items: highAccessMemories.map((m: any) => ({
              id: m.id,
              count: m.access_count,
              content: m.content.substring(0, 50)
            }))
          }
        });
      }

      // Store new insights
      for (const insight of insights) {
        await insightTable.add([insight]);
      }

      console.log(`Generated ${insights.length} new insights`);
      return insights;
    } catch (error) {
      console.error('Error generating insights:', error);
      return [];
    }
  }

  async getStats(): Promise<{ memories: number; patterns: number; insights: number }> {
    const db = await this.connect();
    
    try {
      const memories = await db.openTable('memories');
      const patterns = await db.openTable('patterns');
      const insights = await db.openTable('insights');
      
      return {
        memories: await memories.countRows(),
        patterns: await patterns.countRows(),
        insights: await insights.countRows()
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { memories: 0, patterns: 0, insights: 0 };
    }
  }

  async listInsights(): Promise<Insight[]> {
    const db = await this.connect();
    const table = await db.openTable('insights');

    try {
      const results = await table
        .search(Array(384).fill(0))
        .filter('dismissed = false')
        .limit(20)
        .execute();

      // Convert to plain objects for IPC serialization
      return results.map((r: any) => ({
        id: r.id,
        insight_text: r.insight_text,
        category: r.category,
        confidence: r.confidence,
        created_at: r.created_at,
        dismissed: r.dismissed,
        metadata: r.metadata || {}
      }));
    } catch (error) {
      console.error('Error listing insights:', error);
      return [];
    }
  }

  async dismissInsight(id: string): Promise<void> {
    const db = await this.connect();
    const table = await db.openTable('insights');
    
    try {
      // LanceDB doesn't support direct updates, so we need to delete and re-add
      // For now, we'll just add a new entry with dismissed = true
      const insight: Insight = {
        id,
        insight_text: 'dismissed',
        category: 'dismissed',
        vector: Array(384).fill(0),
        confidence: 0,
        created_at: Date.now(),
        dismissed: true,
        metadata: {}
      };
      
      await table.add([insight]);
      console.log('Insight dismissed:', id);
    } catch (error) {
      console.error('Error dismissing insight:', error);
    }
  }

  // Document operations
  async addDocumentChunk(chunk: {
    document_id: string;
    chunk_id: string;
    content: string;
    vector: number[];
    position: number;
    file_path: string;
    file_type: string;
    title: string;
    chunk_tokens: number;
    metadata: Record<string, any>;
  }): Promise<void> {
    const db = await this.connect();
    const table = await db.openTable('document_chunks');
    
    const chunkRecord = {
      id: `${chunk.document_id}-${chunk.chunk_id}`,
      ...chunk,
      created_at: Date.now()
    };
    
    await table.add([chunkRecord]);
    console.log('Document chunk added:', chunkRecord.id);
  }

  async searchDocuments(query: string, vector: number[], options: {
    fileTypes?: string[];
    maxResults?: number;
  } = {}): Promise<any[]> {
    const db = await this.connect();
    const table = await db.openTable('document_chunks');
    
    try {
      let search = table
        .search(vector)
        .select(['id', 'document_id', 'chunk_id', 'content', 'position', 'file_path', 'file_type', 'title', 'metadata'])
        .limit(options.maxResults || 20);
      
      // Filter by file type if specified
      if (options.fileTypes && options.fileTypes.length > 0) {
        const typeFilter = options.fileTypes.map(t => `file_type = '${t}'`).join(' OR ');
        search = search.filter(typeFilter);
      }
      
      const results = await search.execute();
      return results;
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }

  async getDocumentChunks(documentId: string): Promise<any[]> {
    const db = await this.connect();
    const table = await db.openTable('document_chunks');
    
    try {
      const results = await table
        .search(Array(384).fill(0))
        .filter(`document_id = '${documentId}'`)
        .limit(1000)
        .execute();
      
      return results.sort((a: any, b: any) => a.position - b.position);
    } catch (error) {
      console.error('Error getting document chunks:', error);
      return [];
    }
  }
}

export const lanceDBManager = new LanceDBManager();
