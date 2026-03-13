import { useCallback, useState, useEffect } from "react";
import ReactFlow, {
  type Node,
  type Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";

interface MacroViewProps {
  data?: any;
}

// データが実際に渡された場合は実データを使用、なければモックデータを使用
const useRealDataIfAvailable = (data?: any) => {
  if (!data || !data.functions || data.functions.length === 0) {
    return false;
  }
  return true;
};

// MacroViewDataをReact Flowのノードとエッジに変換
const convertMacroDataToNodes = (
  data: any,
): { initialNodes: Node[]; initialEdges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (!data || !data.functions) {
    return { initialNodes: [], initialEdges: [] };
  }

  // ファイル別に関数をグループ化
  const fileGroups = new Map<string, any[]>();
  for (const func of data.functions) {
    const file = func.sourceFile || "Unknown";
    if (!fileGroups.has(file)) {
      fileGroups.set(file, []);
    }
    fileGroups.get(file)!.push(func);
  }

  // 色のパレット
  const colors = [
    "#667eea", // 青紫
    "#764ba2", // 紫
    "#f093fb", // ピンク
    "#4facfe", // 水色
    "#43e97b", // 緑
    "#fa709a", // ローズ
  ];

  let groupIndex = 0;
  let xOffset = 50;

  // 各ファイルごとにグループノードを作成
  fileGroups.forEach((functions, fileName) => {
    const color = colors[groupIndex % colors.length];
    const groupId = `group_${groupIndex}`;

    // グループノードの高さを計算
    const groupHeight = 80 + functions.length * 100;

    // グループノード（ファイル）
    nodes.push({
      id: groupId,
      type: "group",
      position: { x: xOffset, y: 50 },
      data: { label: `📄 ${fileName}` },
      style: {
        width: 350,
        height: groupHeight,
        background: `${color}20`, // 透明度20%
        border: `2px solid ${color}`,
        borderRadius: "12px",
        padding: "20px",
      },
    });

    // グループ内の関数ノード
    functions.forEach((func, funcIndex) => {
      const funcId = `${groupId}_func_${funcIndex}`;

      // 複雑度に応じたラベル
      let complexityLabel = "";
      if (func.complexity > 10) {
        complexityLabel = " ⚠️";
      } else if (func.hasLoops || func.hasConditionals) {
        complexityLabel = " 🔄";
      }

      nodes.push({
        id: funcId,
        type: "default",
        position: { x: 25, y: 80 + funcIndex * 100 },
        data: {
          label: `${func.name}${complexityLabel}\n${func.lineCount}行 | 複雑度: ${func.complexity}`,
        },
        parentNode: groupId,
        style: {
          background: color,
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontSize: "12px",
          padding: "10px",
          width: 300,
        },
      });
    });

    xOffset += 450;
    groupIndex++;
  });

  // コールグラフからエッジを作成（簡易版）
  // 実際のコールグラフの実装は将来的に追加
  if (data.callGraph && data.callGraph.length > 0) {
    // TODO: コールグラフの可視化
  }

  return { initialNodes: nodes, initialEdges: edges };
};

// 仮データ: 機能単位でグループ化されたフローチャート
const MOCK_NODES: Node[] = [
  // 機能1: ユーザー認証
  {
    id: "func-auth",
    type: "group",
    position: { x: 50, y: 50 },
    data: { label: "機能: ユーザー認証" },
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
    data: { label: "ログイン画面表示" },
    parentNode: "func-auth",
    style: {
      background: "#667eea",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "12px",
      padding: "10px",
    },
  },
  {
    id: "auth-2",
    type: "default",
    position: { x: 25, y: 160 },
    data: { label: "認証情報検証" },
    parentNode: "func-auth",
    style: {
      background: "#667eea",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "12px",
      padding: "10px",
    },
  },
  {
    id: "auth-3",
    type: "default",
    position: { x: 25, y: 240 },
    data: { label: "トークン生成" },
    parentNode: "func-auth",
    style: {
      background: "#667eea",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "12px",
      padding: "10px",
    },
  },
  {
    id: "auth-4",
    type: "default",
    position: { x: 25, y: 320 },
    data: { label: "セッション確立" },
    parentNode: "func-auth",
    style: {
      background: "#667eea",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "12px",
      padding: "10px",
    },
  },

  // 機能2: データ処理
  {
    id: "func-data",
    type: "group",
    position: { x: 500, y: 50 },
    data: { label: "機能: データ処理" },
    style: {
      width: 350,
      height: 400,
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
    data: { label: "データ取得" },
    parentNode: "func-data",
    style: {
      background: "#764ba2",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "12px",
      padding: "10px",
    },
  },
  {
    id: "data-2",
    type: "default",
    position: { x: 25, y: 160 },
    data: { label: "データ変換" },
    parentNode: "func-data",
    style: {
      background: "#764ba2",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "12px",
      padding: "10px",
    },
  },
  {
    id: "data-3",
    type: "default",
    position: { x: 25, y: 240 },
    data: { label: "データ保存" },
    parentNode: "func-data",
    style: {
      background: "#764ba2",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "12px",
      padding: "10px",
    },
  },

  // 機能3: エラーハンドリング
  {
    id: "func-error",
    type: "group",
    position: { x: 950, y: 50 },
    data: { label: "機能: エラーハンドリング" },
    style: {
      width: 350,
      height: 300,
      background: "rgba(239, 68, 68, 0.1)",
      border: "2px solid #ef4444",
      borderRadius: "12px",
      padding: "20px",
    },
  },
  {
    id: "error-1",
    type: "default",
    position: { x: 25, y: 80 },
    data: { label: "エラー検知" },
    parentNode: "func-error",
    style: {
      background: "#ef4444",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "12px",
      padding: "10px",
    },
  },
  {
    id: "error-2",
    type: "default",
    position: { x: 25, y: 160 },
    data: { label: "ログ出力" },
    parentNode: "func-error",
    style: {
      background: "#ef4444",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "12px",
      padding: "10px",
    },
  },
];

const MOCK_EDGES: Edge[] = [
  // 認証機能内のフロー
  { id: "e-auth-1-2", source: "auth-1", target: "auth-2", animated: true },
  { id: "e-auth-2-3", source: "auth-2", target: "auth-3", animated: true },
  { id: "e-auth-3-4", source: "auth-3", target: "auth-4", animated: true },

  // データ処理機能内のフロー
  { id: "e-data-1-2", source: "data-1", target: "data-2", animated: true },
  { id: "e-data-2-3", source: "data-2", target: "data-3", animated: true },

  // エラーハンドリング機能内のフロー
  { id: "e-error-1-2", source: "error-1", target: "error-2", animated: true },

  // 機能間の連携
  {
    id: "e-auth-data",
    source: "auth-4",
    target: "data-1",
    label: "認証成功後",
    style: { stroke: "#10b981", strokeWidth: 3 },
    animated: true,
  },
  {
    id: "e-auth-error",
    source: "auth-2",
    target: "error-1",
    label: "認証失敗",
    style: { stroke: "#ef4444", strokeWidth: 3 },
    animated: true,
  },
  {
    id: "e-data-error",
    source: "data-3",
    target: "error-1",
    label: "データエラー",
    style: { stroke: "#ef4444", strokeWidth: 3 },
    animated: true,
  },
];

export function MacroView({ data }: MacroViewProps) {
  const hasRealData = useRealDataIfAvailable(data);

  // 実データがある場合は、それを元にノードとエッジを生成
  const { initialNodes, initialEdges } = hasRealData
    ? convertMacroDataToNodes(data)
    : { initialNodes: MOCK_NODES, initialEdges: MOCK_EDGES };

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  // dataが変更されたときにノードとエッジを更新
  useEffect(() => {
    const hasData = useRealDataIfAvailable(data);
    const { initialNodes: newNodes, initialEdges: newEdges } = hasData
      ? convertMacroDataToNodes(data)
      : { initialNodes: MOCK_NODES, initialEdges: MOCK_EDGES };

    setNodes(newNodes);
    setEdges(newEdges);
  }, [data, setNodes, setEdges]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === "group") {
      setSelectedFeature(node.id);
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
        fitView
        style={{ background: "#1e1e1e" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="#404040"
        />
        <Controls />

        {/* パネル: 説明 */}
        <Panel position="top-left">
          <div
            style={{
              background: "rgba(30, 30, 30, 0.95)",
              padding: "15px 20px",
              borderRadius: "8px",
              border: "1px solid #667eea",
              color: "#e0e0e0",
              maxWidth: "400px",
            }}
          >
            <h2
              style={{
                margin: "0 0 10px 0",
                fontSize: "18px",
                fontWeight: "bold",
                color: "#667eea",
              }}
            >
              🔭 マクロビュー（俯瞰）
            </h2>
            <p style={{ margin: 0, fontSize: "13px", color: "#9ca3af" }}>
              {hasRealData ? (
                <>
                  ワークスペース全体の関数をファイル別にグループ化して表示しています。
                  <br />
                  {data.metadata?.fileCount &&
                    `${data.metadata.fileCount}ファイル, `}
                  {data.functions?.length && `${data.functions.length}関数`}
                </>
              ) : (
                <>
                  機能単位でグループ化されたフローチャートを表示しています。
                  <br />
                  将来的にAIが自動的に機能を分類・可視化します。
                </>
              )}
            </p>
          </div>
        </Panel>

        {/* パネル: 選択中の機能 */}
        {selectedFeature && (
          <Panel position="top-right">
            <div
              style={{
                background: "rgba(30, 30, 30, 0.95)",
                padding: "15px 20px",
                borderRadius: "8px",
                border: "1px solid #10b981",
                color: "#e0e0e0",
                minWidth: "250px",
              }}
            >
              <h3
                style={{
                  margin: "0 0 10px 0",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#10b981",
                }}
              >
                選択中: {selectedFeature}
              </h3>
              <button
                onClick={() => setSelectedFeature(null)}
                style={{
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#fff",
                  background: "#667eea",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                選択解除
              </button>
            </div>
          </Panel>
        )}

        {/* パネル: 凡例 */}
        <Panel position="bottom-right">
          <div
            style={{
              background: "rgba(30, 30, 30, 0.95)",
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid #404040",
              color: "#e0e0e0",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                marginBottom: "8px",
              }}
            >
              凡例
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                fontSize: "11px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    background: "#667eea",
                    borderRadius: "4px",
                  }}
                />
                <span>認証機能</span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    background: "#764ba2",
                    borderRadius: "4px",
                  }}
                />
                <span>データ処理</span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    background: "#ef4444",
                    borderRadius: "4px",
                  }}
                />
                <span>エラーハンドリング</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
