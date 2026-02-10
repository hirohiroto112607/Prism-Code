/**
 * ソースコード上の位置情報
 */
export interface SourceLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

/**
 * 抽象構文木のルート
 */
export interface AST {
  type: 'Program';
  body: ASTNode[];
  sourceFile?: string;
}

/**
 * ASTノードの型（Union Type）
 */
export type ASTNode =
  | FunctionNode
  | IfStatementNode
  | ForStatementNode
  | WhileStatementNode
  | VariableDeclarationNode
  | ReturnStatementNode
  | ExpressionStatementNode;

/**
 * 関数宣言ノード
 */
export interface FunctionNode {
  type: 'FunctionDeclaration';
  name: string;
  parameters: Parameter[];
  body: ASTNode[];
  returnType?: string;
  location: SourceLocation;
}

/**
 * パラメータ
 */
export interface Parameter {
  name: string;
  type?: string;
}

/**
 * If文ノード
 */
export interface IfStatementNode {
  type: 'IfStatement';
  condition: string; // 簡略化のため文字列で保持
  thenBranch: ASTNode[];
  elseBranch?: ASTNode[];
  location: SourceLocation;
}

/**
 * For文ノード
 */
export interface ForStatementNode {
  type: 'ForStatement';
  initializer?: string;
  condition?: string;
  incrementor?: string;
  body: ASTNode[];
  location: SourceLocation;
}

/**
 * While文ノード
 */
export interface WhileStatementNode {
  type: 'WhileStatement';
  condition: string;
  body: ASTNode[];
  location: SourceLocation;
}

/**
 * 変数宣言ノード
 */
export interface VariableDeclarationNode {
  type: 'VariableDeclaration';
  name: string;
  varType?: string;
  initializer?: string;
  location: SourceLocation;
}

/**
 * Return文ノード
 */
export interface ReturnStatementNode {
  type: 'ReturnStatement';
  value?: string;
  location: SourceLocation;
}

/**
 * 式文ノード
 */
export interface ExpressionStatementNode {
  type: 'ExpressionStatement';
  expression: string;
  location: SourceLocation;
}
