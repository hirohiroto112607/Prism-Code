/**
 * .prismcodeフォルダーで管理されるインデックスの型定義
 */

/**
 * プロジェクト全体のインデックス
 */
export interface ProjectIndex {
  version: string; // スキーマバージョン
  projectName: string;
  projectRoot: string;
  lastUpdated: string; // ISO 8601形式

  files: FileIndexEntry[];
  modules: ModuleGroup[];

  metadata: {
    totalFiles: number;
    totalLines: number;
    totalFunctions: number;
    languages: string[];
  };
}

/**
 * ファイル単位のインデックスエントリ
 */
export interface FileIndexEntry {
  filePath: string; // プロジェクトルートからの相対パス
  fileHash: string; // ファイル内容のSHA-256ハッシュ
  language: string; // 'typescript', 'javascript', etc.

  lastModified: string; // ISO 8601形式
  lastAnalyzed: string; // 最後に解析した日時

  // 基本的なメトリクス
  lineCount: number;
  functionCount: number;
  classCount: number;
  complexity: number; // サイクロマティック複雑度

  // キャッシュパス
  astCachePath?: string;
  irCachePath?: string;

  // 依存関係
  imports: string[]; // インポートしているファイル
  exports: string[]; // エクスポートしている識別子

  // AI生成サマリー（オプション）
  aiSummary?: string;
}

/**
 * モジュール/機能グループ
 * （AI分析またはフォルダー構造から生成）
 */
export interface ModuleGroup {
  id: string;
  name: string; // 'Authentication', 'Data Processing', etc.
  type: 'folder' | 'feature' | 'ai-generated';

  files: string[]; // ファイルパスのリスト
  description?: string; // AI生成の説明

  // モジュール間の関係
  dependencies: string[]; // 依存しているモジュールID
  dependents: string[]; // このモジュールに依存しているモジュールID

  // メトリクス
  totalLines: number;
  totalFunctions: number;
  averageComplexity: number;

  // カラーリング用（UI表示）
  color?: string;
}

/**
 * プロジェクト全体のマクロビュー用のデータ
 */
export interface ProjectMacroViewData {
  version: string;
  generatedAt: string;

  // モジュールグループ
  modules: ModuleGroup[];

  // 関数レベルの情報（マクロビューで表示する関数）
  functions: MacroFunctionInfo[];

  // コールグラフ（関数間の呼び出し関係）
  callGraph: CallGraphEdge[];

  // メタデータ
  metadata: {
    fileCount: number;
    functionCount: number;
    moduleCount: number;
  };
}

/**
 * マクロビューで表示する関数情報
 */
export interface MacroFunctionInfo {
  id: string;
  name: string;
  sourceFile: string; // ファイルパス
  module?: string; // 所属モジュールID

  // 位置情報
  location: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };

  // メトリクス
  lineCount: number;
  complexity: number;
  hasLoops: boolean;
  hasConditionals: boolean;

  // AI生成の説明（オプション）
  aiSummary?: string;
}

/**
 * コールグラフのエッジ
 */
export interface CallGraphEdge {
  id: string;
  from: string; // 関数ID
  to: string; // 関数ID
  type: 'call' | 'import' | 'dependency';
  weight?: number; // 呼び出し頻度（静的解析では推定）
}

/**
 * 依存関係グラフ
 */
export interface DependencyGraph {
  version: string;
  generatedAt: string;

  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: string; // ファイルパス
  label: string; // ファイル名
  type: 'file' | 'module' | 'external';
  moduleGroup?: string; // 所属モジュールID
}

export interface DependencyEdge {
  id: string;
  from: string; // ファイルパス
  to: string; // ファイルパス
  type: 'import' | 'require' | 'dynamic-import';
}

/**
 * AI生成のサマリー
 */
export interface AISummaries {
  version: string;
  generatedAt: string;
  model: string; // 'gemini-pro', etc.

  projectSummary?: string; // プロジェクト全体のサマリー

  moduleSummaries: {
    [moduleId: string]: {
      summary: string;
      keyFunctions: string[];
      suggestedImprovements?: string[];
    };
  };

  fileSummaries: {
    [filePath: string]: {
      summary: string;
      purpose: string;
      complexity: 'low' | 'medium' | 'high';
    };
  };
}

/**
 * .prismcodeの設定
 */
export interface PrismCodeConfig {
  version: string;

  // インデックス更新の設定
  autoUpdate: boolean; // ファイル変更時に自動更新するか
  updateInterval?: number; // 自動更新の間隔（ミリ秒）

  // キャッシュ設定
  cacheEnabled: boolean;
  cacheMaxAge: number; // キャッシュの有効期限（ミリ秒）

  // AI機能の設定
  aiEnabled: boolean;
  aiProvider?: 'gemini' | 'openai' | 'claude';
  aiApiKey?: string; // 暗号化して保存すべき

  // エクスポート設定
  exports: {
    markdown: boolean;
    cursorRules: boolean;
    copilotContext: boolean;
    clineContext: boolean;
  };

  // Git管理設定
  git?: {
    addToGitignore: boolean; // .gitignoreに自動追加するか
    ignoreCache: boolean; // キャッシュのみ除外するか（部分管理）
  };

  // 除外パターン
  excludePatterns: string[]; // .gitignoreのような形式
}

/**
 * エクスポート用のコンテキスト（他のAIツール向け）
 */
export interface AIToolContext {
  projectName: string;
  projectStructure: string; // ツリー形式の文字列

  // プロジェクトの概要
  overview: {
    description: string;
    mainLanguages: string[];
    keyFeatures: string[];
    architecture: string;
  };

  // 重要なファイル
  importantFiles: {
    path: string;
    description: string;
    purpose: string;
  }[];

  // コーディング規約
  codingConventions?: {
    style: string;
    patterns: string[];
    antiPatterns: string[];
  };

  // 依存関係
  dependencies: {
    production: string[];
    development: string[];
  };
}
