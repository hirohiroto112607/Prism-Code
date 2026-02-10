import { Node, Edge, MarkerType } from 'reactflow';
import { IR, IRNode } from '../types/ir';
import dagre from 'dagre';

/**
 * IRをReact Flow形式に変換
 */
export function convertIRToReactFlow(ir: IR): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = ir.nodes.map((irNode) => convertNodeToReactFlow(irNode));
  const edges: Edge[] = ir.edges.map((irEdge) => ({
    id: irEdge.id,
    source: irEdge.source,
    target: irEdge.target,
    label: irEdge.label,
    type: 'smoothstep',
    animated: irEdge.label === 'ループ',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
    },
    style: {
      stroke: irEdge.label === 'true' ? '#4ade80' : irEdge.label === 'false' ? '#ef4444' : '#9ca3af',
      strokeWidth: 2,
    },
  }));

  // レイアウトを計算
  const layoutedNodes = calculateLayout(nodes, edges);

  return { nodes: layoutedNodes, edges };
}

/**
 * IRノードをReact FlowノードにReact Flowノードに変換
 */
function convertNodeToReactFlow(irNode: IRNode): Node {
  const baseNode = {
    id: irNode.id,
    position: { x: 0, y: 0 }, // レイアウト計算で上書き
    data: {},
  };

  switch (irNode.type) {
    case 'start':
      return {
        ...baseNode,
        type: 'start',
        data: { label: irNode.label },
      };

    case 'end':
      return {
        ...baseNode,
        type: 'end',
        data: { label: irNode.label },
      };

    case 'if':
      return {
        ...baseNode,
        type: 'if',
        data: { condition: irNode.condition || 'condition' },
      };

    case 'for':
    case 'while':
      return {
        ...baseNode,
        type: 'loop',
        data: {
          condition: irNode.condition,
          loopType: irNode.type,
        },
      };

    case 'variable':
    case 'return':
    case 'expression':
      return {
        ...baseNode,
        type: 'process',
        data: {
          label: irNode.label,
          details: irNode.details,
          nodeType: irNode.type,
        },
      };

    default:
      return baseNode;
  }
}

/**
 * Dagreを使用してレイアウトを計算
 */
function calculateLayout(nodes: Node[], edges: Edge[]): Node[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 200;
  const nodeHeight = 100;

  dagreGraph.setGraph({
    rankdir: 'TB', // Top to Bottom
    nodesep: 80,
    ranksep: 100,
  });

  // ノードを追加
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // エッジを追加
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // レイアウト計算
  dagre.layout(dagreGraph);

  // 計算結果を適用
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });
}
