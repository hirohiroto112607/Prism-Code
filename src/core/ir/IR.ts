/**
 * ソースコード上の位置情報
 */
export interface SourceLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

/**
 * 可視化テンプレートの種類
 * AIがコードを解析して最適な図を自動選択する
 */
export type DiagramType =
  | "flowchart" // 制御フロー（デフォルト・if/for/while等）
  | "class-diagram" // クラス・インターフェース構造（class/interface/extends）
  | "screen-transition" // 画面遷移（React Router / Next.js / navigate()）
  | "sequence-diagram" // 関数呼び出し順序（async/await チェーン・APIコール）
  | "state-machine" // 状態遷移（useState / useReducer / XState）
  | "dependency-graph"; // モジュール依存関係（import/export が主体のファイル）

/**
 * 中間表現（Intermediate Representation）
 * 言語非依存の共通フォーマット
 */
export interface IR {
  version: string;
  metadata: IRMetadata;
  nodes: IRNode[];
  edges: IREdge[];
}

/**
 * IRのメタデータ
 */
export interface IRMetadata {
  sourceLanguage: string;
  sourceFile: string;
  timestamp: number;
  diagramType: DiagramType; // AIが選択した可視化テンプレート（未指定時は 'flowchart'）
  aiReason?: string; // AI選択の理由（デバッグ・UI表示用）
}

/**
 * IRノードの型（Union Type）
 */
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
// 既存ノード型（flowchart テンプレート）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 関数ノード
 */
export interface IRFunctionNode {
  id: string;
  type: "function";
  name: string;
  parameters: string[];
  returnType?: string;
  bodyNodeIds: string[]; // 関数本体のノードID
  location: SourceLocation;
}

/**
 * 制御フローノード（if, for, while等）
 */
export interface IRControlFlowNode {
  id: string;
  type: "if" | "for" | "while";
  condition?: string;
  branches: {
    [key: string]: string[]; // ブランチ名 → ノードID[]
  };
  location: SourceLocation;
}

/**
 * プロセスノード（変数宣言、return文、式文等）
 */
export interface IRProcessNode {
  id: string;
  type: "variable" | "return" | "expression";
  label: string; // 表示用のラベル
  details?: string; // 詳細情報
  location: SourceLocation;
}

/**
 * 開始ノード
 */
export interface IRStartNode {
  id: string;
  type: "start";
  label: string;
}

/**
 * 終了ノード
 */
export interface IREndNode {
  id: string;
  type: "end";
  label: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// class-diagram テンプレート用ノード
// ─────────────────────────────────────────────────────────────────────────────

/**
 * クラス・インターフェースノード
 */
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

/**
 * 画面・ページノード
 */
export interface IRScreenNode {
  id: string;
  type: "screen";
  name: string; // 画面名（例: 'ホーム', 'ログイン'）
  path?: string; // URLパス（例: '/home', '/login'）
  component?: string; // Reactコンポーネント名（例: 'HomeScreen'）
  location: SourceLocation;
}

// ─────────────────────────────────────────────────────────────────────────────
// sequence-diagram テンプレート用ノード
// ─────────────────────────────────────────────────────────────────────────────

/**
 * シーケンス図のアクター（関数・クラス・モジュール）
 */
export interface IRActorNode {
  id: string;
  type: "actor";
  name: string;
  kind: "function" | "class" | "module" | "external";
  location?: SourceLocation;
}

/**
 * シーケンス図のメッセージ（関数呼び出し）
 */
export interface IRMessageNode {
  id: string;
  type: "message";
  label: string; // 呼び出し内容（例: 'fetchUser(id)'）
  async: boolean; // 非同期呼び出しかどうか
  returnLabel?: string; // 返り値の説明
  location?: SourceLocation;
}

// ─────────────────────────────────────────────────────────────────────────────
// state-machine テンプレート用ノード
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 状態遷移ノード
 */
export interface IRStateNode {
  id: string;
  type: "state";
  name: string;
  initial: boolean; // 初期状態かどうか
  final: boolean; // 最終状態かどうか
  actions?: string[]; // onEntry / onExit アクション
  location?: SourceLocation;
}

// ─────────────────────────────────────────────────────────────────────────────
// エッジ型
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IRエッジ（ノード間の接続）
 * type はテンプレートに応じて拡張
 */
export interface IREdge {
  id: string;
  source: string; // ソースノードのID
  target: string; // ターゲットノードのID
  label?: string; // エッジのラベル（"true", "false", "extends"等）
  type:
    | "control" // 制御フロー（flowchart）
    | "data" // データフロー（flowchart）
    | "inherits" // 継承（class-diagram: extends）
    | "implements" // 実装（class-diagram: implements）
    | "uses" // 使用関係（class-diagram / dependency-graph）
    | "calls" // 呼び出し（sequence-diagram）
    | "navigates" // 画面遷移（screen-transition）
    | "transition"; // 状態遷移（state-machine）
}
