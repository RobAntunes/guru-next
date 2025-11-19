# Happen Agent System Integration

## Overview
The Happen Agent System has been integrated into Guru AI Mission Control. This allows for decentralized, autonomous agents to perform tasks such as code generation, file manipulation, and testing.

## Architecture
- **Frontend**: `RuntimePage` contains `AgentMonitor` (observability) and `Inbox` (governance).
- **IPC Layer**: `happen-handlers.ts` bridges the Renderer and Main processes.
- **Main Process**: 
  - `HappenManager`: Singleton that manages the NATS connection and spawns nodes.
  - `AgentNode`: Wrapper around `happen-core` nodes that implements the agent loop.
  - `ServiceNodes`: `fs`, `llm`, `terminal`, etc.

## Usage

### 1. Starting the System
The system initializes automatically on app launch in `src/main/index.ts` if NATS is running locally.
```typescript
await natsService.start();
await happenManager.initialize();
```

### 2. Sending a Task
Use the `happenService` in the renderer:
```typescript
import { happenService } from '../services/happen-service';

await happenService.sendTask('coder', 'Refactor the login component', {
  filePath: 'src/components/Login.tsx'
});
```

### 3. Monitoring
The `AgentMonitor` component polls `happenService.listAgents()` to visualize:
- Agent Status (Idle/Active/Error)
- Current Task
- Tool Usage
- Budget/Resources

## Configuration
Agents are defined in `src/main/services/happen/nodes/agent-configs.ts`.
New agents can be added by exporting a new `AgentConfig` object.

## Next Steps
1. **Tool Implementation**: Connect `AgentNode` tool execution to actual `ipcMain` handlers or direct service calls.
2. **NATS Bundling**: Ensure a NATS server instance is bundled or managed by the Electron app for non-dev environments.
3. **Governance**: Connect the `Inbox` component to a real approval workflow in `HappenManager`.
