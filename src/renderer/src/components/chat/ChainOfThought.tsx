import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Loader2, Terminal, CheckCircle2, XCircle, BrainCircuit, Sparkles, Clock, ArrowRight } from 'lucide-react';

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
    const containerRef = useRef<HTMLDivElement>(null);
    const [shouldAutoClose, setShouldAutoClose] = useState(false);
    const [progress, setProgress] = useState(0);

    // Auto-scroll to bottom
    useEffect(() => {
        if (isExpanded && isThinking) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [steps.length, isExpanded, isThinking]);

    // Simulate progress during thinking (just for visual feedback)
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isThinking) {
            interval = setInterval(() => {
                setProgress(p => (p >= 95 ? 95 : p + Math.random() * 5));
            }, 1000);
        } else {
            setProgress(100);
        }
        return () => clearInterval(interval);
    }, [isThinking]);

    // Watch for thinking to finish to trigger auto-close sequence
    useEffect(() => {
        if (!isThinking && steps.length > 0) {
            setShouldAutoClose(true);
        } else if (isThinking) {
            setShouldAutoClose(false);
        }
    }, [isThinking, steps.length]);

    // Execute auto-close
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (shouldAutoClose && isExpanded) {
            timeout = setTimeout(() => {
                setIsExpanded(false);
                setShouldAutoClose(false);
            }, 2500); // 2.5s delay before closing
        }
        return () => clearTimeout(timeout);
    }, [shouldAutoClose, isExpanded]);

    if (steps.length === 0 && !isThinking) return null;

    const lastStep = steps[steps.length - 1];
    const statusText = isThinking
        ? (lastStep?.type === 'status' ? lastStep.content : "Processing...")
        : "Completed";

    const getStepIcon = (step: ThoughtStep, isLast: boolean) => {
        if (step.type === 'error') return <XCircle className="w-3.5 h-3.5 text-red-500" />;
        if (step.type === 'tool_call') return <Terminal className="w-3.5 h-3.5 text-amber-400/80" />;
        if (step.type === 'tool_result') return step.content.includes('Error') 
            ? <XCircle className="w-3.5 h-3.5 text-red-400" /> 
            : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
        
        // Status
        if (isThinking && isLast) return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />;
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/50" />;
    };

    return (
        <div 
            ref={containerRef}
            className={cn(
                "w-full max-w-3xl my-3 rounded-xl border transition-all duration-500 ease-in-out overflow-hidden group/container relative",
                isThinking 
                    ? "border-blue-500/30 bg-gradient-to-r from-blue-950/10 via-indigo-950/10 to-blue-950/10 bg-[length:200%_200%] animate-gradient shadow-[0_0_20px_rgba(59,130,246,0.15)]" 
                    : "border-border/40 bg-black/20",
                !isExpanded && !isThinking && "opacity-70 hover:opacity-100 hover:border-border/60"
            )}
        >
            {/* Progress Bar (Thin line at top) */}
            {isThinking && (
                <div className="absolute top-0 left-0 h-[1px] bg-blue-500/50 transition-all duration-300 ease-out z-10" style={{ width: `${progress}%` }} />
            )}

            {/* Header / Summary */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left group relative z-0"
            >
                <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
                    isThinking 
                        ? "text-blue-400 bg-blue-500/10 ring-1 ring-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]" 
                        : "text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                )}>
                    {isThinking ? (
                        <BrainCircuit className="w-3.5 h-3.5 animate-pulse" />
                    ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                    )}
                </div>

                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className={cn(
                        "text-xs font-mono font-medium transition-colors duration-300 uppercase tracking-wider",
                        isThinking ? "text-blue-300" : "text-emerald-300"
                    )}>
                        {isThinking ? "Thinking" : "Done"}
                    </span>
                    
                    <ArrowRight className="w-3 h-3 text-muted-foreground/30" />
                    
                    <span className="text-xs text-muted-foreground/80 truncate font-medium">
                        {statusText}
                    </span>
                </div>

                <div className="flex items-center gap-3 text-muted-foreground/50">
                    {steps.length > 0 && (
                        <div className="text-[10px] font-mono hidden sm:flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded">
                            <Clock className="w-3 h-3" />
                            <span>{((steps[steps.length-1].timestamp - steps[0].timestamp) / 1000).toFixed(1)}s</span>
                        </div>
                    )}
                    <div className="group-hover:text-foreground transition-colors">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                </div>
            </button>

            {/* Detailed Steps */}
            <div className={cn(
                "transition-[max-height,opacity] duration-500 ease-in-out overflow-hidden",
                isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            )}>
                <div className="border-t border-white/5 bg-black/20 px-4 py-3 space-y-3 overflow-y-auto max-h-[300px] font-mono text-xs relative backdrop-blur-sm">
                    {steps.map((step, index) => {
                        const isLastStep = index === steps.length - 1;
                        
                        return (
                            <div 
                                key={step.id} 
                                className={cn(
                                    "flex gap-3 group",
                                    "animate-in fade-in slide-in-from-left-2 duration-300"
                                )}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="mt-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                                    {getStepIcon(step, isLastStep)}
                                </div>

                                <div className="flex-1 min-w-0 wrap-break-word text-muted-foreground leading-relaxed">
                                    {step.type === 'tool_call' ? (
                                        <div className="inline-flex flex-col gap-1">
                                            <span className="text-amber-200/80 font-medium">Using Tool</span>
                                            <span className="bg-amber-950/30 border border-amber-500/20 px-2 py-1 rounded text-amber-200/70">{step.content}</span>
                                        </div>
                                    ) : step.type === 'tool_result' ? (
                                        <div className="inline-flex flex-col gap-1">
                                             <span className={step.content.includes('Error') ? "text-red-300 font-medium" : "text-emerald-300 font-medium"}>
                                                {step.content.includes('Error') ? "Tool Failed" : "Tool Output"}
                                             </span>
                                            <span className={cn(
                                                "px-2 py-1 rounded border bg-black/20",
                                                step.content.includes('Error') ? "text-red-300/70 border-red-500/20" : "text-emerald-300/70 border-emerald-500/20"
                                            )}>
                                                {step.content}
                                            </span>
                                        </div>
                                    ) : (
                                        <span>{step.content}</span>
                                    )}
                                </div>

                                <div className="text-[10px] text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors shrink-0 tabular-nums select-none pt-0.5">
                                    {new Date(step.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}
                                </div>
                            </div>
                        );
                    })}
                    
                    {isThinking && (
                        <div className="flex gap-3 animate-pulse opacity-30 pl-0.5 mt-2">
                            <div className="w-3.5 h-3.5 rounded-full bg-blue-400/20" />
                            <div className="h-3.5 w-24 bg-blue-400/10 rounded" />
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
};
