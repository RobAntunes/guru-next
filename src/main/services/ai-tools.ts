/**
 * AI Tools System
 * Provides tools/functions that AI models can call to manipulate knowledge bases,
 * state graphs, memories, and context.
 */

import { lanceDBManager } from '../storage/lancedb-manager';
import { documentIndexer } from './document-indexer';
import { readFileContent, getDirectoryFiles, getFileInfo } from '../file-handlers';
import { writeFile, mkdir, unlink, rename, readdir, stat } from 'fs/promises';
import { dirname, join, extname, basename } from 'path';
import { existsSync } from 'fs';

// Dynamic import for happenManager to avoid circular dependencies if any
// typically we can import directly, but since tools are used by orchestrator which is used by happen... better safe.
// actually, orchestrator uses tools, happen uses agent-node, agent-node uses ai-manager.
// tools -> happen-manager -> agent-node -> ai-manager -> (maybe) tools
// This loop exists. We will use dynamic imports inside the execute functions.

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: any) => Promise<any>;
}

/**
 * Knowledge Base Tools
 */
export const knowledgeBaseTools: ToolDefinition[] = [
  {
    name: 'search_knowledge_base',
    description: 'Search the indexed knowledge base (code, docs, conversations, decisions) for relevant information',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query'
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)'
        },
        fileTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by file types (e.g., ["js", "md", "conversation"])'
        }
      },
      required: ['query']
    },
    execute: async (args) => {
      const { query, maxResults = 10, fileTypes } = args;
      const vector = Array(384).fill(0); // Placeholder - in production use actual embeddings
      const results = await lanceDBManager.searchDocuments(query, vector, {
        fileTypes,
        maxResults
      });
      return {
        success: true,
        results: results.map(r => ({
          content: r.content,
          filePath: r.file_path,
          fileType: r.file_type,
          title: r.title,
          chunkId: r.chunk_id
        }))
      };
    }
  },

  {
    name: 'add_to_knowledge_base',
    description: 'Add a piece of information (code snippet, decision, note) to the knowledge base',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The content to add'
        },
        title: {
          type: 'string',
          description: 'Title or summary of the content'
        },
        type: {
          type: 'string',
          description: 'Type of content (e.g., "decision", "note", "code_snippet", "constraint")'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization'
        }
      },
      required: ['content', 'title', 'type']
    },
    execute: async (args) => {
      const { content, title, type, tags = [] } = args;
      const documentId = `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const vector = Array(384).fill(0); // Placeholder

      await lanceDBManager.addDocumentChunk({
        document_id: documentId,
        chunk_id: 'chunk-0',
        content,
        vector,
        position: 0,
        file_path: `knowledge/${type}/${documentId}`,
        file_type: type,
        title,
        chunk_tokens: Math.ceil(content.length / 4),
        metadata: JSON.stringify({ tags, type, source: 'ai_generated' })
      });

      return {
        success: true,
        documentId,
        message: `Added "${title}" to knowledge base`
      };
    }
  },

  {
    name: 'get_document_chunks',
    description: 'Get all chunks for a specific document from the knowledge base',
    parameters: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'The document ID'
        }
      },
      required: ['documentId']
    },
    execute: async (args) => {
      const { documentId } = args;
      const chunks = await lanceDBManager.getDocumentChunks(documentId);
      return {
        success: true,
        chunks
      };
    }
  }
];

/**
 * Memory & Context Tools
 */
export const memoryTools: ToolDefinition[] = [
  {
    name: 'add_memory',
    description: 'Store a memory (fact, observation, decision) in the AI memory system',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The memory content'
        },
        type: {
          type: 'string',
          description: 'Type of memory (e.g., "fact", "decision", "observation", "task", "goal")'
        },
        layer: {
          type: 'string',
          enum: ['working', 'short-term', 'long-term'],
          description: 'Memory layer - working (temporary), short-term (session), or long-term (persistent)'
        },
        importance: {
          type: 'number',
          description: 'Importance score 0-1 (higher = more important)'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization'
        },
        context: {
          type: 'array',
          items: { type: 'string' },
          description: 'Context identifiers this memory relates to'
        }
      },
      required: ['content', 'type', 'layer']
    },
    execute: async (args) => {
      const { content, type, layer, importance = 0.5, tags = [], context = [] } = args;
      const memoryId = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const vector = Array(384).fill(0); // Placeholder

      await lanceDBManager.addMemory({
        id: memoryId,
        type,
        layer,
        content,
        vector,
        timestamp: Date.now(),
        last_accessed: Date.now(),
        access_count: 1,
        confidence: 1.0,
        relevance_score: 1.0,
        importance,
        context,
        related_ids: [],
        tags,
        metadata: { source: 'ai_tool' }
      });

      return {
        success: true,
        memoryId,
        message: `Stored memory in ${layer} layer`
      };
    }
  },

  {
    name: 'search_memories',
    description: 'Search past memories, decisions, and observations',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 10)'
        },
        type: {
          type: 'string',
          description: 'Filter by memory type'
        }
      },
      required: ['query']
    },
    execute: async (args) => {
      const { query, limit = 10 } = args;
      const vector = Array(384).fill(0); // Placeholder
      const memories = await lanceDBManager.searchMemories(query, vector, limit);

      return {
        success: true,
        memories: memories.map(m => ({
          id: m.id,
          type: m.type,
          content: m.content,
          timestamp: m.timestamp,
          confidence: m.confidence,
          tags: m.tags,
          context: m.context
        }))
      };
    }
  },

  {
    name: 'index_conversation',
    description: 'Index the current conversation context into the knowledge base for future reference',
    parameters: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string' },
              content: { type: 'string' },
              timestamp: { type: 'number' }
            }
          },
          description: 'The conversation messages to index'
        },
        summary: {
          type: 'string',
          description: 'A summary of the conversation'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for this conversation'
        }
      },
      required: ['messages', 'summary']
    },
    execute: async (args) => {
      const { messages, summary, tags = [] } = args;

      // Create conversation document
      const conversationId = `conv-${Date.now()}`;
      const content = messages.map((m: any) =>
        `${m.role}: ${m.content}`
      ).join('\n\n');

      const vector = Array(384).fill(0); // Placeholder

      await lanceDBManager.addDocumentChunk({
        document_id: conversationId,
        chunk_id: 'conversation',
        content,
        vector,
        position: 0,
        file_path: `conversations/${conversationId}`,
        file_type: 'conversation',
        title: summary,
        chunk_tokens: Math.ceil(content.length / 4),
        metadata: JSON.stringify({
          tags,
          messageCount: messages.length,
          source: 'conversation_index'
        })
      });

      return {
        success: true,
        conversationId,
        message: `Indexed conversation: ${summary}`
      };
    }
  }
];

/**
 * State Graph Tools
 */
export const stateGraphTools: ToolDefinition[] = [
  {
    name: 'add_graph_node',
    description: 'Add a node to the state graph (goal, task, fact, constraint, decision)',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['goal', 'task', 'fact', 'constraint', 'decision', 'agent', 'file'],
          description: 'Type of node'
        },
        label: {
          type: 'string',
          description: 'Node label/title'
        },
        description: {
          type: 'string',
          description: 'Detailed description'
        },
        category: {
          type: 'string',
          description: 'Category for grouping'
        },
        status: {
          type: 'string',
          enum: ['active', 'completed', 'blocked', 'pending'],
          description: 'Node status'
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata'
        }
      },
      required: ['type', 'label']
    },
    execute: async (args) => {
      const { type, label, description = '', category = 'default', status = 'active', metadata = {} } = args;
      const nodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Store as a special knowledge base entry
      const vector = Array(384).fill(0);
      await lanceDBManager.addDocumentChunk({
        document_id: nodeId,
        chunk_id: 'graph-node',
        content: `${label}\n${description}`,
        vector,
        position: 0,
        file_path: `graph/nodes/${type}/${nodeId}`,
        file_type: 'graph_node',
        title: label,
        chunk_tokens: Math.ceil((label.length + description.length) / 4),
        metadata: JSON.stringify({
          nodeType: type,
          category,
          status,
          ...metadata
        })
      });

      return {
        success: true,
        nodeId,
        node: {
          id: nodeId,
          type,
          label,
          description,
          category,
          status,
          metadata
        }
      };
    }
  },

  {
    name: 'update_graph_node',
    description: 'Update an existing graph node (change status, add info, etc.)',
    parameters: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'string',
          description: 'The node ID to update'
        },
        updates: {
          type: 'object',
          description: 'Fields to update (status, description, metadata, etc.)'
        }
      },
      required: ['nodeId', 'updates']
    },
    execute: async (args) => {
      const { nodeId, updates } = args;

      // In a real implementation, you'd update the existing node
      // For now, we'll add a note about the update
      const vector = Array(384).fill(0);
      await lanceDBManager.addDocumentChunk({
        document_id: `update-${nodeId}`,
        chunk_id: 'node-update',
        content: `Node ${nodeId} updated: ${JSON.stringify(updates)}`,
        vector,
        position: 0,
        file_path: `graph/updates/${nodeId}`,
        file_type: 'graph_update',
        title: `Update for ${nodeId}`,
        chunk_tokens: 20,
        metadata: JSON.stringify({
          originalNodeId: nodeId,
          updates
        })
      });

      return {
        success: true,
        message: `Updated node ${nodeId}`
      };
    }
  },

  {
    name: 'search_graph',
    description: 'Search the state graph for nodes matching criteria',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        nodeType: {
          type: 'string',
          description: 'Filter by node type'
        },
        status: {
          type: 'string',
          description: 'Filter by status'
        }
      },
      required: ['query']
    },
    execute: async (args) => {
      const { query, nodeType, status } = args;
      const vector = Array(384).fill(0);

      const results = await lanceDBManager.searchDocuments(query, vector, {
        fileTypes: ['graph_node'],
        maxResults: 20
      });

      // Filter by nodeType and status if specified
      const filtered = results.filter(r => {
        const meta = r.metadata || {};
        if (nodeType && meta.nodeType !== nodeType) return false;
        if (status && meta.status !== status) return false;
        return true;
      });

      return {
        success: true,
        nodes: filtered.map(r => ({
          id: r.document_id,
          type: r.metadata?.nodeType,
          label: r.title,
          description: r.content,
          status: r.metadata?.status,
          category: r.metadata?.category
        }))
      };
    }
  }
];

/**
 * Happen Agent Tools (Swarm Control)
 */
export const agentTools: ToolDefinition[] = [
  {
    name: 'dispatch_agent_task',
    description: 'Dispatch a task to a specialized Happen Agent (Architect, Coder, QA)',
    parameters: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          enum: ['architect', 'coder', 'qa'],
          description: 'The ID of the agent to dispatch to'
        },
        task: {
          type: 'string',
          description: 'The detailed task instruction'
        }
      },
      required: ['agentId', 'task']
    },
    execute: async (args) => {
       // Import happenManager dynamically
       const { happenManager } = await import('./happen/happen-manager');
       try {
         const result = await happenManager.dispatchTask(args.agentId, args.task, {
             source: 'main-assistant'
         });
         return { success: true, result, message: `Task dispatched to ${args.agentId}` };
       } catch(e: any) { 
           return { success: false, error: e.message }; 
       }
    }
  },
  {
    name: 'list_agents',
    description: 'Get the current status and capabilities of all specialized agents',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
       const { happenManager } = await import('./happen/happen-manager');
       return { success: true, agents: happenManager.getAgents() };
    }
  }
];

/**
 * File Operation Tools
 */
export const fileOperationTools: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file from the filesystem',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path to the file to read'
        }
      },
      required: ['filePath']
    },
    execute: async (args) => {
      const { filePath } = args;

      try {
        if (!existsSync(filePath)) {
          return {
            success: false,
            error: `File not found: ${filePath}`
          };
        }

        const content = await readFileContent(filePath);
        const fileInfo = await getFileInfo(filePath);

        return {
          success: true,
          content,
          filePath,
          fileName: fileInfo.name,
          size: fileInfo.size,
          extension: fileInfo.extension
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },

  {
    name: 'write_file',
    description: 'Write content to a file (creates new file or overwrites existing)',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path where to write the file'
        },
        content: {
          type: 'string',
          description: 'Content to write to the file'
        },
        createDirectories: {
          type: 'boolean',
          description: 'Create parent directories if they don\'t exist (default: true)'
        }
      },
      required: ['filePath', 'content']
    },
    execute: async (args) => {
      const { filePath, content, createDirectories = true } = args;

      try {
        // Safety check: don't write to system directories
        const dangerousPaths = ['/bin', '/sbin', '/usr', '/etc', '/System', '/Windows', '/Program Files'];
        if (dangerousPaths.some(dp => filePath.startsWith(dp))) {
          return {
            success: false,
            error: 'Cannot write to system directories for safety reasons'
          };
        }

        // Create parent directories if needed
        const dir = dirname(filePath);
        if (createDirectories && !existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }

        await writeFile(filePath, content, 'utf-8');

        // Index the file in knowledge base if it's code
        const ext = extname(filePath).slice(1);
        const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'rb'];
        if (codeExts.includes(ext)) {
          // Fire and forget - don't wait for indexing
          documentIndexer.indexFile(filePath).catch(console.error);
        }

        return {
          success: true,
          filePath,
          message: `File written successfully`,
          size: content.length
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },

  {
    name: 'list_directory',
    description: 'List files and directories in a given path',
    parameters: {
      type: 'object',
      properties: {
        dirPath: {
          type: 'string',
          description: 'Path to the directory to list'
        },
        recursive: {
          type: 'boolean',
          description: 'List recursively (default: false)'
        },
        pattern: {
          type: 'string',
          description: 'Filter by file extension or pattern (e.g., "*.ts")'
        }
      },
      required: ['dirPath']
    },
    execute: async (args) => {
      const { dirPath, recursive = false, pattern } = args;

      try {
        if (!existsSync(dirPath)) {
          return {
            success: false,
            error: `Directory not found: ${dirPath}`
          };
        }

        const files = await getDirectoryFiles(dirPath, recursive);

        // Filter by pattern if provided
        let filtered = files;
        if (pattern) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          filtered = files.filter(f => regex.test(f.name) || regex.test(f.path));
        }

        return {
          success: true,
          files: filtered.map(f => ({
            path: f.path,
            name: f.name,
            isDirectory: f.isDirectory,
            extension: f.extension,
            size: f.size
          })),
          count: filtered.length
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },

  {
    name: 'create_directory',
    description: 'Create a new directory (and parent directories if needed)',
    parameters: {
      type: 'object',
      properties: {
        dirPath: {
          type: 'string',
          description: 'Path of the directory to create'
        }
      },
      required: ['dirPath']
    },
    execute: async (args) => {
      const { dirPath } = args;

      try {
        if (existsSync(dirPath)) {
          return {
            success: false,
            error: 'Directory already exists'
          };
        }

        await mkdir(dirPath, { recursive: true });

        return {
          success: true,
          dirPath,
          message: 'Directory created successfully'
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },

  {
    name: 'delete_file',
    description: 'Delete a file (use with caution!)',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the file to delete'
        },
        confirm: {
          type: 'boolean',
          description: 'Must be true to confirm deletion'
        }
      },
      required: ['filePath', 'confirm']
    },
    execute: async (args) => {
      const { filePath, confirm } = args;

      if (!confirm) {
        return {
          success: false,
          error: 'Deletion not confirmed. Set confirm: true to proceed.'
        };
      }

      try {
        if (!existsSync(filePath)) {
          return {
            success: false,
            error: 'File not found'
          };
        }

        // Safety check: don't delete important files
        const dangerous = ['.git', 'package.json', 'package-lock.json', 'yarn.lock', 'node_modules'];
        if (dangerous.some(d => filePath.includes(d))) {
          return {
            success: false,
            error: 'Cannot delete important project files for safety'
          };
        }

        await unlink(filePath);

        return {
          success: true,
          filePath,
          message: 'File deleted successfully'
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },

  {
    name: 'move_file',
    description: 'Move or rename a file',
    parameters: {
      type: 'object',
      properties: {
        sourcePath: {
          type: 'string',
          description: 'Current path of the file'
        },
        destPath: {
          type: 'string',
          description: 'New path for the file'
        }
      },
      required: ['sourcePath', 'destPath']
    },
    execute: async (args) => {
      const { sourcePath, destPath } = args;

      try {
        if (!existsSync(sourcePath)) {
          return {
            success: false,
            error: 'Source file not found'
          };
        }

        // Check if destination exists and is a directory, or if it's an existing file
        if (existsSync(destPath)) {
          const destStat = await stat(destPath);
          if (destStat.isDirectory()) {
            // If destPath is a directory, move the file into it
            const fileName = basename(sourcePath);
            const newDestPath = join(destPath, fileName);
            await rename(sourcePath, newDestPath);
            return {
              success: true,
              sourcePath,
              destPath: newDestPath,
              message: `File moved successfully to directory: ${destPath}`
            };
          } else {
            // If destPath is an existing file, prevent overwrite
            return {
              success: false,
              error: 'Destination file already exists'
            };
          }
        }

        // Ensure parent directory exists for the new path
        const destDir = dirname(destPath);
        if (!existsSync(destDir)) {
          await mkdir(destDir, { recursive: true });
        }

        await rename(sourcePath, destPath);

        return {
          success: true,
          sourcePath,
          destPath,
          message: 'File moved successfully'
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },

  {
    name: 'search_files',
    description: 'Search for files matching a pattern in a directory',
    parameters: {
      type: 'object',
      properties: {
        dirPath: {
          type: 'string',
          description: 'Directory to search in'
        },
        pattern: {
          type: 'string',
          description: 'Search pattern (supports wildcards like *.ts, *test*)'
        },
        recursive: {
          type: 'boolean',
          description: 'Search recursively (default: true)'
        }
      },
      required: ['dirPath', 'pattern']
    },
    execute: async (args) => {
      const { dirPath, pattern, recursive = true } = args;

      try {
        if (!existsSync(dirPath)) {
          return {
            success: false,
            error: 'Directory not found'
          };
        }

        const files = await getDirectoryFiles(dirPath, recursive);
        const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i');

        const matches = files.filter(f =>
          !f.isDirectory && (regex.test(f.name) || regex.test(f.path))
        );

        return {
          success: true,
          matches: matches.map(f => ({
            path: f.path,
            name: f.name,
            extension: f.extension,
            size: f.size
          })),
          count: matches.length
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  }
];

/**
 * Get all tools as a single array
 */
export const allTools: ToolDefinition[] = [
  ...knowledgeBaseTools,
  ...memoryTools,
  ...stateGraphTools,
  ...agentTools,
  ...fileOperationTools
];

/**
 * Get tool definitions in OpenAI function calling format
 */
export function getToolsForOpenAI() {
  return allTools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

/**
 * Get tool definitions in Anthropic format
 */
export function getToolsForAnthropic() {
  return allTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters
  }));
}

export function getToolsForGemini() {
  return {
    function_declarations: allTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }))
  };
}

/**
 * Execute a tool by name
 */
export async function executeTool(toolName: string, args: any): Promise<any> {
  const tool = allTools.find(t => t.name === toolName);

  if (!tool) {
    throw new Error(`Tool not found: ${toolName}`);
  }

  try {
    return await tool.execute(args);
  } catch (error: any) {
    console.error(`Error executing tool ${toolName}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}
