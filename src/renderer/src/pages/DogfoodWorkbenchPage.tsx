import React, { useState } from 'react';
import { Terminal, FileCode, GitCompare } from 'lucide-react';
import { cn } from '../lib/utils';
import { FileBrowser } from '../components/workbench/FileBrowser';
import { DiffViewer } from '../components/workbench/DiffViewer';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

type ViewMode = 'code' | 'diff';

export const DogfoodWorkbenchPage = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('code');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Diff comparison state
  const [originalContent, setOriginalContent] = useState<string>('');
  const [modifiedContent, setModifiedContent] = useState<string>('');

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
        } else if (viewMode === 'diff') {
          setModifiedContent(result.data);
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

  return (
    <div className="h-full flex bg-background">
      {/* File Browser - Left Sidebar */}
      <div className="w-64 flex-shrink-0">
        <FileBrowser onFileSelect={handleFileSelect} selectedFile={selectedFile || undefined} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-background">
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
                'flex items-center space-x-2 px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer',
                viewMode === 'code'
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-secondary hover:bg-secondary/80 text-foreground border-border'
              )}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Code</span>
            </button>
            <button
              onClick={() => setViewMode('diff')}
              className={cn(
                'flex items-center space-x-2 px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer',
                viewMode === 'diff'
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-secondary hover:bg-secondary/80 text-foreground border-border'
              )}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Diff</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-background">
          {loading && (
            <div className="flex items-center justify-center h-full">
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
                      onClick={() => {
                        setOriginalContent('');
                        setModifiedContent('');
                      }}
                      className="mt-4 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border transition-colors cursor-pointer"
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
    </div>
  );
};
