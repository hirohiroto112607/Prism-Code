/**
 * 他のAIツール向けにプロジェクト情報をエクスポート
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { IndexManager } from './IndexManager';
import { ProjectIndex, AIToolContext, ModuleGroup } from './types';

export class Exporter {
  private indexManager: IndexManager;
  private workspaceRoot: string;

  constructor(indexManager: IndexManager, workspaceRoot: string) {
    this.indexManager = indexManager;
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * すべてのエクスポートを実行
   */
  async exportAll(): Promise<void> {
    const config = this.indexManager.getConfig();
    if (!config) {
      return;
    }

    if (config.exports.markdown) {
      await this.exportMarkdown();
    }

    if (config.exports.cursorRules) {
      await this.exportCursorRules();
    }

    if (config.exports.copilotContext) {
      await this.exportCopilotContext();
    }

    if (config.exports.clineContext) {
      await this.exportClineContext();
    }
  }

  /**
   * Markdown形式でプロジェクト構造をエクスポート
   */
  async exportMarkdown(): Promise<void> {
    const projectIndex = this.indexManager.getProjectIndex();
    if (!projectIndex) {
      return;
    }

    const markdown = this.generateProjectMarkdown(projectIndex);

    const outputPath = path.join(
      this.workspaceRoot,
      '.prismcode',
      'exports',
      'markdown',
      'PROJECT_STRUCTURE.md'
    );

    await fs.writeFile(outputPath, markdown, 'utf-8');
    console.log('Markdownエクスポート完了:', outputPath);
  }

  /**
   * プロジェクト構造のMarkdownを生成
   */
  private generateProjectMarkdown(projectIndex: ProjectIndex): string {
    const { metadata } = projectIndex;

    let md = `# ${projectIndex.projectName}\n\n`;
    md += `**最終更新**: ${new Date(projectIndex.lastUpdated).toLocaleString('ja-JP')}\n\n`;

    // 概要
    md += `## 📊 プロジェクト概要\n\n`;
    md += `- **総ファイル数**: ${metadata.totalFiles}\n`;
    md += `- **総行数**: ${metadata.totalLines.toLocaleString()}\n`;
    md += `- **総関数数**: ${metadata.totalFunctions}\n`;
    md += `- **使用言語**: ${metadata.languages.join(', ')}\n\n`;

    // ファイル一覧
    md += `## 📁 ファイル一覧\n\n`;
    md += `| ファイルパス | 行数 | 関数数 | 複雑度 |\n`;
    md += `|-------------|------|--------|--------|\n`;

    for (const file of projectIndex.files.sort((a, b) => a.filePath.localeCompare(b.filePath))) {
      md += `| ${file.filePath} | ${file.lineCount} | ${file.functionCount} | ${file.complexity} |\n`;
    }

    md += `\n`;

    // モジュール構造
    if (projectIndex.modules.length > 0) {
      md += `## 🔧 モジュール構造\n\n`;
      for (const module of projectIndex.modules) {
        md += `### ${module.name}\n\n`;
        md += `- **タイプ**: ${module.type}\n`;
        md += `- **ファイル数**: ${module.files.length}\n`;
        md += `- **総行数**: ${module.totalLines}\n`;
        md += `- **総関数数**: ${module.totalFunctions}\n`;
        md += `- **平均複雑度**: ${module.averageComplexity.toFixed(2)}\n\n`;

        if (module.description) {
          md += `**説明**: ${module.description}\n\n`;
        }

        md += `**含まれるファイル**:\n\n`;
        for (const file of module.files) {
          md += `- \`${file}\`\n`;
        }
        md += `\n`;
      }
    }

    // AIサマリー
    const aiSummaries = this.indexManager.loadAISummaries();
    if (aiSummaries) {
      md += `## 🤖 AI生成サマリー\n\n`;
      md += `**生成モデル**: ${(aiSummaries as any).model}\n\n`;

      if ((aiSummaries as any).projectSummary) {
        md += `### プロジェクト全体\n\n`;
        md += `${(aiSummaries as any).projectSummary}\n\n`;
      }
    }

    // フッター
    md += `---\n\n`;
    md += `*このドキュメントは Prism Code によって自動生成されました*\n`;

    return md;
  }

  /**
   * Cursor IDE用のルールをエクスポート
   */
  async exportCursorRules(): Promise<void> {
    const projectIndex = this.indexManager.getProjectIndex();
    if (!projectIndex) {
      return;
    }

    const context = await this.generateAIToolContext(projectIndex);

    // Cursor用の.cursorrules形式
    let rules = `# ${context.projectName}\n\n`;
    rules += `${context.overview.description}\n\n`;

    rules += `## プロジェクト構造\n\n`;
    rules += `\`\`\`\n${context.projectStructure}\`\`\`\n\n`;

    rules += `## 主要言語\n\n`;
    rules += context.overview.mainLanguages.join(', ') + '\n\n';

    rules += `## アーキテクチャ\n\n`;
    rules += context.overview.architecture + '\n\n';

    rules += `## 重要なファイル\n\n`;
    for (const file of context.importantFiles) {
      rules += `- **${file.path}**: ${file.description}\n`;
    }
    rules += `\n`;

    if (context.codingConventions) {
      rules += `## コーディング規約\n\n`;
      rules += `**スタイル**: ${context.codingConventions.style}\n\n`;

      if (context.codingConventions.patterns.length > 0) {
        rules += `**推奨パターン**:\n`;
        for (const pattern of context.codingConventions.patterns) {
          rules += `- ${pattern}\n`;
        }
        rules += `\n`;
      }

      if (context.codingConventions.antiPatterns.length > 0) {
        rules += `**避けるべきパターン**:\n`;
        for (const pattern of context.codingConventions.antiPatterns) {
          rules += `- ${pattern}\n`;
        }
        rules += `\n`;
      }
    }

    const outputPath = path.join(
      this.workspaceRoot,
      '.prismcode',
      'exports',
      'ai-context',
      'cursor-rules.json'
    );

    await fs.writeFile(outputPath, JSON.stringify({ rules }, null, 2), 'utf-8');
    console.log('Cursorルールエクスポート完了:', outputPath);
  }

  /**
   * GitHub Copilot用のコンテキストをエクスポート
   */
  async exportCopilotContext(): Promise<void> {
    const projectIndex = this.indexManager.getProjectIndex();
    if (!projectIndex) {
      return;
    }

    const context = await this.generateAIToolContext(projectIndex);

    // Copilot用のMarkdown形式
    let md = `# ${context.projectName} - Copilot Context\n\n`;
    md += `## 概要\n\n${context.overview.description}\n\n`;
    md += `## アーキテクチャ\n\n${context.overview.architecture}\n\n`;

    md += `## プロジェクト構造\n\n\`\`\`\n${context.projectStructure}\`\`\`\n\n`;

    md += `## 重要なファイル\n\n`;
    for (const file of context.importantFiles) {
      md += `### ${file.path}\n\n`;
      md += `**目的**: ${file.purpose}\n\n`;
      md += `${file.description}\n\n`;
    }

    const outputPath = path.join(
      this.workspaceRoot,
      '.prismcode',
      'exports',
      'ai-context',
      'copilot-context.md'
    );

    await fs.writeFile(outputPath, md, 'utf-8');
    console.log('Copilotコンテキストエクスポート完了:', outputPath);
  }

  /**
   * Cline用のコンテキストをエクスポート
   */
  async exportClineContext(): Promise<void> {
    const projectIndex = this.indexManager.getProjectIndex();
    if (!projectIndex) {
      return;
    }

    const context = await this.generateAIToolContext(projectIndex);

    const outputPath = path.join(
      this.workspaceRoot,
      '.prismcode',
      'exports',
      'ai-context',
      'cline-context.json'
    );

    await fs.writeFile(outputPath, JSON.stringify(context, null, 2), 'utf-8');
    console.log('Clineコンテキストエクスポート完了:', outputPath);
  }

  /**
   * AIツール向けのコンテキストを生成
   */
  private async generateAIToolContext(projectIndex: ProjectIndex): Promise<AIToolContext> {
    // プロジェクト構造のツリーを生成
    const projectTree = this.generateProjectTree(projectIndex);

    // package.jsonから依存関係を読み取り
    const dependencies = await this.readDependencies();

    // 重要なファイルを特定（複雑度やファイル名から判定）
    const importantFiles = this.identifyImportantFiles(projectIndex);

    // AIサマリーを読み込み（存在する場合）
    const aiSummaries = await this.indexManager.loadAISummaries();

    const context: AIToolContext = {
      projectName: projectIndex.projectName,
      projectStructure: projectTree,
      overview: {
        description:
          (aiSummaries as any)?.projectSummary ||
          `${projectIndex.projectName}は${projectIndex.metadata.languages.join(
            '/'
          )}で書かれたプロジェクトです。`,
        mainLanguages: projectIndex.metadata.languages,
        keyFeatures: this.extractKeyFeatures(projectIndex),
        architecture: this.describeArchitecture(projectIndex),
      },
      importantFiles,
      dependencies,
    };

    return context;
  }

  /**
   * プロジェクト構造のツリーを生成
   */
  private generateProjectTree(projectIndex: ProjectIndex): string {
    const tree: { [key: string]: string[] } = {};

    // ファイルをディレクトリごとにグループ化
    for (const file of projectIndex.files) {
      const dir = path.dirname(file.filePath);
      if (!tree[dir]) {
        tree[dir] = [];
      }
      tree[dir].push(path.basename(file.filePath));
    }

    // ツリー形式の文字列を生成
    let treeStr = `${projectIndex.projectName}/\n`;
    const sortedDirs = Object.keys(tree).sort();

    for (const dir of sortedDirs) {
      const indent = dir === '.' ? '' : '  '.repeat(dir.split('/').length);
      const dirName = dir === '.' ? '' : path.basename(dir) + '/';

      if (dirName) {
        treeStr += `${indent}${dirName}\n`;
      }

      for (const file of tree[dir].sort()) {
        treeStr += `${indent}  ${file}\n`;
      }
    }

    return treeStr;
  }

  /**
   * package.jsonから依存関係を読み取り
   */
  private async readDependencies(): Promise<{
    production: string[];
    development: string[];
  }> {
    try {
      const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      return {
        production: Object.keys(packageJson.dependencies || {}),
        development: Object.keys(packageJson.devDependencies || {}),
      };
    } catch (error) {
      return { production: [], development: [] };
    }
  }

  /**
   * 重要なファイルを特定
   */
  private identifyImportantFiles(
    projectIndex: ProjectIndex
  ): { path: string; description: string; purpose: string }[] {
    const importantFiles: { path: string; description: string; purpose: string }[] = [];

    // 複雑度が高いファイル、またはエントリーポイントと思われるファイルを特定
    const sortedByComplexity = [...projectIndex.files].sort(
      (a, b) => b.complexity - a.complexity
    );

    // トップ5の複雑なファイル
    for (const file of sortedByComplexity.slice(0, 5)) {
      importantFiles.push({
        path: file.filePath,
        description: `複雑度${file.complexity}の重要なファイル`,
        purpose: this.guessPurpose(file.filePath),
      });
    }

    // 特定のパターンにマッチするファイル
    for (const file of projectIndex.files) {
      if (
        file.filePath.includes('index') ||
        file.filePath.includes('main') ||
        file.filePath.includes('app')
      ) {
        if (!importantFiles.find((f) => f.path === file.filePath)) {
          importantFiles.push({
            path: file.filePath,
            description: 'エントリーポイントまたは主要なファイル',
            purpose: this.guessPurpose(file.filePath),
          });
        }
      }
    }

    return importantFiles;
  }

  /**
   * ファイルの目的を推測
   */
  private guessPurpose(filePath: string): string {
    const fileName = path.basename(filePath, path.extname(filePath));

    if (fileName.toLowerCase().includes('test')) {
      return 'テストファイル';
    }
    if (fileName.toLowerCase().includes('config')) {
      return '設定ファイル';
    }
    if (fileName.toLowerCase().includes('util')) {
      return 'ユーティリティ関数';
    }
    if (fileName.toLowerCase().includes('type')) {
      return '型定義';
    }
    if (fileName.toLowerCase().includes('index') || fileName.toLowerCase().includes('main')) {
      return 'エントリーポイント';
    }

    return '主要なロジック';
  }

  /**
   * 主要機能を抽出
   */
  private extractKeyFeatures(projectIndex: ProjectIndex): string[] {
    const features: string[] = [];

    // モジュール名から推測
    for (const module of projectIndex.modules) {
      if (module.type === 'feature') {
        features.push(module.name);
      }
    }

    // デフォルトの機能
    if (features.length === 0) {
      features.push('コード解析', 'フローチャート生成', 'ビジュアライゼーション');
    }

    return features;
  }

  /**
   * アーキテクチャを説明
   */
  private describeArchitecture(projectIndex: ProjectIndex): string {
    // フォルダー構造から推測
    const hasWebview = projectIndex.files.some((f) => f.filePath.includes('webview'));
    const hasCore = projectIndex.files.some((f) => f.filePath.includes('core'));
    const hasParsers = projectIndex.files.some((f) => f.filePath.includes('parser'));

    if (hasWebview && hasCore && hasParsers) {
      return 'レイヤードアーキテクチャを採用。Extension側（Node.js）とWebView UI側（React）に分離され、コアロジックは言語非依存のIR（中間表現）を使用。';
    }

    return '疎結合な設計により、各モジュールが独立して機能します。';
  }
}
