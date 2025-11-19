import React from 'react';
import { Inbox } from '../runtime/Inbox';
import { AgentMonitor } from '../runtime/AgentMonitor';

export const RightPanel = () => {
    return (
        <div className="h-full w-full bg-sidebar border-l border-border flex flex-col">
            <div className="flex-1 p-4 border-b border-border overflow-hidden">
                <Inbox />
            </div>
            <div className="flex-1 p-4 overflow-hidden">
                <AgentMonitor />
            </div>
        </div>
    );
};
