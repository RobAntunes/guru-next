import React, { useState, useEffect } from 'react';
import { Database, Activity, Zap, DollarSign } from 'lucide-react';

interface StatusBarProps {
  nodeCount?: number;
  memoryUsage?: number;
  tokensPerSession?: number;
  estimatedCost?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  nodeCount = 0,
  memoryUsage = 0,
  tokensPerSession = 0,
  estimatedCost = 0
}) => {
  return (
    <div className="h-10 bg-card border-t border-border flex items-center justify-between px-4 text-xs">
      {/* Left side metrics */}
      <div className="flex items-center gap-6">
        {/* Node Count */}
        <div className="flex items-center gap-2">
          <Database className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">
            {nodeCount.toLocaleString()} nodes
          </span>
        </div>

        {/* Memory Coverage */}
        <div className="flex items-center gap-2">
          <Activity className="h-3 w-3 text-primary" />
          <span className="text-muted-foreground">
            Memory coverage: <span className="text-primary font-medium">{memoryUsage}%</span>
          </span>
        </div>
      </div>

      {/* Right side metrics */}
      <div className="flex items-center gap-6">
        {/* Tokens per session */}
        <div className="flex items-center gap-2">
          <Zap className="h-3 w-3 text-foreground/70" />
          <span className="text-muted-foreground">
            Tokens / session: <span className="text-foreground font-medium">{tokensPerSession.toLocaleString()}k</span>
          </span>
        </div>

        {/* Estimated Cost */}
        <div className="flex items-center gap-2">
          <DollarSign className="h-3 w-3 text-primary" />
          <span className="text-muted-foreground">
            Est. cost: <span className="text-foreground font-medium">${estimatedCost.toFixed(2)}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
