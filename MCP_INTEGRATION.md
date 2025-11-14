# Guru MCP Server - Integration Guide

Guru exposes an MCP (Model Context Protocol) server that allows **any MCP client** (Claude Desktop, Cline, etc.) to access your knowledge bases, documents, and adaptive memory system.

## Quick Start

### 1. Build the Project

```bash
npm install
npm run build
```

### 2. Test the MCP Server

```bash
npm run mcp
```

You should see:
```
✓ Guru MCP Server is running

Available tools:
  • list_knowledge_bases - List all knowledge bases
  • get_knowledge_base - Get KB details
  • list_documents - List documents in a KB
  • get_document - Get document content
  • search_documents - Search across documents
  • read_file - Read any file from disk
  • list_directory - List directory contents
  • get_file_info - Get file metadata
  • get_memory_stats - Memory system statistics
  • search_memories - Search stored memories
  • add_memory - Store new insights
```

Press Ctrl+C to stop.

## Connecting MCP Clients

### Claude Desktop

1. **Locate Claude Desktop config file:**
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. **Edit the config file** and add Guru to `mcpServers`:

```json
{
  "mcpServers": {
    "guru": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/guru-electron/mcp-server.mjs"
      ]
    }
  }
}
```

**Important**: Replace `/ABSOLUTE/PATH/TO/guru-electron/` with your actual path!

Example:
```json
{
  "mcpServers": {
    "guru": {
      "command": "node",
      "args": [
        "/Users/boss/Documents/guru-electron/mcp-server.mjs"
      ]
    }
  }
}
```

3. **Restart Claude Desktop**

4. **Test it**: In Claude Desktop, you can now ask:
   - "List my knowledge bases"
   - "Search my documents for authentication"
   - "What memories do you have about this project?"

### Cline (VS Code Extension)

1. Open Cline settings in VS Code
2. Add MCP server configuration:

```json
{
  "mcp.servers": {
    "guru": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/guru-electron/mcp-server.mjs"]
    }
  }
}
```

3. Restart VS Code or reload window

### Other MCP Clients

Any MCP-compatible client can connect to Guru using the stdio transport:

```bash
node /path/to/guru-electron/mcp-server.mjs
```

The server communicates via stdin/stdout using the MCP protocol.

## Available Tools

### Knowledge Base Tools (Read)

- **list_knowledge_bases**
  - Lists all knowledge bases in your project
  - No parameters required

- **get_knowledge_base**
  - Get details about a specific knowledge base
  - Parameters: `id` (string)

### Knowledge Base Tools (Write)

- **create_knowledge_base**
  - Create a new knowledge base
  - Parameters:
    - `name` (string) - Name of the knowledge base
    - `description` (string, optional) - Description

- **update_knowledge_base**
  - Update knowledge base metadata
  - Parameters:
    - `id` (string) - KB ID
    - `name` (string, optional) - New name
    - `description` (string, optional) - New description

- **delete_knowledge_base**
  - Delete a knowledge base and all its documents
  - Parameters: `id` (string) - KB ID to delete

### Document Tools (Read)

- **list_documents**
  - List documents in a knowledge base
  - Parameters: `knowledge_base_id` (string)

- **get_document**
  - Get the content of a specific document
  - Parameters: `document_id` (string)

- **search_documents**
  - Search across documents using text query
  - Parameters:
    - `query` (string) - Search query
    - `knowledge_base_id` (string, optional) - Limit to specific KB
    - `file_types` (string[], optional) - Filter by file types
    - `max_results` (number, optional) - Max results (default: 20)

### Document Tools (Write)

- **add_document**
  - Add a document to a knowledge base
  - Parameters:
    - `knowledge_base_id` (string) - Target KB ID
    - `file_path` (string) - Absolute path to file
    - `category` (string, optional) - Document category
    - `tags` (string[], optional) - Document tags

- **update_document**
  - Update document metadata
  - Parameters:
    - `document_id` (string) - Document ID
    - `filename` (string, optional) - New filename
    - `category` (string, optional) - New category
    - `tags` (string[], optional) - New tags

- **delete_document**
  - Delete a document from a knowledge base
  - Parameters: `document_id` (string) - Document ID to delete

### File System Tools

- **read_file**
  - Read any file from the file system
  - Parameters: `file_path` (string)

- **list_directory**
  - List files in a directory
  - Parameters:
    - `directory_path` (string)
    - `recursive` (boolean, optional)

- **get_file_info**
  - Get metadata about a file
  - Parameters: `file_path` (string)

### Memory Tools

- **get_memory_stats**
  - Get statistics about the adaptive memory system
  - No parameters required

- **search_memories**
  - Search through stored memories and patterns
  - Parameters:
    - `query` (string)
    - `limit` (number, optional, default: 10)

- **add_memory**
  - Store a new memory or insight
  - Parameters:
    - `content` (string) - Content to remember
    - `type` (string) - Type: "insight", "pattern", "fact"
    - `importance` (number, optional) - Score 0-1 (default: 0.5)
    - `tags` (string[], optional) - Tags for categorization

### Project Management Tools

- **list_projects**
  - List all projects in the system
  - No parameters required

- **get_current_project**
  - Get the currently active project
  - No parameters required

- **create_project**
  - Create a new project
  - Parameters:
    - `name` (string) - Project name
    - `description` (string, optional) - Project description

- **switch_project**
  - Switch to a different project
  - Parameters: `project_id` (string) - Project ID to switch to

### Document Organization Tools

- **list_document_groups**
  - List all groups in a knowledge base
  - Parameters: `knowledge_base_id` (string) - KB ID

- **create_document_group**
  - Create a new document group for organization
  - Parameters:
    - `knowledge_base_id` (string) - KB ID
    - `name` (string) - Group name
    - `description` (string, optional) - Group description

- **move_document_to_group**
  - Move a document to a specific group
  - Parameters:
    - `document_id` (string) - Document ID
    - `group_id` (string) - Target group ID

## Data Storage Locations

Guru stores data in standard application directories:

- **macOS**: `~/Library/Application Support/guru-electron/`
- **Windows**: `%APPDATA%\guru-electron\`
- **Linux**: `~/.config/guru-electron/`

### Directory Structure

```
guru-electron/
├── guru-data/           # File-based storage
│   ├── knowledge-bases/ # Knowledge base metadata
│   ├── documents/       # Document metadata
│   ├── projects/        # Project information
│   ├── specs/           # Specifications
│   └── prompts/         # Prompt templates
└── lancedb/             # Vector database (memories, patterns)
```

## Example Usage

### With Claude Desktop

After connecting Guru to Claude Desktop, you can interact naturally:

#### Reading Data

**User**: "What knowledge bases do I have?"
**Claude**: *Uses `list_knowledge_bases` tool to show your KBs*

**User**: "Search my documents for API authentication patterns"
**Claude**: *Uses `search_documents` with query="API authentication"*

**User**: "Remember that we use OAuth2 for authentication"
**Claude**: *Uses `add_memory` to store this insight*

#### Writing Data

**User**: "Create a new knowledge base called 'API Documentation'"
**Claude**: *Uses `create_knowledge_base` with name="API Documentation"*

**User**: "Add the file /path/to/auth.md to my API Documentation knowledge base"
**Claude**: *Uses `add_document` with knowledge_base_id and file_path*

**User**: "Create a new project called 'Mobile App'"
**Claude**: *Uses `create_project` with name="Mobile App"*

**User**: "Organize my API docs by creating groups for Authentication and Endpoints"
**Claude**: *Uses `create_document_group` twice to create both groups*

**User**: "Delete the old knowledge base I'm not using anymore"
**Claude**: *Uses `delete_knowledge_base` after confirming which KB to delete*

### Programmatic Use (JavaScript/TypeScript)

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Create client
const transport = new StdioClientTransport({
  command: 'node',
  args: ['/path/to/guru-electron/mcp-server.mjs']
});

const client = new Client({
  name: 'my-app',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// List available tools
const tools = await client.listTools();
console.log(tools);

// Call a tool
const result = await client.callTool({
  name: 'list_knowledge_bases',
  arguments: {}
});

console.log(result);
```

## Troubleshooting

### Server Won't Start

**Error**: "Make sure you have built the project first!"
**Solution**: Run `npm run build` before `npm run mcp`

**Error**: "Cannot find module"
**Solution**: Run `npm install` to install dependencies

### Claude Desktop Not Seeing Tools

1. Check the config file path is correct
2. Ensure the path in `args` is **absolute**, not relative
3. Restart Claude Desktop completely
4. Check Claude Desktop logs for errors

### Permission Errors

Make sure the `mcp-server.mjs` file is executable:
```bash
chmod +x /path/to/guru-electron/mcp-server.mjs
```

### Data Not Persisting

- The MCP server uses the same data directory as the Electron app
- Make sure you've used the Electron app to create knowledge bases first
- Data location: `~/Library/Application Support/guru-electron/` (macOS)

## Development

### Running in Development

While developing, you can run the MCP server alongside the Electron app:

```bash
# Terminal 1: Run Electron app
npm run dev

# Terminal 2: Run MCP server
npm run mcp
```

Both will share the same data directory.

### Adding New Tools

1. Add tool definition in `src/main/mcp-server.ts` (ListToolsRequestSchema handler)
2. Add tool implementation method
3. Add case in CallToolRequestSchema handler
4. Rebuild: `npm run build`
5. Test: `npm run mcp`

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/model-context-protocol)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## Support

For issues or questions:
- Check the `MCP_SERVER.md` file for technical details
- Review the `docs/` directory for architecture information
- Open an issue on GitHub
