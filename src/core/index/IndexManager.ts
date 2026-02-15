/**
 * .prismcodeフォルダーのインデックスを管理するマネージャー
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  ProjectIndex,
  FileIndexEntry,
  ProjectMacroViewData,
  DependencyGraph,
  AISummaries,
  PrismCodeConfig,
} from './types';

export class IndexManager {
  private readonly PRISMCODE_DIR = '.prismcode';
  private readonly INDEX_FILE = 'index.json';
  private readonly CONFIG_FILE = 'config.json';

  private workspaceRoot: string;
  private prismcodeDir: string;

  private projectIndex?: ProjectIndex;
  private config?: PrismCodeConfig;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.prismcodeDir = path.join(workspaceRoot, this.PRISMCODE_DIR);
  }

  /**
   * .prismcodeフォルダーを初期化
   */
  async initialize(): Promise<void> {
    // .prismcodeディレクトリが存在しない場合は作成
    try {
      await fs.access(this.prismcodeDir);
    } catch {
      await this.createPrismcodeStructure();
    }

    // インデックスと設定を読み込み
    await this.loadProjectIndex();
    await this.loadConfig();
  }

  /**
   * .prismcodeフォルダー構造を作成
   */
  private async createPrismcodeStructure(): Promise<void> {
    await fs.mkdir(this.prismcodeDir, { recursive: true });
    await fs.mkdir(path.join(this.prismcodeDir, 'cache', 'ast-cache'), { recursive: true });
    await fs.mkdir(path.join(this.prismcodeDir, 'cache', 'ir-cache'), { recursive: true });
    await fs.mkdir(path.join(this.prismcodeDir, 'analysis'), { recursive: true });
    await fs.mkdir(path.join(this.prismcodeDir, 'exports', 'markdown'), { recursive: true });
    await fs.mkdir(path.join(this.prismcodeDir, 'exports', 'ai-context'), { recursive: true });

    // 初期設定ファイルを作成
    const defaultConfig: PrismCodeConfig = {
      version: '1.0.0',
      autoUpdate: true,
      updateInterval: 5000, // 5秒
      cacheEnabled: true,
      cacheMaxAge: 3600000, // 1時間
      aiEnabled: false, // デフォルトは無効
      exports: {
        markdown: true,
        cursorRules: true,
        copilotContext: true,
        clineContext: true,
      },
      git: {
        addToGitignore: false, // デフォルトは.gitignoreに追加しない
        ignoreCache: true, // キャッシュのみ除外（部分管理）
      },
      excludePatterns: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/out/**',
        '**/.vite/**',
        '**/*.min.js',
        '**/*.bundle.js',
        '**/*.d.ts',
        '**/*.map',
        '**/*.png',
        '**/*.jpg',
        '**/*.jpeg',
        '**/*.gif',
        '**/*.svg',
        '**/*.ico',
        '**/*.woff',
        '**/*.woff2',
        '**/*.ttf',
        '**/*.eot',
        '**/package-lock.json',
        '**/yarn.lock',
        '**/pnpm-lock.yaml',
        '**/.DS_Store',
      ],
    };

    await this.saveConfig(defaultConfig);

    // 初期インデックスを作成
    const initialIndex: ProjectIndex = {
      version: '1.0.0',
      projectName: path.basename(this.workspaceRoot),
      projectRoot: this.workspaceRoot,
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

    await this.saveProjectIndex(initialIndex);

    // .gitignoreに.prismcodeを追加（設定に従う）
    await this.updateGitignore();
  }

  /**
   * .gitignoreに.prismcodeを追加
   */
  private async updateGitignore(): Promise<void> {
    const config = this.config || (await this.loadConfig());
    if (!config?.git?.addToGitignore) {
      console.log('.gitignoreへの自動追加はスキップされました（設定で無効）');
      return;
    }

    const gitignorePath = path.join(this.workspaceRoot, '.gitignore');

    try {
      let content = '';
      try {
        content = await fs.readFile(gitignorePath, 'utf-8');
      } catch {
        // .gitignoreが存在しない場合は新規作成
      }

      if (!content.includes('.prismcode')) {
        content += '\n# Prism Code インデックス\n.prismcode/\n';
        await fs.writeFile(gitignorePath, content, 'utf-8');
        console.log('.gitignoreに.prismcode/を追加しました');
      }
    } catch (error) {
      console.error('.gitignore更新エラー:', error);
    }

    // キャッシュのみ除外する場合、.prismcode/.gitignoreを作成
    if (config?.git?.ignoreCache) {
      await this.createPrismcodeGitignore();
    }
  }

  /**
   * .prismcode/.gitignoreを作成（キャッシュのみ除外）
   */
  private async createPrismcodeGitignore(): Promise<void> {
    const prismcodeGitignorePath = path.join(this.prismcodeDir, '.gitignore');

    try {
      const content = `# Prism Code - キャッシュのみ除外
# 生成日: ${new Date().toISOString()}

# キャッシュは除外（ローカル環境依存）
cache/

# index.jsonは除外（ファイルハッシュを含むため）
index.json

# 以下はGit管理される
# - config.json（チーム設定）
# - analysis/（プロジェクト構造）
# - exports/（AIツール向けコンテキスト）
`;

      await fs.writeFile(prismcodeGitignorePath, content, 'utf-8');
      console.log('.prismcode/.gitignoreを作成しました（キャッシュのみ除外）');
    } catch (error) {
      console.error('.prismcode/.gitignore作成エラー:', error);
    }
  }

  /**
   * プロジェクトインデックスを読み込み
   */
  async loadProjectIndex(): Promise<ProjectIndex | undefined> {
    try {
      const indexPath = path.join(this.prismcodeDir, this.INDEX_FILE);
      const content = await fs.readFile(indexPath, 'utf-8');
      this.projectIndex = JSON.parse(content);
      return this.projectIndex;
    } catch (error) {
      console.error('インデックス読み込みエラー:', error);
      return undefined;
    }
  }

  /**
   * プロジェクトインデックスを保存
   */
  async saveProjectIndex(index: ProjectIndex): Promise<void> {
    try {
      const indexPath = path.join(this.prismcodeDir, this.INDEX_FILE);
      index.lastUpdated = new Date().toISOString();
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
      this.projectIndex = index;
    } catch (error) {
      console.error('インデックス保存エラー:', error);
      throw error;
    }
  }

  /**
   * 設定を読み込み
   */
  async loadConfig(): Promise<PrismCodeConfig | undefined> {
    try {
      const configPath = path.join(this.prismcodeDir, this.CONFIG_FILE);
      const content = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(content);
      return this.config;
    } catch (error) {
      console.error('設定読み込みエラー:', error);
      return undefined;
    }
  }

  /**
   * 設定を保存
   */
  async saveConfig(config: PrismCodeConfig): Promise<void> {
    try {
      const configPath = path.join(this.prismcodeDir, this.CONFIG_FILE);
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
      this.config = config;
    } catch (error) {
      console.error('設定保存エラー:', error);
      throw error;
    }
  }

  /**
   * ファイルのハッシュを計算
   */
  async calculateFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * ファイルがキャッシュされているか、かつ最新かをチェック
   */
  async isFileCached(filePath: string): Promise<boolean> {
    if (!this.projectIndex) {
      return false;
    }

    const relativePath = path.relative(this.workspaceRoot, filePath);
    const entry = this.projectIndex.files.find((f) => f.filePath === relativePath);

    if (!entry) {
      return false;
    }

    // ファイルハッシュを比較
    const currentHash = await this.calculateFileHash(filePath);
    return entry.fileHash === currentHash;
  }

  /**
   * ファイルインデックスエントリを追加/更新
   */
  async updateFileEntry(entry: FileIndexEntry): Promise<void> {
    if (!this.projectIndex) {
      throw new Error('プロジェクトインデックスが初期化されていません');
    }

    const existingIndex = this.projectIndex.files.findIndex(
      (f) => f.filePath === entry.filePath
    );

    if (existingIndex >= 0) {
      this.projectIndex.files[existingIndex] = entry;
    } else {
      this.projectIndex.files.push(entry);
    }

    // メタデータを更新
    this.updateMetadata();

    await this.saveProjectIndex(this.projectIndex);
  }

  /**
   * メタデータを更新
   */
  private updateMetadata(): void {
    if (!this.projectIndex) {
      return;
    }

    const metadata = {
      totalFiles: this.projectIndex.files.length,
      totalLines: this.projectIndex.files.reduce((sum, f) => sum + f.lineCount, 0),
      totalFunctions: this.projectIndex.files.reduce((sum, f) => sum + f.functionCount, 0),
      languages: [...new Set(this.projectIndex.files.map((f) => f.language))],
    };

    this.projectIndex.metadata = metadata;
  }

  /**
   * マクロビューデータを保存
   */
  async saveMacroViewData(data: ProjectMacroViewData): Promise<void> {
    const filePath = path.join(this.prismcodeDir, 'analysis', 'macro-view.json');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * マクロビューデータを読み込み
   */
  async loadMacroViewData(): Promise<ProjectMacroViewData | undefined> {
    try {
      const filePath = path.join(this.prismcodeDir, 'analysis', 'macro-view.json');
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('マクロビューデータ読み込みエラー:', error);
      return undefined;
    }
  }

  /**
   * 依存関係グラフを保存
   */
  async saveDependencyGraph(graph: DependencyGraph): Promise<void> {
    const filePath = path.join(this.prismcodeDir, 'analysis', 'dependency-graph.json');
    await fs.writeFile(filePath, JSON.stringify(graph, null, 2), 'utf-8');
  }

  /**
   * 依存関係グラフを読み込み
   */
  async loadDependencyGraph(): Promise<DependencyGraph | undefined> {
    try {
      const filePath = path.join(this.prismcodeDir, 'analysis', 'dependency-graph.json');
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('依存関係グラフ読み込みエラー:', error);
      return undefined;
    }
  }

  /**
   * AIサマリーを保存
   */
  async saveAISummaries(summaries: AISummaries): Promise<void> {
    const filePath = path.join(this.prismcodeDir, 'analysis', 'ai-summaries.json');
    await fs.writeFile(filePath, JSON.stringify(summaries, null, 2), 'utf-8');
  }

  /**
   * AIサマリーを読み込み
   */
  async loadAISummaries(): Promise<AISummaries | undefined> {
    try {
      const filePath = path.join(this.prismcodeDir, 'analysis', 'ai-summaries.json');
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('AIサマリー読み込みエラー:', error);
      return undefined;
    }
  }

  /**
   * ASTキャッシュを保存
   */
  async saveASTCache(filePath: string, ast: any): Promise<void> {
    const relativePath = path.relative(this.workspaceRoot, filePath);
    const cacheFileName = relativePath.replace(/[\/\\]/g, '-').replace(/\./g, '-') + '.json';
    const cachePath = path.join(this.prismcodeDir, 'cache', 'ast-cache', cacheFileName);

    await fs.writeFile(cachePath, JSON.stringify(ast, null, 2), 'utf-8');
  }

  /**
   * ASTキャッシュを読み込み
   */
  async loadASTCache(filePath: string): Promise<any | undefined> {
    try {
      const relativePath = path.relative(this.workspaceRoot, filePath);
      const cacheFileName = relativePath.replace(/[\/\\]/g, '-').replace(/\./g, '-') + '.json';
      const cachePath = path.join(this.prismcodeDir, 'cache', 'ast-cache', cacheFileName);

      const content = await fs.readFile(cachePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * IRキャッシュを保存
   */
  async saveIRCache(filePath: string, ir: any): Promise<void> {
    const relativePath = path.relative(this.workspaceRoot, filePath);
    const cacheFileName = relativePath.replace(/[\/\\]/g, '-').replace(/\./g, '-') + '.json';
    const cachePath = path.join(this.prismcodeDir, 'cache', 'ir-cache', cacheFileName);

    await fs.writeFile(cachePath, JSON.stringify(ir, null, 2), 'utf-8');
  }

  /**
   * IRキャッシュを読み込み
   */
  async loadIRCache(filePath: string): Promise<any | undefined> {
    try {
      const relativePath = path.relative(this.workspaceRoot, filePath);
      const cacheFileName = relativePath.replace(/[\/\\]/g, '-').replace(/\./g, '-') + '.json';
      const cachePath = path.join(this.prismcodeDir, 'cache', 'ir-cache', cacheFileName);

      const content = await fs.readFile(cachePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * プロジェクトインデックスを取得
   */
  getProjectIndex(): ProjectIndex | undefined {
    return this.projectIndex;
  }

  /**
   * 設定を取得
   */
  getConfig(): PrismCodeConfig | undefined {
    return this.config;
  }
}
