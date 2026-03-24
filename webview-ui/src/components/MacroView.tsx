import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  Panel,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

interface MacroViewProps {
  data?: any;
  onSwitchToMicro?: () => void;
}

const COLORS = [
  "#667eea",
  "#764ba2",
  "#4facfe",
  "#43e97b",
  "#fa709a",
  "#f093fb",
  "#f59e0b",
  "#10b981",
];

interface LegendItem {
  label: string;
  color: string;
}

const convertMacroDataToNodes = (
  data: any,
): {
  initialNodes: Node[];
  initialEdges: Edge[];
  legendItems: LegendItem[];
} => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const legendItems: LegendItem[] = [];

  if (!data || !data.functions) {
    return { initialNodes: [], initialEdges: [], legendItems: [] };
  }

  // ファイル別に関数をグループ化
  const fileGroups = new Map<string, any[]>();
  for (const func of data.functions) {
    const file = func.sourceFile || "Unknown";
    if (!fileGroups.has(file)) {
      fileGroups.set(file, []);
    }
    fileGroups.get(file)?.push(func);
  }

  // 関数ID → React FlowノードID のマッピング（コールグラフ用）
  const funcIdToNodeId = new Map<string, string>();

  let groupIndex = 0;
  let xOffset = 50;

  fileGroups.forEach((functions, fileName) => {
    const color = COLORS[groupIndex % COLORS.length];
    const groupId = `group_${groupIndex}`;
    const groupHeight = 80 + functions.length * 100;
    const shortName = fileName.split("/").pop() || fileName;

    legendItems.push({ label: shortName, color });

    nodes.push({
      id: groupId,
      type: "group",
      position: { x: xOffset, y: 50 },
      data: { label: `📄 ${shortName}` },
      style: {
        width: 350,
        height: groupHeight,
        background: `${color}18`,
        border: `2px solid ${color}`,
        borderRadius: "12px",
        padding: "20px",
      },
    });

    functions.forEach((func: any, funcIndex: number) => {
      const funcNodeId = `${groupId}_func_${funcIndex}`;
      funcIdToNodeId.set(func.id, funcNodeId);

      let badge = "";
      if (func.complexity > 10) {
        badge = " ⚠️";
      } else if (func.hasLoops || func.hasConditionals) {
        badge = " 🔄";
      }

      nodes.push({
        id: funcNodeId,
        type: "default",
        position: { x: 25, y: 80 + funcIndex * 100 },
        data: {
          label: `${func.name}${badge}`,
          func,
        },
        parentNode: groupId,
        style: {
          background: color,
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontSize: "12px",
          padding: "10px 14px",
          width: 300,
          cursor: "pointer",
        },
      });
    });

    xOffset += 450;
    groupIndex++;
  });

  // コールグラフのエッジを生成
  if (data.callGraph && data.callGraph.length > 0) {
    for (const call of data.callGraph) {
      const sourceNodeId = funcIdToNodeId.get(call.from);
      const targetNodeId = funcIdToNodeId.get(call.to);
      if (sourceNodeId && targetNodeId) {
        const edgeColor = call.type === "call" ? "#667eea" : "#9ca3af";
        edges.push({
          id: call.id,
          source: sourceNodeId,
          target: targetNodeId,
          type: "smoothstep",
          animated: call.type === "call",
          style: { stroke: edgeColor, strokeWidth: 2 },
          label: call.type !== "call" ? call.type : undefined,
        } as Edge);
      }
    }
  }

  return { initialNodes: nodes, initialEdges: edges, legendItems };
};

export function MacroView({ data, onSwitchToMicro }: MacroViewProps) {
  const hasRealData = !!(data?.functions?.length > 0);

  const { initialNodes, initialEdges, legendItems } = hasRealData
    ? convertMacroDataToNodes(data)
    : {
        initialNodes: MOCK_NODES,
        initialEdges: MOCK_EDGES,
        legendItems: MOCK_LEGEND,
      };

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedFunc, setSelectedFunc] = useState<any | null>(null);

  useEffect(() => {
    const { initialNodes: newNodes, initialEdges: newEdges } = hasRealData
      ? convertMacroDataToNodes(data)
      : {
          initialNodes: MOCK_NODES,
          initialEdges: MOCK_EDGES,
          legendItems: MOCK_LEGEND,
        };
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedFunc(null);
  }, [data, hasRealData, setNodes, setEdges]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.data?.func) {
      setSelectedFunc(node.data.func);
    } else {
      setSelectedFunc(null);
    }
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#1e1e1e" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelectedFunc(null)}
        fitView
        style={{ background: "#1e1e1e" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="#333"
        />
        <Controls />
        <MiniMap
          style={{ background: "#252526" }}
          nodeColor={(n) => (n.style?.background as string) ?? "#667eea"}
        />

        {/* 情報パネル (左上) */}
        <Panel position="top-left">
          <div style={styles.panel}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#667eea",
                }}
              >
                🔭 マクロビュー
              </h2>
              {onSwitchToMicro && (
                <button
                  type="button"
                  onClick={onSwitchToMicro}
                  style={styles.switchButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#3a3a4a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  ← ミクロビュー
                </button>
              )}
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>
              {hasRealData ? (
                <>
                  {data.metadata?.fileCount != null &&
                    `${data.metadata.fileCount}ファイル  `}
                  {data.functions?.length != null &&
                    `${data.functions.length}関数`}
                  {data.callGraph?.length > 0 &&
                    `  /  ${data.callGraph.length}件の呼び出し関係`}
                </>
              ) : (
                "プレビューデータを表示中 — 実際のプロジェクトでは自動生成されます"
              )}
            </p>
          </div>
        </Panel>

        {/* 選択中の関数パネル (右上) */}
        {selectedFunc && (
          <Panel position="top-right">
            <div
              style={{
                ...styles.panel,
                borderColor: "#10b981",
                minWidth: "240px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: "#10b981",
                  }}
                >
                  {selectedFunc.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedFunc(null)}
                  style={{
                    ...styles.switchButton,
                    fontSize: "16px",
                    padding: "0 4px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#3a3a4a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  ✕
                </button>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#d1d5db",
                  lineHeight: "1.8",
                }}
              >
                <div>
                  <span style={{ color: "#9ca3af" }}>ファイル: </span>
                  {selectedFunc.sourceFile?.split("/").pop() ?? "—"}
                </div>
                <div>
                  <span style={{ color: "#9ca3af" }}>行数: </span>
                  {selectedFunc.lineCount}行
                  <span style={{ color: "#9ca3af", marginLeft: "12px" }}>
                    位置:{" "}
                  </span>
                  L{selectedFunc.location?.start?.line}–
                  {selectedFunc.location?.end?.line}
                </div>
                <div>
                  <span style={{ color: "#9ca3af" }}>複雑度: </span>
                  <span
                    style={{
                      color:
                        selectedFunc.complexity > 10
                          ? "#ef4444"
                          : selectedFunc.complexity > 5
                            ? "#f59e0b"
                            : "#10b981",
                    }}
                  >
                    {selectedFunc.complexity}
                  </span>
                  {selectedFunc.complexity > 10 && " ⚠️ 高複雑"}
                </div>
                {(selectedFunc.hasLoops || selectedFunc.hasConditionals) && (
                  <div
                    style={{
                      marginTop: "6px",
                      display: "flex",
                      gap: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    {selectedFunc.hasLoops && (
                      <span style={styles.badge}>ループ</span>
                    )}
                    {selectedFunc.hasConditionals && (
                      <span style={styles.badge}>条件分岐</span>
                    )}
                  </div>
                )}
                {selectedFunc.aiSummary && (
                  <div
                    style={{
                      marginTop: "8px",
                      color: "#a78bfa",
                      fontSize: "11px",
                    }}
                  >
                    ✨ {selectedFunc.aiSummary}
                  </div>
                )}
              </div>
            </div>
          </Panel>
        )}

        {/* 凡例 (右下) */}
        <Panel position="bottom-right">
          <div
            style={{ ...styles.panel, maxHeight: "220px", overflowY: "auto" }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: "bold",
                marginBottom: "8px",
                color: "#9ca3af",
              }}
            >
              ファイル
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "5px" }}
            >
              {legendItems.map((item) => (
                <div
                  key={item.label}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      background: item.color,
                      borderRadius: "3px",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#d1d5db",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "160px",
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: "10px",
                paddingTop: "8px",
                borderTop: "1px solid #404040",
                fontSize: "10px",
                color: "#6b7280",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "4px",
                }}
              >
                <span>🔄</span>
                <span>ループ/条件分岐あり</span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span>⚠️</span>
                <span>複雑度 {">"} 10</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// スタイル
// ─────────────────────────────────────────────────────────────────────────────

const styles = {
  panel: {
    background: "rgba(30, 30, 30, 0.95)",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid #404040",
    color: "#e0e0e0",
  } as React.CSSProperties,
  switchButton: {
    padding: "3px 10px",
    fontSize: "11px",
    color: "#9ca3af",
    background: "transparent",
    border: "1px solid #555",
    borderRadius: "5px",
    cursor: "pointer",
    transition: "background 0.15s",
  } as React.CSSProperties,
  badge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "10px",
    background: "#374151",
    color: "#d1d5db",
  } as React.CSSProperties,
};

// ─────────────────────────────────────────────────────────────────────────────
// モックデータ（実データがない場合のプレビュー）
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_LEGEND: LegendItem[] = [
  { label: "auth.ts", color: "#667eea" },
  { label: "dataService.ts", color: "#764ba2" },
  { label: "errorHandler.ts", color: "#fa709a" },
];

const MOCK_NODES: Node[] = [
  {
    id: "func-auth",
    type: "group",
    position: { x: 50, y: 50 },
    data: { label: "📄 auth.ts" },
    style: {
      width: 350,
      height: 400,
      background: "rgba(102, 126, 234, 0.1)",
      border: "2px solid #667eea",
      borderRadius: "12px",
      padding: "20px",
    },
  },
  {
    id: "auth-1",
    type: "default",
    position: { x: 25, y: 80 },
    data: { label: "login" },
    parentNode: "func-auth",
    style: {
      background: "#667eea",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "12px",
      padding: "10px",
      width: 300,
    },
  },
  {
    id: "auth-2",
    type: "default",
    position: { x: 25, y: 180 },
    data: { label: "validateToken 🔄" },
    parentNode: "func-auth",
    style: {
      background: "#667eea",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "12px",
      padding: "10px",
      width: 300,
    },
  },
  {
    id: "auth-3",
    type: "default",
    position: { x: 25, y: 280 },
    data: { label: "logout" },
    parentNode: "func-auth",
    style: {
      background: "#667eea",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "12px",
      padding: "10px",
      width: 300,
    },
  },
  {
    id: "func-data",
    type: "group",
    position: { x: 500, y: 50 },
    data: { label: "📄 dataService.ts" },
    style: {
      width: 350,
      height: 300,
      background: "rgba(118, 75, 162, 0.1)",
      border: "2px solid #764ba2",
      borderRadius: "12px",
      padding: "20px",
    },
  },
  {
    id: "data-1",
    type: "default",
    position: { x: 25, y: 80 },
    data: { label: "fetchData 🔄" },
    parentNode: "func-data",
    style: {
      background: "#764ba2",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "12px",
      padding: "10px",
      width: 300,
    },
  },
  {
    id: "data-2",
    type: "default",
    position: { x: 25, y: 180 },
    data: { label: "saveData ⚠️" },
    parentNode: "func-data",
    style: {
      background: "#764ba2",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "12px",
      padding: "10px",
      width: 300,
    },
  },
  {
    id: "func-error",
    type: "group",
    position: { x: 950, y: 50 },
    data: { label: "📄 errorHandler.ts" },
    style: {
      width: 350,
      height: 200,
      background: "rgba(250, 112, 154, 0.1)",
      border: "2px solid #fa709a",
      borderRadius: "12px",
      padding: "20px",
    },
  },
  {
    id: "error-1",
    type: "default",
    position: { x: 25, y: 80 },
    data: { label: "handleError" },
    parentNode: "func-error",
    style: {
      background: "#fa709a",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "12px",
      padding: "10px",
      width: 300,
    },
  },
];

const MOCK_EDGES: Edge[] = [
  {
    id: "e-auth-1-2",
    source: "auth-1",
    target: "auth-2",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#667eea", strokeWidth: 2 },
  },
  {
    id: "e-data-1-2",
    source: "data-1",
    target: "data-2",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#764ba2", strokeWidth: 2 },
  },
  {
    id: "e-auth-data",
    source: "auth-1",
    target: "data-1",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#667eea", strokeWidth: 2 },
  },
  {
    id: "e-data-error",
    source: "data-2",
    target: "error-1",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#fa709a", strokeWidth: 2 },
  },
];
