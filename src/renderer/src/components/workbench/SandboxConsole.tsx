import React from 'react';
import { AlertCircle, CheckCircle2, FileText, Shield, Terminal } from 'lucide-react';

export const SandboxConsole = () => {
    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last run</h3>
                <span className="px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-mono">shadow-only</span>
            </div>

            <div className="p-4 space-y-3">
                <div className="flex items-start space-x-3 text-sm">
                    <div className="mt-0.5">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-muted-foreground">
                        <span className="font-bold text-foreground">3 filesystem writes</span> intercepted by Limbo.
                    </div>
                </div>

                <div className="flex items-start space-x-3 text-sm">
                    <div className="mt-0.5">
                        <Shield className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-muted-foreground">
                        <span className="font-bold text-foreground">1 network call</span> blocked by egress policy.
                    </div>
                </div>

                <div className="flex items-start space-x-3 text-sm">
                    <div className="mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-muted-foreground">
                        <span className="font-bold text-foreground">Runbook artifact</span> generated in sandbox.
                    </div>
                </div>
            </div>
        </div>
    );
};
