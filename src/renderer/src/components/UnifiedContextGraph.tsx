import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Folder, 
  Wrench, 
  Brain, 
  Activity,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Info,
  FolderOpen
} from 'lucide-react';
import * as d3 from 'd3';
import { contextGraphService, ContextNode, ContextEdge, ContextGraphData } from '../services/context-graph-service';
import { ContextDetailsPanel } from './ContextDetailsPanel';

interface UnifiedContextGraphProps {
  knowledgeGroups?: any[];
  onToggleNode?: (nodeId: string, active: boolean) => void;
}

export const UnifiedContextGraph: React.FC<UnifiedContextGraphProps> = ({
  knowledgeGroups = [],
  onToggleNode
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<ContextGraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<ContextNode | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['knowledge', 'filesystem', 'tools', 'memory', 'session', 'specs'])
  );
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Subscribe to graph updates
    const handleGraphUpdate = (data: ContextGraphData) => {
      setGraphData(data);
    };

    contextGraphService.on('graphUpdated', handleGraphUpdate);

    // Update knowledge nodes
    if (knowledgeGroups.length > 0) {
      contextGraphService.updateKnowledgeNodes(knowledgeGroups);
    }

    // Update file system context with project structure
    contextGraphService.updateFileSystemContext({
      rootPath: './my-project',
      allowedPaths: ['./src', './docs', './config', './tests'],
      fileCount: 247,
      totalSize: 3.8 * 1024 * 1024,
      fileTypes: { '.ts': 82, '.tsx': 54, '.json': 18, '.md': 45, '.css': 28, '.py': 20 }
    });

    contextGraphService.updateToolContext({
      availableTools: [
        { id: 'code-search', name: 'Code Search', description: 'Semantic code search', enabled: true, category: 'development' },
        { id: 'refactor', name: 'Refactoring', description: 'AI-powered refactoring', enabled: true, category: 'development' },
        { id: 'docs-gen', name: 'Doc Generator', description: 'Generate documentation', enabled: true, category: 'documentation' },
        { id: 'test-gen', name: 'Test Generator', description: 'Generate unit tests', enabled: false, category: 'testing' },
        { id: 'analyzer', name: 'Code Analyzer', description: 'Static analysis', enabled: true, category: 'development' }
      ],
      activeToolCount: 4
    });

    // Load real memory stats
    const loadMemoryStats = async () => {
      try {
        const stats = await (window as any).api?.memory?.getStats();
        if (stats) {
          contextGraphService.updateMemoryContext({
            patterns: stats.patterns || 0,
            insights: stats.insights || 0,
            interactions: stats.memories || 0,
            lastUpdated: new Date()
          });
        }
      } catch (error) {
        console.error('Failed to load memory stats:', error);
        // Fallback to default values
        contextGraphService.updateMemoryContext({
          patterns: 0,
          insights: 0,
          interactions: 0,
          lastUpdated: new Date()
        });
      }
    };
    
    loadMemoryStats();

    contextGraphService.updateSessionContext({
      activeSessions: [
        { id: 'dev-1', type: 'Development', startTime: new Date(), status: 'active' },
        { id: 'review-1', type: 'Code Review', startTime: new Date(), status: 'active' }
      ],
      conversationLength: 67,
      contextTokens: 12584
    });

    // Get initial data
    setGraphData(contextGraphService.getGraphData());

    return () => {
      contextGraphService.off('graphUpdated', handleGraphUpdate);
    };
  }, [knowledgeGroups]);

  // Add resize observer to handle container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0 && !isInitialized) {
          setIsInitialized(true);
          // Force re-render with proper dimensions
          setGraphData(contextGraphService.getGraphData());
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isInitialized]);

  useEffect(() => {
    if (!svgRef.current || !graphData) return;

    // Ensure SVG has dimensions
    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || svgRef.current.clientWidth || 800;
    const height = rect.height || svgRef.current.clientHeight || 600;
    
    // Force a reflow if dimensions are 0
    if (width === 0 || height === 0) {
      setTimeout(() => {
        if (svgRef.current) {
          const newRect = svgRef.current.getBoundingClientRect();
          if (newRect.width > 0 && newRect.height > 0) {
            // Re-trigger the effect with proper dimensions
            setGraphData(contextGraphService.getGraphData());
          }
        }
      }, 100);
      return;
    }

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const g = svg.append('g');

    // Add zoom behavior with proper typing
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom as any);

    // Create proper node hierarchy and add cross-references
    const nodeMap = new Map(graphData.nodes.map(n => [n.id, n]));
    
    // Create additional edges for relationships
    const enhancedEdges = [...graphData.edges];
    
    // Add edges between documents in same group
    const groupDocuments = new Map<string, string[]>();
    graphData.nodes.forEach(node => {
      if (node.type === 'document' && node.parent) {
        if (!groupDocuments.has(node.parent)) {
          groupDocuments.set(node.parent, []);
        }
        groupDocuments.get(node.parent)!.push(node.id);
      }
    });
    
    // Add edges between active tools and document groups
    const activeTools = graphData.nodes.filter(n => n.type === 'tool' && n.active);
    const documentGroups = graphData.nodes.filter(n => n.type === 'group');
    activeTools.forEach(tool => {
      documentGroups.forEach(group => {
        if (tool.id.includes('synthesis') || tool.id.includes('knowledge')) {
          enhancedEdges.push({
            id: `${tool.id}-${group.id}-ref`,
            source: tool.id,
            target: group.id,
            type: 'uses'
          });
        }
      });
    });
    
    // Use force simulation for all nodes
    const simulation = d3.forceSimulation(graphData.nodes as any)
      .force('link', d3.forceLink(enhancedEdges)
        .id((d: any) => d.id)
        .distance(d => d.type === 'contains' ? 50 : 100)
        .strength(d => d.type === 'contains' ? 1 : 0.3))
      .force('charge', d3.forceManyBody()
        .strength(d => {
          const node = d as any;
          if (node.type === 'group') return -400;
          if (node.type === 'directory') return -300;
          return -200;
        }))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => {
        const node = d as any;
        return getNodeRadius(node) + 10;
      }));

    // Draw edges with different styles
    const link = g.append('g')
      .selectAll('line')
      .data(enhancedEdges)
      .enter()
      .append('line')
      .attr('stroke', d => {
        switch(d.type) {
          case 'uses': return '#8b5cf6';
          case 'inherits': return '#06b6d4';
          case 'relates_to': return '#10b981';
          default: return '#4a5568';
        }
      })
      .attr('stroke-opacity', d => {
        switch(d.type) {
          case 'uses': return 0.2;
          case 'inherits': return 0.6;
          case 'relates_to': return 0.3;
          default: return 0.4;
        }
      })
      .attr('stroke-width', d => {
        switch(d.type) {
          case 'inherits': return 2;
          case 'relates_to': return 1.5;
          case 'uses': return 1;
          default: return 2;
        }
      })
      .attr('stroke-dasharray', d => {
        switch(d.type) {
          case 'uses': return '5,5';
          case 'relates_to': return '3,3';
          default: return 'none';
        }
      });

    // Create node groups
    const nodeGroup = g.append('g')
      .selectAll('g')
      .data(graphData.nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d);
      });

    // Add node circles
    nodeGroup.append('circle')
      .attr('r', d => getNodeRadius(d))
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', d => d.active ? '#3b82f6' : '#6b7280')
      .attr('stroke-width', d => d.active ? 2 : 1)
      .attr('opacity', d => d.active ? 1 : 0.5);

    // Add node icons
    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '14px')
      .attr('fill', 'white')
      .text(d => getNodeIcon(d));

    // Add node labels
    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', d => getNodeRadius(d) + 15)
      .attr('font-size', '10px')
      .attr('fill', '#e5e7eb')
      .text(d => {
        if (d.type === 'group' && d.metadata?.documentCount !== undefined) {
          const activeCount = d.metadata.activeDocumentCount || 0;
          const totalCount = d.metadata.documentCount || 0;
          return `${d.label} (${activeCount}/${totalCount})`;
        }
        return d.label;
      })
      .each(function(d) {
        const text = d3.select(this);
        const textContent = text.text();
        const words = textContent.split(/\s+/);
        if (words.length > 3 && d.type !== 'group') {
          text.text(words.slice(0, 2).join(' ') + '...');
        }
      });

    // Position nodes based on category with better spacing
    const categoryPositions: Record<string, { x: number, y: number }> = {
      knowledge: { x: width * 0.2, y: height * 0.25 },
      specs: { x: width * 0.5, y: height * 0.25 },
      filesystem: { x: width * 0.8, y: height * 0.25 },
      tools: { x: width * 0.2, y: height * 0.75 },
      memory: { x: width * 0.5, y: height * 0.75 },
      session: { x: width * 0.8, y: height * 0.75 }
    };

    // Initialize positions for category roots
    graphData.nodes.forEach((node: any) => {
      const pos = categoryPositions[node.category];
      if (pos && (node.id.endsWith('-root') || (!node.parent && node.type === 'group'))) {
        node.fx = pos.x + (Math.random() - 0.5) * 50;
        node.fy = pos.y + (Math.random() - 0.5) * 50;
      }
    });

    // Update positions
    simulation.on('tick', () => {
      nodeGroup.attr('transform', d => `translate(${(d as any).x || 0},${(d as any).y || 0})`);

      link
        .attr('x1', d => {
          const source = typeof d.source === 'string' 
            ? nodeMap.get(d.source) as any
            : d.source as any;
          return source?.x || 0;
        })
        .attr('y1', d => {
          const source = typeof d.source === 'string'
            ? nodeMap.get(d.source) as any
            : d.source as any;
          return source?.y || 0;
        })
        .attr('x2', d => {
          const target = typeof d.target === 'string'
            ? nodeMap.get(d.target) as any
            : d.target as any;
          return target?.x || 0;
        })
        .attr('y2', d => {
          const target = typeof d.target === 'string'
            ? nodeMap.get(d.target) as any
            : d.target as any;
          return target?.y || 0;
        });
    });

    // Speed up the initial simulation
    simulation.alpha(1).restart();
    
    // Run simulation synchronously for a few ticks to get initial positions
    for (let i = 0; i < 50; i++) {
      simulation.tick();
    }
    
    // Apply initial positions immediately
    nodeGroup.attr('transform', d => `translate(${(d as any).x || 0},${(d as any).y || 0})`);
    link
      .attr('x1', d => {
        const source = typeof d.source === 'string' 
          ? nodeMap.get(d.source) as any
          : d.source as any;
        return source?.x || 0;
      })
      .attr('y1', d => {
        const source = typeof d.source === 'string'
          ? nodeMap.get(d.source) as any
          : d.source as any;
        return source?.y || 0;
      })
      .attr('x2', d => {
        const target = typeof d.target === 'string'
          ? nodeMap.get(d.target) as any
          : d.target as any;
        return target?.x || 0;
      })
      .attr('y2', d => {
        const target = typeof d.target === 'string'
          ? nodeMap.get(d.target) as any
          : d.target as any;
        return target?.y || 0;
      });

    // Center and zoom to fit after initial layout
    const centerAndZoom = () => {
      const bounds = g.node()?.getBBox();
      if (bounds && bounds.width > 0 && bounds.height > 0) {
        const fullWidth = bounds.width;
        const fullHeight = bounds.height;
        const midX = bounds.x + fullWidth / 2;
        const midY = bounds.y + fullHeight / 2;
        
        const scale = 0.8 / Math.max(fullWidth / width, fullHeight / height);
        const translate = [width / 2 - scale * midX, height / 2 - scale * midY];
        
        svg.transition()
          .duration(750)
          .call(
            zoom.transform as any,
            d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
          );
      }
    };
    
    // Center immediately and again after simulation settles
    centerAndZoom();
    setTimeout(centerAndZoom, 300);

  }, [graphData, onToggleNode]);

  const getNodeRadius = (node: ContextNode): number => {
    switch (node.type) {
      case 'group': return 20;
      case 'directory': return 18;
      case 'spec': return 16;
      case 'tool': return 16;
      case 'memory': return 16;
      case 'session': return 14;
      default: return 12;
    }
  };

  const getNodeColor = (node: ContextNode): string => {
    if (!node.active) return '#4b5563'; // Gray for inactive

    switch (node.category) {
      case 'knowledge': return '#10b981'; // Green
      case 'specs': return '#06b6d4'; // Cyan
      case 'filesystem': return '#3b82f6'; // Blue
      case 'tools': return '#8b5cf6'; // Purple
      case 'memory': return '#f59e0b'; // Orange
      case 'session': return '#ef4444'; // Red
      default: return '#6b7280';
    }
  };

  const getNodeIcon = (node: ContextNode): string => {
    switch (node.type) {
      case 'document': return '📄';
      case 'group': return '📁';
      case 'directory': return '📂';
      case 'file': return '📄';
      case 'spec': return '📋';
      case 'tool': return '🔧';
      case 'memory': return '🧠';
      case 'session': return '🔗';
      default: return '•';
    }
  };

  const createHierarchicalData = (data: ContextGraphData): any[] => {
    const categoryRoots = data.nodes.filter(n => 
      n.id.endsWith('-root') || (!n.parent && n.type === 'group')
    );
    return categoryRoots;
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  if (!graphData) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header - more compact */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">AI Context Graph</h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {graphData.stats.totalNodes} nodes
          </Badge>
          <Badge variant="default" className="text-xs">
            {graphData.stats.activeNodes} active
          </Badge>
        </div>
      </div>

      {/* Category Summary - 3x2 grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {Object.entries(graphData.stats.byCategory).map(([category, count]) => (
          <div key={category} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-md">
            <span className="text-xs capitalize">{category}</span>
            <Badge variant="outline" className="text-xs h-5">{count}</Badge>
          </div>
        ))}
      </div>

      {/* Main content - taller */}
      <div className="flex flex-col gap-4 overflow-hidden">
        {/* Graph Visualization */}
        <Card className="fp-4 bg-background/50" ref={containerRef}>
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ minHeight: '300px' }}
            />
        </Card>
        
        {/* Context Details Panel */}
        <div className="flex-1 min-w-[300px] max-w-md">
          <ContextDetailsPanel
            node={selectedNode}
            allNodes={graphData?.nodes || []}
            onToggle={(nodeId, active) => {
              if (onToggleNode) {
                contextGraphService.toggleNode(nodeId);
                onToggleNode(nodeId, active);
              }
            }}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      </div>


    </div>
  );
};