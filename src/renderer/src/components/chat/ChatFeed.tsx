import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { ChatMessage } from '../../types/control-room';
import { User, Bot, Terminal } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ChainOfThought } from './ChainOfThought';

interface ChatFeedProps {
    messages: ChatMessage[];
    inputValue: string;
    onInputChange: (value: string) => void;
    onSend: () => void;
}

export const ChatFeed = ({ messages, inputValue, onInputChange, onSend }: ChatFeedProps) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                        <Terminal className="w-12 h-12 mb-4" />
                        <p className="font-mono text-sm">AWAITING COMMAND INPUT...</p>
                    </div>
                )}

                {messages.map((msg) => (
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
                            msg.agentId === 'user' ? "text-right" : "text-left"
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

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-background/50 backdrop-blur-sm shrink-0">
                <div className="relative">
                    <textarea
                        value={inputValue}
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Transmit orders..."
                        className="w-full bg-background border border-border p-3 pr-12 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary resize-none h-12 min-h-[48px] max-h-[200px]"
                    />
                    <div className="absolute right-2 bottom-2 text-[10px] text-muted-foreground font-mono">
                        CMD+ENTER
                    </div>
                </div>
            </div>
        </div>
    );
};
