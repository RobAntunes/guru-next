import React from 'react';
import { cn } from '../../lib/utils';
import { Agent } from '../../types/control-room';
import { Bot, Circle, Users } from 'lucide-react';

interface AgentRosterProps {
    agents: Agent[];
    selectedAgentId: string | null;
    onSelectAgent: (id: string | null) => void;
}

export const AgentRoster = ({ agents, selectedAgentId, onSelectAgent }: AgentRosterProps) => {
    return (
        <div className="h-full flex flex-col border-r border-border bg-secondary/10 w-64">
            <div className="p-4 border-b border-border">
                <h2 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Roster
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {/* Broadcast Channel */}
                <button
                    onClick={() => onSelectAgent(null)}
                    className={cn(
                        "w-full text-left px-3 py-3 flex items-center space-x-3 border border-transparent transition-all hover:bg-secondary/50 group",
                        selectedAgentId === null ? "bg-secondary border-border" : ""
                    )}
                >
                    <div className="p-1.5 bg-foreground text-background rounded-none">
                        <Users className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-foreground group-hover:text-[var(--foreground-highlight)]">SWARM_ALL</div>
                        <div className="text-[10px] font-mono text-muted-foreground">Broadcast</div>
                    </div>
                </button>

                <div className="h-px bg-border/50 my-2 mx-2" />

                {/* Individual Agents */}
                {agents.map((agent) => (
                    <button
                        key={agent.id}
                        onClick={() => onSelectAgent(agent.id)}
                        className={cn(
                            "w-full text-left px-3 py-2 flex items-center space-x-3 border border-transparent transition-all hover:bg-secondary/50 group",
                            selectedAgentId === agent.id ? "bg-secondary border-border" : ""
                        )}
                    >
                        <div className="relative">
                            <div className="p-1.5 bg-secondary border border-border text-foreground">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className={cn(
                                "absolute -bottom-1 -right-1 w-2.5 h-2.5 border-2 border-background rounded-full",
                                agent.status === 'working' ? "bg-green-500 animate-pulse" :
                                    agent.status === 'error' ? "bg-red-500" :
                                        "bg-gray-500"
                            )} />
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-sm font-bold text-foreground truncate group-hover:text-[var(--foreground-highlight)]">
                                {agent.name}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground truncate">
                                {agent.status.toUpperCase()}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
