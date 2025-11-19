import React, { useState, useEffect } from 'react';
import { Wrench, Play, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export const ToolsPanel = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  const [result, setResult] = useState<{ tool: string; data: any; success: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    setLoading(true);
    try {
      const response = await (window as any).api.tools.list();
      if (response.success) {
        setTools(response.data);
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeTool = async (toolName: string, args: any) => {
    setExecuting(toolName);
    setResult(null);

    try {
      const response = await (window as any).api.tools.execute(toolName, args);
      setResult({
        tool: toolName,
        data: response.data,
        success: response.success
      });
    } catch (error: any) {
      setResult({
        tool: toolName,
        data: { error: error.message },
        success: false
      });
    } finally {
      setExecuting(null);
    }
  };

  const getCategoryFromToolName = (name: string): string => {
    if (name.includes('knowledge') || name.includes('document')) return 'Knowledge Base';
    if (name.includes('memory') || name.includes('conversation')) return 'Memory';
    if (name.includes('graph') || name.includes('node')) return 'State Graph';
    return 'Other';
  };

  const groupedTools = tools.reduce((acc, tool) => {
    const category = getCategoryFromToolName(tool.name);
    if (!acc[category]) acc[category] = [];
    acc[category].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-secondary/20">
        <div className="flex items-center space-x-3">
          <Wrench className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-bold text-foreground">AI Tools</h2>
            <p className="text-xs text-muted-foreground">
              Tools available for AI to manipulate knowledge and state
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-muted-foreground">Loading tools...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTools).map(([category, categoryTools]) => (
              <div key={category}>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryTools.map((tool) => (
                    <ToolCard
                      key={tool.name}
                      tool={tool}
                      isExpanded={expandedTool === tool.name}
                      isExecuting={executing === tool.name}
                      result={result?.tool === tool.name ? result : null}
                      onToggleExpand={() => setExpandedTool(
                        expandedTool === tool.name ? null : tool.name
                      )}
                      onExecute={(args) => executeTool(tool.name, args)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="p-3 border-t border-border bg-secondary/20 text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>{tools.length} tools available</span>
          {result && (
            <>
              <span>•</span>
              <span className={result.success ? 'text-green-500' : 'text-red-500'}>
                Last: {result.tool} {result.success ? '✓' : '✗'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface ToolCardProps {
  tool: Tool;
  isExpanded: boolean;
  isExecuting: boolean;
  result: { data: any; success: boolean } | null;
  onToggleExpand: () => void;
  onExecute: (args: any) => void;
}

const ToolCard = ({ tool, isExpanded, isExecuting, result, onToggleExpand, onExecute }: ToolCardProps) => {
  const [args, setArgs] = useState<Record<string, any>>({});

  const handleExecute = () => {
    const finalArgs: Record<string, any> = {};

    // Build args from parameters
    Object.keys(tool.parameters.properties).forEach(key => {
      if (args[key] !== undefined && args[key] !== '') {
        const prop = tool.parameters.properties[key];
        if (prop.type === 'number') {
          finalArgs[key] = Number(args[key]);
        } else if (prop.type === 'array') {
          finalArgs[key] = args[key].split(',').map((s: string) => s.trim());
        } else if (prop.type === 'object') {
          try {
            finalArgs[key] = JSON.parse(args[key]);
          } catch (e) {
            finalArgs[key] = args[key];
          }
        } else {
          finalArgs[key] = args[key];
        }
      }
    });

    onExecute(finalArgs);
  };

  return (
    <div className="border border-border bg-card">
      {/* Header */}
      <div
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-mono font-medium text-foreground truncate">
              {tool.name}
            </h4>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {tool.description}
            </p>
          </div>
        </div>
        {result && (
          result.success ? (
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 ml-2" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 ml-2" />
          )
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 border-t border-border bg-secondary/10">
          <div className="space-y-3">
            {/* Parameters */}
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-2">Parameters:</h5>
              <div className="space-y-2">
                {Object.entries(tool.parameters.properties).map(([key, prop]: [string, any]) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-foreground flex items-center space-x-1 mb-1">
                      <span>{key}</span>
                      {tool.parameters.required?.includes(key) && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder={prop.description || `Enter ${key}`}
                      value={args[key] || ''}
                      onChange={(e) => setArgs({ ...args, [key]: e.target.value })}
                      className="w-full px-2 py-1 text-xs bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {prop.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Execute Button */}
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              <span>{isExecuting ? 'Executing...' : 'Execute Tool'}</span>
            </button>

            {/* Result */}
            {result && (
              <div className={cn(
                'p-3 rounded text-xs font-mono',
                result.success
                  ? 'bg-green-900/20 text-green-200 border border-green-500/20'
                  : 'bg-red-900/20 text-red-200 border border-red-500/20'
              )}>
                <pre className="whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
