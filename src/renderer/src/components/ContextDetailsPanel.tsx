import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Folder,
  Wrench,
  Brain,
  Activity,
  Eye,
  EyeOff,
  Code,
  Info,
  ChevronRight,
  Copy,
  ExternalLink
} from 'lucide-react';
import { ContextNode } from '../services/context-graph-service';

interface ContextDetailsPanelProps {
  node: ContextNode | null;
  allNodes?: ContextNode[];
  onToggle?: (nodeId: string, active: boolean) => void;
  onClose?: () => void;
}

export const ContextDetailsPanel: React.FC<ContextDetailsPanelProps> = ({
  node,
  allNodes = [],
  onToggle,
  onClose
}) => {
  if (!node) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-normal flex items-center gap-2">
            <Info className="h-4 w-4" />
            Context Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-8">
            Click any node in the graph to view detailed information
          </p>
        </CardContent>
      </Card>
    );
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="h-4 w-4" />;
      case 'group': return <Folder className="h-4 w-4" />;
      case 'directory': return <Folder className="h-4 w-4" />;
      case 'tool': return <Wrench className="h-4 w-4" />;
      case 'memory': return <Brain className="h-4 w-4" />;
      case 'session': return <Activity className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'knowledge': return 'text-green-500';
      case 'filesystem': return 'text-blue-500';
      case 'tools': return 'text-purple-500';
      case 'memory': return 'text-orange-500';
      case 'session': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const parentNode = node.parent ? allNodes.find(n => n.id === node.parent) : null;
  const childNodes = node.children ? 
    node.children.map(childId => allNodes.find(n => n.id === childId)).filter(Boolean) : [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className={getCategoryColor(node.category)}>
              {getNodeIcon(node.type)}
            </span>
            <CardTitle className="text-sm font-normal">{node.label}</CardTitle>
          </div>
          {onClose && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {/* Status and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={node.active ? "default" : "secondary"} className="text-xs">
              {node.active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {node.type}
            </Badge>
            <Badge variant="outline" className={`text-xs ${getCategoryColor(node.category)}`}>
              {node.category}
            </Badge>
          </div>
          
          {onToggle && (node.type === 'document' || node.type === 'tool') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onToggle(node.id, !node.active)}
              className="h-7 text-xs"
            >
              {node.active ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
              Toggle
            </Button>
          )}
        </div>

        <Separator />

        {/* Metadata */}
        {node.metadata && Object.keys(node.metadata).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Properties</h4>
            <div className="space-y-1">
              {Object.entries(node.metadata).map(([key, value]) => {
                // Special formatting for document counts
                if (key === 'documentCount' && node.type === 'group') {
                  const activeCount = node.metadata?.activeDocumentCount || 0;
                  const directCount = node.metadata?.directDocumentCount || 0;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between items-start gap-2 text-xs">
                        <span className="text-muted-foreground">Total Documents:</span>
                        <span className="font-medium">{value as number}</span>
                      </div>
                      <div className="flex justify-between items-start gap-2 text-xs">
                        <span className="text-muted-foreground">Active Documents:</span>
                        <span className="font-medium text-green-500">{activeCount}</span>
                      </div>
                      {directCount !== value && (
                        <div className="flex justify-between items-start gap-2 text-xs">
                          <span className="text-muted-foreground">Direct Documents:</span>
                          <span>{directCount}</span>
                        </div>
                      )}
                    </div>
                  );
                }
                
                // Skip these as they're shown above
                if (key === 'activeDocumentCount' || key === 'directDocumentCount') {
                  return null;
                }
                
                return (
                  <div key={key} className="flex justify-between items-start gap-2 text-xs">
                    <span className="text-muted-foreground capitalize flex-shrink-0">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <span className="text-right break-all">
                      {typeof value === 'object' ? (
                        <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
                      ) : (
                        String(value)
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Relationships */}
        {(parentNode || childNodes.length > 0) && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Relationships</h4>
              
              {parentNode && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Parent:</p>
                  <div className="flex items-center gap-2 ml-2">
                    <span className={getCategoryColor(parentNode.category)}>
                      {getNodeIcon(parentNode.type)}
                    </span>
                    <span className="text-xs">{parentNode.label}</span>
                  </div>
                </div>
              )}
              
              {childNodes.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Children ({childNodes.length}):</p>
                  <div className="space-y-1 ml-2 max-h-32 overflow-y-auto">
                    {childNodes.map((child: any) => (
                      <div key={child.id} className="flex items-center gap-2">
                        <span className={getCategoryColor(child.category)}>
                          {getNodeIcon(child.type)}
                        </span>
                        <span className="text-xs">{child.label}</span>
                        {child.active !== undefined && (
                          <Badge variant={child.active ? "default" : "secondary"} className="text-xs h-4">
                            {child.active ? "✓" : "×"}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Special sections based on node type */}
        {node.type === 'document' && node.metadata && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Document Actions</h4>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Path
                </Button>
              </div>
            </div>
          </>
        )}

        {node.type === 'tool' && node.metadata?.description && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Tool Description</h4>
              <p className="text-xs">{node.metadata.description}</p>
            </div>
          </>
        )}

        {node.category === 'memory' && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Learning Insights</h4>
              <p className="text-xs text-muted-foreground">
                This node represents learned patterns and insights from user interactions.
                The AI uses this information to improve responses and suggestions.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};