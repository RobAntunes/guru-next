import React from 'react';
import { Shield, Lock, FileCode, AlertTriangle, CheckCircle2, Plus } from 'lucide-react';

export const GovernancePage = () => {
    return (
        <div className="h-full w-full bg-background p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Governance Hub</h1>
                    <p className="text-muted-foreground text-lg font-light">
                        Define the safety boundaries for your agent swarms. Liners intercept every action.
                    </p>
                </div>

                {/* Active Policies */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-card border border-border rounded-none p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-secondary rounded-none border border-border text-foreground">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <h3 className="font-semibold text-foreground tracking-tight">Active Liners</h3>
                            </div>
                            <span className="text-2xl font-bold text-foreground tracking-tight">12</span>
                        </div>
                        <p className="text-sm text-muted-foreground font-light">
                            Composable middleware functions enforcing safety on every system call.
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-none p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-secondary rounded-none border border-border text-foreground">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <h3 className="font-semibold text-foreground tracking-tight">Interventions</h3>
                            </div>
                            <span className="text-2xl font-bold text-foreground tracking-tight">3</span>
                        </div>
                        <p className="text-sm text-muted-foreground font-light">
                            Actions blocked or flagged for review in the last 24 hours.
                        </p>
                    </div>
                </div>

                {/* Liner Stack */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-foreground tracking-tight">Liner Stack</h2>
                        <button className="px-4 py-2 rounded-none border border-border hover:bg-secondary transition-colors flex items-center text-sm font-medium text-foreground">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Policy
                        </button>
                    </div>

                    <div className="bg-card border border-border rounded-none overflow-hidden divide-y divide-border">
                        {/* Liner Item 1 */}
                        <div className="p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors group">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-secondary rounded-none border border-border text-muted-foreground group-hover:text-foreground">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-foreground">Secret Redaction</h4>
                                    <p className="text-xs text-muted-foreground font-light">Redacts API keys and tokens from logs and diffs.</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <span className="px-2 py-1 rounded-none border border-border bg-secondary text-foreground text-xs font-medium">Enforced</span>
                                <div className="w-10 h-5 bg-foreground rounded-full relative cursor-pointer">
                                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-background rounded-full border border-border"></div>
                                </div>
                            </div>
                        </div>

                        {/* Liner Item 2 */}
                        <div className="p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors group">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-secondary rounded-none border border-border text-muted-foreground group-hover:text-foreground">
                                    <FileCode className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-foreground">Path Allowlist</h4>
                                    <p className="text-xs text-muted-foreground font-light">Restricts file writes to /src and /docs only.</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <span className="px-2 py-1 rounded-none border border-border bg-secondary text-foreground text-xs font-medium">Enforced</span>
                                <div className="w-10 h-5 bg-foreground rounded-full relative cursor-pointer">
                                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-background rounded-full border border-border"></div>
                                </div>
                            </div>
                        </div>

                        {/* Liner Item 3 */}
                        <div className="p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors group">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-secondary rounded-none border border-border text-muted-foreground group-hover:text-foreground">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-foreground">Human Approval (Limbo)</h4>
                                    <p className="text-xs text-muted-foreground font-light">Requires operator approval for all destructive actions.</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <span className="px-2 py-1 rounded-none border border-border bg-secondary text-foreground text-xs font-medium">Enforced</span>
                                <div className="w-10 h-5 bg-foreground rounded-full relative cursor-pointer">
                                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-background rounded-full border border-border"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
