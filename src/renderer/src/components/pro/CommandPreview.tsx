/**
 * Command Preview - Review bash commands before execution
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Terminal, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { PendingCommand } from '../../../../shared/types/task';

interface CommandPreviewProps {
  commands: PendingCommand[];
  onApprove?: (command: string) => void;
  onReject?: (command: string) => void;
}

export function CommandPreview({ commands, onApprove, onReject }: CommandPreviewProps) {
  const getRiskIcon = (risk: 'safe' | 'warning' | 'danger') => {
    switch (risk) {
      case 'safe': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'danger': return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Commands to Run ({commands.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {commands.map((cmd, i) => (
          <div key={i} className={`border rounded-lg p-3 ${
            cmd.risk === 'danger' ? 'border-red-300 bg-red-50 dark:bg-red-950/20' :
            cmd.risk === 'warning' ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20' :
            'border-slate-300 bg-slate-50 dark:bg-slate-900'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {getRiskIcon(cmd.risk)}
                  <code className="text-sm font-mono">{cmd.command}</code>
                </div>
                {cmd.reason && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">{cmd.reason}</p>
                )}
                {cmd.violatesSpec && (
                  <p className="text-xs text-red-600">⚠️ Violates spec: {cmd.violatesSpec}</p>
                )}
              </div>
              <div className="flex gap-2">
                {onApprove && (
                  <Button size="sm" variant="outline" onClick={() => onApprove(cmd.command)}>
                    Run
                  </Button>
                )}
                {onReject && (
                  <Button size="sm" variant="ghost" onClick={() => onReject(cmd.command)}>
                    Skip
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
