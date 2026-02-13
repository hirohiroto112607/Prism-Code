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
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

// VSCode WebView APIの型定義
declare global {
  interface Window {
    acquireVsCodeApi: () => {
      postMessage: (message: any) => void;
    };
  }
}

const vscode = window.acquireVsCodeApi();

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
  console.log('FlowChart component rendered with:', {
    nodes: initialNodes.length,
    edges: initialEdges.length,
    firstNode: initialNodes[0]
  });

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

  console.log('FlowChart state:', {
    nodes: nodes.length,
    edges: edges.length
  });

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node);
    // 将来的には、ノードクリックでソースコードへジャンプ
  }, []);

  const switchToMacroView = useCallback(() => {
    vscode.postMessage({ type: 'switchViewMode', viewMode: 'macro' });
  }, []);

  const switchToOverviewView = useCallback(() => {
    vscode.postMessage({ type: 'switchViewMode', viewMode: 'overview' });
  }, []);

  console.log('Rendering ReactFlow component...');

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
        onInit={() => console.log('ReactFlow initialized')}
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

        {/* ビュー切替パネル */}
        <Panel position="top-right">
          <div
            style={{
              background: 'rgba(30, 30, 30, 0.95)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #667eea',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#667eea',
                marginBottom: '4px',
              }}
            >
              ビュー切替
            </div>
            <button
              onClick={switchToMacroView}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#fff',
                background: '#667eea',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              🔭 マクロビュー
            </button>
            <button
              onClick={switchToOverviewView}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#fff',
                background: '#764ba2',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              📊 概要ビュー
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
