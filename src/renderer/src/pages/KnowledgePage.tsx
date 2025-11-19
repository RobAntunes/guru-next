import React, { useState } from 'react';
import { StateGraph } from '../components/context/StateGraph';
import { Network, GitBranch, Database, Search, FileStack, Wrench } from 'lucide-react';
import { KnowledgeBaseManager } from '../components/knowledge/KnowledgeBaseManager';
import { ToolsPanel } from '../components/knowledge/ToolsPanel';
import { cn } from '../lib/utils';

export const KnowledgePage = () => {
    const [activeTab, setActiveTab] = useState<'graph' | 'documents' | 'tools'>('documents');

    return (
        <div className="h-full w-full bg-background flex flex-col overflow-hidden">
            {/* Header */}
            <header className="px-6 py-4 border-b border-border bg-background z-10">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">Knowledge</h1>
                        <p className="text-muted-foreground text-sm font-light">
                            Project context, state graphs, and indexed documents
                        </p>
                    </div>
                    {activeTab === 'graph' && (
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search nodes..."
                                    className="pl-9 pr-4 py-2 rounded-none bg-background border border-border text-sm focus:border-foreground transition-all w-64 outline-none"
                                />
                            </div>
                            <button className="p-2 rounded-none border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                                <Network className="w-5 h-5" />
                            </button>
                            <button className="p-2 rounded-none border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                                <GitBranch className="w-5 h-5" />
                            </button>
                            <button className="p-2 rounded-none border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                                <Database className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex items-center space-x-1 border-b border-border -mb-4">
                    <button
                        onClick={() => setActiveTab('documents')}
                        className={cn(
                            'flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer',
                            activeTab === 'documents'
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <FileStack className="w-4 h-4" />
                        <span>Documents</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('tools')}
                        className={cn(
                            'flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer',
                            activeTab === 'tools'
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Wrench className="w-4 h-4" />
                        <span>AI Tools</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('graph')}
                        className={cn(
                            'flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer',
                            activeTab === 'graph'
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Network className="w-4 h-4" />
                        <span>State Graph</span>
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-hidden">
                {activeTab === 'graph' ? (
                    <>
                        <StateGraph />

                        {/* Legend / Overlay */}
                        <div className="absolute bottom-4 left-12 bg-background border border-border rounded-none p-4 max-w-xs">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Graph Legend</h3>
                            <div className="space-y-2">
                                <div className="flex items-center text-sm">
                                    <span className="w-3 h-3 rounded-none bg-foreground mr-2"></span>
                                    <span className="text-foreground font-medium">Goal (Active)</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="w-3 h-3 rounded-none border border-foreground mr-2"></span>
                                    <span className="text-foreground font-medium">Task (Pending)</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="w-3 h-3 rounded-none bg-muted-foreground mr-2"></span>
                                    <span className="text-foreground font-medium">Constraint</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="w-3 h-3 rounded-none border border-muted-foreground mr-2"></span>
                                    <span className="text-foreground font-medium">Failed Attempt</span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : activeTab === 'tools' ? (
                    <ToolsPanel />
                ) : (
                    <KnowledgeBaseManager />
                )}
            </div>
        </div>
    );
};
