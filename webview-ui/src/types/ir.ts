/**
 * IRの型定義（Extension側と同じ）
 */

export interface SourceLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

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
}

export type IRNode =
  | IRFunctionNode
  | IRControlFlowNode
  | IRProcessNode
  | IRStartNode
  | IREndNode;

export interface IRFunctionNode {
  id: string;
  type: 'function';
  name: string;
  parameters: string[];
  returnType?: string;
  bodyNodeIds: string[];
  location: SourceLocation;
}

export interface IRControlFlowNode {
  id: string;
  type: 'if' | 'for' | 'while';
  condition?: string;
  branches: {
    [key: string]: string[];
  };
  location: SourceLocation;
}

export interface IRProcessNode {
  id: string;
  type: 'variable' | 'return' | 'expression';
  label: string;
  details?: string;
  location: SourceLocation;
}

export interface IRStartNode {
  id: string;
  type: 'start';
  label: string;
}

export interface IREndNode {
  id: string;
  type: 'end';
  label: string;
}

export interface IREdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: 'control' | 'data';
}

/**
 * マクロビュー用のデータ構造
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
  lineCount: number;
  complexity: number;
  location: SourceLocation;
  hasLoops: boolean;
  hasConditionals: boolean;
}

/**
 * 関数呼び出し関係
 */
export interface FunctionCall {
  id: string;
  caller: string;
  callee: string;
  location: SourceLocation;
}
