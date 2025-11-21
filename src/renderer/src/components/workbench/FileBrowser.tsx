import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, FolderPlus, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FileInfo {
  path: string;
  name: string;
  size: number;
  extension: string;
  lastModified: Date;
  isDirectory: boolean;
}

interface FileNode extends FileInfo {
  children?: FileNode[];
  isLoaded?: boolean;
}

interface FileBrowserProps {
  onFileSelect?: (filePath: string) => void;
  selectedFile?: string;
  initialPath?: string;
}

export const FileBrowser = ({ onFileSelect, selectedFile, initialPath }: FileBrowserProps) => {
  const [rootPath, setRootPath] = useState<string | null>(initialPath || null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // If initialPath provided, use it
      if (initialPath) {
        setRootPath(initialPath);
        await loadDirectory(initialPath);
        return;
      }
      
      // Otherwise try to get CWD
      if (!rootPath) {
        try {
          setLoading(true);
          const result = await (window as any).api.file.getCwd();
          if (result.success && result.data) {
             setRootPath(result.data);
             await loadDirectory(result.data);
          }
        } catch (e) {
          console.warn("Failed to auto-load CWD:", e);
        } finally {
          setLoading(false);
        }
      }
    };
    
    init();
  }, [initialPath]);

  const selectFolder = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await (window as any).api.file.openFolderDialog();

      if (result.success && result.data) {
        setRootPath(result.data);
        await loadDirectory(result.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to open folder');
    } finally {
      setLoading(false);
    }
  };

  const loadDirectory = async (dirPath: string, parentNode?: FileNode) => {
    try {
      // Avoid clearing root loading state for subdirectory expansions
      if (!parentNode) setLoading(true);
      
      const result = await (window as any).api.file.getDirectoryFiles(dirPath, false);

      if (!result.success) {
        throw new Error(result.error);
      }

      const files: FileInfo[] = result.data;

      // Sort: directories first, then files, alphabetically
      const sorted = files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      const nodes: FileNode[] = sorted.map(file => ({
        ...file,
        children: file.isDirectory ? [] : undefined,
        isLoaded: false
      }));

      if (parentNode) {
        // Update the parent node's children
        parentNode.children = nodes;
        parentNode.isLoaded = true;
        setFileTree((prev) => [...prev]); // Trigger re-render
      } else {
        // This is the root directory
        setFileTree(nodes);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load directory');
    } finally {
      if (!parentNode) setLoading(false);
    }
  };

  const handleFileClick = (node: FileNode) => {
    if (node.isDirectory) {
      if (!node.isLoaded) {
        loadDirectory(node.path, node);
      }
    } else {
      onFileSelect?.(node.path);
    }
  };

  const refresh = () => {
    if (rootPath) {
      loadDirectory(rootPath);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background border-r border-border">
      <div className="p-2 border-b border-border flex items-center justify-between bg-secondary/30">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          File Browser
        </span>
        <div className="flex items-center space-x-1">
          {rootPath && (
            <button
              onClick={refresh}
              className="p-1.5 hover:bg-secondary rounded transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={selectFolder}
            className="p-1.5 hover:bg-secondary rounded transition-colors"
            title="Open Folder"
          >
            <FolderPlus className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading && !fileTree.length && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        )}

        {error && (
          <div className="px-4 py-2">
            <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
              {error}
            </div>
          </div>
        )}

        {!loading && !rootPath && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Folder className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-2">No folder opened</p>
            <button
              onClick={selectFolder}
              className="text-xs text-primary hover:underline"
            >
              Open a folder to browse
            </button>
          </div>
        )}

        {fileTree.length > 0 && (
          <div>
            {fileTree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                level={0}
                onFileClick={handleFileClick}
                selectedFile={selectedFile}
              />
            ))}
          </div>
        )}
      </div>

      {rootPath && (
        <div className="p-2 border-t border-border bg-secondary/20">
          <div className="text-[10px] text-muted-foreground truncate font-mono" title={rootPath}>
            {rootPath}
          </div>
        </div>
      )}
    </div>
  );
};

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
  onFileClick: (node: FileNode) => void;
  selectedFile?: string;
}

const FileTreeNode = ({ node, level, onFileClick, selectedFile }: FileTreeNodeProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    if (node.isDirectory) {
      setIsOpen(!isOpen);
      if (!isOpen && !node.isLoaded) {
        onFileClick(node);
      }
    } else {
      onFileClick(node);
    }
  };

  const isSelected = !node.isDirectory && selectedFile === node.path;

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-1 px-2 cursor-pointer text-sm select-none transition-colors group",
          isSelected ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-secondary/50",
          level === 0 && node.isDirectory && "font-medium"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        <span className="mr-1.5 text-muted-foreground flex-shrink-0">
          {node.isDirectory ? (
            isOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )
          ) : (
            <span className="w-3.5 inline-block" />
          )}
        </span>
        <span className="mr-2 text-primary/70 flex-shrink-0">
          {node.isDirectory ? (
            isOpen ? (
              <FolderOpen className="w-4 h-4" />
            ) : (
              <Folder className="w-4 h-4" />
            )
          ) : (
            <File className="w-4 h-4 text-muted-foreground" />
          )}
        </span>
        <span
          className={cn(
            "truncate flex-1",
            node.isDirectory ? "text-foreground" : "text-muted-foreground",
            isSelected && "text-foreground font-medium"
          )}
          title={node.name}
        >
          {node.name}
        </span>
      </div>
      {isOpen && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onFileClick={onFileClick}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};
