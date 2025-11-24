# Feature Spec: The Workbench (Dynamic Runtime)

**Version:** 1.0  
**Role:** The "Factory" for Ephemeral Intelligence.  
**Core Philosophy:** "Agents should be able to build the tools they are missing."

## 1. Executive Summary

The Workbench is a specialized system module that allows AI agents to define, compile, and execute new tools at runtime. It acts as a bridge between Agent Intent (Code) and System Capability (Happen Nodes).

Crucially, the Workbench enforces the "Safe by Default" principle. Any tool created by an agent is automatically wrapped in the system's governance Liners (Shadow Mode, Telepathy) before it can be used.

## 2. System Architecture

### 2.1 The Workbench Node

A specialized Happen Node (`workbench-service`) that acts as the factory.

- **Location:** `src/main/services/happen/nodes/workbench-node.ts`
- **Responsibility:** Listens for creation requests, manages the WASM VM lifecycle, and spawns/kills dynamic tool nodes.
- **State:** Maintains a registry of active dynamic tools and their resource usage.

### 2.2 The Runtime Engine (WASM)

We leverage the existing Extism / WASM VM (`src/main/wasm-vm.ts`) for isolation.

- **Why WASM:** It provides a secure, memory-safe sandbox that crashes without taking down the main Electron process.
- **Languages:** Supports code written in Python, JavaScript, and Rust (compiled to WASM).

## 3. Event API (Happen Protocol)

The Workbench communicates exclusively via events.

### 3.1 Input: `agent:create-tool`

Sent by an Agent when it wants to build a tool.

```typescript
interface CreateToolPayload {
  name: string;          // e.g., "csv-parser"
  description: string;   // For context embedding
  language: 'javascript' | 'python' | 'wasm';
  code: string;          // The source code
  trigger: string;       // The event it listens to (e.g., "tool:parse-csv")
}
```

### 3.2 Output: `system:tool-ready`

Broadcast when the tool is compiled and live.

```typescript
interface ToolReadyPayload {
  status: 'active';
  toolId: string;
  trigger: string;       // "tool:parse-csv"
  sandbox: 'wasm';
  liners: string[];      // ["ShadowMode", "Telepathy"]
}
```

## 4. Implementation Guide

### 4.1 The Workbench Node Logic

Create `src/main/services/happen/nodes/workbench-node.ts`.

**Core Logic Flow:**

1. Receive `agent:create-tool`.
2. **Compile/Prepare:**
   - If `javascript` (simpler for MVP): Wrap logic in a quickjs-emscripten or isolate.
   - If `wasm`: Load bytes into `wasmVM.loadModule(name, code)`.
3. **Spawn Proxy Node:** Create a new ephemeral Happen Node (`tool-${name}`).
4. **Auto-Line (CRITICAL):**
   - Register the event handler for `payload.trigger`.
   - Wrap the handler in `withShadowMode` (if it needs IO) and `withTelepathy`.
   - **Note:** Since WASM is sandboxed, ShadowMode is enforced by limiting the Host Functions we expose to the WASM module (e.g., only exposing `host_read` and `host_write_staged`).
5. Emit `system:tool-ready`.

### 4.2 Updating the Happen Manager

You must register the Workbench in `src/main/services/happen/happen-manager.ts`.

```typescript
// In HappenManager.initialize()
this.createServiceNode(createNode, 'workbench-service', WorkbenchNode);
```

### 4.3 Host Functions (The Bridge)

To make WASM tools useful, they need to talk to the outside world safely.

Modify `src/main/wasm-vm.ts` to expose **Safe Host Functions:**

- `host_log(msg)` -> wired to Guru System Logs.
- `host_read_file(path)` -> wired to `FileSystemNode.read` (Safe).
- `host_write_file(path, content)` -> Intercepted by Shadow Service. It does not write to disk; it calls `ShadowService.stageAction()`.

## 5. UI/UX Requirements

### 5.1 The "Active Tools" Panel

In `AgentMonitor.tsx` or a dedicated `ToolsPanel.tsx`, visualize the active runtime.

**List View:** Show all active dynamic tools.

- **Icon:** WASM / JS badge.
- **Name:** `csv-parser-v1`
- **Status:** 🟢 Ready
- **Memory:** 12MB
- **Actions:**
  - **[Inspect Source]:** Opens the code in a read-only editor.
  - **[Kill]:** Instantly unloads the module and unregisters the node.

### 5.2 The "Creation" Moment

When the Workbench is building a tool, show a toast or status indicator in the Command Bar:

- "Agent is compiling 'image-resizer'..."
- "Tool 'image-resizer' hot-loaded and secured."

## 6. Security Model

- **Isolation:** Dynamic tools cannot import system modules (`fs`, `net`) directly. They can only call the Host Functions we explicitly pass to the VM.
- **Resource Limits:** Enforce a 100MB memory limit and 5s execution timeout per tool invocation to prevent infinite loops.
- **Ephemeral:** All dynamic tools are destroyed when the Guru session ends (window close).

## Next Steps for You:

1. ✅ **Clean up:** Delete the old orchestrator files as discussed.
2. **Implement:** Create the WorkbenchNode class following this spec.
3. **Wire:** Add the Workbench to HappenManager.
