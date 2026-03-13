/**
 * IRの型定義（Extension側の src/core/ir/IR.ts と同期して管理）
 */

export interface SourceLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// DiagramType
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 可視化テンプレートの種類
 * AIがコードを解析して最適な図を自動選択する
 */
export type DiagramType =
  | "flowchart" // 制御フロー（デフォルト・if/for/while等）
  | "class-diagram" // クラス・インターフェース構造
  | "screen-transition" // 画面遷移（React Router / Next.js）
  | "sequence-diagram" // 関数呼び出し順序（async/await チェーン）
  | "state-machine" // 状態遷移（useState / useReducer / XState）
  | "dependency-graph"; // モジュール依存関係（import/export）

// ─────────────────────────────────────────────────────────────────────────────
// IR ルート
// ─────────────────────────────────────────────────────────────────────────────

export interface IR {
  version: string;
  metadata: IRMetadata;
  nodes: IRNode[];
  edges: IREdge[];
}

export interface IRMetadata {
  sourceLanguage: string;
  sourceFile: string;
  timestamp: number;
  diagramType: DiagramType; // AIが選択した可視化テンプレート（未指定時は 'flowchart'）
  aiReason?: string; // AI選択の理由（UI表示用）
}

// ─────────────────────────────────────────────────────────────────────────────
// IRNode Union Type
// ─────────────────────────────────────────────────────────────────────────────

export type IRNode =
  | IRFunctionNode
  | IRControlFlowNode
  | IRProcessNode
  | IRStartNode
  | IREndNode
  | IRClassNode
  | IRScreenNode
  | IRActorNode
  | IRMessageNode
  | IRStateNode;

// ─────────────────────────────────────────────────────────────────────────────
// flowchart テンプレート用ノード
// ─────────────────────────────────────────────────────────────────────────────

export interface IRFunctionNode {
  id: string;
  type: "function";
  name: string;
  parameters: string[];
  returnType?: string;
  bodyNodeIds: string[];
  location: SourceLocation;
}

export interface IRControlFlowNode {
  id: string;
  type: "if" | "for" | "while";
  condition?: string;
  branches: {
    [key: string]: string[];
  };
  location: SourceLocation;
}

export interface IRProcessNode {
  id: string;
  type: "variable" | "return" | "expression";
  label: string;
  details?: string;
  location: SourceLocation;
}

export interface IRStartNode {
  id: string;
  type: "start";
  label: string;
}

export interface IREndNode {
  id: string;
  type: "end";
  label: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// class-diagram テンプレート用ノード
// ─────────────────────────────────────────────────────────────────────────────

export interface IRClassNode {
  id: string;
  type: "class";
  name: string;
  kind: "class" | "interface" | "abstract" | "enum";
  properties: Array<{
    name: string;
    valueType: string;
    access: "public" | "protected" | "private";
  }>;
  methods: Array<{
    name: string;
    returnType: string;
    params: string[];
    access: "public" | "protected" | "private";
  }>;
  location: SourceLocation;
}

// ─────────────────────────────────────────────────────────────────────────────
// screen-transition テンプレート用ノード
// ─────────────────────────────────────────────────────────────────────────────

export interface IRScreenNode {
  id: string;
  type: "screen";
  name: string;
  path?: string;
  component?: string;
  location: SourceLocation;
}

// ─────────────────────────────────────────────────────────────────────────────
// sequence-diagram テンプレート用ノード
// ─────────────────────────────────────────────────────────────────────────────

export interface IRActorNode {
  id: string;
  type: "actor";
  name: string;
  kind: "function" | "class" | "module" | "external";
  location?: SourceLocation;
}

export interface IRMessageNode {
  id: string;
  type: "message";
  label: string;
  async: boolean;
  returnLabel?: string;
  location?: SourceLocation;
}

// ─────────────────────────────────────────────────────────────────────────────
// state-machine テンプレート用ノード
// ─────────────────────────────────────────────────────────────────────────────

export interface IRStateNode {
  id: string;
  type: "state";
  name: string;
  initial: boolean;
  final: boolean;
  actions?: string[];
  location?: SourceLocation;
}

// ─────────────────────────────────────────────────────────────────────────────
// エッジ型
// ─────────────────────────────────────────────────────────────────────────────

export interface IREdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type:
    | "control"
    | "data"
    | "inherits"
    | "implements"
    | "uses"
    | "calls"
    | "navigates"
    | "transition";
}
