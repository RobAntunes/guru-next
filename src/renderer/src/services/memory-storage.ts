/**
 * Memory Storage Service
 * Manages memory system - patterns, insights, and interactions
 */

interface Memory {
  id: string;
  type: 'pattern' | 'insight' | 'interaction' | 'preference';
  content: string;
  timestamp: Date;
  confidence: number;
  context: string[];
  tags: string[];
  metadata: any;
}

interface MemoryStats {
  memories: number;
  patterns: number;
  insights: number;
}

class MemoryStorageService {
  /**
   * Add a new memory
   */
  async addMemory(memory: Omit<Memory, 'id'>): Promise<void> {
    const memoryWithId = {
      ...memory,
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: memory.timestamp.getTime(),
      vector: await this.generateEmbedding(memory.content),
      layer: 'short-term' as const,
      last_accessed: Date.now(),
      access_count: 1,
      relevance_score: 1.0,
      importance: memory.confidence,
      related_ids: []
    };

    try {
      if ((window as any).api?.memory?.add) {
        const result = await (window as any).api.memory.add(memoryWithId);
        if (!result.success) {
          console.error('Failed to add memory:', result.error);
        }
      }
    } catch (error) {
      console.warn('Memory API error:', error);
    }
  }

  /**
   * Search memories by semantic similarity
   */
  async search(query: string, limit = 10): Promise<Memory[]> {
    try {
      if ((window as any).api?.memory?.search) {
        const vector = await this.generateEmbedding(query);
        const result = await (window as any).api.memory.search(query, vector, limit);

        if (result.success && result.data) {
          return result.data.map((r: any) => ({
            ...r,
            timestamp: new Date(r.timestamp)
          }));
        }
      }
    } catch (error) {
      console.warn('Memory search error:', error);
    }

    return [];
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    try {
      if ((window as any).api?.memory?.getStats) {
        const result = await (window as any).api.memory.getStats();
        if (result.success && result.data) {
          return result.data;
        }
      }
    } catch (error) {
      console.warn('Memory stats error:', error);
    }

    // Return default stats if API not available
    return {
      memories: 0,
      patterns: 0,
      insights: 0
    };
  }

  /**
   * Generate embedding vector for text using AI service
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Try to use the AI service for embedding generation
      if ((window as any).api?.ai?.generateEmbedding) {
        const result = await (window as any).api.ai.generateEmbedding(text)
        if (result.success && result.data) {
          return result.data.embedding
        }
      }
    } catch (error) {
      console.warn('AI embedding generation failed, using fallback:', error)
    }

    // Fallback to simple hash-based embedding
    const hash = this.simpleHash(text)
    const vector = Array(384).fill(0)
    
    // Fill vector with deterministic values based on hash
    for (let i = 0; i < 384; i++) {
      vector[i] = Math.sin(hash + i) * 0.5 + 0.5
    }
    
    return vector
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * Track document access pattern
   */
  async trackDocumentAccess(documentId: string, documentName: string): Promise<void> {
    await this.addMemory({
      type: 'interaction',
      content: `Accessed document: ${documentName}`,
      timestamp: new Date(),
      confidence: 1.0,
      context: [documentId],
      tags: ['document', 'access'],
      metadata: { 
        documentId,
        documentName,
        action: 'access'
      }
    });
  }

  /**
   * Track search query
   */
  async trackQuery(query: string, results: any[]): Promise<void> {
    await this.addMemory({
      type: 'interaction',
      content: `Searched for: ${query}`,
      timestamp: new Date(),
      confidence: 1.0,
      context: results.map(r => r.id),
      tags: ['query', 'search'],
      metadata: { 
        query, 
        resultCount: results.length,
        resultIds: results.map(r => r.id)
      }
    });
  }

  /**
   * Track spec usage
   */
  async trackSpecUsage(specId: string, specName: string, action: 'create' | 'update' | 'view'): Promise<void> {
    await this.addMemory({
      type: 'interaction',
      content: `${action} spec: ${specName}`,
      timestamp: new Date(),
      confidence: 1.0,
      context: [specId],
      tags: ['spec', action],
      metadata: {
        specId,
        specName,
        action
      }
    });
  }

  /**
   * Track prompt usage
   */
  async trackPromptUsage(promptId: string, promptName: string, variables: Record<string, any>): Promise<void> {
    await this.addMemory({
      type: 'interaction',
      content: `Used prompt: ${promptName}`,
      timestamp: new Date(),
      confidence: 1.0,
      context: [promptId],
      tags: ['prompt', 'usage'],
      metadata: {
        promptId,
        promptName,
        variables
      }
    });
  }

  /**
   * Track user preference
   */
  async trackPreference(key: string, value: any, context: string): Promise<void> {
    await this.addMemory({
      type: 'preference',
      content: `Preference: ${key} = ${JSON.stringify(value)}`,
      timestamp: new Date(),
      confidence: 1.0,
      context: [context],
      tags: ['preference', key],
      metadata: {
        key,
        value,
        context
      }
    });
  }

  /**
   * Generate insights from patterns
   */
  async generateInsights(): Promise<any[]> {
    try {
      if ((window as any).api?.insight?.generate) {
        const result = await (window as any).api.insight.generate();
        if (result.success && result.data) {
          return result.data;
        }
      }
    } catch (error) {
      console.warn('Insight generation error:', error);
    }

    return [];
  }

  /**
   * List all insights
   */
  async listInsights(): Promise<any[]> {
    try {
      if ((window as any).api?.insight?.list) {
        const result = await (window as any).api.insight.list();
        if (result.success && result.data) {
          return result.data;
        }
      }
    } catch (error) {
      console.warn('Insight list error:', error);
    }

    return [];
  }

  /**
   * Dismiss an insight
   */
  async dismissInsight(id: string): Promise<void> {
    try {
      if ((window as any).api?.insight?.dismiss) {
        const result = await (window as any).api.insight.dismiss(id);
        if (!result.success) {
          console.error('Failed to dismiss insight:', result.error);
        }
      }
    } catch (error) {
      console.warn('Insight dismiss error:', error);
    }
  }
}

export const memoryStorage = new MemoryStorageService();
