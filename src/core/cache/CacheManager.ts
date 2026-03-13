/**
 * キャッシュ統合管理マネージャー
 * すべてのキャッシュ操作を統括し、鮮度チェック・自動更新を管理する
 */

import * as fs from "fs/promises";
import * as path from "path";
import type { IndexManager } from "../index/IndexManager";
import type { AST } from "../parser/AST";
import type { IR } from "../ir/IR";
import { TypeScriptParser } from "../../parsers/typescript/TypeScriptParser";
import { IRTransformer } from "../transformer/IRTransformer";

export interface CacheStats {
  totalFiles: number;
  cachedFiles: number;
  cacheHitRate: number;
  totalCacheSize: number; // バイト
  oldestCache: string | null;
  newestCache: string | null;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  fileHash: string;
  filePath: string;
}

export interface CacheResult<T> {
  hit: boolean;
  data?: T;
  source: "cache" | "fresh" | "error";
  processingTime?: number;
}

/**
 * CacheManager
 *
 * すべてのキャッシュ操作を統括する中央管理クラス
 * - AST/IRキャッシュの保存・読み込み
 * - 鮮度チェック（ファイルハッシュ + 有効期限）
 * - キャッシュヒット率の追跡
 * - 統計情報の提供
 */
export class CacheManager {
  private indexManager: IndexManager;
  private cacheHits = 0;
  private cacheMisses = 0;
  private parser: TypeScriptParser;
  private transformer: IRTransformer;

  constructor(indexManager: IndexManager) {
    this.indexManager = indexManager;
    this.parser = new TypeScriptParser();
    this.transformer = new IRTransformer();
  }

  /**
   * ASTを取得（常に新規パース、キャッシュなし）
   */
  async getAST(filePath: string, code: string): Promise<CacheResult<AST>> {
    const startTime = Date.now();
    const ast = this.parser.parse(code, filePath);
    return {
      hit: false,
      data: ast,
      source: "fresh",
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * IRを取得（キャッシュ優先）
   *
   * 処理フロー:
   * 1. IRキャッシュの存在確認
   * 2. 鮮度チェック
   * 3. キャッシュヒット時 → キャッシュから返却
   * 4. キャッシュミス時 → AST取得 → IR変換 → キャッシュ保存 → 返却
   */
  async getIR(filePath: string, code: string): Promise<CacheResult<IR>> {
    const startTime = Date.now();
    const config = this.indexManager.getConfig();

    // キャッシュが無効な場合は常に新規生成
    if (!config?.cacheEnabled) {
      const astResult = await this.getAST(filePath, code);
      const ir = this.transformer.transform(astResult.data!, {
        language: this.parser.getSupportedLanguage(),
        file: filePath,
      });
      return {
        hit: false,
        data: ir,
        source: "fresh",
        processingTime: Date.now() - startTime,
      };
    }

    try {
      // ファイルの鮮度をチェック
      const isFresh = await this.indexManager.isFileCached(filePath);

      if (isFresh) {
        // IRキャッシュから読み込み
        const cachedIR = await this.indexManager.loadIRCache(filePath);

        if (cachedIR) {
          // 有効期限チェック
          const cacheAge = Date.now() - cachedIR.timestamp;
          const maxAge = config?.cacheMaxAge || 3600000;

          if (cacheAge < maxAge) {
            this.cacheHits++;
            console.log(
              `✅ IRキャッシュヒット: ${path.basename(filePath)} (${cacheAge}ms前)`,
            );

            return {
              hit: true,
              data: cachedIR.data,
              source: "cache",
              processingTime: Date.now() - startTime,
            };
          } else {
            console.log(
              `⏰ IRキャッシュ期限切れ: ${path.basename(filePath)} (${cacheAge}ms前)`,
            );
          }
        }
      }

      // キャッシュミス → 新規生成
      this.cacheMisses++;
      console.log(
        `❌ IRキャッシュミス: ${path.basename(filePath)} - 新規生成中...`,
      );

      // ASTを取得（インメモリのみ）
      const astResult = await this.getAST(filePath, code);

      // ファイルハッシュを計算してインデックスエントリを更新
      const fileHash = await this.indexManager.calculateFileHash(filePath);
      await this.updateFileIndex(filePath, astResult.data!, fileHash);

      // IRに変換
      const ir = this.transformer.transform(astResult.data!, {
        language: this.parser.getSupportedLanguage(),
        file: filePath,
      });

      // IRキャッシュに保存
      const cacheEntry: CacheEntry<IR> = {
        data: ir,
        timestamp: Date.now(),
        fileHash,
        filePath,
      };

      await this.indexManager.saveIRCache(filePath, cacheEntry);
      console.log(`💾 IRキャッシュ保存完了: ${path.basename(filePath)}`);

      return {
        hit: false,
        data: ir,
        source: "fresh",
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`❌ IRキャッシュ処理エラー: ${filePath}`, error);

      // エラー時はフォールバック
      const astResult = await this.getAST(filePath, code);
      const ir = this.transformer.transform(astResult.data!, {
        language: this.parser.getSupportedLanguage(),
        file: filePath,
      });

      return {
        hit: false,
        data: ir,
        source: "error",
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * ファイルインデックスエントリを更新
   */
  private async updateFileIndex(
    filePath: string,
    ast: AST,
    fileHash: string,
  ): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      const relativePath = path.relative(
        this.indexManager.getProjectIndex()?.projectRoot || "",
        filePath,
      );

      // ASTから基本メトリクスを抽出
      const functionCount = this.countFunctions(ast);
      const classCount = this.countClasses(ast);
      const lineCount = await this.countLines(filePath);

      const entry = {
        filePath: relativePath,
        fileHash,
        language: "typescript",
        lastModified: stats.mtime.toISOString(),
        lastAnalyzed: new Date().toISOString(),
        lineCount,
        functionCount,
        classCount,
        complexity: 0, // TODO: サイクロマティック複雑度の計算
        imports: [], // TODO: import文の抽出
        exports: [], // TODO: export文の抽出
      };

      await this.indexManager.updateFileEntry(entry);
    } catch (error) {
      console.error("インデックス更新エラー:", error);
    }
  }

  /**
   * ASTから関数数をカウント
   */
  private countFunctions(ast: AST): number {
    let count = 0;
    for (const node of ast.body) {
      if (node.type === "FunctionDeclaration") {
        count++;
      }
    }
    return count;
  }

  /**
   * ASTからクラス数をカウント
   * TODO: ClassDeclaration型を追加した際に実装
   */
  private countClasses(_ast: AST): number {
    // 現在のAST定義にはClassDeclarationがないため0を返す
    return 0;
  }

  /**
   * ファイルの行数をカウント
   */
  private async countLines(filePath: string): Promise<number> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return content.split("\n").length;
    } catch {
      return 0;
    }
  }

  /**
   * 特定ファイルのキャッシュを無効化
   */
  async invalidateCache(filePath: string): Promise<void> {
    console.log(`🗑️ キャッシュ無効化: ${path.basename(filePath)}`);

    try {
      const prismcodeDir = path.join(
        this.indexManager.getProjectIndex()?.projectRoot || "",
        ".prismcode",
      );

      const relativePath = path.relative(
        this.indexManager.getProjectIndex()?.projectRoot || "",
        filePath,
      );
      const cacheFileName =
        relativePath.replace(/[/\\]/g, "-").replace(/\./g, "-") + ".json";

      // IRキャッシュ削除
      const irCachePath = path.join(
        prismcodeDir,
        "cache",
        "ir-cache",
        cacheFileName,
      );
      await fs.unlink(irCachePath).catch(() => {});

      console.log(`✅ キャッシュ無効化完了: ${path.basename(filePath)}`);
    } catch (error) {
      console.error("キャッシュ無効化エラー:", error);
    }
  }

  /**
   * すべてのキャッシュをクリア
   */
  async clearAllCaches(): Promise<void> {
    console.log("🗑️ すべてのキャッシュをクリア中...");

    try {
      const prismcodeDir = path.join(
        this.indexManager.getProjectIndex()?.projectRoot || "",
        ".prismcode",
      );

      // IRキャッシュディレクトリをクリア
      const irCacheDir = path.join(prismcodeDir, "cache", "ir-cache");
      const irFiles = await fs.readdir(irCacheDir).catch(() => []);
      for (const file of irFiles) {
        await fs.unlink(path.join(irCacheDir, file)).catch(() => {});
      }

      // 統計をリセット
      this.cacheHits = 0;
      this.cacheMisses = 0;

      console.log(
        `✅ すべてのキャッシュをクリアしました（${irFiles.length}ファイル）`,
      );
    } catch (error) {
      console.error("キャッシュクリアエラー:", error);
      throw error;
    }
  }

  /**
   * キャッシュ統計を取得
   */
  async getStats(): Promise<CacheStats> {
    try {
      const prismcodeDir = path.join(
        this.indexManager.getProjectIndex()?.projectRoot || "",
        ".prismcode",
      );

      const projectIndex = this.indexManager.getProjectIndex();
      const totalFiles = projectIndex?.files.length || 0;

      // キャッシュファイルをカウント・サイズを計算
      const irCacheDir = path.join(prismcodeDir, "cache", "ir-cache");
      const irFiles = await fs.readdir(irCacheDir).catch(() => []);

      let totalSize = 0;
      for (const file of irFiles) {
        const stat = await fs
          .stat(path.join(irCacheDir, file))
          .catch(() => null);
        if (stat) {
          totalSize += stat.size;
        }
      }

      const cachedFiles = irFiles.length;
      const totalRequests = this.cacheHits + this.cacheMisses;
      const cacheHitRate =
        totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;

      return {
        totalFiles,
        cachedFiles,
        cacheHitRate,
        totalCacheSize: totalSize,
        oldestCache: null, // TODO: 実装
        newestCache: null, // TODO: 実装
      };
    } catch (error) {
      console.error("統計取得エラー:", error);
      return {
        totalFiles: 0,
        cachedFiles: 0,
        cacheHitRate: 0,
        totalCacheSize: 0,
        oldestCache: null,
        newestCache: null,
      };
    }
  }

  /**
   * キャッシュヒット率をリセット
   */
  resetStats(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}
