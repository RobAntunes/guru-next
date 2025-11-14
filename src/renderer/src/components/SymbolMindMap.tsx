/**
 * Interactive Mind Map visualization for symbols using React Flow
 */

import React, { useCallback, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
  Position,
  NodeTypes,
  ReactFlowProvider
} from 'reactflow'
import 'reactflow/dist/style.css'
import dagre from 'dagre'
import { Symbol, SymbolRelationship } from '../utils/tree-sitter-parser'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Maximize2 } from 'lucide-react'

interface SymbolMindMapProps {
  symbols: Symbol[]
  relationships: SymbolRelationship[]
  onSymbolClick?: (symbol: Symbol) => void
  onFollowReference?: (fromId: string, toId: string) => void
}

// Custom node component for symbols
function SymbolNode({ data }: { data: any }) {
  const { symbol, onClick } = data

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'function':
      case 'method':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-400'
      case 'class':
        return 'bg-purple-500/20 border-purple-500/50 text-purple-400'
      case 'interface':
        return 'bg-green-500/20 border-green-500/50 text-green-400'
      case 'type':
        return 'bg-amber-500/20 border-amber-500/50 text-amber-400'
      case 'variable':
      case 'property':
        return 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
      case 'import':
        return 'bg-gray-500/20 border-gray-500/50 text-gray-400'
      case 'export':
        return 'bg-pink-500/20 border-pink-500/50 text-pink-400'
      default:
        return 'bg-gray-500/20 border-gray-500/50 text-gray-400'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'function':
      case 'method':
        return '𝑓'
      case 'class':
        return 'C'
      case 'interface':
        return 'I'
      case 'type':
        return 'T'
      case 'variable':
      case 'property':
        return 'V'
      case 'import':
        return '→'
      case 'export':
        return '←'
      default:
        return '•'
    }
  }

  return (
    <div
      onClick={() => onClick(symbol)}
      className={`
        px-4 py-3 rounded-lg border-2 cursor-pointer
        transition-all duration-200 hover:scale-105 hover:shadow-lg
        ${getTypeColor(symbol.type)}
        min-w-[150px] max-w-[250px]
      `}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg font-bold">{getTypeIcon(symbol.type)}</span>
        <span className="font-semibold text-sm truncate">{symbol.name}</span>
      </div>
      {symbol.signature && (
        <div className="text-xs opacity-70 truncate font-mono">
          {symbol.signature.slice(0, 50)}
          {symbol.signature.length > 50 ? '...' : ''}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 text-xs opacity-60">
        <span>:{symbol.location.line}</span>
        {(symbol.references?.length || 0) > 0 && (
          <Badge variant="secondary" className="text-xs px-1 py-0">
            {symbol.references?.length} refs
          </Badge>
        )}
      </div>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  symbolNode: SymbolNode
}

// Dagre layout algorithm
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  const nodeWidth = 200
  const nodeHeight = 100

  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 150 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      targetPosition: direction === 'TB' ? Position.Top : Position.Left,
      sourcePosition: direction === 'TB' ? Position.Bottom : Position.Right,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2
      }
    }
  })

  return { nodes: layoutedNodes, edges }
}

// Inner component that has access to useReactFlow
function MindMapContent({
  symbols,
  relationships,
  onSymbolClick,
  onFollowReference,
  initialNodes,
  initialEdges
}: SymbolMindMapProps & { initialNodes: Node[]; initialEdges: Edge[] }) {
  const { fitView } = useReactFlow()

  // Apply dagre layout
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(initialNodes, initialEdges),
    [initialNodes, initialEdges]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges)

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const symbol = symbols.find((s) => s.id === node.id)
      if (symbol) {
        onSymbolClick?.(symbol)
      }
    },
    [symbols, onSymbolClick]
  )

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      onFollowReference?.(edge.source, edge.target)
    },
    [onFollowReference]
  )

  const handleResetView = useCallback(() => {
    fitView({ duration: 500, padding: 0.2 })
  }, [fitView])

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background gap={16} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-background/90 border border-border rounded-lg"
        />
      </ReactFlow>

      {/* Floating Reset View Button */}
      <Button
        onClick={handleResetView}
        className="absolute top-4 right-4 z-10 shadow-cosmic-lg"
        size="sm"
        variant="secondary"
        title="Reset view to fit all nodes"
      >
        <Maximize2 className="h-4 w-4 mr-2" />
        Reset View
      </Button>
    </>
  )
}

export function SymbolMindMap({
  symbols,
  relationships,
  onSymbolClick,
  onFollowReference
}: SymbolMindMapProps) {
  // Convert symbols to React Flow nodes
  const initialNodes: Node[] = useMemo(
    () =>
      symbols.map((symbol) => ({
        id: symbol.id,
        type: 'symbolNode',
        data: {
          symbol,
          onClick: (s: Symbol) => {
            onSymbolClick?.(s)
          }
        },
        position: { x: 0, y: 0 }
      })),
    [symbols, onSymbolClick]
  )

  // Convert relationships to React Flow edges
  const initialEdges: Edge[] = useMemo(
    () =>
      relationships.map((rel, idx) => {
        const getEdgeColor = (type: string) => {
          switch (type) {
            case 'imports':
              return '#6366f1' // indigo
            case 'calls':
              return '#3b82f6' // blue
            case 'extends':
              return '#8b5cf6' // purple
            case 'implements':
              return '#10b981' // green
            case 'references':
              return '#f59e0b' // amber
            case 'contains':
              return '#64748b' // gray
            default:
              return '#94a3b8'
          }
        }

        return {
          id: `${rel.from}-${rel.to}-${idx}`,
          source: rel.from,
          target: rel.to,
          type: 'smoothstep',
          animated: rel.type === 'calls',
          style: { stroke: getEdgeColor(rel.type), strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: getEdgeColor(rel.type)
          },
          label: rel.type,
          labelStyle: { fontSize: 10, fill: getEdgeColor(rel.type) }
        }
      }),
    [relationships]
  )

  return (
    <Card className="w-full h-[700px] overflow-hidden relative">
      <ReactFlowProvider>
        <MindMapContent
          symbols={symbols}
          relationships={relationships}
          onSymbolClick={onSymbolClick}
          onFollowReference={onFollowReference}
          initialNodes={initialNodes}
          initialEdges={initialEdges}
        />
      </ReactFlowProvider>
    </Card>
  )
}
