import React, { useEffect, useState, useCallback } from 'react';
import { Check, X, AlertTriangle, FileCode, Terminal, Trash2, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { happenService, ShadowAction } from '../../services/happen-service';
import { CorrectionDeck } from './CorrectionDeck';

export const ShadowPanel = () => {
    const [pendingActions, setPendingActions] = useState<ShadowAction[]>([]);
    const [selectedAction, setSelectedAction] = useState<ShadowAction | null>(null);
    
    // For Diff/Correction Deck
    const [originalContent, setOriginalContent] = useState<string>("");
    const [modifiedContent, setModifiedContent] = useState<string>("");
    const [isContentModified, setIsContentModified] = useState<boolean>(false);

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

    // Load original content when action changes
    useEffect(() => {
        const fetchOriginal = async () => {
            if (selectedAction && selectedAction.type === 'fs:write') {
                try {
                    const content = await happenService.readFile(selectedAction.payload.path);
                    setOriginalContent(content || "");
                    
                    // Handle content formatting
                    let rawNewContent = selectedAction.payload.content;
                    if (typeof rawNewContent !== 'string') {
                         rawNewContent = JSON.stringify(rawNewContent, null, 2);
                    }
                    setModifiedContent(rawNewContent);
                    setIsContentModified(false);
                } catch (error) {
                    console.error("Failed to read original file:", error);
                    setOriginalContent(""); // New file or error
                    setModifiedContent(typeof selectedAction.payload.content === 'string' 
                        ? selectedAction.payload.content 
                        : JSON.stringify(selectedAction.payload.content, null, 2));
                }
            } else {
                setOriginalContent("");
                setModifiedContent("");
            }
        };
        
        fetchOriginal();
    }, [selectedAction]);

    const handleApprove = async (id: string) => {
        // If it's a write action and we have modified content, send it.
        if (selectedAction?.type === 'fs:write') {
             await happenService.approveShadowAction(id, modifiedContent);
        } else {
             await happenService.approveShadowAction(id);
        }
        
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

    const onDeckContentChange = useCallback((newCode: string) => {
        setModifiedContent(newCode);
        setIsContentModified(true);
    }, []);

    const getLanguageFromPath = (path: string) => {
        const ext = path.split('.').pop()?.toLowerCase();
        const map: Record<string, any> = {
            ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
            json: 'json', md: 'markdown', css: 'css', html: 'html',
            py: 'python', java: 'java', go: 'go', rs: 'rust'
        };
        return map[ext || ''] || 'javascript';
    };

    if (pendingActions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-zinc-950">
                <div className="bg-muted/50 p-4 rounded-full mb-4">
                    <Check className="w-8 h-8 text-emerald-500/50" />
                </div>
                <p className="text-sm font-medium">All clear</p>
                <p className="text-xs text-muted-foreground mt-1">No pending agent actions requiring approval.</p>
            </div>
        );
    }

    const action = selectedAction || pendingActions[0];
    const actionFileName = action.type === 'fs:write' ? action.payload.path.split('/').pop() : 'Action';

    return (
        <div className="flex flex-col h-full bg-zinc-950">
            {/* Header / Tabs for Multiple Actions */}
            {pendingActions.length > 1 && (
                <div className="border-b border-border bg-muted/20 overflow-x-auto whitespace-nowrap p-1 flex space-x-1">
                    {pendingActions.map(a => (
                        <button
                            key={a.id}
                            onClick={() => setSelectedAction(a)}
                            className={cn(
                                "px-3 py-2 rounded-t-md text-xs font-medium border-b-2 transition-all flex items-center space-x-2 min-w-[120px] max-w-[200px]",
                                selectedAction?.id === a.id 
                                    ? "bg-background border-primary text-foreground" 
                                    : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            <ActionIcon type={a.type} className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{a.type === 'fs:write' ? a.payload.path.split('/').pop() : a.type}</span>
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

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col bg-[#1e1e1e]">
                {action.type === 'fs:write' ? (
                    <CorrectionDeck
                        fileName={actionFileName}
                        originalCode={originalContent}
                        modifiedCode={modifiedContent}
                        onContentChange={onDeckContentChange}
                        language={getLanguageFromPath(action.payload.path)}
                        className="border-0 rounded-none"
                    />
                ) : action.type === 'terminal:exec' ? (
                    <div className="p-4 font-mono text-sm h-full overflow-auto">
                        <div className="text-xs text-gray-500 mb-2">Command Execution</div>
                        <div className="p-3 bg-black/50 rounded border border-white/10 text-green-400 shadow-inner">
                            <div className="flex gap-2">
                                <span className="select-none opacity-50">$</span>
                                <span>{action.payload.command}</span>
                            </div>
                        </div>
                        {action.payload.cwd && (
                            <div className="mt-2 text-xs text-gray-500 flex items-center">
                                <span className="opacity-50 mr-2">CWD:</span>
                                <span className="font-mono bg-white/5 px-1 rounded">{action.payload.cwd}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 h-full overflow-auto">
                        <pre className="text-xs font-mono text-muted-foreground">
                            {JSON.stringify(action.payload, null, 2)}
                        </pre>
                    </div>
                )}
            </div>

            {/* Action Controls */}
            <div className="border-t border-border bg-card p-4 space-y-4">
                <div className="flex items-start space-x-4">
                    <div className="flex-1 space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {isContentModified ? "Review Changes (Edited)" : "Safety Check"}
                        </h3>
                        <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border">
                            {isContentModified 
                                ? "You have manually edited the agent's proposal. Approving will commit YOUR version."
                                : "This action will modify the local environment. Review the content above carefully."}
                        </p>
                    </div>
                </div>

                <div className="flex items-end space-x-3 pt-2">
                    <div className="flex-1"></div>

                    <div className="flex space-x-2 pb-1">
                        <button 
                            onClick={() => handleReject(action.id)}
                            className="px-4 py-2.5 rounded-lg border border-border hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-colors flex items-center font-medium text-xs uppercase tracking-wide"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Reject
                        </button>
                        <button 
                            onClick={() => handleApprove(action.id)}
                            className={cn(
                                "px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center font-medium text-xs uppercase tracking-wide",
                                isContentModified && "ring-2 ring-offset-2 ring-offset-background ring-guru-accent"
                            )}
                        >
                            <Check className="w-4 h-4 mr-2" />
                            {isContentModified ? "Approve Edit" : "Approve"}
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
