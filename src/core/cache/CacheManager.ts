/**
 * キャッシュ統合管理マネージャー
 * すべてのキャッシュ操作を統括し、鮮度チェック・自動更新を管理する
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { IndexManager } from "../index/IndexManager";

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

/**
 * CacheManager
 *
 * キャッシュの保存・削除・統計情報を管理する
 * IRはAIアナライザーが生成し、このクラスはキャッシュI/Oのみを担当する
 */
export class CacheManager {
  private indexManager: IndexManager;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(indexManager: IndexManager) {
    this.indexManager = indexManager;
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
      const cacheFileName = `${relativePath.replace(/[/\\]/g, "-").replace(/\./g, "-")}.json`;

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
