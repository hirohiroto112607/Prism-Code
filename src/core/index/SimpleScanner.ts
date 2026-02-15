/**
 * シンプルなファイルスキャナー（デバッグ用）
 * vscode.workspace.findFiles を使わずに、Node.jsのfsモジュールで直接ファイルを検索
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export class SimpleScanner {
  /**
   * ディレクトリを再帰的にスキャンしてTypeScript/JavaScriptファイルを検索
   */
  async scanDirectory(
    dirPath: string,
    excludePatterns: string[] = []
  ): Promise<string[]> {
    console.log('=== SimpleScanner.scanDirectory 開始 ===');
    console.log('ディレクトリパス:', dirPath);
    console.log('除外パターン:', excludePatterns);

    const results: string[] = [];

    const scan = async (currentPath: string): Promise<void> => {
      console.log('スキャン中:', currentPath);
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          const relativePath = path.relative(dirPath, fullPath);

          // 除外パターンをチェック（ディレクトリとファイル両方）
          if (this.shouldExclude(relativePath, entry.name, excludePatterns, entry.isDirectory())) {
            console.log('除外:', relativePath);
            continue;
          }

          if (entry.isDirectory()) {
            // ディレクトリの場合は再帰的にスキャン
            await scan(fullPath);
          } else if (entry.isFile()) {
            // ファイルの場合は拡張子をチェック
            const ext = path.extname(entry.name);

            // .d.tsファイルを除外
            if (entry.name.endsWith('.d.ts')) {
              console.log('除外（型定義ファイル）:', relativePath);
              continue;
            }

            // 対象のファイル拡張子のみを含める
            if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
              results.push(fullPath);
              console.log('発見:', relativePath);
            }
          }
        }
      } catch (error) {
        console.error(`ディレクトリスキャンエラー: ${currentPath}`, error);
      }
    };

    await scan(dirPath);

    console.log('=== SimpleScanner.scanDirectory 終了 ===');
    console.log('発見したファイル数:', results.length);
    console.log('ファイルリスト:', results);

    return results;
  }

  /**
   * ファイル/ディレクトリを除外すべきかチェック
   */
  private shouldExclude(
    relativePath: string,
    name: string,
    excludePatterns: string[],
    isDirectory: boolean
  ): boolean {
    // .prismcodeフォルダー自体は除外（無限ループ防止）
    if (name === '.prismcode') {
      console.log('除外（.prismcode）:', name);
      return true;
    }

    // 一般的な隠しファイル/ディレクトリを除外（ただし.prismcodeは既にチェック済み）
    if (name.startsWith('.') && name !== '.prismcode') {
      console.log('除外（隠しファイル）:', name);
      return true;
    }

    console.log('除外チェック - name:', name, 'isDirectory:', isDirectory, 'relativePath:', relativePath);

    // 明示的に除外すべきディレクトリ（デフォルト）
    const defaultExcludes = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'out',
      '.vite',
      '.vscode-test',
      'coverage',
      '.next',
      '.nuxt',
      '.turbo',
      '__pycache__',
      'vendor',
    ];

    // 除外すべきファイルパターン（ファイルのみ）
    const excludeFilePatterns = [
      '.min.js',
      '.bundle.js',
      '.map',
      '.d.ts',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '.DS_Store',
    ];

    // ファイル名が除外パターンに一致するかチェック（ファイルのみ）
    if (!isDirectory) {
      for (const pattern of excludeFilePatterns) {
        if (name.endsWith(pattern) || name.includes(pattern)) {
          return true;
        }
      }
    }

    // ディレクトリ名が除外リストに含まれるかチェック
    if (defaultExcludes.includes(name)) {
      console.log(`除外（デフォルト）: ${name}`);
      return true;
    }

    // 相対パスの各部分をチェック
    const pathParts = relativePath.split(path.sep);
    for (const part of pathParts) {
      if (defaultExcludes.includes(part)) {
        console.log(`除外（パス内）: ${relativePath} (含む: ${part})`);
        return true;
      }
    }

    // 除外パターンをチェック（ディレクトリとファイル両方）
    for (const pattern of excludePatterns) {
      if (this.matchPattern(relativePath, name, pattern)) {
        console.log(`除外（パターン）: ${relativePath} (パターン: ${pattern})`);
        return true;
      }
    }

    return false;
  }

  /**
   * パターンマッチング
   */
  private matchPattern(relativePath: string, name: string, pattern: string): boolean {
    // **/ を含むパターン（例: node_modules/**）
    if (pattern.includes('**/')) {
      const cleanPattern = pattern.replace(/\*\*\//g, '').replace(/\*/g, '');
      return (
        relativePath.includes(cleanPattern) ||
        name.includes(cleanPattern) ||
        relativePath.startsWith(cleanPattern)
      );
    }

    // **を含むパターン（例: **/*.min.js）
    if (pattern.includes('**')) {
      const cleanPattern = pattern.replace(/\*\*/g, '').replace(/\*/g, '');
      return relativePath.includes(cleanPattern) || name.includes(cleanPattern);
    }

    // 単純なワイルドカード（例: *.min.js）
    if (pattern.includes('*')) {
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
      );
      return regex.test(name) || regex.test(relativePath);
    }

    // 完全一致
    return relativePath === pattern || name === pattern;
  }
}
