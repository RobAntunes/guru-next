# Guru Electron - MCP Server

## Overview

Guru now includes a Model Context Protocol (MCP) server that exposes tools for AI models to interact with your knowledge bases, documents, files, and adaptive memory system.

## What's Been Built

### ✅ Core Features
1. **Document Management** - Upload, organize, and search documents
2. **Knowledge Bases** - Create and manage multiple knowledge bases
3. **File System Integration** - Native file dialogs and file operations
4. **Context Graph** - Visualize your active context
5. **Adaptive Memory** - LanceDB-powered memory and pattern tracking
6. **MCP Server** - Tools for AI models to access everything

### ✅ MCP Tools Available

The MCP server exposes these tools for AI models:

#### Knowledge Base Tools
- `list_knowledge_bases` - List all knowledge bases
- `get_knowledge_base` - Get KB details
- `list_documents` - List documents in a KB
- `get_document` - Read document content
- `search_documents` - Search across documents

#### File System Tools
- `read_file` - Read any file from disk
- `list_directory` - List directory contents
- `get_file_info` - Get file metadata

#### Memory Tools
- `get_memory_stats` - Memory system statistics
- `search_memories` - Search stored memories/patterns
- `add_memory` - Store new insights/learnings

## Running the App

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run start
```

## Using the MCP Server

The MCP server can be started independently to allow AI models to access Guru's tools:

```typescript
import { mcpServer } from './src/main/mcp-server';

// Start the MCP server
await mcpServer.start();
```

### Connecting Claude Desktop

To use Guru's tools with Claude Desktop, add this to your Claude config:

```json
{
  "mcpServers": {
    "guru-electron": {
      "command": "node",
      "args": ["/path/to/guru-electron/dist/main/mcp-server.js"]
    }
  }
}
```

## Current State

### ✅ Working
- App launches successfully
- File upload with native dialogs
- Document organization (drag & drop groups)
- Knowledge base management
- Context graph visualization  
- Spec & prompt management
- Project switching
- LanceDB memory storage
- All IPC handlers wired up
- MCP server structure ready

### 🚧 Not Implemented (Intentionally Skipped)
- **AI Services** - Disabled to avoid billing/API costs
- **Vector Embeddings** - Optional, requires AI models
- **Synthesis Engine** - Removed from UI (no AI analysis)
- **VM Execution** - Placeholder only (needs design discussion)

### 📝 TODO (If Needed)
1. Wire MCP tools to localStorage-based storage
2. Add document content retrieval from localStorage
3. Implement knowledge base listing from storage
4. Add file watching/monitoring
5. Create MCP server binary export

## Architecture

```
┌─────────────────────────────────────────┐
│           Electron Main Process         │
│  ┌────────────────────────────────────┐ │
│  │     IPC Handlers                   │ │
│  │  - File Operations                 │ │
│  │  - Memory Management               │ │
│  │  - Document Operations             │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │     MCP Server                     │ │
│  │  - Tool Definitions                │ │
│  │  - Request Handlers                │ │
│  │  - Storage Integration             │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │     Services                       │ │
│  │  - LanceDB Manager                 │ │
│  │  - File Handlers                   │ │
│  │  - (AI Models - disabled)          │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    │
                    │ IPC
                    ▼
┌─────────────────────────────────────────┐
│        Electron Renderer Process        │
│  ┌────────────────────────────────────┐ │
│  │     React UI Components            │ │
│  │  - Knowledge Hub                   │ │
│  │  - Document Organizer              │ │
│  │  - Context Graph                   │ │
│  │  - Spec/Prompt Management          │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │     Storage Services               │ │
│  │  - localStorage-based              │ │
│  │  - Knowledge Bases                 │ │
│  │  - Documents                       │ │
│  │  - Groups, Specs, Prompts          │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Next Steps

1. **Test the app**: Upload documents, create knowledge bases
2. **Connect to Claude**: Use MCP tools with Claude Desktop
3. **Implement storage retrieval**: Wire MCP tools to localStorage
4. **Add more tools**: Extend MCP server with project-specific tools

## Files Changed/Created

### New Files
- `src/main/mcp-server.ts` - MCP server implementation
- `src/main/file-handlers.ts` - File system operations
- `src/main/ai-model-service.ts` - AI models (optional)
- `src/main/vector-store-service.ts` - Vector storage (optional)
- `src/renderer/src/services/file-service.ts` - File service wrapper
- `src/renderer/src/components/CognitiveInsightsPanel.tsx` - Simplified UI

### Modified Files
- `src/main/index.ts` - Added service initialization
- `src/main/ipc-handlers.ts` - Added all missing handlers
- `src/preload/index.ts` - Exposed file/AI/vector APIs
- `src/renderer/src/components/KnowledgeHub.tsx` - Updated upload flow

### Removed from UI
- Synthesis Manager
- Tool Management Panel (complex AI features)
- Cognitive analysis panels

## No Billing/Costs! 🎉

All AI features are **disabled by default**. The app uses:
- ✅ Local storage (localStorage)
- ✅ Local database (LanceDB)
- ✅ Native file system operations
- ❌ No external APIs
- ❌ No AI model costs

To enable local AI features (runs on your machine, no billing):
```typescript
// In src/main/index.ts, uncomment:
await aiModelService.initialize()
await vectorStoreService.initialize()
```

This uses Hugging Face Transformers locally - no API calls, no costs!
