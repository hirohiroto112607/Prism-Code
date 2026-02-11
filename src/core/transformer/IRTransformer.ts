import { AST, ASTNode } from '../parser/AST';
import { IR, IRNode, IREdge, IRMetadata } from '../ir/IR';

/**
 * AST → IR 変換クラス
 * 言語依存のASTを言語非依存のIRに変換する
 */
export class IRTransformer {
  private nodeIdCounter = 0;
  private edgeIdCounter = 0;
  private nodes: IRNode[] = [];
  private edges: IREdge[] = [];

  /**
   * ASTをIRに変換
   */
  transform(ast: AST, metadata: { language: string; file: string }): IR {
    // 初期化
    this.nodeIdCounter = 0;
    this.edgeIdCounter = 0;
    this.nodes = [];
    this.edges = [];

    // 各トップレベルノードを変換
    ast.body.forEach((astNode) => {
      this.transformNode(astNode);
    });

    return {
      version: '1.0.0',
      metadata: {
        sourceLanguage: metadata.language,
        sourceFile: metadata.file,
        timestamp: Date.now(),
      },
      nodes: this.nodes,
      edges: this.edges,
    };
  }

  /**
   * ASTノードをIRノードに変換
   * @returns 変換されたノードの出口IDのリスト（制御フローの末端）
   */
  private transformNode(astNode: ASTNode): string[] {
    switch (astNode.type) {
      case 'FunctionDeclaration':
        return [this.transformFunction(astNode)];
      case 'IfStatement':
        return this.transformIf(astNode);
      case 'ForStatement':
        return this.transformFor(astNode);
      case 'WhileStatement':
        return this.transformWhile(astNode);
      case 'VariableDeclaration':
        return [this.transformVariable(astNode)];
      case 'ReturnStatement':
        return [this.transformReturn(astNode)];
      case 'ExpressionStatement':
        return [this.transformExpression(astNode)];
      default:
        console.warn('未対応のノード型:', astNode);
        return [this.generateNodeId()];
    }
  }

  /**
   * 関数宣言を変換
   */
  private transformFunction(fn: any): string {
    const startId = this.generateNodeId();
    const endId = this.generateNodeId();

    // 開始ノード
    this.nodes.push({
      id: startId,
      type: 'start',
      label: `関数開始: ${fn.name}`,
    });

    // 関数本体のノードを変換
    let currentExits: string[] = [startId]; // 現在の出口ノード（次の文の入口になる）

    for (const stmt of fn.body) {
      const result = this.transformNode(stmt); // [entryId, ...exitIds]
      const entryId = result[0]; // このノードの入口ID
      const exitIds = result.length > 1 ? result.slice(1) : [entryId]; // 出口ID（なければ入口IDを使用）

      // 前の出口から現在の入口に接続
      for (const exitId of currentExits) {
        this.addEdge(exitId, entryId);
      }

      // 現在の出口を更新
      currentExits = exitIds;
    }

    // 終了ノード
    this.nodes.push({
      id: endId,
      type: 'end',
      label: `関数終了: ${fn.name}`,
    });

    // 最後の出口から終了ノードへ接続
    for (const exitId of currentExits) {
      this.addEdge(exitId, endId);
    }

    return startId;
  }

  /**
   * If文を変換
   * @returns [入口ID（ifノード）, ...出口IDのリスト（then/else分岐の末端）]
   */
  private transformIf(ifNode: any): string[] {
    const nodeId = this.generateNodeId();

    // 制御フローノードを追加
    this.nodes.push({
      id: nodeId,
      type: 'if',
      condition: ifNode.condition,
      branches: {
        then: [],
        else: [],
      },
      location: ifNode.location,
    });

    // Then分岐のノードを変換
    let thenExits: string[] = [nodeId]; // then分岐の出口（デフォルトはifノード自体）
    if (ifNode.thenBranch && ifNode.thenBranch.length > 0) {
      let currentExits = [nodeId];
      let isFirst = true;

      for (const stmt of ifNode.thenBranch) {
        const result = this.transformNode(stmt);
        const entryId = result[0];
        const exitIds = result.length > 1 ? result.slice(1) : [entryId];

        // 前の出口から現在の入口に接続
        for (const exitId of currentExits) {
          this.addEdge(exitId, entryId, isFirst ? 'true' : undefined);
        }

        currentExits = exitIds;
        isFirst = false;
      }
      thenExits = currentExits;
    }

    // Else分岐のノードを変換
    let elseExits: string[] = [nodeId]; // else分岐の出口（デフォルトはifノード自体）
    if (ifNode.elseBranch && ifNode.elseBranch.length > 0) {
      let currentExits = [nodeId];
      let isFirst = true;

      for (const stmt of ifNode.elseBranch) {
        const result = this.transformNode(stmt);
        const entryId = result[0];
        const exitIds = result.length > 1 ? result.slice(1) : [entryId];

        // 前の出口から現在の入口に接続
        for (const exitId of currentExits) {
          this.addEdge(exitId, entryId, isFirst ? 'false' : undefined);
        }

        currentExits = exitIds;
        isFirst = false;
      }
      elseExits = currentExits;
    }

    // 入口ID + 両方の分岐の出口IDを返す
    // 出口がifノード自体の場合は除外（空の分岐を除く）
    const allExits = [...thenExits, ...elseExits];
    const uniqueExits = Array.from(new Set(allExits)); // 重複を除去

    return [nodeId, ...uniqueExits];
  }

  /**
   * For文を変換
   * @returns [入口ID（ループノード）, 出口ID（ループ終了時、ループノード自体）]
   */
  private transformFor(forNode: any): string[] {
    const nodeId = this.generateNodeId();

    // 制御フローノードを追加
    this.nodes.push({
      id: nodeId,
      type: 'for',
      condition: forNode.condition,
      branches: {
        body: [],
      },
      location: forNode.location,
    });

    // ループ本体のノードを変換
    if (forNode.body && forNode.body.length > 0) {
      let currentExits = [nodeId];
      for (const stmt of forNode.body) {
        const stmtExits = this.transformNode(stmt);
        const entryId = stmtExits[0];

        // 前の出口から現在の入口に接続
        for (const exitId of currentExits) {
          this.addEdge(exitId, entryId, currentExits[0] === nodeId ? 'ループ継続' : undefined);
        }

        currentExits = stmtExits;
      }

      // ループ本体の最後からループ開始へのバックエッジ
      for (const exitId of currentExits) {
        this.addEdge(exitId, nodeId, 'ループ');
      }
    }

    // 入口と出口は同じ（ループノード自体）
    return [nodeId, nodeId];
  }

  /**
   * While文を変換
   * @returns [入口ID（ループノード）, 出口ID（ループ終了時、ループノード自体）]
   */
  private transformWhile(whileNode: any): string[] {
    const nodeId = this.generateNodeId();

    // 制御フローノードを追加
    this.nodes.push({
      id: nodeId,
      type: 'while',
      condition: whileNode.condition,
      branches: {
        body: [],
      },
      location: whileNode.location,
    });

    // ループ本体のノードを変換
    if (whileNode.body && whileNode.body.length > 0) {
      let currentExits = [nodeId];
      for (const stmt of whileNode.body) {
        const stmtExits = this.transformNode(stmt);
        const entryId = stmtExits[0];

        // 前の出口から現在の入口に接続
        for (const exitId of currentExits) {
          this.addEdge(exitId, entryId, currentExits[0] === nodeId ? 'true' : undefined);
        }

        currentExits = stmtExits;
      }

      // ループ本体の最後からループ開始へのバックエッジ
      for (const exitId of currentExits) {
        this.addEdge(exitId, nodeId, 'ループ');
      }
    }

    // 入口と出口は同じ（ループノード自体）
    return [nodeId, nodeId];
  }

  /**
   * 変数宣言を変換
   */
  private transformVariable(varNode: any): string {
    const nodeId = this.generateNodeId();

    const label = varNode.initializer
      ? `${varNode.name} = ${varNode.initializer}`
      : varNode.name;

    this.nodes.push({
      id: nodeId,
      type: 'variable',
      label,
      details: varNode.varType,
      location: varNode.location,
    });

    return nodeId;
  }

  /**
   * Return文を変換
   */
  private transformReturn(returnNode: any): string {
    const nodeId = this.generateNodeId();

    const label = returnNode.value ? `return ${returnNode.value}` : 'return';

    this.nodes.push({
      id: nodeId,
      type: 'return',
      label,
      location: returnNode.location,
    });

    return nodeId;
  }

  /**
   * 式文を変換
   */
  private transformExpression(exprNode: any): string {
    const nodeId = this.generateNodeId();

    this.nodes.push({
      id: nodeId,
      type: 'expression',
      label: exprNode.expression,
      location: exprNode.location,
    });

    return nodeId;
  }

  /**
   * エッジを追加
   */
  private addEdge(source: string, target: string, label?: string): void {
    this.edges.push({
      id: this.generateEdgeId(),
      source,
      target,
      label,
      type: 'control',
    });
  }

  /**
   * ノードIDを生成
   */
  private generateNodeId(): string {
    return `node_${this.nodeIdCounter++}`;
  }

  /**
   * エッジIDを生成
   */
  private generateEdgeId(): string {
    return `edge_${this.edgeIdCounter++}`;
  }
}
