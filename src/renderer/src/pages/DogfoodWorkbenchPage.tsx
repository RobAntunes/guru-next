import React, { useState, useEffect, useRef } from 'react';
import { Terminal, FileCode, GitCompare, ShieldAlert, History, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { FileBrowser } from '../components/workbench/FileBrowser';
import { DiffViewer } from '../components/workbench/DiffViewer';
import { ShadowPanel } from '../components/workbench/ShadowPanel';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { chatHistoryStorage } from '../services/chat-history-storage';
import { ChatMessage } from '../types/control-room';

type ViewMode = 'code' | 'diff';

export const DogfoodWorkbenchPage = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('code');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Side Panel State
  const [activeSidePanel, setActiveSidePanel] = useState<'shadow' | 'history' | null>('shadow');

  // Diff comparison state
  const [originalContent, setOriginalContent] = useState<string>('');
  const [modifiedContent, setModifiedContent] = useState<string>('');
  const [originalFile, setOriginalFile] = useState<string>('');
  const [modifiedFile, setModifiedFile] = useState<string>('');

  // Chat History State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (activeSidePanel === 'history') {
      loadChatHistory();
    }
  }, [activeSidePanel]);

  const loadChatHistory = async () => {
    const history = await chatHistoryStorage.loadHistory();
    setChatHistory(history);
  };

  const handleFileSelect = async (filePath: string) => {
    setSelectedFile(filePath);
    setLoading(true);
    setError(null);

    try {
      const result = await (window as any).api.file.readContent(filePath);

      if (result.success) {
        setFileContent(result.data);

        // If in diff mode and no original content, set as original
        if (viewMode === 'diff' && !originalContent) {
          setOriginalContent(result.data);
          setOriginalFile(filePath);
        } else if (viewMode === 'diff') {
          setModifiedContent(result.data);
          setModifiedFile(filePath);
        }
      } else {
        setError(result.error || 'Failed to read file');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to read file');
    } finally {
      setLoading(false);
    }
  };

  const getLanguageFromFile = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'jsx',
      ts: 'typescript',
      tsx: 'tsx',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      h: 'c',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      rb: 'ruby',
      php: 'php',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sh: 'bash',
      sql: 'sql',
    };
    return langMap[ext || ''] || 'text';
  };

  const fileName = selectedFile ? selectedFile.split('/').pop() || selectedFile : 'No file selected';

  const toggleSidePanel = (panel: 'shadow' | 'history') => {
    if (activeSidePanel === panel) {
      setActiveSidePanel(null);
    } else {
      setActiveSidePanel(panel);
    }
  };

  const resetComparison = () => {
    setOriginalContent('');
    setModifiedContent('');
    setOriginalFile('');
    setModifiedFile('');
  };

  return (
    <div className="h-full flex bg-background overflow-hidden">
      {/* File Browser - Left Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-border">
        <FileBrowser onFileSelect={handleFileSelect} selectedFile={selectedFile || undefined} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-background shrink-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <FileCode className="w-4 h-4" />
              <span className="font-mono text-sm font-bold text-foreground truncate max-w-[300px]">
                {fileName}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('code')}
              className={cn(
                'flex items-center space-x-2 px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer rounded-sm',
                viewMode === 'code'
                  ? 'bg-secondary text-foreground border-foreground/20'
                  : 'bg-transparent hover:bg-secondary/50 text-muted-foreground border-transparent'
              )}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Code</span>
            </button>
            <button
              onClick={() => setViewMode('diff')}
              className={cn(
                'flex items-center space-x-2 px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer rounded-sm',
                viewMode === 'diff'
                  ? 'bg-secondary text-foreground border-foreground/20'
                  : 'bg-transparent hover:bg-secondary/50 text-muted-foreground border-transparent'
              )}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Diff</span>
            </button>

            <div className="w-px h-4 bg-border mx-2" />

            <button
              onClick={() => toggleSidePanel('history')}
              className={cn(
                'flex items-center space-x-2 px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer rounded-sm',
                activeSidePanel === 'history'
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-transparent hover:bg-secondary/50 text-muted-foreground border-transparent'
              )}
              title="Chat History"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden md:inline">History</span>
            </button>

            <button
              onClick={() => toggleSidePanel('shadow')}
              className={cn(
                'flex items-center space-x-2 px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer rounded-sm',
                activeSidePanel === 'shadow'
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : 'bg-transparent hover:bg-secondary/50 text-muted-foreground border-transparent'
              )}
              title="Shadow Mode Pending Actions"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Shadow Mode</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-background relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="max-w-md p-4">
                <div className="text-sm text-destructive bg-destructive/10 p-4 rounded border border-destructive/20">
                  {error}
                </div>
              </div>
            </div>
          )}

          {!loading && !error && !selectedFile && (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <FileCode className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Select a file to view</p>
              </div>
            </div>
          )}

          {!loading && !error && selectedFile && viewMode === 'code' && (
            <SyntaxHighlighter
              language={getLanguageFromFile(selectedFile)}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '1.5rem',
                background: 'transparent',
                fontSize: '0.875rem',
                lineHeight: '1.5',
              }}
              showLineNumbers
            >
              {fileContent}
            </SyntaxHighlighter>
          )}

          {!loading && !error && viewMode === 'diff' && (
            <div className="h-full">
              {originalContent && modifiedContent ? (
                <DiffViewer
                  oldContent={originalContent}
                  newContent={modifiedContent}
                  fileName={fileName}
                  oldTitle={originalFile.split('/').pop() || 'Original'}
                  newTitle={modifiedFile.split('/').pop() || 'Modified'}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <GitCompare className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {!originalContent
                      ? 'Select a file to set as the original version'
                      : 'Select another file to compare'}
                  </p>
                  <div className="mt-4 text-xs text-muted-foreground bg-secondary/50 p-3 rounded border border-border max-w-md">
                    <p className="mb-2">
                      <strong>Tip:</strong> To compare files:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-left">
                      <li>Select the first file (original version)</li>
                      <li>Switch to diff mode</li>
                      <li>Select the second file (modified version)</li>
                    </ol>
                  </div>
                  {originalContent && (
                    <button
                      onClick={resetComparison}
                      className="mt-4 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border transition-colors cursor-pointer rounded"
                    >
                      Reset Comparison
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar (Shared for Shadow & History) */}
      {activeSidePanel && (
        <div className="w-96 border-l border-border bg-background flex flex-col flex-shrink-0 transition-all shadow-xl z-20">
          {/* Header */}
          <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-muted/20 shrink-0">
            <span className="text-sm font-bold flex items-center gap-2 text-foreground">
              {activeSidePanel === 'shadow' ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-emerald-500" />
                  Shadow Mode Requests
                </>
              ) : (
                <>
                  <History className="w-4 h-4 text-primary" />
                  Chat History
                </>
              )}
            </span>
            <button
              onClick={() => setActiveSidePanel(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-hidden relative">
            {activeSidePanel === 'shadow' && <ShadowPanel />}
            
            {activeSidePanel === 'history' && (
              <div className="h-full overflow-y-auto p-4 space-y-4">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No history available.
                  </div>
                ) : (
                  [...chatHistory].reverse().map((msg, idx) => (
                    <div key={msg.id || idx} className="flex flex-col space-y-1 border-b border-border pb-3 last:border-0">
                      <div className="flex items-center justify-between">
                         <span className={cn(
                           "text-xs font-bold uppercase",
                           msg.agentId === 'user' ? "text-primary" : "text-emerald-500"
                         )}>
                           {msg.agentId}
                         </span>
                         <span className="text-[10px] text-muted-foreground">
                           {new Date(msg.timestamp).toLocaleString()}
                         </span>
                      </div>
                      <div className="text-xs text-foreground/80 font-mono whitespace-pre-wrap bg-secondary/20 p-2 rounded">
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
