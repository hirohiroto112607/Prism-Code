import * as vscode from "vscode";
import { FlowChartPanel } from "./webview/FlowChartPanel";
import { AIChatViewProvider } from "./webview/AIChatViewProvider";
import { IndexManager } from "./core/index/IndexManager";
import { ProjectScanner } from "./core/index/ProjectScanner";
import { Exporter } from "./core/index/Exporter";
import { CacheManager } from "./core/cache/CacheManager";
import { GeminiAnalyzer, GeminiQuotaError } from "./core/ai/GeminiAnalyzer";
import type { IR } from "./core/ir/IR";

/**
 * ファイル変更監視を設定
 * TypeScript/JavaScriptファイルの変更時にキャッシュを自動無効化
 */
function setupFileWatcher(
  cacheManager: CacheManager,
  context: vscode.ExtensionContext,
): void {
  // TypeScript/JavaScriptファイルを監視
  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/*.{ts,tsx,js,jsx}",
    false, // onCreate
    false, // onChange
    false, // onDelete
  );

  // ファイル変更時
  watcher.onDidChange(async (uri) => {
    console.log(`📝 ファイル変更検出: ${uri.fsPath}`);
    await cacheManager.invalidateCache(uri.fsPath);
  });

  // ファイル作成時
  watcher.onDidCreate(async (uri) => {
    console.log(`➕ ファイル作成検出: ${uri.fsPath}`);
    // 新規ファイルはキャッシュがないので何もしない
  });

  // ファイル削除時
  watcher.onDidDelete(async (uri) => {
    console.log(`🗑️ ファイル削除検出: ${uri.fsPath}`);
    await cacheManager.invalidateCache(uri.fsPath);
  });

  context.subscriptions.push(watcher);
}

/**
 * 拡張機能のアクティベーション
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("Prism Code が起動しました！");

  // IndexManagerとCacheManagerの初期化
  let indexManager: IndexManager | undefined;
  let cacheManager: CacheManager | undefined;
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (workspaceFolder) {
    indexManager = new IndexManager(workspaceFolder.uri.fsPath);
    // .prismcodeフォルダーを初期化（非同期）
    indexManager.initialize().catch((error) => {
      console.error(".prismcode初期化エラー:", error);
    });

    // CacheManagerを初期化
    cacheManager = new CacheManager(indexManager);
    console.log("✅ CacheManager初期化完了");

    // ファイル変更監視の設定
    const config = indexManager.getConfig();
    if (config?.autoUpdate) {
      setupFileWatcher(cacheManager, context);
      console.log("✅ ファイル監視を有効化（自動キャッシュ無効化）");
    }
  }

  // サイドバーにAIチャットビューを登録
  const aiChatProvider = new AIChatViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      AIChatViewProvider.viewType,
      aiChatProvider,
    ),
  );

  // Visualizeコマンドの登録
  const visualizeCommand = vscode.commands.registerCommand(
    "prismcode.visualize",
    async () => {
      console.log("🚀 Visualize command executed");
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        console.error("❌ No active editor");
        vscode.window.showErrorMessage("アクティブなエディタがありません");
        return;
      }
      console.log("✅ Active editor found:", editor.document.fileName);

      const document = editor.document;
      const languageId = document.languageId;

      // TypeScriptとJavaScriptのみサポート
      if (
        languageId !== "typescript" &&
        languageId !== "typescriptreact" &&
        languageId !== "javascript" &&
        languageId !== "javascriptreact"
      ) {
        vscode.window.showErrorMessage(
          `現在、TypeScript/JavaScriptのみサポートしています（現在: ${languageId}）`,
        );
        return;
      }

      try {
        console.log("📝 Getting source code...");
        // ソースコードを取得
        const code = document.getText();
        const filePath = document.fileName;
        console.log("📝 Code length:", code.length);

        // Gemini使用フラグをVSCode設定から読み込み
        const config = vscode.workspace.getConfiguration("prismcode");
        const useGemini = config.get<boolean>("useGeminiAnalysis", false);

        let ir: IR;

        if (useGemini) {
          // --- Gemini解析パス ---
          const apiKey = config.get<string>("geminiApiKey", "");
          if (!apiKey) {
            const action = await vscode.window.showErrorMessage(
              "Gemini APIキーが設定されていません。設定でprismcode.geminiApiKeyを入力してください。",
              "設定を開く",
            );
            if (action === "設定を開く") {
              await vscode.commands.executeCommand(
                "workbench.action.openSettings",
                "prismcode.geminiApiKey",
              );
            }
            return;
          }

          const modelName = config.get<string>(
            "geminiModel",
            "gemini-2.0-flash-lite",
          );
          console.log(`🤖 Gemini APIでコードを解析中... (model: ${modelName})`);
          vscode.window.showInformationMessage(
            `Gemini APIでコードを解析中... (${modelName})`,
          );

          const analyzer = new GeminiAnalyzer(apiKey, modelName);
          ir = await analyzer.analyzeCode(code, filePath);

          console.log("✅ Gemini解析完了:", {
            nodes: ir.nodes.length,
            edges: ir.edges.length,
          });
        } else {
          // --- 既存のts-morphパス ---
          if (!cacheManager) {
            vscode.window.showErrorMessage(
              "CacheManagerが初期化されていません",
            );
            return;
          }

          vscode.window.showInformationMessage("コードを解析中...");
          console.log("🔍 Getting IR (cache-aware)...");

          const irResult = await cacheManager.getIR(filePath, code);

          if (irResult.hit) {
            console.log(`✅ キャッシュから取得 (${irResult.processingTime}ms)`);
            vscode.window.showInformationMessage(
              `キャッシュから読み込みました（${irResult.processingTime}ms）`,
            );
          } else {
            console.log(`✅ 新規生成 (${irResult.processingTime}ms)`);
          }

          ir = irResult.data!;
          console.log("✅ IR ready:", {
            nodes: ir.nodes.length,
            edges: ir.edges.length,
            source: irResult.source,
          });
        }

        // 関数が見つからない場合は早期リターン
        if (ir.nodes.length === 0) {
          vscode.window.showWarningMessage(
            `可視化できる関数定義が見つかりませんでした。このファイルには関数宣言やアロー関数が含まれていない可能性があります（例: モジュールレベルの実行コードのみのファイル）。`,
          );
          return;
        }

        // エディタエリアにフローチャートパネルを開く
        console.log("🎨 Creating/showing FlowChartPanel...");
        const panel = FlowChartPanel.createOrShow(context.extensionUri);
        console.log("✅ Panel created/shown");

        console.log("📤 Updating flowchart...");
        panel.updateFlowChart(ir);
        console.log("✅ Flowchart updated");

        const analysisMethod = useGemini ? "（Gemini API）" : "";
        vscode.window.showInformationMessage(
          `フローチャートを生成しました${analysisMethod}（ノード: ${ir.nodes.length}個, エッジ: ${ir.edges.length}個）`,
        );
      } catch (error: any) {
        console.error("❌ Visualization error:", error);
        console.error("Stack trace:", error.stack);

        if (error instanceof GeminiQuotaError) {
          const action = await vscode.window.showErrorMessage(
            error.message,
            "gemini-2.0-flash-lite に切り替える",
            "設定を開く",
          );
          if (action === "gemini-2.0-flash-lite に切り替える") {
            await vscode.workspace
              .getConfiguration("prismcode")
              .update(
                "geminiModel",
                "gemini-2.0-flash-lite",
                vscode.ConfigurationTarget.Global,
              );
            vscode.window.showInformationMessage(
              "モデルを gemini-2.0-flash-lite に変更しました。再度お試しください。",
            );
          } else if (action === "設定を開く") {
            await vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "prismcode.geminiModel",
            );
          }
        } else {
          vscode.window.showErrorMessage(
            `エラーが発生しました: ${error.message}`,
          );
        }
      }
    },
  );

  context.subscriptions.push(visualizeCommand);

  // プロジェクトインデックス生成コマンド
  const generateIndexCommand = vscode.commands.registerCommand(
    "prismcode.generateIndex",
    async () => {
      try {
        if (!indexManager) {
          vscode.window.showErrorMessage("ワークスペースが開かれていません");
          return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
          return;
        }

        console.log("=== インデックス生成開始 ===");
        console.log("ワークスペースルート:", workspaceRoot);
        console.log(
          "ワークスペースフォルダー数:",
          vscode.workspace.workspaceFolders?.length,
        );

        vscode.window.showInformationMessage("プロジェクトをスキャン中...");

        // 設定とインデックスを事前にロード（スキャン前に完了を保証）
        await indexManager.initialize();

        const scanner = new ProjectScanner(indexManager);
        const projectIndex = await scanner.scanProject(workspaceRoot);

        console.log("=== インデックス生成完了 ===");
        console.log("総ファイル数:", projectIndex.metadata.totalFiles);
        console.log("総関数数:", projectIndex.metadata.totalFunctions);

        vscode.window.showInformationMessage(
          `インデックス生成完了！（${projectIndex.metadata.totalFiles}ファイル, ${projectIndex.metadata.totalFunctions}関数）`,
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `インデックス生成エラー: ${error.message}`,
        );
        console.error("インデックス生成エラー:", error);
      }
    },
  );

  // マクロビュー（ワークスペース全体の俯瞰）コマンド
  const showMacroViewCommand = vscode.commands.registerCommand(
    "prismcode.showMacroView",
    async () => {
      try {
        if (!indexManager) {
          vscode.window.showErrorMessage("ワークスペースが開かれていません");
          return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
          return;
        }

        vscode.window.showInformationMessage(
          "マクロビュー（ワークスペース俯瞰）を生成中...",
        );

        // 設定とインデックスを事前にロード
        await indexManager.initialize();

        const scanner = new ProjectScanner(indexManager);

        // まずインデックスを生成
        await scanner.scanProject(workspaceRoot);

        // マクロビューデータを生成
        const macroViewData =
          await scanner.generateMacroViewData(workspaceRoot);

        // パネルを開いてマクロビューを表示
        const panel = FlowChartPanel.createOrShow(context.extensionUri);
        panel.updateProjectMacroView(macroViewData);

        vscode.window.showInformationMessage(
          `マクロビュー生成完了！（${macroViewData.metadata.moduleCount}モジュール, ${macroViewData.metadata.functionCount}関数）`,
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `マクロビュー生成エラー: ${error.message}`,
        );
        console.error("マクロビュー生成エラー:", error);
      }
    },
  );

  // AIツール向けエクスポートコマンド
  const exportForAIToolsCommand = vscode.commands.registerCommand(
    "prismcode.exportForAITools",
    async () => {
      try {
        if (!indexManager) {
          vscode.window.showErrorMessage("ワークスペースが開かれていません");
          return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
          return;
        }

        vscode.window.showInformationMessage(
          "AIツール向けコンテキストをエクスポート中...",
        );

        // 設定とインデックスを事前にロード
        await indexManager.initialize();

        const exporter = new Exporter(indexManager, workspaceRoot);
        await exporter.exportAll();

        vscode.window.showInformationMessage(
          "エクスポート完了！.prismcode/exports/ フォルダーを確認してください",
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(`エクスポートエラー: ${error.message}`);
        console.error("エクスポートエラー:", error);
      }
    },
  );

  // キャッシュからマクロビューを読み込むコマンド
  const loadCachedMacroViewCommand = vscode.commands.registerCommand(
    "prismcode.loadCachedMacroView",
    async () => {
      try {
        if (!indexManager) {
          vscode.window.showErrorMessage("ワークスペースが開かれていません");
          return;
        }

        const macroViewData = await indexManager.loadMacroViewData();
        if (!macroViewData) {
          vscode.window.showWarningMessage(
            "キャッシュされたマクロビューデータがありません。先に「マクロビューデータを生成」を実行してください。",
          );
          return;
        }

        // パネルを開いてマクロビューを表示
        const panel = FlowChartPanel.createOrShow(context.extensionUri);
        panel.updateProjectMacroView(macroViewData);

        vscode.window.showInformationMessage(
          "キャッシュからマクロビューを読み込みました",
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(`読み込みエラー: ${error.message}`);
        console.error("読み込みエラー:", error);
      }
    },
  );

  // キャッシュ統計表示コマンド
  const showCacheStatsCommand = vscode.commands.registerCommand(
    "prismcode.showCacheStats",
    async () => {
      try {
        if (!cacheManager) {
          vscode.window.showErrorMessage("CacheManagerが初期化されていません");
          return;
        }

        const stats = await cacheManager.getStats();

        const message = `
📊 Prism Code キャッシュ統計

📁 総ファイル数: ${stats.totalFiles}
💾 キャッシュ済みファイル: ${stats.cachedFiles}
📈 キャッシュヒット率: ${stats.cacheHitRate.toFixed(2)}%
💿 キャッシュサイズ: ${(stats.totalCacheSize / 1024 / 1024).toFixed(2)} MB
        `.trim();

        vscode.window.showInformationMessage(message, { modal: true });
        console.log("キャッシュ統計:", stats);
      } catch (error: any) {
        vscode.window.showErrorMessage(`統計取得エラー: ${error.message}`);
        console.error("統計取得エラー:", error);
      }
    },
  );

  // キャッシュクリアコマンド
  const clearCacheCommand = vscode.commands.registerCommand(
    "prismcode.clearCache",
    async () => {
      try {
        if (!cacheManager) {
          vscode.window.showErrorMessage("CacheManagerが初期化されていません");
          return;
        }

        const answer = await vscode.window.showWarningMessage(
          "すべてのキャッシュをクリアしますか？次回の可視化時に再生成されます。",
          { modal: true },
          "クリア",
          "キャンセル",
        );

        if (answer === "クリア") {
          await cacheManager.clearAllCaches();
          vscode.window.showInformationMessage("✅ キャッシュをクリアしました");
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `キャッシュクリアエラー: ${error.message}`,
        );
        console.error("キャッシュクリアエラー:", error);
      }
    },
  );

  context.subscriptions.push(
    generateIndexCommand,
    showMacroViewCommand,
    exportForAIToolsCommand,
    loadCachedMacroViewCommand,
    showCacheStatsCommand,
    clearCacheCommand,
  );
}

/**
 * 拡張機能の非アクティベーション
 */
export function deactivate() {
  console.log("Prism Code が停止しました");
}
