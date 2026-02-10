import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { StartNode } from './nodes/StartNode';
import { EndNode } from './nodes/EndNode';
import { ProcessNode } from './nodes/ProcessNode';
import { IfNode } from './nodes/IfNode';
import { LoopNode } from './nodes/LoopNode';

interface FlowChartProps {
  nodes: Node[];
  edges: Edge[];
}

export function FlowChart({ nodes: initialNodes, edges: initialEdges }: FlowChartProps) {
  const nodeTypes = useMemo(
    () => ({
      start: StartNode,
      end: EndNode,
      process: ProcessNode,
      if: IfNode,
      loop: LoopNode,
    }),
    []
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node);
    // 将来的には、ノードクリックでソースコードへジャンプ
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1e1e1e' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'start':
                return '#4ade80';
              case 'end':
                return '#ef4444';
              case 'if':
                return '#f472b6';
              case 'loop':
                return '#14b8a6';
              default:
                return '#60a5fa';
            }
          }}
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
