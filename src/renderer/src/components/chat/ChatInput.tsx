import React, { useState, useRef, useEffect, memo } from 'react';
import { Send, Paperclip, Terminal, X, FileText, Command, User, Hash, Search } from 'lucide-react';
import { ContextMenu, ContextOption } from './ContextMenu';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

export interface Attachment {
    id: string;
    type: 'file' | 'memory' | 'url';
    name: string;
    value: string; // Path or content
    content?: string; // Loaded content
}

interface ChatInputProps {
    onSend: (text: string, attachments: Attachment[]) => void;
    onClear: () => void;
    agentId?: string;
    placeholder?: string;
    disabled?: boolean;
}

export const ChatInput = memo(({ onSend, onClear, agentId, placeholder, disabled }: ChatInputProps) => {
    const [value, setValue] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [menuState, setMenuState] = useState<{ type: 'at' | 'slash', query: string, index: number } | null>(null);
    const [options, setOptions] = useState<ContextOption[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Debounce the query part of menuState to avoid searching on every keystroke for files
    const debouncedQuery = useDebounce(menuState?.query, 300);

    // Effect to update options
    useEffect(() => {
        if (!menuState) {
            setOptions([]);
            return;
        }

        const { type } = menuState;
        // Use immediate query for commands (local filter), debounced for search (async)
        // If type is slash, we use raw menuState.query for instant feedback
        // If type is at, we use debouncedQuery to save backend calls. 
        // EXCEPTION: If query is empty (just opened menu), use immediate to show initial list faster.
        const effectiveQuery = type === 'at'
            ? (menuState.query === '' ? '' : debouncedQuery)
            : menuState.query;

        // Skip if we're waiting for debounce (query exists but effectiveQuery doesn't match yet)
        if (type === 'at' && menuState.query !== '' && effectiveQuery !== menuState.query) {
            return;
        }

        let active = true;

        const fetchOptions = async () => {
            let newOptions: ContextOption[] = [];

            if (type === 'at') {
                // Add "Browse..." option at the top or bottom? 
                // Cursor puts local files first.

                // Search for files immediately
                try {
                    // @ts-ignore
                    // Always search, even with empty query, to show file list
                    const results = await window.api.document.search(effectiveQuery || '', undefined, 20);

                    if (active && results && Array.isArray(results)) {
                        const docOptions = results.map((doc: any) => ({
                            id: doc.id || doc.filePath,
                            label: doc.metadata?.title || doc.fileName || doc.filePath.split(/[/\\]/).pop(),
                            type: 'file' as const,
                            value: doc.filePath,
                            icon: <FileText className="w-4 h-4" />,
                            description: doc.filePath
                        }));
                        newOptions = [...newOptions, ...docOptions];
                    }
                } catch (err) {
                    console.error("Failed to search documents", err);
                }

                // Add the manual picker option at the end
                newOptions.push({
                    id: 'file-picker',
                    label: 'Browse System...',
                    type: 'file' as const,
                    value: 'PICK_FILE',
                    icon: <Paperclip className="w-4 h-4" />,
                    description: 'Select a file from system'
                });

            } else if (type === 'slash') {
                const commands: ContextOption[] = [
                    { id: 'clear', label: '/clear', type: 'command' as const, value: 'clear', icon: <Terminal className="w-4 h-4" />, description: 'Clear chat history' },
                    { id: 'agent', label: '/agent', type: 'command' as const, value: 'agent', icon: <User className="w-4 h-4" />, description: 'Switch active agent' },
                    { id: 'web', label: '/web', type: 'command' as const, value: 'web', icon: <Hash className="w-4 h-4" />, description: 'Browse a URL' },
                    { id: 'search', label: '/search', type: 'command' as const, value: 'search', icon: <Search className="w-4 h-4" />, description: 'Search knowledge base' },
                ];

                const lowerQuery = menuState.query.toLowerCase();
                newOptions = commands.filter(c =>
                    c.label.toLowerCase().startsWith(type === 'slash' && !menuState.query.startsWith('/') ? '/' + lowerQuery : lowerQuery) ||
                    c.label.toLowerCase().includes(lowerQuery)
                );
            }

            if (active) {
                setOptions(newOptions);
                setSelectedIndex(0);
            }
        };

        fetchOptions();

        return () => { active = false; };
    }, [menuState?.type, menuState?.query, debouncedQuery]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        checkForTrigger(newValue, e.target.selectionStart);
    };

    const checkForTrigger = (text: string, cursorIndex: number) => {
        const textBeforeCursor = text.substring(0, cursorIndex);
        const lastAt = textBeforeCursor.lastIndexOf('@');
        const lastSlash = textBeforeCursor.lastIndexOf('/');

        let triggerChar = '';
        let triggerIndex = -1;

        if (lastAt > lastSlash && lastAt !== -1) {
            triggerChar = '@';
            triggerIndex = lastAt;
        } else if (lastSlash > lastAt && lastSlash !== -1) {
            triggerChar = '/';
            triggerIndex = lastSlash;
        }

        if (triggerIndex !== -1) {
            const isStart = triggerIndex === 0;
            const isPrecededBySpace = triggerIndex > 0 && /\s/.test(text[triggerIndex - 1]);

            if (isStart || isPrecededBySpace) {
                const query = text.substring(triggerIndex + 1, cursorIndex);
                if (!query.includes('\n') && query.length < 50) {
                    setMenuState({ type: triggerChar === '@' ? 'at' : 'slash', query, index: triggerIndex });
                    return;
                }
            }
        }

        if (menuState) setMenuState(null);
    };

    const handleSelectOption = async (option: ContextOption) => {
        if (!menuState) return;

        const textBefore = value.substring(0, menuState.index);
        const queryLength = menuState.query.length;
        const textAfter = value.substring(menuState.index + 1 + queryLength);

        let newValue = value;

        if (option.type === 'file') {
            // Remove the @query part
            newValue = textBefore + textAfter;

            let filePath = option.value;
            let fileName = '';
            let content = '';

            if (option.value === 'PICK_FILE') {
                // @ts-ignore
                const result = await window.api.file.openDialog();
                if (result && result.length > 0) {
                    filePath = result[0];
                } else {
                    // Cancelled
                    setValue(newValue);
                    setMenuState(null);
                    textareaRef.current?.focus();
                    return;
                }
            }

            // @ts-ignore
            const sep = filePath.includes('\\') ? '\\' : '/';
            fileName = filePath.split(sep).pop() || 'file';

            try {
                // @ts-ignore
                content = await window.api.file.readContent(filePath);

                const newAttachment: Attachment = {
                    id: Date.now().toString(),
                    type: 'file',
                    name: fileName,
                    value: filePath,
                    content: content
                };
                setAttachments(prev => [...prev, newAttachment]);
            } catch (e) {
                console.error("Failed to read file", e);
            }

        } else if (option.type === 'command') {
            if (option.value === 'clear') {
                onClear();
                newValue = '';
            } else {
                // Replace /query with command + space
                newValue = textBefore + '/' + option.value + ' ' + textAfter;
            }
        }

        setValue(newValue);
        setMenuState(null);

        setTimeout(() => {
            textareaRef.current?.focus();
            if (option.type === 'command' && option.value !== 'clear') {
                const newCursorPos = textBefore.length + option.value.length + 2;
                textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
            } else {
                const newCursorPos = textBefore.length;
                textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 10);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (menuState && options.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % options.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + options.length) % options.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleSelectOption(options[selectedIndex]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setMenuState(null);
            }
        } else {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        }
    };

    const handleSend = () => {
        if ((!value.trim() && attachments.length === 0) || disabled) return;
        onSend(value, attachments);
        setValue('');
        setAttachments([]);
        setMenuState(null);
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    };

    return (
        <div className="p-4 border-t border-border bg-background relative">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map(att => (
                        <div key={att.id} className="flex items-center bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs group">
                            <FileText className="w-3 h-3 mr-1 opacity-70" />
                            <span className="max-w-[150px] truncate">{att.name}</span>
                            <button
                                onClick={() => removeAttachment(att.id)}
                                className="ml-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Context Menu */}
            {menuState && options.length > 0 && (
                <ContextMenu
                    options={options}
                    selectedIndex={selectedIndex}
                    onSelect={handleSelectOption}
                    onClose={() => setMenuState(null)}
                />
            )}

            <div className="relative flex items-end border border-border bg-secondary/10 focus-within:border-foreground/50 transition-colors rounded-md overflow-hidden">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || (agentId ? `Message ${agentId}...` : "Broadcast to swarm...")}
                    className="flex-1 bg-transparent border-none p-3 min-h-[60px] max-h-[200px] resize-none focus:ring-0 text-sm font-mono text-foreground placeholder:text-muted-foreground/50"
                    disabled={disabled}
                />
                <div className="flex items-center p-2 space-x-1">
                    <button
                        onClick={onClear}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-sm hover:bg-muted"
                        title="Clear History"
                    >
                        <Terminal className="w-4 h-4" />
                    </button>
                    <button
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-sm hover:bg-muted"
                        title="Attach File (@)"
                        onClick={() => {
                            setValue(prev => prev + '@');
                            checkForTrigger(value + '@', value.length + 1);
                            textareaRef.current?.focus();
                        }}
                    >
                        <Paperclip className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={disabled || (!value.trim() && attachments.length === 0)}
                        className={cn(
                            "p-2 transition-colors rounded-sm",
                            (!value.trim() && attachments.length === 0)
                                ? "text-muted-foreground bg-muted"
                                : "bg-foreground text-background hover:bg-foreground/90"
                        )}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground font-mono flex justify-between">
                <span>Type <strong className="text-foreground">@</strong> to add context, <strong className="text-foreground">/</strong> for commands</span>
                <span>Enter to send, Shift+Enter for new line</span>
            </div>
        </div>
    );
});

ChatInput.displayName = 'ChatInput';
