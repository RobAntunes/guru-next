import React, { useState, useEffect } from 'react';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { Database, Upload, FileText, FolderPlus, Search, Trash2, RefreshCw, CheckCircle, Loader, Eye } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_id: string;
  content: string;
  file_path: string;
  file_type: string;
  title: string;
  created_at: number;
  chunk_tokens: number;
}

export const KnowledgeBaseManager = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ id: string, title: string } | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await (window as any).api.document.getAll();
      if (result.success && result.data) {
        if (!Array.isArray(result.data)) {
          setError('Invalid response format from server');
          return;
        }

        const uniqueDocs = new Map();
        result.data.forEach((chunk: DocumentChunk) => {
          if (!uniqueDocs.has(chunk.document_id)) {
            uniqueDocs.set(chunk.document_id, {
              id: chunk.document_id,
              title: chunk.title,
              file_path: chunk.file_path,
              file_type: chunk.file_type,
              created_at: chunk.created_at,
              chunk_count: 1
            });
          } else {
            const doc = uniqueDocs.get(chunk.document_id);
            doc.chunk_count++;
          }
        });

        setDocuments(Array.from(uniqueDocs.values()));
      } else {
        setError(result.error || 'Failed to load documents');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleAddFiles = async () => {
    setIndexing(true);
    setError(null);

    try {
      const result = await (window as any).api.file.openDialog({
        multiple: true,
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Code', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c'] },
          { name: 'Documents', extensions: ['md', 'txt', 'pdf', 'doc', 'docx'] }
        ]
      });

      if (result.success && result.data && result.data.length > 0) {
        const filePaths = result.data;
        try {
          const indexResult = await (window as any).api.document.indexFiles(filePaths);
          if (indexResult.success) {
            const data = indexResult.data;
            setSuccessMessage(`Successfully indexed ${data.indexed} files (${data.totalChunks} chunks)`);
            await loadDocuments();
            setTimeout(() => setSuccessMessage(null), 5000);
          } else {
            setError(indexResult.error || 'Failed to index files');
          }
        } catch (err: any) {
          setError(`Indexing error: ${err.message}. Try restarting the app.`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add files');
    } finally {
      setIndexing(false);
    }
  };

  const handleReindexSpecs = async () => {
    setIndexing(true);
    setError(null);

    try {
      const { specStorage } = await import('../../services/spec-storage');
      const allSpecs = await specStorage.getAllSpecs();

      if (allSpecs.length === 0) {
        setSuccessMessage('No specs to index');
        setTimeout(() => setSuccessMessage(null), 3000);
        return;
      }

      let indexedCount = 0;
      for (const spec of allSpecs) {
        // @ts-ignore
        if (window.api && window.api.spec) {
          // @ts-ignore
          await window.api.spec.index(spec);
          indexedCount++;
        }
      }

      setSuccessMessage(`Successfully re-indexed ${indexedCount} specs`);
      await loadDocuments();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(`Re-indexing error: ${err.message}`);
    } finally {
      setIndexing(false);
    }
  };

  const handleAddFolder = async () => {
    setIndexing(true);
    setError(null);

    try {
      const result = await (window as any).api.file.openFolderDialog();

      if (result.success && result.data) {
        const filesResult = await (window as any).api.file.getDirectoryFiles(result.data, true);

        if (filesResult.success && filesResult.data.length > 0) {
          const files = filesResult.data.filter((f: any) => !f.isDirectory);
          const filePaths = files.map((f: any) => f.path);

          if (filePaths.length === 0) {
            setError('No files found in folder');
            return;
          }

          try {
            const indexResult = await (window as any).api.document.indexFiles(filePaths);
            if (indexResult.success) {
              const data = indexResult.data;
              setSuccessMessage(`Successfully indexed ${data.indexed} files from folder (${data.totalChunks} chunks)`);
              await loadDocuments();
              setTimeout(() => setSuccessMessage(null), 5000);
            } else {
              setError(indexResult.error || 'Failed to index files');
            }
          } catch (err: any) {
            setError(`Indexing error: ${err.message}. Try restarting the app.`);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add folder');
    } finally {
      setIndexing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await (window as any).api.document.search(searchQuery, undefined, 20);
      if (result.success) {
        setSearchResults(result.data);
      } else {
        setError(result.error || 'Search failed');
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await (window as any).api.document.delete(documentId);
      if (result.success) {
        setSuccessMessage('Document deleted successfully');
        await loadDocuments();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to delete document');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-secondary/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Database className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Knowledge Base</h2>
              <p className="text-xs text-muted-foreground">
                Index project context for AI retrieval
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadDocuments}
              disabled={loading}
              className="p-2 hover:bg-secondary rounded transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4 text-muted-foreground', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAddFiles}
            disabled={indexing}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {indexing ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>Add Files</span>
          </button>
          <button
            onClick={handleAddFolder}
            disabled={indexing}
            className="flex items-center space-x-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {indexing ? <Loader className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
            <span>Add Folder</span>
          </button>
          <button
            onClick={handleReindexSpecs}
            disabled={indexing}
            className="flex items-center space-x-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {indexing ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>Re-index Specs</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border bg-background">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search indexed documents..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4">
            <div className="text-sm text-red-200 bg-red-900/30 p-4 border-l-4 border-red-500 font-medium font-mono">
              ERROR: {error}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-4">
            <div className="text-sm text-green-200 bg-green-900/30 p-4 border-l-4 border-green-500 font-medium font-mono">
              SUCCESS: {successMessage}
            </div>
          </div>
        )}

        {searchResults.length > 0 ? (
          <div className="p-4 space-y-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Search Results ({searchResults.length})
            </div>
            {searchResults.map((chunk) => (
              <DocumentChunkCard key={chunk.id} chunk={chunk} />
            ))}
          </div>
        ) : searchQuery ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No results found</p>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Indexed Documents ({documents.length})
            </div>
            {documents.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center max-w-md">
                  <Database className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No documents indexed</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add files or folders to build your knowledge base for AI retrieval
                  </p>
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={handleAddFiles}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Add Files</span>
                    </button>
                    <button
                      onClick={handleAddFolder}
                      className="flex items-center space-x-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors text-sm font-medium cursor-pointer"
                    >
                      <FolderPlus className="w-4 h-4" />
                      <span>Add Folder</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onDelete={handleDeleteDocument}
                    onPreview={setPreviewDoc}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="p-3 border-t border-border bg-secondary/20 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>{documents.length} documents</span>
          <span>•</span>
        </div>
        <div className="flex items-center space-x-2">
          {indexing && (
            <>
              <Loader className="w-3 h-3 animate-spin" />
              <span>Indexing...</span>
            </>
          )}
        </div>
      </div>

      {previewDoc && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          documentId={previewDoc.id}
          title={previewDoc.title}
        />
      )}
    </div>
  );
};

interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    file_path: string;
    file_type: string;
    created_at: number;
    chunk_count: number;
  };
  onDelete: (documentId: string) => void;
  onPreview: (document: { id: string, title: string }) => void;
}

const DocumentCard = ({ document, onDelete, onPreview }: DocumentCardProps) => {
  const fileExtension = document.file_type || document.file_path?.split('.').pop() || 'txt';

  return (
    <div className="p-3 border border-border bg-card hover:bg-secondary/30 transition-colors group relative">
      <div className="flex items-center space-x-2 mb-2">
        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
        <h3 className="text-sm font-medium text-foreground truncate flex-1">{document.title}</h3>
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview({ id: document.id, title: document.title });
            }}
            className="p-1 hover:bg-primary/10 hover:text-primary rounded transition-all cursor-pointer mr-1"
            title="Preview document"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(document.id);
            }}
            className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all cursor-pointer"
            title="Delete document"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="px-1.5 py-0.5 bg-secondary rounded">{fileExtension.toUpperCase()}</span>
        <span>{document.chunk_count} chunks</span>
      </div>
    </div>
  );
};

interface DocumentChunkCardProps {
  chunk: DocumentChunk;
}

const DocumentChunkCard = ({ chunk }: DocumentChunkCardProps) => {
  return (
    <div className="p-4 border border-border bg-card hover:bg-secondary/30 transition-colors cursor-pointer">
      <div className="flex items-start space-x-3">
        <FileText className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-sm font-medium text-foreground">{chunk.title}</h3>
            <span className="text-xs text-muted-foreground">#{chunk.chunk_id}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2 line-clamp-3">
            {chunk.content}
          </p>
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <span>{chunk.file_type?.toUpperCase() || 'UNKNOWN'}</span>
            <span>•</span>
            <span>{chunk.chunk_tokens} tokens</span>
          </div>
        </div>
      </div>
    </div>
  );
};
