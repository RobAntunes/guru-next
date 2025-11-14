import * as lancedb from '@lancedb/lancedb';
import { getLanceDBDir } from '../data-paths.js';
class LanceDBManager {
    db = null;
    dbPath;
    constructor() {
        // Store in userData directory
        this.dbPath = getLanceDBDir();
        console.log('LanceDB path:', this.dbPath);
    }
    async connect() {
        if (!this.db) {
            this.db = await lancedb.connect(this.dbPath);
            await this.initializeTables();
        }
        return this.db;
    }
    async initializeTables() {
        const db = await this.connect();
        try {
            // Check if tables exist by trying to open them
            await db.openTable('memories');
            await db.openTable('patterns');
            await db.openTable('insights');
            console.log('LanceDB tables already exist');
        }
        catch (error) {
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
    async searchMemories(query, vector, limit = 10) {
        const db = await this.connect();
        const table = await db.openTable('memories');
        try {
            // Hybrid search: vector + text
            const results = await table
                .search(vector)
                .select(['id', 'type', 'content', 'timestamp', 'confidence', 'context', 'tags', 'metadata'])
                .limit(limit)
                .execute();
            return results;
        }
        catch (error) {
            console.error('Error searching memories:', error);
            return [];
        }
    }
    async addMemory(memory) {
        const db = await this.connect();
        const table = await db.openTable('memories');
        await table.add([memory]);
        console.log('Memory added:', memory.id);
    }
    async trackPattern(pattern) {
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
        }
        catch (error) {
            console.error('Error tracking pattern:', error);
        }
    }
    async generateInsights() {
        // Simple rule-based insights for now
        const db = await this.connect();
        const memTable = await db.openTable('memories');
        const patTable = await db.openTable('patterns');
        const insights = [];
        try {
            // Get recent memories
            const memories = await memTable
                .search(Array(384).fill(0))
                .limit(100)
                .execute();
            // Generate simple insights
            if (memories.length > 10) {
                insights.push({
                    id: `ins-${Date.now()}-1`,
                    insight_text: `You have ${memories.length} memories stored`,
                    category: 'usage',
                    vector: Array(384).fill(0),
                    confidence: 1.0,
                    created_at: Date.now(),
                    dismissed: false,
                    metadata: { memory_count: memories.length }
                });
            }
            return insights;
        }
        catch (error) {
            console.error('Error generating insights:', error);
            return [];
        }
    }
    async getStats() {
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
        }
        catch (error) {
            console.error('Error getting stats:', error);
            return { memories: 0, patterns: 0, insights: 0 };
        }
    }
    async listInsights() {
        const db = await this.connect();
        const table = await db.openTable('insights');
        try {
            const results = await table
                .search(Array(384).fill(0))
                .filter('dismissed = false')
                .limit(20)
                .execute();
            return results;
        }
        catch (error) {
            console.error('Error listing insights:', error);
            return [];
        }
    }
    async dismissInsight(id) {
        const db = await this.connect();
        const table = await db.openTable('insights');
        try {
            // LanceDB doesn't support direct updates, so we need to delete and re-add
            // For now, we'll just add a new entry with dismissed = true
            const insight = {
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
        }
        catch (error) {
            console.error('Error dismissing insight:', error);
        }
    }
    // Document operations
    async addDocumentChunk(chunk) {
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
    async searchDocuments(query, vector, options = {}) {
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
        }
        catch (error) {
            console.error('Error searching documents:', error);
            return [];
        }
    }
    async getDocumentChunks(documentId) {
        const db = await this.connect();
        const table = await db.openTable('document_chunks');
        try {
            const results = await table
                .search(Array(384).fill(0))
                .filter(`document_id = '${documentId}'`)
                .limit(1000)
                .execute();
            return results.sort((a, b) => a.position - b.position);
        }
        catch (error) {
            console.error('Error getting document chunks:', error);
            return [];
        }
    }
}
export const lanceDBManager = new LanceDBManager();
