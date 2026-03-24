/**
 * プロジェクト全体をスキャンしてインデックスを生成
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { TypeScriptParser } from "../../parsers/typescript/TypeScriptParser";
import type { AST } from "../parser/AST";
import { IRTransformer } from "../transformer/IRTransformer";
import type { IndexManager } from "./IndexManager";
import { SimpleScanner } from "./SimpleScanner";
import type {
  CallGraphEdge,
  FileIndexEntry,
  MacroFunctionInfo,
  ModuleGroup,
  ProjectIndex,
  ProjectMacroViewData,
} from "./types";

export class ProjectScanner {
  private indexManager: IndexManager;
  private parser: TypeScriptParser;
  private transformer: IRTransformer;

  constructor(indexManager: IndexManager) {
    this.indexManager = indexManager;
    this.parser = new TypeScriptParser();
    this.transformer = new IRTransformer();
  }

  /**
   * プロジェクト全体をスキャン
   */
  async scanProject(workspaceRoot: string): Promise<ProjectIndex> {
    console.log("プロジェクトスキャン開始:", workspaceRoot);

    const config = this.indexManager.getConfig();
    const excludePatterns = config?.excludePatterns || [];

    console.log("除外パターン:", excludePatterns);

    // SimpleScannerを常に使用（より正確な除外パターン適用）
    console.log("SimpleScannerでファイルを検索中...");
    const simpleScanner = new SimpleScanner();
    const filePaths = await simpleScanner.scanDirectory(
      workspaceRoot,
      excludePatterns,
    );
    console.log(`SimpleScannerで${filePaths.length}個のファイルを発見`);

    const fileEntries: FileIndexEntry[] = [];

    // 各ファイルを解析
    for (const filePath of filePaths) {
      try {
        const entry = await this.analyzeFile(filePath, workspaceRoot);
        if (entry) {
          fileEntries.push(entry);
        }
      } catch (error) {
        console.error(`ファイル解析エラー: ${filePath}`, error);
      }
    }

    // プロジェクトインデックスを更新または作成
    let projectIndex = this.indexManager.getProjectIndex();
    if (!projectIndex) {
      // インデックスが存在しない場合は新規作成
      projectIndex = {
        version: "1.0.0",
        projectName: path.basename(workspaceRoot),
        projectRoot: workspaceRoot,
        lastUpdated: new Date().toISOString(),
        files: [],
        modules: [],
        metadata: {
          totalFiles: 0,
          totalLines: 0,
          totalFunctions: 0,
          languages: [],
        },
      };
    }

    // ファイル情報とメタデータを更新
    projectIndex.files = fileEntries;
    projectIndex.lastUpdated = new Date().toISOString();
    projectIndex.metadata = {
      totalFiles: fileEntries.length,
      totalLines: fileEntries.reduce((sum, f) => sum + f.lineCount, 0),
      totalFunctions: fileEntries.reduce((sum, f) => sum + f.functionCount, 0),
      languages: [...new Set(fileEntries.map((f) => f.language))],
    };

    await this.indexManager.saveProjectIndex(projectIndex);

    console.log("プロジェクトスキャン完了");
    return projectIndex;
  }

  /**
   * ファイルを解析してFileIndexEntryを生成
   */
  private async analyzeFile(
    filePath: string,
    workspaceRoot: string,
  ): Promise<FileIndexEntry | undefined> {
    const relativePath = path.relative(workspaceRoot, filePath);

    // キャッシュをチェック
    const isCached = await this.indexManager.isFileCached(filePath);
    if (isCached) {
      console.log(`キャッシュヒット: ${relativePath}`);
      const projectIndex = this.indexManager.getProjectIndex();
      return projectIndex?.files.find((f) => f.filePath === relativePath);
    }

    console.log(`解析中: ${relativePath}`);

    // ファイルを読み込み
    const code = await fs.readFile(filePath, "utf-8");
    const fileHash = await this.indexManager.calculateFileHash(filePath);

    // パース
    const ast = this.parser.parse(code, filePath);

    // IR変換
    const ir = this.transformer.transform(ast, {
      language: this.detectLanguage(filePath),
      file: relativePath,
    });

    // IRをCacheEntry形式でキャッシュ（CacheManagerと互換性を保つ）
    const cacheEntry = {
      data: ir,
      timestamp: Date.now(),
      fileHash,
      filePath,
    };
    await this.indexManager.saveIRCache(filePath, cacheEntry);

    // メトリクスを計算
    const lineCount = code.split("\n").length;
    const functionCount = this.countFunctions(ast);
    const classCount = this.countClasses(ast);
    const complexity = this.calculateComplexity(ast);

    // import/exportを抽出
    const imports = this.extractImports(ast);
    const exports = this.extractExports(ast);

    const entry: FileIndexEntry = {
      filePath: relativePath,
      fileHash,
      language: this.detectLanguage(filePath),
      lastModified: new Date().toISOString(),
      lastAnalyzed: new Date().toISOString(),
      lineCount,
      functionCount,
      classCount,
      complexity,
      imports,
      exports,
    };

    return entry;
  }

  /**
   * マクロビューデータを生成
   */
  async generateMacroViewData(
    workspaceRoot: string,
  ): Promise<ProjectMacroViewData> {
    const projectIndex = this.indexManager.getProjectIndex();
    if (!projectIndex) {
      throw new Error("プロジェクトインデックスが初期化されていません");
    }

    // モジュールグループを生成（フォルダーベース）
    const modules = this.generateModuleGroups(projectIndex, workspaceRoot);

    // 関数情報を収集
    const functions = await this.collectFunctions(projectIndex, workspaceRoot);

    // コールグラフを生成（簡易版）
    const callGraph: CallGraphEdge[] = [];

    const macroViewData: ProjectMacroViewData = {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      modules,
      functions,
      callGraph,
      metadata: {
        fileCount: projectIndex.files.length,
        functionCount: functions.length,
        moduleCount: modules.length,
      },
    };

    await this.indexManager.saveMacroViewData(macroViewData);

    return macroViewData;
  }

  /**
   * フォルダーベースでモジュールグループを生成
   */
  private generateModuleGroups(
    projectIndex: ProjectIndex,
    _workspaceRoot: string,
  ): ModuleGroup[] {
    const folderMap = new Map<string, FileIndexEntry[]>();

    // ファイルをフォルダーごとにグループ化
    for (const file of projectIndex.files) {
      const dir = path.dirname(file.filePath);
      if (!folderMap.has(dir)) {
        folderMap.set(dir, []);
      }
      folderMap.get(dir)?.push(file);
    }

    // モジュールグループを生成
    const modules: ModuleGroup[] = [];
    let moduleIdCounter = 0;

    for (const [folder, files] of folderMap.entries()) {
      const moduleId = `module_${moduleIdCounter++}`;
      const moduleName = folder === "." ? "Root" : path.basename(folder);

      const totalLines = files.reduce((sum, f) => sum + f.lineCount, 0);
      const totalFunctions = files.reduce((sum, f) => sum + f.functionCount, 0);
      const averageComplexity =
        files.reduce((sum, f) => sum + f.complexity, 0) / files.length;

      modules.push({
        id: moduleId,
        name: moduleName,
        type: "folder",
        files: files.map((f) => f.filePath),
        totalLines,
        totalFunctions,
        averageComplexity,
        dependencies: [],
        dependents: [],
      });
    }

    return modules;
  }

  /**
   * 全ファイルから関数情報を収集
   */
  private async collectFunctions(
    projectIndex: ProjectIndex,
    workspaceRoot: string,
  ): Promise<MacroFunctionInfo[]> {
    const functions: MacroFunctionInfo[] = [];

    for (const file of projectIndex.files) {
      const filePath = path.join(workspaceRoot, file.filePath);

      // IRキャッシュを読み込み（CacheEntry形式 or 直接IR形式の両方に対応）
      const cached = await this.indexManager.loadIRCache(filePath);
      if (!cached) {
        continue;
      }
      // CacheEntry形式（{ data: IR, timestamp, ... }）の場合は.dataを取得
      const ir = cached.nodes ? cached : cached.data;
      if (!ir?.nodes) {
        continue;
      }

      // IRから関数ノードを抽出（type: 'start'ノードから）
      for (const node of ir.nodes) {
        if (node.type === "start") {
          // ラベルから関数名を抽出（例: "関数開始: greet" → "greet"）
          const labelMatch = node.label.match(/関数開始:\s*(.+)/);
          const functionName = labelMatch ? labelMatch[1] : "anonymous";

          // 対応するendノードを見つける
          const endNode = ir.nodes.find(
            (n: any) => n.type === "end" && n.label.includes(functionName),
          );

          // 開始ノードと終了ノードの間にあるノードを収集
          const startIndex = ir.nodes.indexOf(node);
          const endIndex = endNode
            ? ir.nodes.indexOf(endNode)
            : ir.nodes.length;
          const bodyNodes = ir.nodes.slice(startIndex + 1, endIndex);

          // locationを持つノードから位置情報を取得
          const nodesWithLocation = bodyNodes.filter((n: any) => n.location);
          const location =
            nodesWithLocation.length > 0
              ? {
                  start: nodesWithLocation[0].location.start,
                  end: nodesWithLocation[nodesWithLocation.length - 1].location
                    .end,
                }
              : {
                  start: { line: 1, column: 0 },
                  end: { line: 1, column: 0 },
                };

          functions.push({
            id: node.id,
            name: functionName,
            sourceFile: file.filePath,
            location,
            lineCount: location.end.line - location.start.line + 1,
            complexity: this.calculateFunctionComplexity(bodyNodes),
            hasLoops: this.hasFunctionLoops(bodyNodes),
            hasConditionals: this.hasFunctionConditionals(bodyNodes),
          });
        }
      }
    }

    return functions;
  }

  /**
   * ASTから関数の数をカウント
   */
  private countFunctions(ast: AST): number {
    if (ast.type !== "Program") {
      return 0;
    }

    let count = 0;
    for (const node of ast.body) {
      if (node.type === "FunctionDeclaration") {
        count++;
      }
    }

    return count;
  }

  /**
   * ASTからクラスの数をカウント
   */
  private countClasses(_ast: AST): number {
    // TODO: クラス定義のサポート
    return 0;
  }

  /**
   * サイクロマティック複雑度を計算（簡易版）
   */
  private calculateComplexity(ast: AST): number {
    if (ast.type !== "Program") {
      return 1;
    }

    let complexity = 1; // 基本パス

    const countComplexity = (nodes: any[]): void => {
      for (const node of nodes) {
        if (node.type === "IfStatement") {
          complexity++;
          if (node.thenBranch) {
            countComplexity(node.thenBranch);
          }
          if (node.elseBranch) {
            countComplexity(node.elseBranch);
          }
        } else if (
          node.type === "ForStatement" ||
          node.type === "WhileStatement"
        ) {
          complexity++;
          if (node.body) {
            countComplexity(node.body);
          }
        }
      }
    };

    countComplexity(ast.body);

    return complexity;
  }

  /**
   * import文を抽出
   */
  private extractImports(_ast: AST): string[] {
    // TODO: import文の解析
    return [];
  }

  /**
   * export文を抽出
   */
  private extractExports(_ast: AST): string[] {
    // TODO: export文の解析
    return [];
  }

  /**
   * 言語を判定
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    switch (ext) {
      case ".ts":
      case ".tsx":
        return "typescript";
      case ".js":
      case ".jsx":
        return "javascript";
      default:
        return "unknown";
    }
  }

  /**
   * 関数本体の複雑度を計算（簡易版）
   */
  private calculateFunctionComplexity(bodyNodes: any[]): number {
    let complexity = 1; // 基本パス

    for (const node of bodyNodes) {
      if (node.type === "if") {
        complexity++; // if文で1増加
      } else if (node.type === "for" || node.type === "while") {
        complexity++; // ループで1増加
      }
    }

    return complexity;
  }

  /**
   * 関数本体にループが含まれるかチェック
   */
  private hasFunctionLoops(bodyNodes: any[]): boolean {
    return bodyNodes.some(
      (node: any) => node.type === "for" || node.type === "while",
    );
  }

  /**
   * 関数本体に条件分岐が含まれるかチェック
   */
  private hasFunctionConditionals(bodyNodes: any[]): boolean {
    return bodyNodes.some((node: any) => node.type === "if");
  }
}
