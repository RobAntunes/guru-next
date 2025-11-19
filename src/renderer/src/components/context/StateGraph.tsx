import React, { useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes: Node[] = [
    {
        id: '1',
        type: 'input',
        data: { label: 'Goal: Build API' },
        position: { x: 250, y: 0 },
        style: { background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', width: 150 },
    },
    {
        id: '2',
        data: { label: 'Task: Write Schema' },
        position: { x: 100, y: 100 },
        style: { background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px' },
    },
    {
        id: '3',
        data: { label: 'Task: Write Routes' },
        position: { x: 400, y: 100 },
        style: { background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px' },
    },
    {
        id: '4',
        data: { label: 'Failed Attempt' },
        position: { x: 400, y: 200 },
        style: { background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px' },
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#fff' } },
    { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#fff' } },
    {
        id: 'e3-4',
        source: '3',
        target: '4',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
        style: { stroke: '#ef4444' }
    },
];

export const StateGraph = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    return (
        <div className="h-full w-full bg-[#111] relative">
            <div className="absolute top-2 left-4 z-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                State Graph
            </div>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                attributionPosition="bottom-right"
            >
                <Background color="#333" gap={16} />
                <Controls className="bg-card border-border fill-foreground" />
                <MiniMap
                    nodeColor={(n) => {
                        if (n.style?.background) return n.style.background as string;
                        return '#fff';
                    }}
                    className="bg-card border-border"
                />
            </ReactFlow>
        </div>
    );
};
