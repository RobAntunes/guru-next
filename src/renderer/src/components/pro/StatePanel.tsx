/**
 * State Panel - Show active conversation state
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { GitBranch, Target, Shield, Clock } from 'lucide-react';
import { conversationState } from '../../services/pro/conversation-state';

export function StatePanel() {
  const state = conversationState.getState();
  const tokens = conversationState.estimateTokens();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Conversation State
        </CardTitle>
        <div className="text-xs text-slate-500">~{tokens} tokens</div>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.goal && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4" />
              Goal
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{state.goal}</p>
          </div>
        )}

        {state.constraints.filter(c => c.active).length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4" />
              Constraints ({state.constraints.filter(c => c.active).length})
            </div>
            <div className="space-y-1">
              {state.constraints.filter(c => c.active).map(c => (
                <div key={c.id} className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded">
                  <strong>{c.label}:</strong> {c.value}
                  {c.source === 'spec' && <span className="text-slate-500 ml-1">(spec)</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {state.history.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Recent Actions
            </div>
            <div className="space-y-1">
              {state.history.slice(-3).map((h, i) => (
                <div key={i} className="text-xs flex items-start gap-2">
                  <span>{h.result === 'success' ? '✓' : '✗'}</span>
                  <span className="flex-1">{h.summary}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
