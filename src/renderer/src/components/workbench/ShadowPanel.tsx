import React, { useEffect, useState } from 'react';
import { Check, X, AlertTriangle, MessageSquare, FileCode, Terminal, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { happenService, ShadowAction } from '../../services/happen-service';

export const ShadowPanel = () => {
    const [pendingActions, setPendingActions] = useState<ShadowAction[]>([]);
    const [selectedAction, setSelectedAction] = useState<ShadowAction | null>(null);

    useEffect(() => {
        // Initial fetch
        loadActions();

        // Subscribe to real-time updates
        const unsubscribe = happenService.onShadowUpdate((actions) => {
            console.log('Shadow update received:', actions);
            setPendingActions(actions);
            // Update selected action if it still exists
            if (selectedAction) {
                const updated = actions.find(a => a.id === selectedAction.id);
                if (updated) setSelectedAction(updated);
                else setSelectedAction(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const loadActions = async () => {
        const actions = await happenService.getPendingShadowActions();
        setPendingActions(actions);
    };

    const handleApprove = async (id: string) => {
        await happenService.approveShadowAction(id);
        setSelectedAction(null);
        loadActions();
    };

    const handleReject = async (id: string) => {
        await happenService.rejectShadowAction(id);
        setSelectedAction(null);
        loadActions();
    };

    // If no action selected, select the first one
    useEffect(() => {
        if (!selectedAction && pendingActions.length > 0) {
            setSelectedAction(pendingActions[0]);
        }
    }, [pendingActions, selectedAction]);

    if (pendingActions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <div className="bg-muted/50 p-4 rounded-full mb-4">
                    <Check className="w-8 h-8 text-emerald-500/50" />
                </div>
                <p className="text-sm font-medium">All clear</p>
                <p className="text-xs text-muted-foreground mt-1">No pending agent actions requiring approval.</p>
            </div>
        );
    }

    const action = selectedAction || pendingActions[0];

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header / List (if multiple) */}
            {pendingActions.length > 1 && (
                <div className="border-b border-border bg-muted/20 overflow-x-auto whitespace-nowrap p-2 flex space-x-2">
                    {pendingActions.map(a => (
                        <button
                            key={a.id}
                            onClick={() => setSelectedAction(a)}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-medium border transition-all flex items-center space-x-2",
                                selectedAction?.id === a.id 
                                    ? "bg-background border-primary text-foreground shadow-sm" 
                                    : "bg-transparent border-transparent text-muted-foreground hover:bg-muted"
                            )}
                        >
                            <ActionIcon type={a.type} className="w-3 h-3" />
                            <span>{a.type}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Context Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card/50">
                <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-emerald-500/10 rounded-md">
                        <ActionIcon type={action.type} className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-foreground">{action.summary}</h2>
                        <div className="text-xs text-muted-foreground flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                            Proposed by Agent: {action.agentId}
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="px-2 py-1 rounded bg-muted text-xs font-mono text-muted-foreground">
                        {new Date(action.timestamp).toLocaleTimeString()}
                    </div>
                </div>
            </div>

            {/* Action Details / Payload */}
            <div className="flex-1 overflow-y-auto font-mono text-sm bg-[#0d1117] text-gray-300 p-4">
                {action.type === 'fs:write' && (
                    <div>
                        <div className="text-xs text-gray-500 mb-2">File Path: {action.payload.path}</div>
                        <div className="p-2 bg-black/30 rounded border border-white/10 overflow-x-auto">
                            <pre>{action.payload.content}</pre>
                        </div>
                    </div>
                )}
                {action.type === 'terminal:exec' && (
                    <div>
                        <div className="text-xs text-gray-500 mb-2">Command Execution</div>
                        <div className="p-2 bg-black/30 rounded border border-white/10 text-green-400">
                            $ {action.payload.command}
                        </div>
                        {action.payload.cwd && (
                            <div className="mt-2 text-xs text-gray-500">CWD: {action.payload.cwd}</div>
                        )}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="border-t border-border bg-card p-4 space-y-4">
                <div className="flex items-start space-x-4">
                    <div className="flex-1 space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Safety Check</h3>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border">
                            This action will operate on the local environment. Ensure the content and command are safe.
                        </p>
                    </div>
                </div>

                {/* Approval Gate */}
                <div className="flex items-end space-x-3 pt-2">
                    <div className="flex-1 relative">
                         {/* Comment field could be added here */}
                    </div>

                    <div className="flex space-x-2 pb-1">
                        <button 
                            onClick={() => handleReject(action.id)}
                            className="px-4 py-2.5 rounded-lg border border-border hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-colors flex items-center font-medium text-sm"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Reject
                        </button>
                        <button 
                            onClick={() => handleApprove(action.id)}
                            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center font-medium text-sm"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Approve
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ActionIcon = ({ type, className }: { type: string, className?: string }) => {
    switch (type) {
        case 'fs:write': return <FileCode className={className} />;
        case 'fs:delete': return <Trash2 className={className} />;
        case 'terminal:exec': return <Terminal className={className} />;
        default: return <AlertTriangle className={className} />;
    }
};
