import React from 'react';
import { Activity, ArrowRight, Terminal, Zap, Radio, Cpu, Network } from 'lucide-react';
import { cn } from '../lib/utils';
import { TechCard } from '../components/ui/TechCard';
import { useControlRoom } from '../hooks/useControlRoom';
import { Page } from '../components/sidebar/Sidebar';

interface ControlRoomPageProps {
    onNavigate?: (page: Page) => void;
}

export const ControlRoomPage = ({ onNavigate }: ControlRoomPageProps) => {
    const { metrics, logs } = useControlRoom();

    return (
        <div className="h-full w-full p-8 overflow-y-auto relative">
            <div className="max-w-7xl mx-auto space-y-10 relative z-10">

                {/* Header Section */}
                <div className="flex items-end justify-between border-b border-border pb-6">
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <div className={cn("w-2 h-2 rounded-full animate-pulse", metrics.isSystemOnline ? "bg-green-500" : "bg-red-500")} />
                            <span className="text-xs font-mono text-foreground uppercase tracking-[0.2em]">
                                {metrics.isSystemOnline ? "System Online" : "System Offline"}
                            </span>
                        </div>
                        <h1 className="text-5xl font-bold text-[var(--foreground-highlight)] tracking-tighter font-sans">
                            CONTROL ROOM
                        </h1>
                    </div>
                    <div className="text-right hidden md:block">
                        <div className="text-xs font-mono text-foreground mb-1">UPLINK ESTABLISHED</div>
                        <div className="text-sm font-mono text-[var(--foreground-highlight)]">LATENCY: {metrics.latency}ms</div>
                    </div>
                </div>

                {/* KPI Grid - Massive Numbers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <TechCard className="bg-secondary/20 border-border/50">
                        <div className="flex justify-between items-start mb-8">
                            <Cpu className="w-5 h-5 text-foreground" />
                            <span className="text-[10px] font-mono uppercase border border-border px-1 text-foreground">Active Agents</span>
                        </div>
                        <div className="text-6xl font-bold text-[var(--foreground-highlight)] tracking-tighter mb-2">
                            {metrics.activeAgents}
                        </div>
                        <div className="h-1 w-full bg-border mt-4 overflow-hidden">
                            <div className="h-full bg-[var(--foreground-highlight)] w-[40%] animate-pulse" />
                        </div>
                    </TechCard>

                    <TechCard className="bg-secondary/20 border-border/50">
                        <div className="flex justify-between items-start mb-8">
                            <Zap className="w-5 h-5 text-foreground" />
                            <span className="text-[10px] font-mono uppercase border border-border px-1 text-foreground">Events / 10m</span>
                        </div>
                        <div className="text-6xl font-bold text-[var(--foreground-highlight)] tracking-tighter mb-2">
                            {metrics.eventsPerMinute}
                        </div>
                        <div className="flex space-x-1 mt-4">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className={cn("h-1 flex-1 bg-border", i < (metrics.eventsPerMinute / 20) && "bg-[var(--foreground-highlight)]")} />
                            ))}
                        </div>
                    </TechCard>

                    <TechCard className="bg-secondary/20 border-border/50">
                        <div className="flex justify-between items-start mb-8">
                            <Radio className="w-5 h-5 text-foreground" />
                            <span className="text-[10px] font-mono uppercase border border-border px-1 text-foreground">Incidents</span>
                        </div>
                        <div className="text-6xl font-bold text-[var(--foreground-highlight)] tracking-tighter mb-2">
                            {metrics.openIncidents.toString().padStart(2, '0')}
                        </div>
                        {metrics.openIncidents > 0 && (
                            <div className="mt-4 text-xs font-mono text-red-400 flex items-center">
                                <Activity className="w-3 h-3 mr-2 animate-bounce" />
                                ATTENTION REQUIRED
                            </div>
                        )}
                    </TechCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Workspace Area */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center space-x-4">
                            <h3 className="text-sm font-mono text-foreground uppercase tracking-widest">/// Workspaces</h3>
                            <div className="h-[1px] flex-1 bg-border" />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <TechCard className="group" onClick={() => onNavigate?.('workbench')}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-secondary text-[var(--foreground-highlight)]">
                                            <Terminal className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-[var(--foreground-highlight)]">Code Workbench</h3>
                                            <p className="text-xs font-mono text-foreground">/src/renderer/modules/core</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-foreground group-hover:translate-x-1 transition-transform" />
                                </div>
                                <div className="flex space-x-2 mt-4">
                                    <span className="text-[10px] font-mono bg-secondary px-2 py-1 text-foreground border border-border">limits.ts</span>
                                    <span className="text-[10px] font-mono bg-secondary px-2 py-1 text-foreground border border-border">auth.ts</span>
                                </div>
                            </TechCard>

                            <TechCard className="group" onClick={() => onNavigate?.('runtime')}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-secondary text-[var(--foreground-highlight)]">
                                            <Network className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-[var(--foreground-highlight)]">Runtime Monitor</h3>
                                            <p className="text-xs font-mono text-foreground">/cluster/eu-west-1</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-foreground group-hover:translate-x-1 transition-transform" />
                                </div>
                                <div className="flex space-x-2 mt-4">
                                    <span className="text-[10px] font-mono bg-secondary px-2 py-1 text-foreground border border-border">Live Stream</span>
                                    <span className="text-[10px] font-mono bg-secondary px-2 py-1 text-foreground border border-border">Logs</span>
                                </div>
                            </TechCard>
                        </div>
                    </div>

                    {/* Feed / Log */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-4">
                            <h3 className="text-sm font-mono text-foreground uppercase tracking-widest">/// System Log</h3>
                            <div className="h-[1px] flex-1 bg-border" />
                        </div>

                        <div className="bg-card border border-border p-0 max-h-[400px] overflow-y-scroll relative">
                            {/* Fade overlay at bottom */}
                            <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-card to-transparent pointer-events-none" />

                            {logs.map((item) => (
                                <div key={item.id} className="p-4 border-b border-border hover:bg-secondary/30 transition-colors cursor-pointer group animate-fade-in">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={cn(
                                            "text-[10px] font-bold px-1.5 py-0.5 border",
                                            item.level === 'WARN' ? 'border-yellow-900 text-yellow-600' :
                                                item.level === 'ERR' ? 'border-red-900 text-red-600' :
                                                    item.level === 'SUCCESS' ? 'border-green-900 text-green-600' :
                                                        'border-border text-foreground'
                                        )}>{item.level}</span>
                                        <span className="text-[10px] font-mono text-foreground/50">
                                            {new Date(item.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="text-sm font-mono text-[var(--foreground-highlight)] mb-1">{item.source}</div>
                                    <div className="text-xs text-foreground font-light">{item.message}</div>
                                </div>
                            ))}

                            {logs.length === 0 && (
                                <div className="p-8 text-center text-xs text-foreground/50 font-mono">
                                    WAITING FOR SIGNAL...
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
