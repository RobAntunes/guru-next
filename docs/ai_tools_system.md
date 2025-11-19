# Guru AI Tools System

## The Secret Sauce: Index Everything

Unlike traditional coding assistants that only index code, Guru indexes **everything**:
- 📁 Code files and documentation
- 💬 Conversations and chat history
- 🧠 Decisions and reasoning
- 🎯 Goals, tasks, and constraints
- 📊 State graph nodes and relationships
- 🔍 Agent actions and observations

This creates a comprehensive "memory" that the AI can search and build upon.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           AI Chat Interface                     │
│  (User talks to AI agents)                      │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│     Enhanced Chat Orchestrator                  │
│  • Function/Tool Calling                        │
│  • Auto-context Indexing                        │
│  • Memory Retrieval                             │
└────────────────┬────────────────────────────────┘
                 │
       ┌─────────┴──────────┐
       │                    │
       ▼                    ▼
┌─────────────┐      ┌─────────────────┐
│  AI Tools   │      │  Knowledge Base │
│  System     │◄─────┤  (LanceDB)      │
└─────────────┘      └─────────────────┘
```

## AI Tools Categories

### 1. File Operation Tools (NEW! 🔥)

#### `read_file`
Read contents of a file

```typescript
{
  filePath: string  // Absolute path
}
```

**Auto-features**: Returns file info (size, extension, name)

#### `write_file`
Write/create files with auto-indexing

```typescript
{
  filePath: string,
  content: string,
  createDirectories?: boolean  // default: true
}
```

**Auto-features**:
- Creates parent directories if needed
- Auto-indexes code files in knowledge base
- Safety: Blocks system directories

#### `list_directory`
List files in a directory

```typescript
{
  dirPath: string,
  recursive?: boolean,
  pattern?: string  // e.g., "*.ts"
}
```

#### `search_files`
Search for files by pattern

```typescript
{
  dirPath: string,
  pattern: string,  // wildcards: *.ts, *test*
  recursive?: boolean  // default: true
}
```

#### `create_directory`
Create directories with parents

```typescript
{
  dirPath: string
}
```

#### `move_file`
Move or rename files

```typescript
{
  sourcePath: string,
  destPath: string
}
```

**Auto-features**: Creates destination directories

#### `delete_file`
Delete files with confirmation

```typescript
{
  filePath: string,
  confirm: boolean  // Must be true!
}
```

**Safety**: Blocks deletion of `.git`, `package.json`, `node_modules`, etc.

### 2. Knowledge Base Tools

#### `search_knowledge_base`
Search indexed content (code, docs, conversations, decisions)

```typescript
{
  query: string,
  maxResults?: number,
  fileTypes?: string[]
}
```

**Example**: "Search knowledge base for authentication implementation"

#### `add_to_knowledge_base`
Add new information to the knowledge base

```typescript
{
  content: string,
  title: string,
  type: 'decision' | 'note' | 'code_snippet' | 'constraint',
  tags?: string[]
}
```

**Example**: Store a design decision or constraint

#### `get_document_chunks`
Retrieve specific document chunks

```typescript
{
  documentId: string
}
```

### 2. Memory & Context Tools

#### `add_memory`
Store facts, observations, or decisions in AI memory

```typescript
{
  content: string,
  type: 'fact' | 'decision' | 'observation' | 'task' | 'goal',
  layer: 'working' | 'short-term' | 'long-term',
  importance: number, // 0-1
  tags?: string[],
  context?: string[]
}
```

**Memory Layers**:
- **working**: Temporary, session-only
- **short-term**: Lasts for current project session
- **long-term**: Persists permanently

#### `search_memories`
Search past memories and observations

```typescript
{
  query: string,
  limit?: number,
  type?: string
}
```

#### `index_conversation`
Manually index a conversation into the knowledge base

```typescript
{
  messages: Array<{ role, content, timestamp }>,
  summary: string,
  tags?: string[]
}
```

**Auto-Indexing**: The system automatically indexes conversations containing important keywords like "decision", "goal", "constraint", "remember", "important"

### 3. State Graph Tools

#### `add_graph_node`
Add nodes to the state graph (goals, tasks, facts, constraints)

```typescript
{
  type: 'goal' | 'task' | 'fact' | 'constraint' | 'decision' | 'agent' | 'file',
  label: string,
  description?: string,
  category?: string,
  status?: 'active' | 'completed' | 'blocked' | 'pending',
  metadata?: object
}
```

**Example**: AI creates a goal node when user says "I want to implement OAuth"

#### `update_graph_node`
Update existing graph nodes

```typescript
{
  nodeId: string,
  updates: object
}
```

#### `search_graph`
Search state graph for nodes

```typescript
{
  query: string,
  nodeType?: string,
  status?: string
}
```

## How Auto-Context Indexing Works

### 1. Conversation Monitoring
The Enhanced Chat Orchestrator monitors every conversation for:
- Important keywords ("decision", "goal", "constraint", "remember")
- Length thresholds (auto-index every 6+ messages with important content)
- Explicit user requests ("Remember this...")

### 2. Automatic Chunking
When indexing:
- Text is split into 1000-character chunks with 200-character overlap
- Each chunk is embedded (vector representation)
- Chunks are stored with metadata (type, tags, source, timestamp)

### 3. Retrieval on Query
Before responding, the AI:
1. Searches memories for relevant context
2. Searches knowledge base for related documents
3. Includes top 3 results in prompt context
4. Uses this context to provide informed responses

## Usage Examples

### Example 0: AI Writes Code
```
User: "Create a utils.ts file with a capitalize function"

AI internally:
1. Calls write_file({
     filePath: "/path/to/project/utils.ts",
     content: "export function capitalize(str: string): string {\n  return str.charAt(0).toUpperCase() + str.slice(1);\n}"
   })
2. File is auto-indexed in knowledge base
3. AI can now reference it in future queries
```

### Example 1: AI Stores a Decision
```
User: "Let's use PostgreSQL instead of MongoDB for the user database"

AI internally:
1. Detects "decision" keyword
2. Calls add_to_knowledge_base({
     content: "Use PostgreSQL for user database instead of MongoDB",
     title: "Database Technology Decision",
     type: "decision",
     tags: ["database", "postgres", "architecture"]
   })
3. Also adds to memories for quick recall
```

### Example 2: AI Recalls Context
```
User: "What database are we using?"

AI internally:
1. Searches knowledge base for "database"
2. Finds the decision from Example 1
3. Responds: "We decided to use PostgreSQL for the user database"
```

### Example 3: AI Manages State Graph
```
User: "I need to implement user authentication with OAuth"

AI internally:
1. Calls add_graph_node({
     type: "goal",
     label: "Implement OAuth Authentication",
     status: "active"
   })
2. Calls add_graph_node({
     type: "task",
     label: "Set up OAuth provider integration",
     status: "pending"
   })
3. Links nodes together
4. Stores in knowledge base for future reference
```

## Integration with Chat

### Basic Chat (Legacy)
```typescript
ipcRenderer.invoke('chat:send', message, agentId, contextGraph, modelConfig)
```

### Enhanced Chat with Tools
```typescript
ipcRenderer.invoke('chat:send-enhanced',
  message,
  agentId,
  contextGraph,
  {
    providerId: 'openai',
    modelId: 'gpt-4',
    enableTools: true,
    autoIndexContext: true
  },
  conversationId
)
```

## Direct Tool Execution

You can also execute tools directly from the UI:

```typescript
// List all tools
const tools = await ipcRenderer.invoke('tools:list')

// Execute a specific tool
const result = await ipcRenderer.invoke('tools:execute', 'search_knowledge_base', {
  query: 'authentication implementation',
  maxResults: 5
})
```

## Best Practices

### For Users
1. **Be explicit about decisions**: Say "I've decided..." or "Let's use..."
2. **Tag conversations**: Mention topics explicitly
3. **Review indexed content**: Check the Knowledge Base tab
4. **Use AI Tools tab**: Test tools manually to understand capabilities

### For AI Models
1. **Proactively store context**: Don't wait to be asked
2. **Tag everything**: Use rich, descriptive tags
3. **Use appropriate memory layers**:
   - Working: Temporary notes
   - Short-term: Current session facts
   - Long-term: Important decisions/patterns
4. **Update state graph**: Keep it current and accurate
5. **Reference past context**: Search before responding

## Performance Considerations

- **Chunking**: Large files are automatically split for better retrieval
- **Vector search**: Uses 384-dim embeddings (placeholder - upgrade to real embeddings)
- **Caching**: Conversations cached in memory
- **Auto-cleanup**: Old conversations cleared after 1 hour

## Future Enhancements

1. **Real Embeddings**: Replace placeholder vectors with actual embedding models (@huggingface/transformers)
2. **Semantic Search**: Improve search relevance
3. **Graph Visualization**: Show tool calls and knowledge flow
4. **Tool Chaining**: Allow tools to call other tools
5. **Permission System**: Control which tools AI can use
6. **Tool Analytics**: Track tool usage and effectiveness

## File Reference

- `/src/main/services/ai-tools.ts` - Tool definitions and execution
- `/src/main/services/enhanced-chat-orchestrator.ts` - Chat with function calling
- `/src/main/services/document-indexer.ts` - Document indexing logic
- `/src/main/storage/lancedb-manager.ts` - Vector database operations
- `/src/renderer/src/components/knowledge/ToolsPanel.tsx` - UI for testing tools
- `/src/main/ipc-handlers.ts` - IPC integration

## The Bottom Line

This system turns Guru into a **self-organizing knowledge repository** where:
- ✅ Nothing is forgotten
- ✅ Context accumulates over time
- ✅ AI gets smarter with every conversation
- ✅ Users can review and manage what's indexed
- ✅ The state graph reflects reality, not just plans

This is how you build an AI that truly understands your project! 🚀
