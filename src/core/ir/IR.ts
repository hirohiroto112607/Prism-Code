import { SourceLocation } from '../parser/AST';

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
}

/**
 * IRノードの型（Union Type）
 */
export type IRNode =
  | IRFunctionNode
  | IRControlFlowNode
  | IRProcessNode
  | IRStartNode
  | IREndNode;

/**
 * 関数ノード
 */
export interface IRFunctionNode {
  id: string;
  type: 'function';
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
  type: 'if' | 'for' | 'while';
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
  type: 'variable' | 'return' | 'expression';
  label: string; // 表示用のラベル
  details?: string; // 詳細情報
  location: SourceLocation;
}

/**
 * 開始ノード
 */
export interface IRStartNode {
  id: string;
  type: 'start';
  label: string;
}

/**
 * 終了ノード
 */
export interface IREndNode {
  id: string;
  type: 'end';
  label: string;
}

/**
 * IRエッジ（ノード間の接続）
 */
export interface IREdge {
  id: string;
  source: string; // ソースノードのID
  target: string; // ターゲットノードのID
  label?: string; // エッジのラベル（"true", "false"等）
  type: 'control' | 'data'; // 制御フローかデータフローか
}

/**
 * マクロビュー用のデータ構造
 * システム全体の俯瞰図を表示するための情報
 */
export interface MacroViewData {
  metadata: IRMetadata;
  functions: FunctionSummary[];
  callGraph: FunctionCall[];
}

/**
 * 関数の概要情報
 */
export interface FunctionSummary {
  id: string;
  name: string;
  parameters: string[];
  returnType?: string;
  lineCount: number; // 関数の行数
  complexity: number; // 循環的複雑度（仮）
  location: SourceLocation;
  hasLoops: boolean; // ループを含むか
  hasConditionals: boolean; // 条件分岐を含むか
}

/**
 * 関数呼び出し関係
 */
export interface FunctionCall {
  id: string;
  caller: string; // 呼び出し元の関数ID
  callee: string; // 呼び出し先の関数名
  location: SourceLocation;
}
