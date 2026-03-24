import { useEffect, useState } from "react";
import type { Edge, Node } from "reactflow";
import { FlowChart } from "./components/FlowChart";
import { MacroView } from "./components/MacroView";
import type { DiagramType, IR } from "./types/ir";
import { convertIRToReactFlow } from "./utils/flowConverter";
import { vscode } from "./vscode-api";

type ViewMode = "micro" | "macro";

/** テンプレートのメタ情報（UI表示用） */
const DIAGRAM_TEMPLATES: Array<{
  type: DiagramType;
  icon: string;
  label: string;
}> = [
  { type: "flowchart", icon: "📊", label: "フローチャート" },
  { type: "class-diagram", icon: "🏛️", label: "クラス図" },
  { type: "screen-transition", icon: "📱", label: "画面遷移図" },
  { type: "sequence-diagram", icon: "↔️", label: "シーケンス図" },
  { type: "state-machine", icon: "🔀", label: "状態遷移図" },
  { type: "dependency-graph", icon: "🌐", label: "依存関係グラフ" },
];

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("micro");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [macroData, setMacroData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  /** AIが選択した、または手動で選択したテンプレート */
  const [diagramType, setDiagramType] = useState<DiagramType>("flowchart");
  /** AI選択の理由テキスト（ツールチップ表示用） */
  const [aiReason, setAiReason] = useState<string | null>(null);

  const handleVisualize = () => {
    vscode.postMessage({ type: "visualize" });
  };

  /** テンプレートを手動で切り替えたとき Extension に通知する */
  const handleDiagramTypeChange = (type: DiagramType) => {
    setDiagramType(type);
    setAiReason(null);
    vscode.postMessage({
      type: "changeDiagramType",
      data: { diagramType: type },
    });
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      console.log("📨 Message received in App:", message.type, message);

      switch (message.type) {
        case "updateFlow": {
          const ir: IR = message.data;
          console.log("✅ updateFlow received:", {
            nodes: ir.nodes?.length,
            edges: ir.edges?.length,
            diagramType: ir.metadata?.diagramType,
            data: ir,
          });

          // AI が選択したテンプレートを適用（未設定なら 'flowchart'）
          const selectedType: DiagramType =
            ir.metadata?.diagramType ?? "flowchart";
          setDiagramType(selectedType);
          setAiReason(ir.metadata?.aiReason ?? null);

          convertIRToReactFlow(ir)
            .then(({ nodes: flowNodes, edges: flowEdges }) => {
              console.log("✅ Converted to React Flow:", {
                nodes: flowNodes.length,
                edges: flowEdges.length,
              });
              setNodes(flowNodes);
              setEdges(flowEdges);
              setViewMode("micro");
              setError(null);
            })
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : String(err));
              console.error("❌ フロー変換エラー:", err);
            });
          break;
        }
        case "updateMacroView": {
          try {
            const data = message.data;
            console.log("✅ updateMacroView received:", data);
            setMacroData(data);
            setViewMode("macro");
            setError(null);
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            console.error("❌ マクロビュー変換エラー:", err);
          }
          break;
        }
        default:
          console.log("⚠️  Unknown message type:", message.type);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (error) {
    return (
      <div style={styles.centerFill}>
        <div>
          <h2 style={{ color: "#ef4444" }}>エラーが発生しました</h2>
          <p style={{ color: "#ef4444" }}>{error}</p>
        </div>
      </div>
    );
  }

  if (viewMode === "macro" && macroData) {
    return (
      <MacroView
        data={macroData}
        onSwitchToMicro={
          nodes.length > 0 ? () => setViewMode("micro") : undefined
        }
      />
    );
  }

  if (viewMode === "micro" && nodes.length > 0) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "#1e1e1e",
        }}
      >
        {/* テンプレート選択バー */}
        <DiagramTypeBar
          current={diagramType}
          aiReason={aiReason}
          onChange={handleDiagramTypeChange}
          onSwitchToMacro={macroData ? () => setViewMode("macro") : undefined}
        />
        <div style={{ flex: 1, minHeight: 0 }}>
          <FlowChart
            nodes={nodes}
            edges={edges}
          />
        </div>
      </div>
    );
  }

  // 初期状態（データなし）
  return (
    <div style={{ ...styles.centerFill, flexDirection: "column", gap: "20px" }}>
      <div style={{ textAlign: "center" }}>
        <h3 style={{ color: "#60a5fa", marginBottom: "10px" }}>
          📊 Prism Code
        </h3>
        <p style={{ marginBottom: "20px", color: "#9ca3af" }}>
          TypeScriptファイルを開いて、下のボタンをクリックしてください
        </p>
      </div>

      <button
        type="button"
        onClick={handleVisualize}
        style={styles.primaryButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.3)";
        }}
      >
        🔍 現在のファイルを可視化
      </button>

      <div style={{ fontSize: "12px", color: "#6b7280", textAlign: "center" }}>
        または Cmd+Shift+P →「Prism Code: コードを可視化」
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// テンプレート選択バー
// ─────────────────────────────────────────────────────────────────────────────

interface DiagramTypeBarProps {
  current: DiagramType;
  aiReason: string | null;
  onChange: (type: DiagramType) => void;
  onSwitchToMacro?: () => void;
}

function DiagramTypeBar({
  current,
  aiReason,
  onChange,
  onSwitchToMacro,
}: DiagramTypeBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "6px 10px",
        background: "#252526",
        borderBottom: "1px solid #3e3e42",
        flexShrink: 0,
        overflowX: "auto",
      }}
    >
      {/* AI選択ラベル */}
      {aiReason && (
        <span
          title={aiReason}
          style={{
            fontSize: "10px",
            color: "#a78bfa",
            background: "#2d1f4e",
            borderRadius: "4px",
            padding: "2px 6px",
            marginRight: "6px",
            whiteSpace: "nowrap",
            cursor: "help",
            flexShrink: 0,
          }}
        >
          ✨ AI選択
        </span>
      )}

      {/* テンプレートボタン */}
      {DIAGRAM_TEMPLATES.map(({ type, icon, label }) => {
        const isActive = current === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            title={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 10px",
              fontSize: "12px",
              fontWeight: isActive ? "bold" : "normal",
              color: isActive ? "#fff" : "#9ca3af",
              background: isActive ? "#4f46e5" : "transparent",
              border: isActive ? "1px solid #6366f1" : "1px solid transparent",
              borderRadius: "5px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = "#374151";
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = "transparent";
            }}
          >
            {icon} {label}
          </button>
        );
      })}

      {/* マクロビュー切り替えボタン */}
      {onSwitchToMacro && (
        <button
          type="button"
          onClick={onSwitchToMacro}
          title="マクロビュー（俯瞰）に切り替え"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "3px 10px",
            fontSize: "12px",
            color: "#9ca3af",
            background: "transparent",
            border: "1px solid #555",
            borderRadius: "5px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            marginLeft: "auto",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#374151";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#9ca3af";
          }}
        >
          🔭 マクロビュー
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 共通スタイル
// ─────────────────────────────────────────────────────────────────────────────

const styles = {
  centerFill: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1e1e1e",
    color: "#9ca3af",
    fontSize: "14px",
    padding: "20px",
  } as React.CSSProperties,

  primaryButton: {
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#fff",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
    transition: "transform 0.2s, box-shadow 0.2s",
  } as React.CSSProperties,
};

export default App;
