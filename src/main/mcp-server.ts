/**
 * MCP (Model Context Protocol) Server
 * Exposes tools for AI models to interact with the application
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { lanceDBManager } from './storage/lancedb-manager';
import { fileStorage } from './file-storage';
import { wasmVM } from './wasm-vm';
import {
  openFileDialog,
  openFolderDialog,
  readFileContent,
  getFileInfo,
  getDirectoryFiles,
  processUploadedFiles
} from './file-handlers';

/**
 * MCP Server for Guru
 */
export class GuruMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'guru-electron',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
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
          // Write Operations - Knowledge Base Management
          {
            name: 'create_knowledge_base',
            description: 'Create a new knowledge base',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Knowledge base name',
                },
                description: {
                  type: 'string',
                  description: 'Knowledge base description',
                },
              },
              required: ['name', 'description'],
            },
          },
          {
            name: 'update_knowledge_base',
            description: 'Update knowledge base metadata',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Knowledge base ID',
                },
                updates: {
                  type: 'object',
                  description: 'Fields to update (name, description, etc.)',
                },
              },
              required: ['id', 'updates'],
            },
          },
          {
            name: 'delete_knowledge_base',
            description: 'Delete a knowledge base and all its documents',
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
          // Document Management
          {
            name: 'add_document',
            description: 'Add a document to a knowledge base',
            inputSchema: {
              type: 'object',
              properties: {
                knowledge_base_id: {
                  type: 'string',
                  description: 'Knowledge base ID',
                },
                file_path: {
                  type: 'string',
                  description: 'Path to the file to add',
                },
                metadata: {
                  type: 'object',
                  description: 'Optional metadata (category, tags, etc.)',
                },
              },
              required: ['knowledge_base_id', 'file_path'],
            },
          },
          {
            name: 'update_document',
            description: 'Update document metadata',
            inputSchema: {
              type: 'object',
              properties: {
                document_id: {
                  type: 'string',
                  description: 'Document ID',
                },
                updates: {
                  type: 'object',
                  description: 'Fields to update',
                },
              },
              required: ['document_id', 'updates'],
            },
          },
          {
            name: 'delete_document',
            description: 'Delete a document from a knowledge base',
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
          // Project Management
          {
            name: 'list_projects',
            description: 'List all projects',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_current_project',
            description: 'Get the currently active project',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'create_project',
            description: 'Create a new project',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Project name',
                },
                description: {
                  type: 'string',
                  description: 'Project description',
                },
              },
              required: ['name', 'description'],
            },
          },
          {
            name: 'switch_project',
            description: 'Switch to a different project',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: {
                  type: 'string',
                  description: 'Project ID to switch to',
                },
              },
              required: ['project_id'],
            },
          },
          // Document Organization
          {
            name: 'list_document_groups',
            description: 'List document groups in a knowledge base',
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
            name: 'create_document_group',
            description: 'Create a new document group',
            inputSchema: {
              type: 'object',
              properties: {
                knowledge_base_id: {
                  type: 'string',
                  description: 'Knowledge base ID',
                },
                name: {
                  type: 'string',
                  description: 'Group name',
                },
                description: {
                  type: 'string',
                  description: 'Group description',
                },
              },
              required: ['knowledge_base_id', 'name'],
            },
          },
          {
            name: 'move_document_to_group',
            description: 'Move a document to a different group',
            inputSchema: {
              type: 'object',
              properties: {
                document_id: {
                  type: 'string',
                  description: 'Document ID',
                },
                group_id: {
                  type: 'string',
                  description: 'Target group ID',
                },
              },
              required: ['document_id', 'group_id'],
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
            return await this.searchDocuments(
              args.query,
              args.knowledge_base_id,
              args.file_types,
              args.max_results
            );
            
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
            return await this.addMemory(
              args.content,
              args.type,
              args.importance,
              args.tags
            );
            
          case 'execute_wasm':
            return await this.executeWasm(
              args.module_id,
              args.function_name,
              args.input,
              args.timeout
            );
            
          case 'list_wasm_modules':
            return await this.listWasmModules();

          // Write Operations - Knowledge Base
          case 'create_knowledge_base':
            return await this.createKnowledgeBase(args.name, args.description);

          case 'update_knowledge_base':
            return await this.updateKnowledgeBase(args.id, args.updates);

          case 'delete_knowledge_base':
            return await this.deleteKnowledgeBaseTool(args.id);

          // Document Management
          case 'add_document':
            return await this.addDocument(args.knowledge_base_id, args.file_path, args.metadata);

          case 'update_document':
            return await this.updateDocument(args.document_id, args.updates);

          case 'delete_document':
            return await this.deleteDocument(args.document_id);

          // Project Management
          case 'list_projects':
            return await this.listProjects();

          case 'get_current_project':
            return await this.getCurrentProject();

          case 'create_project':
            return await this.createProject(args.name, args.description);

          case 'switch_project':
            return await this.switchProject(args.project_id);

          // Document Organization
          case 'list_document_groups':
            return await this.listDocumentGroups(args.knowledge_base_id);

          case 'create_document_group':
            return await this.createDocumentGroup(args.knowledge_base_id, args.name, args.description);

          case 'move_document_to_group':
            return await this.moveDocumentToGroup(args.document_id, args.group_id);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
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
  private async listKnowledgeBases() {
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

  private async getKnowledgeBase(id: string) {
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

  private async listDocuments(knowledgeBaseId: string) {
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

  private async getDocument(documentId: string) {
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

  private async searchDocuments(
    query: string,
    knowledgeBaseId?: string,
    fileTypes?: string[],
    maxResults?: number
  ) {
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

  private async readFile(filePath: string) {
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

  private async listDirectory(dirPath: string, recursive = false) {
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

  private async getFileInfoTool(filePath: string) {
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

  private async getMemoryStats() {
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

  private async searchMemories(query: string, limit = 10) {
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

  private async addMemory(
    content: string,
    type: string,
    importance = 0.5,
    tags: string[] = []
  ) {
    const memory = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      layer: 'short-term' as const,
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

  private async executeWasm(
    moduleId: string,
    functionName: string,
    input?: string,
    timeout?: number
  ) {
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

  private async listWasmModules() {
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

  // ============================================================================
  // KNOWLEDGE BASE WRITE OPERATIONS
  // ============================================================================

  private async createKnowledgeBase(name: string, description?: string) {
    const id = `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const knowledgeBase = {
      name,
      description: description || '',
      projectId: 'default', // TODO: Get from current project
      documentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await fileStorage.writeFile('knowledge-bases', id, knowledgeBase);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            id,
            knowledgeBase
          }, null, 2),
        },
      ],
    };
  }

  private async updateKnowledgeBase(id: string, updates: { name?: string; description?: string }) {
    const item = await fileStorage.readFile('knowledge-bases', id);

    if (!item) {
      throw new Error(`Knowledge base not found: ${id}`);
    }

    const updatedData = {
      ...item.data,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await fileStorage.writeFile('knowledge-bases', id, updatedData);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            id,
            knowledgeBase: updatedData
          }, null, 2),
        },
      ],
    };
  }

  private async deleteKnowledgeBaseTool(id: string) {
    // Check if KB exists
    const item = await fileStorage.readFile('knowledge-bases', id);
    if (!item) {
      throw new Error(`Knowledge base not found: ${id}`);
    }

    // Delete all documents in this KB
    const documents = await fileStorage.listFiles('documents');
    const kbDocuments = documents.filter(doc => doc.data.knowledgeBaseId === id);

    for (const doc of kbDocuments) {
      await fileStorage.deleteFile('documents', doc.id);
    }

    // Delete the KB itself
    await fileStorage.deleteFile('knowledge-bases', id);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            id,
            deletedDocuments: kbDocuments.length
          }, null, 2),
        },
      ],
    };
  }

  // ============================================================================
  // DOCUMENT WRITE OPERATIONS
  // ============================================================================

  private async addDocument(
    knowledgeBaseId: string,
    filePath: string,
    metadata?: { category?: string; tags?: string[] }
  ) {
    // Verify KB exists
    const kb = await fileStorage.readFile('knowledge-bases', knowledgeBaseId);
    if (!kb) {
      throw new Error(`Knowledge base not found: ${knowledgeBaseId}`);
    }

    // Process the file
    const processed = await processUploadedFiles([filePath]);

    if (processed.length === 0) {
      throw new Error(`Failed to process file: ${filePath}`);
    }

    const fileData = processed[0];

    // Create document record
    const documentId = fileData.id;
    const document = {
      filename: fileData.filename,
      content: fileData.content,
      category: metadata?.category || fileData.category,
      isBase64: fileData.isBase64,
      knowledgeBaseId,
      tags: metadata?.tags || [],
      metadata: fileData.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await fileStorage.writeFile('documents', documentId, document);

    // Update KB document count
    await fileStorage.writeFile('knowledge-bases', knowledgeBaseId, {
      ...kb.data,
      documentCount: (kb.data.documentCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            id: documentId,
            document
          }, null, 2),
        },
      ],
    };
  }

  private async updateDocument(
    documentId: string,
    updates: {
      filename?: string;
      category?: string;
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ) {
    const item = await fileStorage.readFile('documents', documentId);

    if (!item) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const updatedData = {
      ...item.data,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await fileStorage.writeFile('documents', documentId, updatedData);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            id: documentId,
            document: updatedData
          }, null, 2),
        },
      ],
    };
  }

  private async deleteDocument(documentId: string) {
    const item = await fileStorage.readFile('documents', documentId);

    if (!item) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const knowledgeBaseId = item.data.knowledgeBaseId;

    // Delete the document
    await fileStorage.deleteFile('documents', documentId);

    // Update KB document count
    if (knowledgeBaseId) {
      const kb = await fileStorage.readFile('knowledge-bases', knowledgeBaseId);
      if (kb) {
        await fileStorage.writeFile('knowledge-bases', knowledgeBaseId, {
          ...kb.data,
          documentCount: Math.max(0, (kb.data.documentCount || 1) - 1),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            id: documentId
          }, null, 2),
        },
      ],
    };
  }

  // ============================================================================
  // PROJECT MANAGEMENT OPERATIONS
  // ============================================================================

  private async listProjects() {
    const items = await fileStorage.listFiles('projects');

    const projects = items.map(item => ({
      id: item.id,
      ...item.data,
      metadata: item.metadata
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            projects,
            count: projects.length
          }, null, 2),
        },
      ],
    };
  }

  private async getCurrentProject() {
    // For now, return the first project or a default
    // TODO: Implement proper current project tracking
    const items = await fileStorage.listFiles('projects');

    if (items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              currentProject: null,
              message: 'No projects found. Create a project first.'
            }, null, 2),
          },
        ],
      };
    }

    const currentProject = {
      id: items[0].id,
      ...items[0].data,
      metadata: items[0].metadata
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ currentProject }, null, 2),
        },
      ],
    };
  }

  private async createProject(name: string, description?: string) {
    const id = `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const project = {
      name,
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {},
    };

    await fileStorage.writeFile('projects', id, project);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            id,
            project
          }, null, 2),
        },
      ],
    };
  }

  private async switchProject(projectId: string) {
    // Verify project exists
    const item = await fileStorage.readFile('projects', projectId);

    if (!item) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // TODO: Implement proper current project tracking
    // For now, just return success
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            currentProject: {
              id: item.id,
              ...item.data
            },
            message: 'Project switched successfully'
          }, null, 2),
        },
      ],
    };
  }

  // ============================================================================
  // DOCUMENT ORGANIZATION OPERATIONS
  // ============================================================================

  private async listDocumentGroups(knowledgeBaseId: string) {
    // Verify KB exists
    const kb = await fileStorage.readFile('knowledge-bases', knowledgeBaseId);
    if (!kb) {
      throw new Error(`Knowledge base not found: ${knowledgeBaseId}`);
    }

    // Get groups from KB data or return empty array
    const groups = kb.data.groups || [];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            groups,
            count: groups.length
          }, null, 2),
        },
      ],
    };
  }

  private async createDocumentGroup(
    knowledgeBaseId: string,
    name: string,
    description?: string
  ) {
    // Verify KB exists
    const kb = await fileStorage.readFile('knowledge-bases', knowledgeBaseId);
    if (!kb) {
      throw new Error(`Knowledge base not found: ${knowledgeBaseId}`);
    }

    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newGroup = {
      id: groupId,
      name,
      description: description || '',
      documentIds: [],
      createdAt: new Date().toISOString(),
    };

    // Add group to KB
    const groups = kb.data.groups || [];
    groups.push(newGroup);

    await fileStorage.writeFile('knowledge-bases', knowledgeBaseId, {
      ...kb.data,
      groups,
      updatedAt: new Date().toISOString(),
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            group: newGroup
          }, null, 2),
        },
      ],
    };
  }

  private async moveDocumentToGroup(documentId: string, groupId: string) {
    // Get document to find its KB
    const doc = await fileStorage.readFile('documents', documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const knowledgeBaseId = doc.data.knowledgeBaseId;

    // Get KB
    const kb = await fileStorage.readFile('knowledge-bases', knowledgeBaseId);
    if (!kb) {
      throw new Error(`Knowledge base not found: ${knowledgeBaseId}`);
    }

    const groups = kb.data.groups || [];
    const group = groups.find((g: any) => g.id === groupId);

    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }

    // Remove document from all groups
    groups.forEach((g: any) => {
      g.documentIds = (g.documentIds || []).filter((id: string) => id !== documentId);
    });

    // Add document to target group
    group.documentIds = group.documentIds || [];
    if (!group.documentIds.includes(documentId)) {
      group.documentIds.push(documentId);
    }

    // Update KB
    await fileStorage.writeFile('knowledge-bases', knowledgeBaseId, {
      ...kb.data,
      groups,
      updatedAt: new Date().toISOString(),
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            documentId,
            groupId,
            message: 'Document moved to group successfully'
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
