import React, { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FileNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    children?: FileNode[];
}

const mockFileSystem: FileNode[] = [
    {
        id: 'root',
        name: 'guru-electron',
        type: 'folder',
        children: [
            {
                id: 'src',
                name: 'src',
                type: 'folder',
                children: [
                    {
                        id: 'main',
                        name: 'main',
                        type: 'folder',
                        children: [
                            { id: 'index.ts', name: 'index.ts', type: 'file' },
                        ],
                    },
                    {
                        id: 'renderer',
                        name: 'renderer',
                        type: 'folder',
                        children: [
                            { id: 'App.tsx', name: 'App.tsx', type: 'file' },
                            { id: 'main.tsx', name: 'main.tsx', type: 'file' },
                        ],
                    },
                ],
            },
            { id: 'package.json', name: 'package.json', type: 'file' },
            { id: 'tsconfig.json', name: 'tsconfig.json', type: 'file' },
        ],
    },
];

const FileTreeNode = ({ node, level = 0 }: { node: FileNode; level?: number }) => {
    const [isOpen, setIsOpen] = useState(level === 0); // Open root by default

    const toggleOpen = () => {
        if (node.type === 'folder') {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div>
            <div
                className={cn(
                    "flex items-center py-1 px-2 hover:bg-accent/50 cursor-pointer text-sm select-none transition-colors",
                    level === 0 && "font-semibold"
                )}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={toggleOpen}
            >
                <span className="mr-1.5 text-muted-foreground">
                    {node.type === 'folder' ? (
                        isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                        <span className="w-3.5 inline-block" />
                    )}
                </span>
                <span className="mr-2 text-blue-500/80">
                    {node.type === 'folder' ? (
                        isOpen ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />
                    ) : (
                        <File className="w-4 h-4 text-muted-foreground" />
                    )}
                </span>
                <span className={cn("truncate", node.type === 'file' && "text-muted-foreground")}>
                    {node.name}
                </span>
            </div>
            {isOpen && node.children && (
                <div>
                    {node.children.map((child) => (
                        <FileTreeNode key={child.id} node={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

export const FileTree = () => {
    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                Explorer
            </div>
            <div className="flex-1 overflow-y-auto py-2">
                {mockFileSystem.map((node) => (
                    <FileTreeNode key={node.id} node={node} />
                ))}
            </div>
        </div>
    );
};
