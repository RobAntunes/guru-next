# Memory System & Document Indexing

## Overview
The Guru Electron app features a production-grade memory system and document indexing powered by LanceDB, enabling semantic search, pattern tracking, intelligent insights, and full-text PDF indexing.

## Architecture

### Main Process (Electron)
- **LanceDB Manager** (`src/main/storage/lancedb-manager.ts`)
  - Manages vector database connection
  - Handles memory, pattern, and insight storage
  - Provides search and analytics functions
  
- **IPC Handlers** (`src/main/ipc-handlers.ts`)
  - Exposes memory APIs to renderer process
  - Routes memory operations through IPC

### Renderer Process
- **Memory Storage Service** (`src/renderer/src/services/memory-storage.ts`)
  - Client-side service for memory operations
  - Tracks user interactions automatically
  - Generates embeddings for semantic search

### Preload Script
- Exposes secure memory APIs to renderer
- `window.api.memory.*` - Memory operations
- `window.api.pattern.*` - Pattern tracking
- `window.api.insight.*` - Insight management

## Database Schema

### Memories Table
```typescript
{
  id: string;
  type: 'pattern' | 'insight' | 'interaction' | 'preference';
  content: string;
  vector: number[384];  // Embedding vector
  timestamp: number;
  confidence: number;
  context: string[];     // Related entity IDs
  tags: string[];
  metadata: Record<string, any>;
}
```

### Patterns Table
```typescript
{
  id: string;
  pattern_type: string;
  entity_ids: string[];
  frequency: number;
  vector: number[384];
  first_seen: number;
  last_seen: number;
  metadata: Record<string, any>;
}
```

### Insights Table
```typescript
{
  id: string;
  insight_text: string;
  category: string;
  vector: number[384];
  confidence: number;
  created_at: number;
  dismissed: boolean;
  metadata: Record<string, any>;
}
```

## Usage

### Track Document Access
```typescript
import { memoryStorage } from './services/memory-storage';

await memoryStorage.trackDocumentAccess(documentId, documentName);
```

### Track Search Queries
```typescript
await memoryStorage.trackQuery(query, results);
```

### Search Memories
```typescript
const memories = await memoryStorage.search('user authentication', 10);
```

### Get Statistics
```typescript
const stats = await memoryStorage.getStats();
// Returns: { memories: 42, patterns: 15, insights: 8 }
```

### Generate Insights
```typescript
const insights = await memoryStorage.generateInsights();
```

## Storage Location
- **Development**: `~/Library/Application Support/Electron/lancedb`
- **Production**: `~/Library/Application Support/guru-electron/lancedb`

## Document Indexing (NEW!)

### PDF Processing
- **Parse PDFs**: Extract text, metadata, page count
- **Smart Chunking**: Respect paragraph boundaries (~1000 chars/chunk)
- **Embeddings**: Hash-based vectors (384-dim) for semantic search
- **Full Storage**: All chunks stored in `document_chunks` table

### Usage

#### Index a PDF
```typescript
const filePath = await window.api.document.selectFile();
const result = await window.api.document.indexPdf(filePath);
// Returns: { success: true, documentId, chunks, title }
```

#### Search Documents
```typescript
const results = await window.api.document.search(
  'authentication system',
  ['pdf'],  // file types
  20        // max results
);
```

#### Get Document Chunks
```typescript
const chunks = await window.api.document.getChunks(documentId);
// Returns chunks in order
```

## Future Enhancements
1. **Real Embeddings**: Integrate transformers.js or API-based embeddings (currently hash-based)
2. **More File Types**: Code files (.ts, .js, .py), markdown, Office docs
3. **Advanced Pattern Detection**: Machine learning-based pattern recognition
4. **Spec Extraction**: Auto-generate specs from PDFs
5. **Memory Consolidation**: Periodic cleanup and summarization
6. **Cross-Project Learning**: Share patterns across projects

## API Reference

### Window API
```typescript
// Memory Operations
window.api.memory.add(memory)       // Add new memory
window.api.memory.search(query, vector, limit)  // Search memories
window.api.memory.getStats()        // Get statistics

// Pattern Tracking
window.api.pattern.track(pattern)   // Track pattern

// Insights
window.api.insight.generate()       // Generate insights
window.api.insight.list()           // List all insights
window.api.insight.dismiss(id)      // Dismiss insight

// Document Operations (NEW!)
window.api.document.selectFile()    // Open file dialog
window.api.document.indexPdf(path)  // Index PDF file
window.api.document.search(query, fileTypes?, maxResults?)  // Search docs
window.api.document.getChunks(docId)  // Get all chunks for a document
```

## Cleanup Notes
The following legacy components were removed during implementation:
- `synthesis-engine.ts` - Replaced with stub
- `guru-mock-integration.ts` - Removed mock service
- All `USE_MOCK` flags removed from `guru-integration.ts`
