import { type Node, type Edge, MarkerType } from "reactflow";
import type { IR, IRNode } from "../types/ir";
import ELK from "elkjs/lib/elk.bundled.js";

const elk = new ELK();

const NODE_SIZE: Record<string, { width: number; height: number }> = {
  if: { width: 160, height: 160 },
  loop: { width: 200, height: 100 },
  start: { width: 180, height: 80 },
  end: { width: 180, height: 80 },
  default: { width: 200, height: 80 },
};

function getNodeSize(type: string | undefined) {
  return NODE_SIZE[type ?? ""] ?? NODE_SIZE.default;
}

/**
 * IRをReact Flow形式に変換（ELK.jsによるレイアウト）
 */
export async function convertIRToReactFlow(
  ir: IR,
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const rfNodes: Node[] = ir.nodes.map(convertNodeToReactFlow);
  const rfEdges: Edge[] = ir.edges.map((irEdge) => {
    const edge: Edge = {
      id: irEdge.id,
      source: irEdge.source,
      target: irEdge.target,
      label: irEdge.label,
      type: "smoothstep",
      animated: irEdge.label === "ループ",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
      },
      style: {
        stroke:
          irEdge.label === "true"
            ? "#4ade80"
            : irEdge.label === "false"
              ? "#ef4444"
              : "#9ca3af",
        strokeWidth: 2,
      },
    };

    if (irEdge.label === "true") {
      edge.sourceHandle = "true";
    } else if (irEdge.label === "false") {
      edge.sourceHandle = "false";
    }

    if (irEdge.label === "ループ継続") {
      edge.sourceHandle = "continue";
      edge.style = { stroke: "#10b981", strokeWidth: 2 };
    } else if (irEdge.label === "ループ終了") {
      edge.sourceHandle = "exit";
      edge.style = { stroke: "#ef4444", strokeWidth: 2 };
    }

    if (irEdge.label === "ループ") {
      edge.animated = true;
      edge.style = { stroke: "#14b8a6", strokeWidth: 2 };
      edge.targetHandle = "loop";
    }

    const targetNode = ir.nodes.find((n) => n.id === irEdge.target);
    if (
      targetNode &&
      (targetNode.type === "for" || targetNode.type === "while") &&
      irEdge.label !== "ループ"
    ) {
      edge.targetHandle = "entry";
    }

    return edge;
  });

  const layoutedNodes = await calculateLayout(rfNodes, rfEdges);
  return { nodes: layoutedNodes, edges: rfEdges };
}

/**
 * IRノードをReact Flowノードに変換
 */
function convertNodeToReactFlow(irNode: IRNode): Node {
  const base = {
    id: irNode.id,
    position: { x: 0, y: 0 },
    data: {},
  };

  switch (irNode.type) {
    case "start":
      return { ...base, type: "start", data: { label: irNode.label } };
    case "end":
      return { ...base, type: "end", data: { label: irNode.label } };
    case "if":
      return {
        ...base,
        type: "if",
        data: { condition: irNode.condition || "condition" },
      };
    case "for":
    case "while":
      return {
        ...base,
        type: "loop",
        data: { condition: irNode.condition, loopType: irNode.type },
      };
    case "variable":
    case "return":
    case "expression":
      return {
        ...base,
        type: "process",
        data: {
          label: irNode.label,
          details: irNode.details,
          nodeType: irNode.type,
        },
      };
    default:
      return base;
  }
}

/**
 * ELK.jsを使用してレイアウトを計算
 */
async function calculateLayout(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  if (nodes.length === 0) return nodes;

  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.spacing.nodeNode": "80",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    },
    children: nodes.map((node) => {
      const { width, height } = getNodeSize(node.type);
      return { id: node.id, width, height };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layout = await elk.layout(elkGraph);

  const posMap = new Map(
    layout.children?.map((child) => [
      child.id,
      { x: child.x ?? 0, y: child.y ?? 0 },
    ]) ?? [],
  );

  return nodes.map((node) => ({
    ...node,
    position: posMap.get(node.id) ?? { x: 0, y: 0 },
  }));
}
