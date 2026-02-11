import { Node, Edge, MarkerType } from 'reactflow';
import { IR, IRNode } from '../types/ir';
import dagre from 'dagre';

/**
 * IRをReact Flow形式に変換
 */
export function convertIRToReactFlow(ir: IR): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = ir.nodes.map((irNode) => convertNodeToReactFlow(irNode));
  const edges: Edge[] = ir.edges.map((irEdge) => {
    const edge: Edge = {
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
    };

    // ifノードからのエッジの場合、適切なハンドルを指定
    if (irEdge.label === 'true') {
      edge.sourceHandle = 'true';
    } else if (irEdge.label === 'false') {
      edge.sourceHandle = 'false';
    }

    // ループノードからのエッジの場合、適切なハンドルを指定
    if (irEdge.label === 'ループ継続') {
      edge.sourceHandle = 'continue';
      edge.style = { stroke: '#10b981', strokeWidth: 2 };
    } else if (irEdge.label === 'ループ終了') {
      edge.sourceHandle = 'exit';
      edge.style = { stroke: '#ef4444', strokeWidth: 2 };
    }

    // バックエッジ（ループ本体の最後からループノードへ）
    if (irEdge.label === 'ループ') {
      edge.animated = true;
      edge.style = { stroke: '#14b8a6', strokeWidth: 2 };
      edge.targetHandle = undefined; // ループノードのtopハンドル（デフォルト）
    }

    return edge;
  });

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

  // ノードタイプに応じたサイズを設定
  const getNodeSize = (node: Node) => {
    switch (node.type) {
      case 'if':
        return { width: 160, height: 160 };
      case 'loop':
        return { width: 200, height: 100 };
      case 'start':
      case 'end':
        return { width: 180, height: 80 };
      default:
        return { width: 200, height: 80 };
    }
  };

  dagreGraph.setGraph({
    rankdir: 'TB', // Top to Bottom
    nodesep: 120, // ノード間の水平スペース（増加）
    ranksep: 150, // ノード間の垂直スペース（増加）
    edgesep: 50,  // エッジ間のスペース
    align: 'UL',  // アライメント
  });

  // ノードを追加
  nodes.forEach((node) => {
    const size = getNodeSize(node);
    dagreGraph.setNode(node.id, size);
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
    const size = getNodeSize(node);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - size.width / 2,
        y: nodeWithPosition.y - size.height / 2,
      },
    };
  });
}
