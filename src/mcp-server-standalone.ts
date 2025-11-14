#!/usr/bin/env node
/**
 * Standalone MCP Server for Guru
 * Run this to expose Guru's knowledge bases, documents, and memory to any MCP client
 *
 * This is a simple launcher that uses the compiled main process code
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

async function main() {
  console.error('Starting Guru MCP Server...');
  console.error('Listening for MCP client connections via stdio');

  try {
    // Import the compiled MCP server from dist
    const mcpServerPath = join(__dirname, '../dist/main/index.js');
    const { mcpServer } = await import(mcpServerPath);

    await mcpServer.start();

    console.error('Guru MCP Server is running');
    console.error('Available tools:');
    console.error('  - list_knowledge_bases');
    console.error('  - get_knowledge_base');
    console.error('  - list_documents');
    console.error('  - get_document');
    console.error('  - search_documents');
    console.error('  - read_file');
    console.error('  - list_directory');
    console.error('  - get_file_info');
    console.error('  - get_memory_stats');
    console.error('  - search_memories');
    console.error('  - add_memory');
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    console.error('Make sure you run "npm run build" first!');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('\nShutting down Guru MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\nShutting down Guru MCP Server...');
  process.exit(0);
});

main();
