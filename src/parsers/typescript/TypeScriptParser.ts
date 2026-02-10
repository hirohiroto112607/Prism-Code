import { Project, SourceFile, SyntaxKind, Node } from 'ts-morph';
import { IParser } from '../../core/parser/IParser';
import {
  AST,
  ASTNode,
  FunctionNode,
  IfStatementNode,
  ForStatementNode,
  WhileStatementNode,
  VariableDeclarationNode,
  ReturnStatementNode,
  ExpressionStatementNode,
  SourceLocation,
  Parameter
} from '../../core/parser/AST';

/**
 * TypeScriptパーサー
 * ts-morphを使用してTypeScriptコードを解析する
 */
export class TypeScriptParser implements IParser {
  private project: Project;

  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99, // Latest
      },
    });
  }

  parse(code: string, filePath?: string): AST {
    const sourceFile = this.project.createSourceFile(
      filePath || 'temp.ts',
      code,
      { overwrite: true }
    );

    return {
      type: 'Program',
      body: this.parseSourceFile(sourceFile),
      sourceFile: filePath,
    };
  }

  getSupportedLanguage(): string {
    return 'TypeScript';
  }

  getSupportedExtensions(): string[] {
    return ['.ts', '.tsx', '.js', '.jsx'];
  }

  /**
   * SourceFileを解析してASTノードの配列を返す
   */
  private parseSourceFile(sourceFile: SourceFile): ASTNode[] {
    const nodes: ASTNode[] = [];

    // 関数宣言を解析
    sourceFile.getFunctions().forEach((fn) => {
      const functionNode = this.parseFunctionDeclaration(fn);
      if (functionNode) {
        nodes.push(functionNode);
      }
    });

    // アロー関数を含む変数宣言を解析
    sourceFile.getVariableDeclarations().forEach((varDecl) => {
      const initializer = varDecl.getInitializer();
      if (initializer && Node.isArrowFunction(initializer)) {
        const functionNode = this.parseArrowFunction(
          varDecl.getName(),
          initializer
        );
        if (functionNode) {
          nodes.push(functionNode);
        }
      }
    });

    return nodes;
  }

  /**
   * 関数宣言を解析
   */
  private parseFunctionDeclaration(fn: any): FunctionNode | null {
    try {
      const name = fn.getName() || 'anonymous';
      const parameters: Parameter[] = fn.getParameters().map((param: any) => ({
        name: param.getName(),
        type: param.getTypeNode()?.getText(),
      }));

      const body = this.parseStatements(fn.getBody()?.getStatements() || []);
      const location = this.getLocation(fn);

      return {
        type: 'FunctionDeclaration',
        name,
        parameters,
        body,
        returnType: fn.getReturnTypeNode()?.getText(),
        location,
      };
    } catch (error) {
      console.error('関数解析エラー:', error);
      return null;
    }
  }

  /**
   * アロー関数を解析
   */
  private parseArrowFunction(name: string, arrow: any): FunctionNode | null {
    try {
      const parameters: Parameter[] = arrow.getParameters().map((param: any) => ({
        name: param.getName(),
        type: param.getTypeNode()?.getText(),
      }));

      const bodyNode = arrow.getBody();
      let body: ASTNode[] = [];

      if (Node.isBlock(bodyNode)) {
        body = this.parseStatements(bodyNode.getStatements());
      } else {
        // 式の場合はreturn文として扱う
        body = [
          {
            type: 'ReturnStatement',
            value: bodyNode.getText(),
            location: this.getLocation(bodyNode),
          },
        ];
      }

      return {
        type: 'FunctionDeclaration',
        name,
        parameters,
        body,
        returnType: arrow.getReturnTypeNode()?.getText(),
        location: this.getLocation(arrow),
      };
    } catch (error) {
      console.error('アロー関数解析エラー:', error);
      return null;
    }
  }

  /**
   * 文のリストを解析
   */
  private parseStatements(statements: any[]): ASTNode[] {
    const nodes: ASTNode[] = [];

    for (const stmt of statements) {
      const node = this.parseStatement(stmt);
      if (node) {
        nodes.push(node);
      }
    }

    return nodes;
  }

  /**
   * 単一の文を解析
   */
  private parseStatement(stmt: any): ASTNode | null {
    try {
      const kind = stmt.getKind();

      switch (kind) {
        case SyntaxKind.IfStatement:
          return this.parseIfStatement(stmt);
        case SyntaxKind.ForStatement:
          return this.parseForStatement(stmt);
        case SyntaxKind.WhileStatement:
          return this.parseWhileStatement(stmt);
        case SyntaxKind.VariableStatement:
          return this.parseVariableStatement(stmt);
        case SyntaxKind.ReturnStatement:
          return this.parseReturnStatement(stmt);
        case SyntaxKind.ExpressionStatement:
          return this.parseExpressionStatement(stmt);
        default:
          // その他の文は式文として扱う
          return {
            type: 'ExpressionStatement',
            expression: stmt.getText(),
            location: this.getLocation(stmt),
          };
      }
    } catch (error) {
      console.error('文解析エラー:', error);
      return null;
    }
  }

  /**
   * If文を解析
   */
  private parseIfStatement(stmt: any): IfStatementNode {
    const condition = stmt.getExpression().getText();
    const thenBranch = this.parseStatements(
      stmt.getThenStatement().getKind() === SyntaxKind.Block
        ? stmt.getThenStatement().getStatements()
        : [stmt.getThenStatement()]
    );

    const elseStmt = stmt.getElseStatement();
    const elseBranch = elseStmt
      ? this.parseStatements(
          elseStmt.getKind() === SyntaxKind.Block
            ? elseStmt.getStatements()
            : [elseStmt]
        )
      : undefined;

    return {
      type: 'IfStatement',
      condition,
      thenBranch,
      elseBranch,
      location: this.getLocation(stmt),
    };
  }

  /**
   * For文を解析
   */
  private parseForStatement(stmt: any): ForStatementNode {
    const initializer = stmt.getInitializer()?.getText();
    const condition = stmt.getCondition()?.getText();
    const incrementor = stmt.getIncrementor()?.getText();

    const bodyStmt = stmt.getStatement();
    const body = this.parseStatements(
      bodyStmt.getKind() === SyntaxKind.Block
        ? bodyStmt.getStatements()
        : [bodyStmt]
    );

    return {
      type: 'ForStatement',
      initializer,
      condition,
      incrementor,
      body,
      location: this.getLocation(stmt),
    };
  }

  /**
   * While文を解析
   */
  private parseWhileStatement(stmt: any): WhileStatementNode {
    const condition = stmt.getExpression().getText();
    const bodyStmt = stmt.getStatement();
    const body = this.parseStatements(
      bodyStmt.getKind() === SyntaxKind.Block
        ? bodyStmt.getStatements()
        : [bodyStmt]
    );

    return {
      type: 'WhileStatement',
      condition,
      body,
      location: this.getLocation(stmt),
    };
  }

  /**
   * 変数宣言文を解析
   */
  private parseVariableStatement(stmt: any): VariableDeclarationNode | null {
    const declarations = stmt.getDeclarationList().getDeclarations();
    if (declarations.length === 0) {
      return null;
    }

    // 最初の宣言のみを扱う（簡略化のため）
    const decl = declarations[0];
    return {
      type: 'VariableDeclaration',
      name: decl.getName(),
      varType: decl.getTypeNode()?.getText(),
      initializer: decl.getInitializer()?.getText(),
      location: this.getLocation(stmt),
    };
  }

  /**
   * Return文を解析
   */
  private parseReturnStatement(stmt: any): ReturnStatementNode {
    return {
      type: 'ReturnStatement',
      value: stmt.getExpression()?.getText(),
      location: this.getLocation(stmt),
    };
  }

  /**
   * 式文を解析
   */
  private parseExpressionStatement(stmt: any): ExpressionStatementNode {
    return {
      type: 'ExpressionStatement',
      expression: stmt.getExpression().getText(),
      location: this.getLocation(stmt),
    };
  }

  /**
   * ノードの位置情報を取得
   */
  private getLocation(node: any): SourceLocation {
    const start = node.getStartLineNumber();
    const end = node.getEndLineNumber();

    return {
      start: { line: start, column: 0 },
      end: { line: end, column: 0 },
    };
  }
}
