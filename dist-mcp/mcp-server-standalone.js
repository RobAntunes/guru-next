#!/usr/bin/env node
/**
 * Standalone MCP Server for Guru
 * Run this to expose Guru's knowledge bases, documents, and memory to any MCP client
 */
import { GuruMCPServer } from './main/mcp-server.js';
async function main() {
    console.error('Starting Guru MCP Server...');
    console.error('Listening for MCP client connections via stdio');
    try {
        const server = new GuruMCPServer();
        await server.start();
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
    }
    catch (error) {
        console.error('Failed to start MCP server:', error);
        process.exit(1);
    }
}
// Handle graceful shutdown
process.on('SIGINT', () => {
    console.error('Shutting down Guru MCP Server...');
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.error('Shutting down Guru MCP Server...');
    process.exit(0);
});
main();
