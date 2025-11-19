import React from 'react';
import { Inbox } from '../components/runtime/Inbox';
import { AgentMonitor } from '../components/runtime/AgentMonitor';

export const RuntimePage = () => {
    return (
        <div className="h-full w-full bg-background p-6 overflow-hidden flex flex-col">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Runtime Monitor</h1>
                    <p className="text-muted-foreground text-sm">Manage active agents and approve async actions.</p>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col shadow-sm">
                    <div className="p-4 border-b border-border bg-muted/30">
                        <h2 className="font-semibold text-foreground">Inbox</h2>
                    </div>
                    <div className="flex-1 overflow-hidden p-2">
                        <Inbox />
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col shadow-sm">
                    <div className="p-4 border-b border-border bg-muted/30">
                        <h2 className="font-semibold text-foreground">Agent Swarm</h2>
                    </div>
                    <div className="flex-1 overflow-hidden p-2">
                        <AgentMonitor />
                    </div>
                </div>
            </div>
        </div>
    );
};
