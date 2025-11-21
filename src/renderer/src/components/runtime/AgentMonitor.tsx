import React, { useEffect, useState } from 'react';
import { Bot, Terminal, HardDrive, Activity, Play, Pause, RefreshCw, AlertTriangle } from 'lucide-react';
import { happenService, AgentState } from '../../services/happen-service';

export const AgentMonitor = () => {
    const [agents, setAgents] = useState<AgentState[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchAgents = async () => {
        setIsLoading(true);
        try {
            const data = await happenService.listAgents();
            // If no agents returned (e.g. NATS not running), use fallback for UI demo
            if (data.length === 0) {
                // Keep existing mock if real fetch fails/returns empty in dev
                // setAgents(mockAgents); 
            } else {
                setAgents(data);
            }
        } catch (error) {
            console.error('Failed to fetch agents:', error);
        } finally {
            setIsLoading(false);
            setLastUpdated(new Date());
        }
    };

    useEffect(() => {
        fetchAgents();
        // Poll every 2 seconds
        const interval = setInterval(fetchAgents, 2000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'active': return 'bg-emerald-500 animate-pulse';
            case 'waiting_approval': return 'bg-amber-500 animate-bounce';
            case 'error': return 'bg-red-500';
            default: return 'bg-gray-400';
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Swarm</h3>
                <div className="flex items-center space-x-2">
                     {isLoading && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
                    <div className="flex items-center space-x-1 text-xs text-emerald-500">
                        <Activity className="w-3 h-3 animate-pulse" />
                        <span>Running</span>
                    </div>
                </div>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                {agents.length === 0 ? (
                    <div className="text-center p-4 text-muted-foreground text-xs">
                        No active agents detected. Ensure NATS is running.
                    </div>
                ) : (
                    agents.map((agent) => (
                        <div key={agent.id} className={`p-3 rounded-lg bg-card border ${agent.status === 'waiting_approval' ? 'border-amber-500/50 bg-amber-500/5' : 'border-border'} shadow-sm`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                                        <Bot className="w-3.5 h-3.5 text-primary" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-foreground">{agent.name}</div>
                                        <div className="text-[10px] text-muted-foreground">{agent.role}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                     <span className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                                     <span className={`text-[10px] capitalize ${agent.status === 'waiting_approval' ? 'text-amber-500 font-bold' : 'text-muted-foreground'}`}>
                                         {agent.status === 'waiting_approval' ? 'Needs Approval' : agent.status}
                                     </span>
                                </div>
                            </div>

                            <div className="mb-2">
                                <div className="text-[10px] text-muted-foreground mb-1">Current Task:</div>
                                <div className="text-xs text-foreground font-medium truncate">
                                    {agent.currentTask || "Idle - Waiting for instructions"}
                                </div>
                            </div>
                            
                            {agent.status === 'waiting_approval' && (
                                <div className="mb-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-200 flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Agent halted. Go to Workbench to approve action.</span>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-1">
                                {agent.tools.map((tool) => (
                                    <span key={tool} className="px-1.5 py-0.5 rounded-sm bg-muted text-[10px] text-muted-foreground border border-border flex items-center">
                                        <Terminal className="w-2.5 h-2.5 mr-1" />
                                        {tool}
                                    </span>
                                ))}
                            </div>
                            
                            {agent.budget && (
                                <div className="mt-2 w-full bg-muted/50 h-1 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary/50 rounded-full"
                                        style={{ width: `${(agent.budget.used / agent.budget.limit) * 100}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
