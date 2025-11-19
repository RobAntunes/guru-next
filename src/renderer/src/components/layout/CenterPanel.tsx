import React, { useState } from 'react';
import { ShadowPanel } from '../workbench/ShadowPanel';
import { FileCode, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const CenterPanel = () => {
    const [activeTab, setActiveTab] = useState('login.ts');

    return (
        <div className="h-full w-full bg-background flex flex-col overflow-hidden">
            {/* Tab Bar */}
            <div className="flex items-center bg-muted/30 border-b border-border pt-1 px-1">
                <div
                    className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-t-lg border-t border-l border-r border-transparent cursor-pointer min-w-[120px] group relative",
                        activeTab === 'login.ts'
                            ? "bg-background border-border text-foreground tab-indicator"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    onClick={() => setActiveTab('login.ts')}
                >
                    <FileCode className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                    <span className="flex-1 truncate">login.ts (Diff)</span>
                    <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded ml-2 transition-opacity">
                        <X className="w-3 h-3" />
                    </button>
                    {activeTab === 'login.ts' && (
                        <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-primary" />
                    )}
                </div>

                <div
                    className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-t-lg border-t border-l border-r border-transparent cursor-pointer min-w-[120px] group relative",
                        activeTab === 'Task 1'
                            ? "bg-background border-border text-foreground tab-indicator"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    onClick={() => setActiveTab('Task 1')}
                >
                    <span className="flex-1 truncate">Task 1</span>
                    <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded ml-2 transition-opacity">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'login.ts' ? (
                    <ShadowPanel />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        Select a file or task
                    </div>
                )}
            </div>
        </div>
    );
};
