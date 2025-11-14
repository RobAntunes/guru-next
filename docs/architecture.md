# Guru Electron - Architecture

## Tech Stack
- **Electron**: Desktop app framework
- **React**: UI components
- **TypeScript**: Type-safe development
- **Vite**: Fast build tooling
- **TailwindCSS**: Styling
- **LanceDB**: Vector database for memory system
- **LocalStorage**: Simple key-value storage for UI state

## Project Structure
```
guru-electron/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # App entry point
│   │   ├── ipc-handlers.ts      # IPC communication handlers
│   │   └── storage/
│   │       └── lancedb-manager.ts  # Vector database manager
│   │
│   ├── preload/                 # Preload scripts (security bridge)
│   │   └── index.ts             # Context bridge API
│   │
│   └── renderer/                # React frontend
│       └── src/
│           ├── components/      # UI components
│           ├── services/        # Business logic
│           └── App.tsx          # Root component
│
├── docs/                        # Documentation
├── dist/                        # Build output
└── electron.vite.config.ts      # Build configuration
```

## Process Architecture

### Main Process
- Runs Node.js with full system access
- Manages windows and native functionality
- Handles LanceDB operations
- Processes IPC requests from renderer

### Renderer Process
- Runs Chromium with isolated context
- React-based UI
- Limited access to system APIs
- Communicates via IPC

### Preload Script
- Secure bridge between main and renderer
- Exposes safe APIs through contextBridge
- No direct access to require() in renderer

## Security Model
- Context Isolation: ON
- Node Integration: OFF (in renderer)
- Sandbox: OFF (for preload script access)

## Storage Strategy
| Data Type | Storage | Reason |
|-----------|---------|--------|
| Memories, Patterns, Insights | LanceDB | Vector search, unlimited size |
| Projects | LocalStorage | Small, frequent access |
| Documents | LocalStorage → Future: LanceDB | Currently small, will migrate |
| Specs | LocalStorage | Structured, frequent updates |
| Prompts | LocalStorage | Template metadata |
| UI State | LocalStorage | User preferences |

## IPC Communication
```
Renderer → Preload → Main
  ↓          ↓        ↓
window.api → contextBridge → ipcMain
```

## Build & Development
- **Dev**: `npm run dev` - Hot reload enabled
- **Build**: `npm run build` - Production build
- **Preview**: `npm run start` - Test production build

## Migration Notes
- Migrated from Tauri to Electron
- Removed all Tauri-specific code
- Replaced mock services with LanceDB
- Cleaned up legacy artifacts
