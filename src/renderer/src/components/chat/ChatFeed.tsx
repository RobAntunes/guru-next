import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { ChatMessage } from '../../types/control-room';
import { User, Bot, Terminal, ArrowUp } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ChainOfThought } from './ChainOfThought';

interface ChatFeedProps {
    messages: ChatMessage[];
    // Deprecated props below, kept for compatibility but ignored
    inputValue?: string;
    onInputChange?: (value: string) => void;
    onSend?: () => void;
}

const MESSAGES_PER_PAGE = 20;

export const ChatFeed = ({ messages }: ChatFeedProps) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleCount, setVisibleCount] = useState(MESSAGES_PER_PAGE);
    const [autoScroll, setAutoScroll] = useState(true);

    // Update visible count when messages array changes drastically (e.g. clear or new chat)
    // or when a new message comes in at the end.
    useEffect(() => {
        // If we receive a new message, we might want to show it
        // But for large histories, we start with a subset.
        if (messages.length <= MESSAGES_PER_PAGE) {
            setVisibleCount(messages.length);
        }
    }, [messages.length]);

    const visibleMessages = messages.slice(-visibleCount);
    const hasMore = visibleCount < messages.length;

    useEffect(() => {
        if (autoScroll) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [visibleMessages, autoScroll]);

    const handleScroll = () => {
        if (containerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            
            // If scrolled to top and has more messages, load more
            if (scrollTop === 0 && hasMore) {
                // Save current scroll height to maintain position
                const oldHeight = scrollHeight;
                
                setVisibleCount(prev => Math.min(prev + MESSAGES_PER_PAGE, messages.length));
                
                // Restore scroll position (approximate)
                requestAnimationFrame(() => {
                    if (containerRef.current) {
                        containerRef.current.scrollTop = containerRef.current.scrollHeight - oldHeight;
                    }
                });
            }

            // Check if user is at bottom
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
            setAutoScroll(isAtBottom);
        }
    };

    const loadAll = () => {
        setVisibleCount(messages.length);
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background">
            <div 
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-6 space-y-6"
            >
                {hasMore && (
                    <div className="flex justify-center pt-2 pb-4">
                        <button 
                            onClick={loadAll}
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 bg-secondary/50 px-3 py-1 rounded-full transition-colors"
                        >
                            <ArrowUp className="w-3 h-3" />
                            Load full history ({messages.length - visibleCount} more)
                        </button>
                    </div>
                )}

                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                        <Terminal className="w-12 h-12 mb-4" />
                        <p className="font-mono text-sm">AWAITING COMMAND INPUT...</p>
                    </div>
                )}

                {visibleMessages.map((msg) => (
                    <div key={msg.id} className={cn(
                        "flex space-x-4 max-w-3xl",
                        msg.agentId === 'user' ? "ml-auto flex-row-reverse space-x-reverse" : ""
                    )}>
                        {/* Avatar */}
                        <div className={cn(
                            "w-8 h-8 flex items-center justify-center border shrink-0 mt-1",
                            msg.agentId === 'user'
                                ? "bg-foreground text-background border-foreground"
                                : "bg-secondary border-border text-foreground"
                        )}>
                            {msg.agentId === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>

                        {/* Content */}
                        <div className={cn(
                            "flex-1 min-w-0",
                            "text-left"
                        )}>
                            <div className="flex items-center space-x-2 mb-1 text-[10px] font-mono text-muted-foreground uppercase tracking-wider"
                                style={{ flexDirection: msg.agentId === 'user' ? 'row-reverse' : 'row' }}>
                                <span className="font-bold text-foreground">
                                    {msg.agentId === 'user' ? ' OPERATOR' : msg.agentId}
                                </span>
                                <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                            </div>

                            <div className={cn(
                                "p-3 border",
                                msg.agentId === 'user'
                                    ? "bg-secondary/50 border-border text-foreground"
                                    : "bg-transparent border-transparent pl-0 pt-0"
                            )}>
                                {(msg.thoughtProcess || msg.isThinking) && (
                                    <ChainOfThought
                                        steps={msg.thoughtProcess || []}
                                        isThinking={!!msg.isThinking}
                                    />
                                )}
                                {msg.text && (
                                    <MarkdownRenderer
                                        content={msg.text}
                                        className={cn(
                                            msg.agentId === 'user' ? "prose-sm" : ""
                                        )}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};
