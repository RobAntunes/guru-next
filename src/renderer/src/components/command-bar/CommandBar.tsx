import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, Terminal, Zap, FileCode, Layers } from 'lucide-react';

export const CommandBar = () => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');

    // Toggle with Cmd+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const handleAskGuru = () => {
        console.log('Asking Guru:', inputValue);
        // TODO: Send to agent
        setOpen(false);
        setInputValue('');
    };

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Global Command Menu"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] max-w-[90vw] bg-background border border-border shadow-none z-50"
            overlayClassName="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        >
            <div className="flex items-center border-b border-border px-4 py-3">
                <Terminal className="w-5 h-5 text-foreground mr-3" />
                <Command.Input
                    value={inputValue}
                    onValueChange={setInputValue}
                    placeholder="Ask Guru or search commands..."
                    className="flex-1 bg-transparent outline-none text-lg text-foreground placeholder:text-muted-foreground font-mono"
                />
                <div className="flex items-center space-x-1">
                    <kbd className="bg-secondary text-muted-foreground px-2 py-0.5 border border-border text-xs font-mono">ESC</kbd>
                </div>
            </div>

            <Command.List className="max-h-[400px] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-muted-foreground font-mono text-sm">
                    No results found.
                </Command.Empty>

                <Command.Group heading="Agent Actions" className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2 py-1.5 mb-1">
                    <Command.Item
                        onSelect={handleAskGuru}
                        className="flex items-center px-3 py-2 text-sm text-foreground hover:bg-secondary cursor-pointer transition-colors aria-selected:bg-secondary group"
                    >
                        <Zap className="w-4 h-4 mr-3 text-foreground" />
                        <span className="font-mono">Ask Guru: <span className="text-muted-foreground">{inputValue || '...'}</span></span>
                        <span className="ml-auto text-xs text-muted-foreground group-aria-selected:text-foreground">ENTER</span>
                    </Command.Item>
                </Command.Group>

                <Command.Group heading="System" className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2 py-1.5 mb-1">
                    <Command.Item className="flex items-center px-3 py-2 text-sm text-foreground hover:bg-secondary cursor-pointer transition-colors aria-selected:bg-secondary">
                        <Layers className="w-4 h-4 mr-3 text-muted-foreground" />
                        <span>Go to State Graph</span>
                    </Command.Item>
                    <Command.Item className="flex items-center px-3 py-2 text-sm text-foreground hover:bg-secondary cursor-pointer transition-colors aria-selected:bg-secondary">
                        <FileCode className="w-4 h-4 mr-3 text-muted-foreground" />
                        <span>Search Files...</span>
                    </Command.Item>
                </Command.Group>
            </Command.List>

            <div className="border-t border-border px-4 py-2 bg-secondary/30 flex justify-between items-center text-xs text-muted-foreground font-mono">
                <span>Guru 2.0 Dispatch</span>
                <div className="flex space-x-2">
                    <span>Select ↵</span>
                    <span>Navigate ↑↓</span>
                </div>
            </div>
        </Command.Dialog>
    );
};
