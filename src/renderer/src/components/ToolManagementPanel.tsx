import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wrench,
  Info,
  Settings,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Code,
  Brain,
  Sparkles,
  Database,
  FileText,
  Search,
  GitBranch,
  Layers,
  Zap,
  RefreshCw
} from 'lucide-react';

interface MCPTool {
  id: string;
  name: string;
  description: string;
  category: 'cognitive' | 'knowledge' | 'system' | 'analysis' | 'context' | 'memory' | 'task';
  enabled: boolean;
  status: 'active' | 'inactive' | 'error' | 'coming_soon';
  lastUsed?: Date;
  usageCount: number;
  capabilities: string[];
  examples: string[];
  phase?: 'current' | 'phase2' | 'phase3';
  releaseDate?: string;
}

interface ToolManagementPanelProps {
  onToolToggle?: (toolId: string, enabled: boolean) => void;
}

export const ToolManagementPanel: React.FC<ToolManagementPanelProps> = ({
  onToolToggle
}) => {
  const [tools, setTools] = useState<MCPTool[]>([
    // Current Phase Tools
    {
      id: 'guru_knowledge_synthesis',
      name: 'Knowledge Synthesis',
      description: 'Multi-stage pattern analysis and work generation from documents',
      category: 'cognitive',
      enabled: true,
      status: 'active',
      usageCount: 0,
      phase: 'current',
      capabilities: [
        'Pattern extraction using creative frameworks',
        'Feature and architecture generation',
        'Gap analysis and roadmap creation',
        'Cross-domain connection finding'
      ],
      examples: [
        '"Analyze my documents and suggest new features"',
        '"Find patterns across these research papers"',
        '"What opportunities exist in this codebase?"'
      ]
    },
    {
      id: 'guru_active_knowledge',
      name: 'Active Knowledge Access',
      description: 'Access only the documents users have toggled on',
      category: 'knowledge',
      enabled: true,
      status: 'active',
      usageCount: 0,
      phase: 'current',
      capabilities: [
        'List knowledge bases',
        'Access active documents only',
        'Navigate group structures',
        'Retrieve document content'
      ],
      examples: [
        '"What documents are currently active?"',
        '"Show me the active knowledge base structure"',
        '"Get content from my enabled documents"'
      ]
    },
    {
      id: 'guru_harmonic_analysis',
      name: 'Harmonic Analysis',
      description: 'Mathematical pattern detection in code and text',
      category: 'analysis',
      enabled: true,
      status: 'active',
      usageCount: 0,
      phase: 'current',
      capabilities: [
        'Signal processing for pattern detection',
        'Code structure analysis',
        'Rhythm and flow detection',
        'Architectural harmony assessment'
      ],
      examples: [
        '"Analyze the patterns in this code"',
        '"Find the rhythmic structure of this document"'
      ]
    },
    {
      id: 'guru_adaptive_learning',
      name: 'Adaptive Learning',
      description: 'Learn from interactions to improve responses',
      category: 'cognitive',
      enabled: true,
      status: 'active',
      usageCount: 0,
      phase: 'current',
      capabilities: [
        'Track successful patterns',
        'Optimize strategies over time',
        'Multi-armed bandit optimization',
        'Performance history tracking'
      ],
      examples: [
        '"Learn from our conversation patterns"',
        '"Optimize your approach based on feedback"'
      ]
    },
    // Phase 2 Tools
    {
      id: 'guru_spec_management',
      name: 'Core Spec Management',
      description: 'Manage system specifications, constraints, and architectural decisions',
      category: 'system',
      enabled: false,
      status: 'coming_soon',
      usageCount: 0,
      phase: 'phase2',
      releaseDate: 'Q1 2025',
      capabilities: [
        'Version-controlled spec storage',
        'API contract management',
        'Business rule enforcement',
        'Architectural decision records',
        'Immutable core knowledge'
      ],
      examples: [
        '"What are our API design principles?"',
        '"Show me the core business constraints"',
        '"Add new architectural decision"'
      ]
    },
    {
      id: 'guru_prompt_management',
      name: 'Prompt Engineering',
      description: 'Advanced prompt templates, chaining, and optimization',
      category: 'context',
      enabled: false,
      status: 'coming_soon',
      usageCount: 0,
      phase: 'phase2',
      releaseDate: 'Q1 2025',
      capabilities: [
        'Reusable prompt templates',
        'Variable injection system',
        'Multi-step prompt chains',
        'A/B testing framework',
        'Meta-prompt generation'
      ],
      examples: [
        '"Create a prompt template for code review"',
        '"Optimize this prompt for better results"',
        '"Chain these prompts together"'
      ]
    },
    {
      id: 'guru_living_tasks',
      name: 'Living Tasks',
      description: 'Tasks that evolve and adapt based on context and progress',
      category: 'task',
      enabled: false,
      status: 'coming_soon',
      usageCount: 0,
      phase: 'phase2',
      releaseDate: 'Q1 2025',
      capabilities: [
        'Dynamic task evolution',
        'Context-aware priority adjustment',
        'Progress-based refinement',
        'Task spawning and branching',
        'Learning from similar tasks'
      ],
      examples: [
        '"Create an adaptive task for optimization"',
        '"Show how this task has evolved"',
        '"Spawn subtasks based on findings"'
      ]
    },
    {
      id: 'guru_memory_management',
      name: 'Persistent Memory',
      description: 'Multi-layered memory system for true AI persistence',
      category: 'memory',
      enabled: false,
      status: 'coming_soon',
      usageCount: 0,
      phase: 'phase2',
      releaseDate: 'Q2 2025',
      capabilities: [
        'Working, short-term, and long-term memory',
        'Episodic and semantic memory types',
        'Memory consolidation and pruning',
        'Cross-session persistence',
        'Memory search and recall'
      ],
      examples: [
        '"Remember this solution for next time"',
        '"What did we learn last session?"',
        '"Search memories about React optimization"'
      ]
    },
    // Phase 3 Tools  
    {
      id: 'guru_semantic_router',
      name: 'Semantic Router',
      description: 'Intelligent query routing to appropriate knowledge domains',
      category: 'context',
      enabled: false,
      status: 'coming_soon',
      usageCount: 0,
      phase: 'phase3',
      releaseDate: 'Q2 2025',
      capabilities: [
        'Query intent detection',
        'Automatic tool selection',
        'Context-aware routing',
        'Domain expertise mapping',
        'Response strategy optimization'
      ],
      examples: [
        '"Route this query to the best tool"',
        '"What domain should handle this?"'
      ]
    },
    {
      id: 'guru_context_window',
      name: 'Context Window Manager',
      description: 'Visual token management and context optimization',
      category: 'context',
      enabled: false,
      status: 'coming_soon',
      usageCount: 0,
      phase: 'phase3',
      releaseDate: 'Q3 2025',
      capabilities: [
        'Real-time token counting',
        'Context pruning strategies',
        'Priority-based inclusion',
        'Context compression',
        'Dead context detection'
      ],
      examples: [
        '"Show me current context usage"',
        '"Optimize context for this query"',
        '"Prune unnecessary context"'
      ]
    },
    {
      id: 'guru_knowledge_graph_editor',
      name: 'Knowledge Graph Editor',
      description: 'Visual relationship builder for concepts and entities',
      category: 'knowledge',
      enabled: false,
      status: 'coming_soon',
      usageCount: 0,
      phase: 'phase3',
      releaseDate: 'Q3 2025',
      capabilities: [
        'Visual graph editing',
        'Custom entity types',
        'Relationship management',
        'Ontology design',
        'Graph-based reasoning'
      ],
      examples: [
        '"Show relationships between concepts"',
        '"Add new entity type"',
        '"Find reasoning path between X and Y"'
      ]
    }
  ]);

  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'current' | 'phase2' | 'phase3'>('all');
  const [showPhases, setShowPhases] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cognitive': return <Brain className="h-4 w-4" />;
      case 'knowledge': return <Database className="h-4 w-4" />;
      case 'analysis': return <Search className="h-4 w-4" />;
      case 'system': return <Settings className="h-4 w-4" />;
      case 'context': return <Layers className="h-4 w-4" />;
      case 'memory': return <Brain className="h-4 w-4" />;
      case 'task': return <CheckCircle className="h-4 w-4" />;
      default: return <Wrench className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'inactive': return <XCircle className="h-3 w-3 text-gray-500" />;
      case 'error': return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'coming_soon': return <Activity className="h-3 w-3 text-blue-500" />;
      default: return null;
    }
  };

  const filteredTools = tools.filter(tool => {
    // First apply enable/disable filter
    let passesEnableFilter = true;
    if (filter === 'enabled') passesEnableFilter = tool.enabled;
    if (filter === 'disabled') passesEnableFilter = !tool.enabled;
    
    // Then apply phase filter
    let passesPhaseFilter = true;
    if (phaseFilter !== 'all') {
      passesPhaseFilter = tool.phase === phaseFilter;
    }
    
    return passesEnableFilter && passesPhaseFilter;
  });

  const toggleTool = (toolId: string) => {
    setTools(prevTools => 
      prevTools.map(tool => 
        tool.id === toolId 
          ? { ...tool, enabled: !tool.enabled, status: !tool.enabled ? 'active' : 'inactive' }
          : tool
      )
    );
    
    const tool = tools.find(t => t.id === toolId);
    if (tool && onToolToggle) {
      onToolToggle(toolId, !tool.enabled);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">AI Tool Management</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPhases(!showPhases)}
            className="h-6 text-xs"
          >
            {showPhases ? 'Hide' : 'Show'} Roadmap
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Configure which tools are available to the AI assistant
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-2">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              All Tools ({tools.length})
            </TabsTrigger>
            <TabsTrigger value="enabled">
              Enabled ({tools.filter(t => t.enabled).length})
            </TabsTrigger>
            <TabsTrigger value="disabled">
              Disabled ({tools.filter(t => !t.enabled).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {showPhases && (
          <Tabs value={phaseFilter} onValueChange={(v) => setPhaseFilter(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Phases</TabsTrigger>
              <TabsTrigger value="current">
                Current ({tools.filter(t => t.phase === 'current').length})
              </TabsTrigger>
              <TabsTrigger value="phase2">
                Phase 2 ({tools.filter(t => t.phase === 'phase2').length})
              </TabsTrigger>
              <TabsTrigger value="phase3">
                Phase 3 ({tools.filter(t => t.phase === 'phase3').length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 gap-3 overflow-y-auto flex-1">
        {filteredTools.map(tool => (
          <Card 
            key={tool.id} 
            className={`cursor-pointer transition-all ${
              selectedTool?.id === tool.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedTool(tool)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 ${tool.enabled ? 'text-primary' : 'text-muted-foreground'}`}>
                    {getCategoryIcon(tool.category)}
                  </span>
                  <div>
                    <CardTitle className="text-sm font-normal flex items-center gap-2">
                      {tool.name}
                      {getStatusIcon(tool.status)}
                      {tool.phase && tool.phase !== 'current' && (
                        <Badge variant="outline" className="text-xs ml-1">
                          {tool.phase === 'phase2' ? 'Phase 2' : 'Phase 3'}
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tool.description}
                    </p>
                  </div>
                </div>
                {tool.status !== 'coming_soon' ? (
                  <Switch
                    checked={tool.enabled}
                    onCheckedChange={() => toggleTool(tool.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    {tool.releaseDate}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            {selectedTool?.id === tool.id && (
              <CardContent className="pt-0 space-y-3">
                {/* Capabilities */}
                <div>
                  <h4 className="text-xs font-medium mb-2">Capabilities</h4>
                  <ul className="space-y-1">
                    {tool.capabilities.map((cap, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                        <span className="text-primary mt-0.5">•</span>
                        {cap}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Example Prompts */}
                <div>
                  <h4 className="text-xs font-medium mb-2">Example Prompts</h4>
                  <div className="space-y-1">
                    {tool.examples.map((example, i) => (
                      <div key={i} className="text-xs bg-muted/50 p-2 rounded italic">
                        {example}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Category: {tool.category}</span>
                  {tool.status === 'coming_soon' ? (
                    <span>Coming in {tool.releaseDate}</span>
                  ) : (
                    <span>Used: {tool.usageCount} times</span>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Info Box */}
      <Card className="mt-4 bg-muted/30">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Info className="h-3 w-3 text-muted-foreground mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p>Tools provide specialized capabilities to the AI. Enable or disable them based on your needs.</p>
              <p className="mt-1">Disabled tools won't be accessible to the AI during conversations.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};