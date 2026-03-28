/**
 * プロジェクト全体をスキャンしてインデックスを生成
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { IRNode } from "../ir/IR";
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

  constructor(indexManager: IndexManager) {
    this.indexManager = indexManager;
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
   * ファイルを解析してFileIndexEntryを生成（テキストベースの簡易解析）
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

    const code = await fs.readFile(filePath, "utf-8");
    const fileHash = await this.indexManager.calculateFileHash(filePath);

    const lineCount = code.split("\n").length;
    const functionCount = this.countFunctionsInCode(code);
    const classCount = this.countClassesInCode(code);
    const complexity = this.calculateComplexityFromCode(code);

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
      imports: [],
      exports: [],
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
      const ir = cached.data;
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
            (n: IRNode) =>
              n.type === "end" &&
              "label" in n &&
              n.label.includes(functionName),
          );

          // 開始ノードと終了ノードの間にあるノードを収集
          const startIndex = ir.nodes.indexOf(node);
          const endIndex = endNode
            ? ir.nodes.indexOf(endNode)
            : ir.nodes.length;
          const bodyNodes = ir.nodes.slice(startIndex + 1, endIndex);

          // locationを持つノードから位置情報を取得
          type IRNodeWithLocation = IRNode & {
            location: {
              start: { line: number; column: number };
              end: { line: number; column: number };
            };
          };
          const nodesWithLocation = bodyNodes.filter(
            (n: IRNode): n is IRNodeWithLocation =>
              "location" in n && !!n.location,
          );
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
   * コードから関数の数をカウント（テキストベース）
   */
  private countFunctionsInCode(code: string): number {
    const functionKeywords = (code.match(/\bfunction\b/g) || []).length;
    const arrowFunctions = (code.match(/=>\s*[{(]/g) || []).length;
    return functionKeywords + arrowFunctions;
  }

  /**
   * コードからクラスの数をカウント（テキストベース）
   */
  private countClassesInCode(code: string): number {
    return (code.match(/\bclass\s+\w/g) || []).length;
  }

  /**
   * サイクロマティック複雑度を計算（テキストベース簡易版）
   */
  private calculateComplexityFromCode(code: string): number {
    const ifCount = (code.match(/\bif\s*\(/g) || []).length;
    const forCount = (code.match(/\bfor\s*\(/g) || []).length;
    const whileCount = (code.match(/\bwhile\s*\(/g) || []).length;
    return 1 + ifCount + forCount + whileCount;
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
  private calculateFunctionComplexity(bodyNodes: IRNode[]): number {
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
  private hasFunctionLoops(bodyNodes: IRNode[]): boolean {
    return bodyNodes.some(
      (node) => node.type === "for" || node.type === "while",
    );
  }

  /**
   * 関数本体に条件分岐が含まれるかチェック
   */
  private hasFunctionConditionals(bodyNodes: IRNode[]): boolean {
    return bodyNodes.some((node) => node.type === "if");
  }
}
