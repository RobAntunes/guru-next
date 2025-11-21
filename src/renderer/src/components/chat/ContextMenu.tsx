import React from 'react';
import { cn } from '@/lib/utils';

export type ContextOption = {
    id: string;
    label: string;
    type: 'file' | 'agent' | 'command' | 'memory' | 'url';
    value: string;
    icon?: React.ReactNode;
    description?: string;
    payload?: any;
};

interface ContextMenuProps {
    options: ContextOption[];
    selectedIndex: number;
    onSelect: (option: ContextOption) => void;
    onClose: () => void;
    className?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ options, selectedIndex, onSelect, className }) => {
    if (options.length === 0) return null;

    return (
        <div className={cn("absolute bottom-full mb-2 w-72 bg-popover border border-border rounded-md shadow-lg overflow-hidden z-50 animate-in slide-in-from-bottom-2 duration-200", className)}>
            <div className="p-1 max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {options.map((opt, i) => (
                    <button
                        key={opt.id}
                        className={cn(
                            "w-full flex items-center text-left px-2 py-2 text-sm rounded-sm transition-colors",
                            i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted/50 text-foreground"
                        )}
                        onClick={() => onSelect(opt)}
                        role="option"
                        aria-selected={i === selectedIndex}
                    >
                        <span className={cn(
                            "mr-3 flex-shrink-0 flex items-center justify-center w-5 h-5 rounded",
                            i === selectedIndex ? "text-accent-foreground" : "text-muted-foreground"
                        )}>
                            {opt.icon}
                        </span>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-medium truncate leading-none mb-0.5">{opt.label}</span>
                            {opt.description && (
                                <span className={cn(
                                    "text-[10px] truncate",
                                    i === selectedIndex ? "text-accent-foreground/80" : "text-muted-foreground"
                                )}>
                                    {opt.description}
                                </span>
                            )}
                        </div>
                        {i === selectedIndex && (
                            <span className="text-[10px] text-muted-foreground/50 font-mono ml-2">
                                ↵
                            </span>
                        )}
                    </button>
                ))}
            </div>
            <div className="px-2 py-1 bg-muted/30 border-t border-border flex justify-between text-[10px] text-muted-foreground">
                <span>Navigate <span className="font-mono">↑↓</span></span>
                <span>Select <span className="font-mono">Tab</span> or <span className="font-mono">Enter</span></span>
            </div>
        </div>
    );
};
