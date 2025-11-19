import React from 'react';
import { LayoutDashboard, Terminal, Network, Settings, MessageSquare, Database, Shield, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

import { ThemeToggle } from '../ThemeToggle';

export type Page = 'control-room' | 'chat' | 'workbench' | 'runtime' | 'governance' | 'knowledge' | 'settings';

interface SidebarProps {
    activePage: Page;
    onNavigate: (page: Page) => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
}

export const Sidebar = ({ activePage, onNavigate, collapsed, onToggleCollapse }: SidebarProps) => {
    const NavItem = ({ page, icon: Icon, label }: { page: Page; icon: any; label: string }) => (
        <button
            onClick={() => onNavigate(page)}
            className={cn(
                "w-full flex items-center space-x-3 px-3 py-2 rounded-none border-l-2 transition-all duration-200 group",
                activePage === page
                    ? "border-primary bg-secondary text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                collapsed && "justify-center px-0"
            )}
            title={collapsed ? label : undefined}
        >
            <Icon className={cn("w-4 h-4 shrink-0", activePage === page ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
            {!collapsed && <span className="font-medium text-sm tracking-tight truncate">{label}</span>}
        </button>
    );

    return (
        <div className={cn(
            "h-full bg-background border-r border-border flex flex-col z-50 transition-all duration-300 ease-in-out",
            collapsed ? "w-12" : "w-64"
        )}>
            <div className={cn("flex items-center mb-8 pt-4", collapsed ? "justify-center px-0" : "space-x-3 px-4")}>
                <div className="w-8 h-8 bg-primary rounded-none flex items-center justify-center shrink-0 cursor-pointer" onClick={onToggleCollapse}>
                    <span className="text-primary-foreground font-bold text-lg">G</span>
                </div>
                {!collapsed && (
                    <div className="overflow-hidden whitespace-nowrap">
                        <div className="font-bold text-foreground tracking-tight">Guru</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">AI Mission Control</div>
                    </div>
                )}
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                <div>
                    {!collapsed && <div className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-100 truncate">Overview</div>}
                    <div className="space-y-0">
                        <NavItem page="control-room" icon={LayoutDashboard} label="Console Home" />
                    </div>
                </div>

                <div>
                    {!collapsed && <div className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-100 truncate">Workbench</div>}
                    <div className="space-y-0">
                        <NavItem page="workbench" icon={Terminal} label="Code Workbench" />
                        <NavItem page="knowledge" icon={Database} label="Knowledge Bases" />
                    </div>
                </div>

                <div>
                    {!collapsed && <div className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-100 truncate">Governance</div>}
                    <div className="space-y-0">
                        <NavItem page="governance" icon={Shield} label="Governance Hub" />
                    </div>
                </div>

                <div>
                    {!collapsed && <div className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-100 truncate">Runtime</div>}
                    <div className="space-y-0">
                        <NavItem page="runtime" icon={Activity} label="Runtime Monitor" />
                    </div>
                </div>

                <div>
                    {!collapsed && <div className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-100 truncate">Communication</div>}
                    <div className="space-y-0">
                        <NavItem page="chat" icon={MessageSquare} label="Comms" />
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-border space-y-1">
                <div className={cn("flex", collapsed ? "justify-center" : "")}>
                    <ThemeToggle collapsed={collapsed} />
                </div>
                <button
                    onClick={() => onNavigate('settings')}
                    className={cn(
                        "w-full flex items-center space-x-3 px-3 py-2 rounded-none border-l-2 border-transparent transition-all duration-0 group",
                        activePage === 'settings'
                            ? "border-primary bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                        collapsed && "justify-center px-0"
                    )}
                    title={collapsed ? "Settings" : undefined}
                >
                    <Settings className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="font-medium text-sm tracking-tight">Settings</span>}
                </button>
            </div>
        </div>
    );
};
