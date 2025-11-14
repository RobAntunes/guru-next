/**
 * MCP (Model Context Protocol) Server
 * Exposes tools for AI models to interact with the application
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { lanceDBManager } from './storage/lancedb-manager';
import { fileStorage } from './file-storage';
import { wasmVM } from './wasm-vm';
import { readFileContent, getFileInfo, getDirectoryFiles } from './file-handlers';
/**
 * MCP Server for Guru
 */
export class GuruMCPServer {
    server;
    constructor() {
        this.server = new Server({
            name: 'guru-electron',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
    }
    setupHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'list_knowledge_bases',
                        description: 'List all knowledge bases in the current project',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                        },
                    },
                    {
                        name: 'get_knowledge_base',
                        description: 'Get details about a specific knowledge base',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'Knowledge base ID',
                                },
                            },
                            required: ['id'],
                        },
                    },
                    {
                        name: 'list_documents',
                        description: 'List documents in a knowledge base',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                knowledge_base_id: {
                                    type: 'string',
                                    description: 'Knowledge base ID',
                                },
                            },
                            required: ['knowledge_base_id'],
                        },
                    },
                    {
                        name: 'get_document',
                        description: 'Get the content of a specific document',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                document_id: {
                                    type: 'string',
                                    description: 'Document ID',
                                },
                            },
                            required: ['document_id'],
                        },
                    },
                    {
                        name: 'search_documents',
                        description: 'Search for documents using text query',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: 'Search query',
                                },
                                knowledge_base_id: {
                                    type: 'string',
                                    description: 'Optional: limit search to specific knowledge base',
                                },
                                file_types: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Optional: filter by file types (e.g., ["pdf", "md"])',
                                },
                                max_results: {
                                    type: 'number',
                                    description: 'Maximum number of results (default: 20)',
                                },
                            },
                            required: ['query'],
                        },
                    },
                    {
                        name: 'read_file',
                        description: 'Read a file from the file system',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                file_path: {
                                    type: 'string',
                                    description: 'Path to the file',
                                },
                            },
                            required: ['file_path'],
                        },
                    },
                    {
                        name: 'list_directory',
                        description: 'List files in a directory',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                directory_path: {
                                    type: 'string',
                                    description: 'Path to the directory',
                                },
                                recursive: {
                                    type: 'boolean',
                                    description: 'Whether to list recursively (default: false)',
                                },
                            },
                            required: ['directory_path'],
                        },
                    },
                    {
                        name: 'get_file_info',
                        description: 'Get information about a file',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                file_path: {
                                    type: 'string',
                                    description: 'Path to the file',
                                },
                            },
                            required: ['file_path'],
                        },
                    },
                    {
                        name: 'get_memory_stats',
                        description: 'Get statistics about the adaptive memory system',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                        },
                    },
                    {
                        name: 'search_memories',
                        description: 'Search through stored memories and patterns',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: 'Search query',
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Maximum number of results (default: 10)',
                                },
                            },
                            required: ['query'],
                        },
                    },
                    {
                        name: 'add_memory',
                        description: 'Store a new memory or insight',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                content: {
                                    type: 'string',
                                    description: 'Content to remember',
                                },
                                type: {
                                    type: 'string',
                                    description: 'Type of memory (e.g., "insight", "pattern", "fact")',
                                },
                                importance: {
                                    type: 'number',
                                    description: 'Importance score 0-1 (default: 0.5)',
                                },
                                tags: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Tags for categorization',
                                },
                            },
                            required: ['content', 'type'],
                        },
                    },
                ],
            };
        });
        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'list_knowledge_bases':
                        return await this.listKnowledgeBases();
                    case 'get_knowledge_base':
                        return await this.getKnowledgeBase(args.id);
                    case 'list_documents':
                        return await this.listDocuments(args.knowledge_base_id);
                    case 'get_document':
                        return await this.getDocument(args.document_id);
                    case 'search_documents':
                        return await this.searchDocuments(args.query, args.knowledge_base_id, args.file_types, args.max_results);
                    case 'read_file':
                        return await this.readFile(args.file_path);
                    case 'list_directory':
                        return await this.listDirectory(args.directory_path, args.recursive);
                    case 'get_file_info':
                        return await this.getFileInfoTool(args.file_path);
                    case 'get_memory_stats':
                        return await this.getMemoryStats();
                    case 'search_memories':
                        return await this.searchMemories(args.query, args.limit);
                    case 'add_memory':
                        return await this.addMemory(args.content, args.type, args.importance, args.tags);
                    case 'execute_wasm':
                        return await this.executeWasm(args.module_id, args.function_name, args.input, args.timeout);
                    case 'list_wasm_modules':
                        return await this.listWasmModules();
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    // Tool implementations
    async listKnowledgeBases() {
        const items = await fileStorage.listFiles('knowledge-bases');
        const knowledgeBases = items.map(item => ({
            id: item.id,
            ...item.data,
            metadata: item.metadata
        }));
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        knowledge_bases: knowledgeBases,
                        count: knowledgeBases.length
                    }, null, 2),
                },
            ],
        };
    }
    async getKnowledgeBase(id) {
        const item = await fileStorage.readFile('knowledge-bases', id);
        if (!item) {
            throw new Error(`Knowledge base not found: ${id}`);
        }
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        id: item.id,
                        ...item.data,
                        metadata: item.metadata
                    }, null, 2),
                },
            ],
        };
    }
    async listDocuments(knowledgeBaseId) {
        const items = await fileStorage.listFiles('documents');
        // Filter documents by knowledge base
        const documents = items
            .filter(item => item.data.knowledgeBaseId === knowledgeBaseId)
            .map(item => ({
            id: item.id,
            ...item.data,
            metadata: item.metadata
        }));
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        documents,
                        count: documents.length
                    }, null, 2),
                },
            ],
        };
    }
    async getDocument(documentId) {
        const item = await fileStorage.readFile('documents', documentId);
        if (!item) {
            throw new Error(`Document not found: ${documentId}`);
        }
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        id: item.id,
                        ...item.data,
                        metadata: item.metadata
                    }, null, 2),
                },
            ],
        };
    }
    async searchDocuments(query, knowledgeBaseId, fileTypes, maxResults) {
        const results = await lanceDBManager.searchDocuments(query, [], {
            fileTypes,
            maxResults: maxResults || 20,
        });
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ results, count: results.length }, null, 2),
                },
            ],
        };
    }
    async readFile(filePath) {
        const content = await readFileContent(filePath);
        return {
            content: [
                {
                    type: 'text',
                    text: content,
                },
            ],
        };
    }
    async listDirectory(dirPath, recursive = false) {
        const files = await getDirectoryFiles(dirPath, recursive);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ files, count: files.length }, null, 2),
                },
            ],
        };
    }
    async getFileInfoTool(filePath) {
        const info = await getFileInfo(filePath);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(info, null, 2),
                },
            ],
        };
    }
    async getMemoryStats() {
        const stats = await lanceDBManager.getStats();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(stats, null, 2),
                },
            ],
        };
    }
    async searchMemories(query, limit = 10) {
        const results = await lanceDBManager.searchMemories(query, [], limit);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ results, count: results.length }, null, 2),
                },
            ],
        };
    }
    async addMemory(content, type, importance = 0.5, tags = []) {
        const memory = {
            id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            layer: 'short-term',
            content,
            vector: Array(384).fill(0), // TODO: Generate actual embedding
            timestamp: Date.now(),
            last_accessed: Date.now(),
            access_count: 1,
            confidence: 1.0,
            relevance_score: 1.0,
            importance,
            context: ['user-added'],
            related_ids: [],
            tags,
            metadata: {},
        };
        await lanceDBManager.addMemory(memory);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ success: true, memory_id: memory.id }, null, 2),
                },
            ],
        };
    }
    async executeWasm(moduleId, functionName, input, timeout) {
        const result = await wasmVM.execute(moduleId, functionName, input, {
            timeout: timeout || 30000,
        });
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: result.success,
                        output: result.output,
                        error: result.error,
                        executionTime: result.executionTime,
                    }, null, 2),
                },
            ],
        };
    }
    async listWasmModules() {
        const modules = wasmVM.listModules();
        const capabilities = wasmVM.getCapabilities();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        modules,
                        count: modules.length,
                        capabilities,
                    }, null, 2),
                },
            ],
        };
    }
    /**
     * Start the MCP server
     */
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.log('Guru MCP Server started');
    }
}
// Export singleton
export const mcpServer = new GuruMCPServer();
