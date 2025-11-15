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
    new Set(['knowledge'])
  );
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Subscribe to graph updates
    const handleGraphUpdate = (data: ContextGraphData) => {
      setGraphData(data);
    };

    contextGraphService.on('graphUpdated', handleGraphUpdate);

    // Update knowledge nodes only - remove all mock data
    if (knowledgeGroups.length > 0) {
      contextGraphService.updateKnowledgeNodes(knowledgeGroups);
    }

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

    // Add zoom and pan behavior - only with Shift key
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 5])
      .filter((event) => {
        // Only allow zoom when Shift key is pressed, or it's a programmatic zoom
        return event.shiftKey || event.type === 'dblclick' || !event.type;
      })
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
    
    // Use force simulation for all nodes with increased spacing
    const simulation = d3.forceSimulation(graphData.nodes as any)
      .force('link', d3.forceLink(enhancedEdges)
        .id((d: any) => d.id)
        .distance(d => d.type === 'contains' ? 100 : 200)
        .strength(d => d.type === 'contains' ? 0.5 : 0.2))
      .force('charge', d3.forceManyBody()
        .strength(d => {
          const node = d as any;
          if (node.type === 'group') return -800;
          if (node.type === 'directory') return -600;
          return -400;
        }))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => {
        const node = d as any;
        return getNodeSize(node) / 2 + 30;
      }));

    // Draw edges with gradient colors (matching marketing design)
    const link = g.append('g')
      .selectAll('line')
      .data(enhancedEdges)
      .enter()
      .append('line')
      .attr('stroke', d => {
        switch(d.type) {
          case 'uses': return '#b85a32';
          case 'inherits': return '#E09952';
          case 'relates_to': return '#a6a6a6';
          default: return '#383838';
        }
      })
      .attr('stroke-opacity', d => {
        switch(d.type) {
          case 'uses': return 0.3;
          case 'inherits': return 0.4;
          case 'relates_to': return 0.2;
          default: return 0.15;
        }
      })
      .attr('stroke-width', d => {
        switch(d.type) {
          case 'inherits': return 1.5;
          case 'relates_to': return 1;
          case 'uses': return 1;
          default: return 1;
        }
      })
      .attr('stroke-dasharray', d => {
        switch(d.type) {
          case 'uses': return '4,4';
          case 'relates_to': return '2,2';
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

    // Add node rounded rectangles (matching marketing design)
    nodeGroup.append('rect')
      .attr('width', d => getNodeSize(d))
      .attr('height', d => getNodeSize(d))
      .attr('x', d => -getNodeSize(d) / 2)
      .attr('y', d => -getNodeSize(d) / 2)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', '#141414')
      .attr('stroke', d => d.active ? '#383838' : '#2a2a2a')
      .attr('stroke-width', 1)
      .attr('opacity', d => d.active ? 1 : 0.6)
      .attr('filter', d => d.active ? 'url(#glow)' : 'none');

    // Add subtle glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    filter.append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'coloredBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Add node icons
    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '16px')
      .attr('fill', d => getNodeIconColor(d))
      .text(d => getNodeIcon(d));

    // Add node labels
    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', d => getNodeSize(d) / 2 + 14)
      .attr('font-size', '10px')
      .attr('fill', '#a6a6a6')
      .attr('font-weight', '500')
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
      knowledge: { x: width * 0.3, y: height * 0.3 },
      specs: { x: width * 0.7, y: height * 0.3 },
      filesystem: { x: width * 0.5, y: height * 0.5 },
      tools: { x: width * 0.3, y: height * 0.7 },
      memory: { x: width * 0.5, y: height * 0.7 },
      session: { x: width * 0.7, y: height * 0.7 }
    };

    // Initialize positions for category roots with wider spacing
    graphData.nodes.forEach((node: any, i: number) => {
      const pos = categoryPositions[node.category];
      if (pos && (node.id.endsWith('-root') || (!node.parent && node.type === 'group'))) {
        node.fx = pos.x + (Math.random() - 0.5) * 200;
        node.fy = pos.y + (Math.random() - 0.5) * 200;
      } else if (node.category === 'knowledge') {
        // Spread knowledge nodes across the canvas
        const angle = (i / graphData.nodes.length) * 2 * Math.PI;
        const radius = 150 + Math.random() * 100;
        node.x = width / 2 + Math.cos(angle) * radius;
        node.y = height / 2 + Math.sin(angle) * radius;
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

  const getNodeSize = (node: ContextNode): number => {
    switch (node.type) {
      case 'group': return 48;
      case 'directory': return 44;
      case 'spec': return 40;
      case 'tool': return 40;
      case 'memory': return 40;
      case 'session': return 36;
      default: return 32;
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

  const getNodeIconColor = (node: ContextNode): string => {
    if (!node.active) return '#4b5563';

    switch (node.category) {
      case 'knowledge': return '#b85a32';
      case 'specs': return '#E09952';
      case 'filesystem': return '#a6a6a6';
      case 'tools': return '#d4d4d4';
      case 'memory': return '#b85a32';
      case 'session': return '#E09952';
      default: return '#737373';
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
    <div className="w-full pb-6">
      {/* Grid Layout: Graph (2fr) + Info Panel (1fr) */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Graph Visualization */}
        <Card className="bg-card border-border p-4 relative" style={{ height: '700px' }} ref={containerRef}>
          {/* Shift Key Indicator */}
          <div className="absolute top-4 left-4 z-10 bg-card px-3 py-2 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono border border-border">Shift</kbd>
              Press and hold for pan and zoom
            </p>
          </div>
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ cursor: 'default' }}
          />
        </Card>

        {/* Info Panel */}
        <div className="flex flex-col gap-3" style={{ height: '700px' }}>
          {/* Header Stats */}
          <Card className="bg-card border-border p-4 shrink-0">
            <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-[0.18em]">Overview</h3>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="text-xs">
                {graphData.stats.totalNodes} nodes
              </Badge>
              <Badge variant="default" className="text-xs">
                {graphData.stats.activeNodes} active
              </Badge>
            </div>

            {/* Category Summary */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <div className="text-xs font-medium text-muted-foreground mb-2">By Category</div>
              {Object.entries(graphData.stats.byCategory).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-md">
                  <span className="text-xs capitalize">{category}</span>
                  <Badge variant="outline" className="text-xs h-5">{count}</Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Context Details Panel */}
          {selectedNode && (
            <div className="flex-1 min-h-0 overflow-y-auto">
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
          )}
        </div>
      </div>
    </div>
  );
};