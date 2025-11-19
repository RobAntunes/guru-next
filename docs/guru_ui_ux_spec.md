# Guru 2.0: UI/UX Feature Specification

Core Principle: The user is a sovereign governor, not a chat partner. The UI is a control room, not a text box.

This spec moves Guru from a "Context Tool" to an "Agentic OS." The primary UX shift is from Synchronous Chat (blocking, linear) to an Asynchronous Inbox (non-blocking, parallel).

## 1. Core Layout: The "AI Mission Control"
The app abandons the single-page chat model and adopts a 3-column layout, similar to VS Code or a professional creative tool.

### Left Panel (The "Context"): The "Static World."
- **File Tree**: The project's files.
- **State Graph**: The "memory" of the conversation.
- **Knowledge**: The user's long-term RAG knowledge bases.

### Center Panel (The "Workbench"): The "Active Task."
- This is a tabbed environment.
- Displays the file being edited.
- Crucially, this is where "Shadow Mode" Diffs appear.

### Right Panel (The "Runtime"): The "Live World."
- **The Inbox**: The async list of actions needing approval.
- **Agent Monitor**: A view of all active/spawned agents.
- **Causal Explorer**: The "flight recorder" timeline of events.

## 2. Feature Spec: The "Command Bar" (Fast Input)
This replaces the "chat box" as the primary user input.

- **Feature**: A floating, Cmd+K style "Spotlight" bar.
- **UX Function**: This is the Dispatch. It's how the user starts work. It is not for conversation.

**Great UX**:
- **Action-Oriented**: Typing "refactor..." brings up a list of files to refactor.
- **Strategy-Aware**: Typing "Refactor" also suggests applying a pre-saved "Strategy" (e.g., "Apply Strategy: React Component Refactor").
- **Non-Blocking**: Hitting Enter dispatches the agent swarm to the background. The command bar vanishes. The user is free to continue working.

## 3. Feature Spec: The "Inbox" (Async Governance)
This is the core of the async "Notion Comments" idea. It is the human side of the Happen Event Bus.

- **Feature**: A persistent list in the Right Panel that shows all events blocked by a Liner.
- **UX Function**: This is the Review Queue. It replaces a linear, synchronous chat log.

**Great UX**:
- **Decouples Time**: The user can dispatch 10 agents, go to lunch, and return to 10 items in their Inbox.
- **Rich Content**: Items aren't just text. They are specific requests:
    - `[SHADOW]` "Approve File Write to login.ts"
    - `[POLICY]` "Agent requests network access to api.stripe.com"
    - `[BUDGET]` "Agent swarm paused. Task 4 will exceed $5.00 limit."
    - `[CLARIFY]` "Agent is confused: 'I found two User models...'"
- **Contextual Threads**: Clicking an Inbox item opens the Shadow Panel (Center) and the State Graph (Left), showing the full context of that single request.

## 4. Feature Spec: The "Shadow Panel" (Safe Review)
This is the Center Panel view triggered by an Inbox item. It's the "Pull Request" for AI.

- **Feature**: A rich, multi-part diff and simulation view.
- **UX Function**: This is the Approval Gate. It's where the user gives explicit consent for a destructive action.

**Great UX (Exceeding Expectations)**:
- **Code Diff**: Standard red/green diff view.
- **Pre-Flight Simulation**: A checkbox below the diff: `[✅] Tests Passed`. This is the "Dry Run" Liner reporting back. If it's `[❌] Breaks 3 Tests`, the "Approve" button is disabled.
- **Agent's Rationale**: A small box showing why the agent made this change, pulled from its "State Graph."
- **The "Notion Comment"**: A text box at the bottom. The user doesn't just click "Approve/Discard." They can "Reply" with an instruction, which un-pauses the agent with new context. (e.g., "You missed the error handling. Add a try/catch block and resubmit.")

## 5. Feature Spec: The "Agent State Monitor" (Transparency)
This pane solves "Black Box Anxiety" by showing who is working.

- **Feature**: A list of all active agents/swarms, appearing in the Right Panel.
- **UX Function**: This is the Task Manager for your AI.

**Great UX (The "Agent Resume")**:
Each agent is a "Card" showing:
- **Role**: "RefactorAgent-42"
- **Task**: "Refactoring use-auth.ts..."
- **Tools**: `[File System (Safe)]`, `[Shell (Restricted)]`
- **Budget**: "$0.05 / $0.50"
- **Lifespan**: "Ephemeral"

## 6. Feature Spec: The "State Graph Explorer" (Memory)
This replaces the old "Chat History" window.

- **Feature**: A visual, interactive D3/ReactFlow graph (like SymbolMindMap.tsx) that visualizes the Conversation State Graph.
- **UX Function**: This is the "Epistemic Memory." It shows what the system knows.

**Great UX**:
- **No More Scrolling**: Instead of a 200-message log, the user sees a clean graph of nodes: Goal: Build API -> Task: Write Schema (Done) -> Task: Write Routes (Active).
- **Pruning Dead Ends**: Failed agent attempts are visualized as red, "withered" branches. This gives the user confidence that the agent learned from its mistake and won't try it again.
- **Strategy Templates**: A "Save" button on this graph. This allows the user to save a successful workflow as a "Strategy" that they can re-apply later from the Command Bar.

## 7. Feature Spec: The "Governance Hub" (Control)
This is where the power user (Uno solopreneur) defines their "company."

- **Feature**: A new section in "Settings" called "Governance."
- **UX Function**: A code editor for writing Liner Policies.

**Great UX**:
- **Simple Mode**: A UI with toggles ("Block all rm commands," "Whitelist api.github.com").
- **Advanced Mode**: A full JavaScript editor where users can write their own Liners (e.g., the "No Deletes on Fridays" policy).

## 8. Feature Spec: The "Workbench" (Extensibility)
- **Feature**: A panel (likely in the "Agent State Monitor") labeled "Dynamic Tools."
- **UX Function**: Shows the tools the agent has built on the fly using the WASM VM.

**Great UX**:
- Lists the tool name: `tool.csv_parser` (WASM).
- Shows its resource limits: (Mem: 100MB, CPU: 5s).
- The user can click a "trash" icon to instantly kill and unload the dynamic tool.
