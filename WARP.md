# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Guru is an Electron-based desktop app for **Context Engineering for AI Coding Assistants**. It provides knowledge base management, document organization, adaptive memory, semantic search, and MCP (Model Context Protocol) server integration for AI models.

**Tech Stack**: Electron + React + TypeScript + Vite + TailwindCSS + LanceDB

## Essential Commands

### Development
```bash
npm run dev        # Start dev server with hot reload (opens DevTools)
npm run build      # Production build to dist/
npm run start      # Preview production build
npm run mcp        # Run standalone MCP server (requires build first)
```

### MCP Server Setup
The MCP server allows AI assistants (Claude Desktop, Cline, etc.) to access knowledge bases. After building:
```bash
npm run build
npm run mcp        # Test server locally
```

To connect Claude Desktop, edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "guru": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/guru-electron/mcp-server.mjs"]
    }
  }
}
```

## Architecture

### Process Model
- **Main Process** (`src/main/`): Node.js with full system access, manages windows, LanceDB, file operations
- **Renderer Process** (`src/renderer/`): Chromium-based React UI, isolated context, communicates via IPC
- **Preload Script** (`src/preload/`): Secure bridge exposing safe APIs through `contextBridge`

### Key Directories
```
src/
├── main/
│   ├── index.ts              # App entry, service initialization
│   ├── ipc-handlers.ts       # IPC communication (memory, file, AI operations)
│   ├── mcp-server.ts         # MCP server implementation
│   ├── mcp-export.ts         # Standalone MCP server export
│   ├── file-handlers.ts      # File system operations
│   ├── file-storage.ts       # File-based data storage
│   └── storage/
│       └── lancedb-manager.ts # Vector database for memory/search
├── preload/
│   └── index.ts              # Exposes window.api.* to renderer
└── renderer/src/
    ├── components/           # React UI components
    ├── services/             # Business logic (storage, analytics)
    └── utils/                # Helpers (code-parser, token-counter)
```

### Data Storage Strategy
| Data Type | Storage | Location |
|-----------|---------|----------|
| Memories, Patterns, Insights | LanceDB | `~/Library/Application Support/guru-electron/lancedb` |
| Projects, KBs, Documents, Specs, Prompts | localStorage | Browser storage (via renderer process) |
| File metadata | JSON files | `~/Library/Application Support/guru-electron/guru-data/` |

### Security Model
- Context Isolation: **ON**
- Node Integration: **OFF** (in renderer)
- Sandbox: **OFF** (to allow preload script access)
- All main process APIs exposed through secure `window.api.*` interface

## Core Systems

### 1. Knowledge Base Management
- **Storage**: localStorage-based (see `knowledge-base-storage.ts`)
- **Structure**: Knowledge bases contain documents organized into groups
- **Project Association**: Each KB belongs to a project
- **Default Group**: "Ungrouped" created automatically

### 2. Memory System (LanceDB)
- **Tables**: `memories`, `patterns`, `insights`, `document_chunks`
- **Embeddings**: Hash-based (384-dim) - AI services disabled to avoid costs
- **Operations**: Add, search, track patterns, generate insights
- **IPC Handlers**: `memory:*`, `pattern:*`, `insight:*` in `ipc-handlers.ts`

### 3. Document Processing
- **PDF Support**: Extract text, metadata, smart chunking (~1000 chars)
- **Indexing**: Chunks stored in LanceDB with embeddings
- **Search**: Semantic search across all indexed documents
- **API**: `window.api.document.*` (select, index, search, getChunks)

### 4. MCP Server
Exposes tools to AI models:
- **Knowledge Base Tools**: list, get, create, update, delete KBs
- **Document Tools**: list, get, add, update, delete, search documents
- **File System Tools**: read_file, list_directory, get_file_info
- **Memory Tools**: get_memory_stats, search_memories, add_memory
- **Project Tools**: list, get, create, switch projects

### 5. Symbol Graph
- **Parser**: `code-parser.ts` extracts symbols from TypeScript/JavaScript/Python
- **Features**: Function/class extraction, complexity metrics, token counting
- **UI**: File tree browser, search, filtering, export
- **Note**: Requires file system APIs to load directories

### 6. Analytics (PostHog)
- **Service**: `services/analytics.ts`
- **Events**: Session tracking, page views, feature usage, errors
- **Configuration**: `.env` with `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`
- **Development**: Debug mode logs to console, no external calls by default

## Important Patterns

### IPC Communication
```typescript
// Renderer → Main
const result = await window.api.memory.add({ content: '...' });

// Main Process Handler (ipc-handlers.ts)
ipcMain.handle('memory:add', async (_event, memory) => {
  await lanceDBManager.addMemory(memory);
  return { success: true };
});

// Preload Bridge (preload/index.ts)
contextBridge.exposeInMainWorld('api', {
  memory: { add: (memory) => ipcRenderer.invoke('memory:add', memory) }
});
```

### Storage Service Pattern
Services in `renderer/src/services/` use localStorage with this pattern:
```typescript
class StorageService {
  private readonly KEY = 'storage_key';
  
  async get(): Promise<Data[]> {
    const stored = localStorage.getItem(this.KEY);
    return stored ? JSON.parse(stored) : [];
  }
  
  async save(data: Data[]): Promise<void> {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  }
}
```

### Project-Based Data Organization
All user data is scoped to projects:
- Use `projectStorage.getCurrentProject()` to get active project
- Filter KBs/documents by `projectId`
- Update project metadata after changes: `projectStorage.updateProjectMetadata(id)`

## Development Notes

### AI Services Status
**DISABLED by default** to avoid API costs. The app uses:
- ✅ Hash-based embeddings (simple, no external deps)
- ✅ Local LanceDB (runs locally)
- ❌ No AI model APIs
- ❌ No transformer.js (ONNX models had issues)

To enable (runs locally, no billing):
```typescript
// In src/main/index.ts, uncomment:
await aiModelService.initialize();
await vectorStoreService.initialize();
```

### UI Framework (Radix UI + TailwindCSS)
- Components in `components/ui/` are Radix UI primitives
- Custom theme with cosmic/space aesthetic
- Glass morphism effects (`.glass-vibrant`, `.shadow-cosmic`)
- Animations defined in `index.css`

### File Path Handling
When working with user files:
- Use `window.api.file.openDialog()` for file selection
- Store absolute paths in metadata
- Use IPC handlers for file content reading (security boundary)

### Token Counting
- Utility: `utils/token-counter.ts`
- Components: `components/ui/token-counter.tsx`
- Used in: Prompt templates, Symbol Graph
- Estimation-based (not tiktoken) for performance

### Adding New IPC Handlers
1. Add handler in `src/main/ipc-handlers.ts`
2. Expose in `src/preload/index.ts` via `contextBridge`
3. Update TypeScript types if using typed preload
4. Rebuild: `npm run build`

### Adding New MCP Tools
1. Define tool in `src/main/mcp-server.ts` (ListToolsRequestSchema handler)
2. Implement tool method
3. Add case in CallToolRequestSchema handler
4. Rebuild and test: `npm run build && npm run mcp`

## Common Pitfalls

1. **Relative vs Absolute Paths**: MCP server requires absolute paths in config
2. **Project Context**: Always check current project before creating KBs/documents
3. **IPC Error Handling**: Always return `{ success, data?, error? }` from handlers
4. **Date Serialization**: localStorage stores strings, convert back to Date objects
5. **Memory Embeddings**: Currently hash-based, not true semantic embeddings
6. **Build Before MCP**: Must run `npm run build` before `npm run mcp`

## Testing

No automated test suite currently. Manual testing workflow:
1. Run `npm run dev`
2. Test features in UI
3. Check DevTools console for errors
4. Verify localStorage data in DevTools → Application → Local Storage
5. For MCP: `npm run build && npm run mcp` to test server

## Documentation

- `IMPLEMENTATION_STATUS.md` - Feature completion checklist
- `MCP_INTEGRATION.md` - MCP server usage guide
- `MCP_SERVER.md` - Technical MCP implementation details
- `docs/architecture.md` - Architecture overview
- `docs/memory-system.md` - Memory/LanceDB system details
- `MEMORY_SYSTEM_COMPLETE.md` - Memory implementation guide

## Build Configuration

**Vite Config** (`electron.vite.config.ts`):
- Main process: Builds `index.ts` and `mcp-export.ts`
- Preload: Builds `preload/index.ts`
- Renderer: React app with Vite, alias `@/` → `src/renderer/src/`

**TypeScript**: ES2022, ESNext modules, React JSX, strict mode

**Output**:
```
dist/
├── main/
│   ├── index.js           # Main process
│   └── mcp-export.js      # MCP standalone server
├── preload/
│   └── index.mjs          # Preload script
└── renderer/              # Bundled React app
```
