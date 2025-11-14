#!/usr/bin/env node
/**
 * Standalone MCP Server for Guru
 * Run this to expose Guru's knowledge bases, documents, and memory to any MCP client
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.error('Starting Guru MCP Server...');
  console.error('Listening for MCP client connections via stdio\n');

  try {
    // Import the compiled MCP server from dist (standalone export without Electron)
    const mcpServerPath = join(__dirname, 'dist/main/mcp-export.js');
    const module = await import(mcpServerPath);

    if (!module.mcpServer) {
      throw new Error('MCP server not found in compiled output');
    }

    await module.mcpServer.start();

    console.error('✓ Guru MCP Server is running\n');
    console.error('Available tools:');
    console.error('\n📖 Knowledge Base Operations (Read):');
    console.error('  • list_knowledge_bases - List all knowledge bases');
    console.error('  • get_knowledge_base - Get KB details');
    console.error('\n✏️  Knowledge Base Operations (Write):');
    console.error('  • create_knowledge_base - Create a new knowledge base');
    console.error('  • update_knowledge_base - Update KB metadata');
    console.error('  • delete_knowledge_base - Delete a knowledge base');
    console.error('\n📄 Document Operations (Read):');
    console.error('  • list_documents - List documents in a KB');
    console.error('  • get_document - Get document content');
    console.error('  • search_documents - Search across documents');
    console.error('\n✏️  Document Operations (Write):');
    console.error('  • add_document - Add a document to a KB');
    console.error('  • update_document - Update document metadata');
    console.error('  • delete_document - Delete a document');
    console.error('\n📁 File System:');
    console.error('  • read_file - Read any file from disk');
    console.error('  • list_directory - List directory contents');
    console.error('  • get_file_info - Get file metadata');
    console.error('\n🧠 Memory System:');
    console.error('  • get_memory_stats - Memory system statistics');
    console.error('  • search_memories - Search stored memories');
    console.error('  • add_memory - Store new insights');
    console.error('\n📦 Project Management:');
    console.error('  • list_projects - List all projects');
    console.error('  • get_current_project - Get active project');
    console.error('  • create_project - Create a new project');
    console.error('  • switch_project - Switch to a different project');
    console.error('\n🗂️  Document Organization:');
    console.error('  • list_document_groups - List groups in a KB');
    console.error('  • create_document_group - Create a document group');
    console.error('  • move_document_to_group - Move document to group\n');
  } catch (error) {
    console.error('✗ Failed to start MCP server:', error.message);
    console.error('\nMake sure you have built the project first:');
    console.error('  npm run build\n');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('\n\nShutting down Guru MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\n\nShutting down Guru MCP Server...');
  process.exit(0);
});

main();
