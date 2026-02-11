import { AST, FunctionNode, ASTNode, Parameter } from '../parser/AST';
import { MacroViewData, FunctionSummary, FunctionCall } from '../ir/IR';

/**
 * ASTをマクロビュー用のデータに変換
 */
export class MacroViewTransformer {
  private functionIdCounter = 0;
  private callIdCounter = 0;

  /**
   * ASTをマクロビューデータに変換
   */
  transform(ast: AST, metadata: { language: string; file: string }): MacroViewData {
    const functions: FunctionSummary[] = [];
    const callGraph: FunctionCall[] = [];

    // 各関数を解析
    for (const node of ast.body) {
      if (node.type === 'FunctionDeclaration') {
        const summary = this.analyzeFunctionNode(node as FunctionNode);
        functions.push(summary);

        // 関数内の呼び出しを解析
        const calls = this.extractFunctionCalls(node as FunctionNode);
        callGraph.push(...calls);
      }
    }

    return {
      metadata: {
        sourceLanguage: metadata.language,
        sourceFile: metadata.file,
        timestamp: Date.now(),
      },
      functions,
      callGraph,
    };
  }

  /**
   * 関数ノードを解析してサマリーを作成
   */
  private analyzeFunctionNode(node: FunctionNode): FunctionSummary {
    const id = `func_${this.functionIdCounter++}`;

    // 行数を計算
    const lineCount = node.location.end.line - node.location.start.line + 1;

    // ループと条件分岐の有無をチェック
    const hasLoops = this.checkHasLoops(node.body);
    const hasConditionals = this.checkHasConditionals(node.body);

    // 循環的複雑度を計算（簡易版）
    const complexity = this.calculateComplexity(node.body);

    // パラメータを文字列配列に変換
    const parameters = node.parameters.map((p) =>
      p.type ? `${p.name}: ${p.type}` : p.name
    );

    return {
      id,
      name: node.name,
      parameters,
      returnType: node.returnType,
      lineCount,
      complexity,
      location: node.location,
      hasLoops,
      hasConditionals,
    };
  }

  /**
   * ループが含まれているかチェック
   */
  private checkHasLoops(body: ASTNode[]): boolean {
    for (const node of body) {
      if (node.type === 'ForStatement' || node.type === 'WhileStatement') {
        return true;
      }
      // ネストした構造も再帰的にチェック
      if (node.type === 'IfStatement') {
        if (
          this.checkHasLoops(node.thenBranch) ||
          (node.elseBranch && this.checkHasLoops(node.elseBranch))
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 条件分岐が含まれているかチェック
   */
  private checkHasConditionals(body: ASTNode[]): boolean {
    for (const node of body) {
      if (node.type === 'IfStatement') {
        return true;
      }
      // ループ内の条件分岐もチェック
      if (node.type === 'ForStatement' || node.type === 'WhileStatement') {
        if (this.checkHasConditionals(node.body)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 循環的複雑度を計算（簡易版）
   * 1 + 分岐点の数
   */
  private calculateComplexity(body: ASTNode[]): number {
    let complexity = 1; // 基本パス

    for (const node of body) {
      if (node.type === 'IfStatement') {
        complexity++; // if文で1増加
        complexity += this.calculateComplexity(node.thenBranch);
        if (node.elseBranch) {
          complexity += this.calculateComplexity(node.elseBranch);
        }
      } else if (node.type === 'ForStatement' || node.type === 'WhileStatement') {
        complexity++; // ループで1増加
        complexity += this.calculateComplexity(node.body);
      }
    }

    return complexity;
  }

  /**
   * 関数内の関数呼び出しを抽出
   */
  private extractFunctionCalls(node: FunctionNode): FunctionCall[] {
    const calls: FunctionCall[] = [];
    const callerName = node.name;

    // 関数本体から関数呼び出しを検索
    this.findCallExpressionsRecursive(node.body, callerName, calls);

    return calls;
  }

  /**
   * 再帰的に関数呼び出しを検索
   */
  private findCallExpressionsRecursive(
    body: ASTNode[],
    callerName: string,
    calls: FunctionCall[]
  ): void {
    for (const node of body) {
      // CallExpressionを検出（実装は簡易版）
      if (node.type === 'ExpressionStatement' && node.expression) {
        // ここでは仮実装として、式文に含まれる識別子を関数呼び出しとみなす
        // 本格実装では、CallExpressionノードを追加する必要がある
        const callMatch = node.expression.match(/(\w+)\(/);
        if (callMatch) {
          const calleeName = callMatch[1];
          calls.push({
            id: `call_${this.callIdCounter++}`,
            caller: callerName,
            callee: calleeName,
            location: node.location,
          });
        }
      }

      // 再帰的に探索
      if (node.type === 'IfStatement') {
        this.findCallExpressionsRecursive(node.thenBranch, callerName, calls);
        if (node.elseBranch) {
          this.findCallExpressionsRecursive(node.elseBranch, callerName, calls);
        }
      } else if (node.type === 'ForStatement' || node.type === 'WhileStatement') {
        this.findCallExpressionsRecursive(node.body, callerName, calls);
      }
    }
  }
}
