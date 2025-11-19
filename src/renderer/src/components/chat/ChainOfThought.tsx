import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Loader2, Terminal, CheckCircle2, XCircle, BrainCircuit } from 'lucide-react';

export interface ThoughtStep {
    id: string;
    type: 'status' | 'tool_call' | 'tool_result' | 'error';
    content: string;
    timestamp: number;
    metadata?: any;
}

interface ChainOfThoughtProps {
    steps: ThoughtStep[];
    isThinking: boolean;
    defaultExpanded?: boolean;
}

export const ChainOfThought: React.FC<ChainOfThoughtProps> = ({ steps, isThinking, defaultExpanded = true }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of thoughts when new steps are added, if expanded
    useEffect(() => {
        if (isExpanded && isThinking) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [steps.length, isExpanded, isThinking]);

    if (steps.length === 0 && !isThinking) return null;

    const lastStep = steps[steps.length - 1];
    const statusText = isThinking
        ? (lastStep?.type === 'status' ? lastStep.content : "Thinking...")
        : "Finished thinking";

    return (
        <div className="w-full max-w-3xl my-2 rounded-lg border border-border/50 bg-black/20 overflow-hidden">
            {/* Header / Summary */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
            >
                <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                    isThinking ? "animate-pulse text-blue-400" : "text-muted-foreground"
                )}>
                    {isThinking ? <BrainCircuit className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono font-medium text-foreground/80 truncate">
                        {statusText}
                    </div>
                    {steps.length > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                            {steps.length} steps taken
                        </div>
                    )}
                </div>

                <div className="text-muted-foreground">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
            </button>

            {/* Detailed Steps */}
            {isExpanded && (
                <div className="border-t border-border/30 bg-black/20 px-4 py-3 space-y-3 max-h-[300px] overflow-y-auto font-mono text-xs">
                    {steps.map((step) => (
                        <div key={step.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="mt-0.5 shrink-0">
                                {step.type === 'status' && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                                {step.type === 'tool_call' && <Terminal className="w-3.5 h-3.5 text-amber-400" />}
                                {step.type === 'tool_result' && (
                                    step.content.includes('Error')
                                        ? <XCircle className="w-3.5 h-3.5 text-red-400" />
                                        : <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                )}
                                {step.type === 'error' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                            </div>

                            <div className="flex-1 min-w-0 break-words text-muted-foreground">
                                {step.type === 'tool_call' ? (
                                    <span className="text-amber-200/80">{step.content}</span>
                                ) : step.type === 'tool_result' ? (
                                    <span className={step.content.includes('Error') ? "text-red-300" : "text-green-300/80"}>
                                        {step.content}
                                    </span>
                                ) : (
                                    <span>{step.content}</span>
                                )}
                            </div>

                            <div className="text-[10px] text-muted-foreground/50 shrink-0 tabular-nums">
                                {new Date(step.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }).split(' ')[0]}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex gap-3 animate-pulse opacity-50">
                            <div className="w-3.5 h-3.5 rounded-full bg-blue-400/20" />
                            <div className="h-3 w-24 bg-blue-400/10 rounded" />
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            )}
        </div>
    );
};
