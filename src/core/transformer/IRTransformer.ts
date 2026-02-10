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
   * @returns 変換されたノードのID
   */
  private transformNode(astNode: ASTNode): string {
    switch (astNode.type) {
      case 'FunctionDeclaration':
        return this.transformFunction(astNode);
      case 'IfStatement':
        return this.transformIf(astNode);
      case 'ForStatement':
        return this.transformFor(astNode);
      case 'WhileStatement':
        return this.transformWhile(astNode);
      case 'VariableDeclaration':
        return this.transformVariable(astNode);
      case 'ReturnStatement':
        return this.transformReturn(astNode);
      case 'ExpressionStatement':
        return this.transformExpression(astNode);
      default:
        console.warn('未対応のノード型:', astNode);
        return this.generateNodeId();
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
    const bodyIds: string[] = [];
    for (const stmt of fn.body) {
      const nodeId = this.transformNode(stmt);
      bodyIds.push(nodeId);
    }

    // 終了ノード
    this.nodes.push({
      id: endId,
      type: 'end',
      label: `関数終了: ${fn.name}`,
    });

    // エッジを接続
    if (bodyIds.length > 0) {
      // 開始 → 最初のノード
      this.addEdge(startId, bodyIds[0]);

      // ノード間を順次接続
      for (let i = 0; i < bodyIds.length - 1; i++) {
        this.addEdge(bodyIds[i], bodyIds[i + 1]);
      }

      // 最後のノード → 終了
      this.addEdge(bodyIds[bodyIds.length - 1], endId);
    } else {
      // 本体が空の場合は直接接続
      this.addEdge(startId, endId);
    }

    return startId;
  }

  /**
   * If文を変換
   */
  private transformIf(ifNode: any): string {
    const nodeId = this.generateNodeId();
    const mergeId = this.generateNodeId(); // 分岐の合流点

    // Then分岐のノードを変換
    const thenIds: string[] = [];
    for (const stmt of ifNode.thenBranch) {
      const id = this.transformNode(stmt);
      thenIds.push(id);
    }

    // Else分岐のノードを変換
    const elseIds: string[] = [];
    if (ifNode.elseBranch) {
      for (const stmt of ifNode.elseBranch) {
        const id = this.transformNode(stmt);
        elseIds.push(id);
      }
    }

    // 制御フローノードを追加
    this.nodes.push({
      id: nodeId,
      type: 'if',
      condition: ifNode.condition,
      branches: {
        then: thenIds,
        else: elseIds,
      },
      location: ifNode.location,
    });

    // 合流ノードを追加（プロセスノードとして）
    this.nodes.push({
      id: mergeId,
      type: 'expression',
      label: '合流',
      location: ifNode.location,
    });

    // エッジを接続
    if (thenIds.length > 0) {
      this.addEdge(nodeId, thenIds[0], 'true');
      // Then分岐内を接続
      for (let i = 0; i < thenIds.length - 1; i++) {
        this.addEdge(thenIds[i], thenIds[i + 1]);
      }
      // Then分岐の最後 → 合流
      this.addEdge(thenIds[thenIds.length - 1], mergeId);
    } else {
      this.addEdge(nodeId, mergeId, 'true');
    }

    if (elseIds.length > 0) {
      this.addEdge(nodeId, elseIds[0], 'false');
      // Else分岐内を接続
      for (let i = 0; i < elseIds.length - 1; i++) {
        this.addEdge(elseIds[i], elseIds[i + 1]);
      }
      // Else分岐の最後 → 合流
      this.addEdge(elseIds[elseIds.length - 1], mergeId);
    } else {
      this.addEdge(nodeId, mergeId, 'false');
    }

    return nodeId;
  }

  /**
   * For文を変換
   */
  private transformFor(forNode: any): string {
    const nodeId = this.generateNodeId();
    const exitId = this.generateNodeId(); // ループ終了後のノード

    // ループ本体のノードを変換
    const bodyIds: string[] = [];
    for (const stmt of forNode.body) {
      const id = this.transformNode(stmt);
      bodyIds.push(id);
    }

    // 制御フローノードを追加
    this.nodes.push({
      id: nodeId,
      type: 'for',
      condition: forNode.condition,
      branches: {
        body: bodyIds,
      },
      location: forNode.location,
    });

    // ループ終了ノード
    this.nodes.push({
      id: exitId,
      type: 'expression',
      label: 'ループ終了',
      location: forNode.location,
    });

    // エッジを接続
    if (bodyIds.length > 0) {
      this.addEdge(nodeId, bodyIds[0], 'ループ継続');
      // ループ本体内を接続
      for (let i = 0; i < bodyIds.length - 1; i++) {
        this.addEdge(bodyIds[i], bodyIds[i + 1]);
      }
      // ループ本体の最後 → ループ開始（バックエッジ）
      this.addEdge(bodyIds[bodyIds.length - 1], nodeId, 'ループ');
    }

    // ループ終了条件 → 終了ノード
    this.addEdge(nodeId, exitId, 'ループ終了');

    return nodeId;
  }

  /**
   * While文を変換
   */
  private transformWhile(whileNode: any): string {
    const nodeId = this.generateNodeId();
    const exitId = this.generateNodeId();

    // ループ本体のノードを変換
    const bodyIds: string[] = [];
    for (const stmt of whileNode.body) {
      const id = this.transformNode(stmt);
      bodyIds.push(id);
    }

    // 制御フローノードを追加
    this.nodes.push({
      id: nodeId,
      type: 'while',
      condition: whileNode.condition,
      branches: {
        body: bodyIds,
      },
      location: whileNode.location,
    });

    // ループ終了ノード
    this.nodes.push({
      id: exitId,
      type: 'expression',
      label: 'ループ終了',
      location: whileNode.location,
    });

    // エッジを接続
    if (bodyIds.length > 0) {
      this.addEdge(nodeId, bodyIds[0], 'true');
      // ループ本体内を接続
      for (let i = 0; i < bodyIds.length - 1; i++) {
        this.addEdge(bodyIds[i], bodyIds[i + 1]);
      }
      // ループ本体の最後 → ループ開始
      this.addEdge(bodyIds[bodyIds.length - 1], nodeId, 'ループ');
    }

    // ループ終了
    this.addEdge(nodeId, exitId, 'false');

    return nodeId;
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
