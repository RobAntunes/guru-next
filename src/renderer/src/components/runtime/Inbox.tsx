import React from 'react';
import { AlertCircle, CheckCircle2, Clock, ShieldAlert, DollarSign, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';

type InboxItemType = 'SHADOW' | 'POLICY' | 'BUDGET' | 'CLARIFY';

interface InboxItem {
    id: string;
    type: InboxItemType;
    title: string;
    description: string;
    timestamp: string;
    status: 'pending' | 'approved' | 'rejected';
}

const mockItems: InboxItem[] = [
    {
        id: '1',
        type: 'SHADOW',
        title: 'Approve File Write',
        description: 'Agent requests to write to src/auth/login.ts',
        timestamp: '2m ago',
        status: 'pending',
    },
    {
        id: '2',
        type: 'POLICY',
        title: 'Network Access Request',
        description: 'Agent requests access to api.stripe.com',
        timestamp: '15m ago',
        status: 'pending',
    },
    {
        id: '3',
        type: 'BUDGET',
        title: 'Budget Warning',
        description: 'Task 4 will exceed $5.00 limit',
        timestamp: '1h ago',
        status: 'pending',
    },
    {
        id: '4',
        type: 'CLARIFY',
        title: 'Ambiguity Detected',
        description: 'I found two User models. Which one should I use?',
        timestamp: '2h ago',
        status: 'pending',
    },
];

const TypeIcon = ({ type }: { type: InboxItemType }) => {
    switch (type) {
        case 'SHADOW':
            return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        case 'POLICY':
            return <ShieldAlert className="w-4 h-4 text-amber-500" />;
        case 'BUDGET':
            return <DollarSign className="w-4 h-4 text-red-500" />;
        case 'CLARIFY':
            return <MessageSquare className="w-4 h-4 text-blue-500" />;
        default:
            return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
};

export const Inbox = () => {
    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inbox (4)</h3>
                <button className="text-xs text-primary hover:underline">Clear All</button>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                {mockItems.map((item) => (
                    <div
                        key={item.id}
                        className="group p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    >
                        <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center space-x-2">
                                <div className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                                    item.type === 'SHADOW' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                    item.type === 'POLICY' && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                                    item.type === 'BUDGET' && "bg-red-500/10 text-red-500 border-red-500/20",
                                    item.type === 'CLARIFY' && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                                )}>
                                    {item.type}
                                </div>
                                <span className="text-xs text-muted-foreground flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {item.timestamp}
                                </span>
                            </div>
                        </div>

                        <h4 className="text-sm font-medium text-foreground mb-1 group-hover:text-primary transition-colors">
                            {item.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};
