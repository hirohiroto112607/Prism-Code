import * as vscode from "vscode";
import {
  AIAnalyzerFactory,
  GeminiQuotaError,
} from "./core/ai/AIAnalyzerFactory";
import { CopilotUnavailableError } from "./core/ai/CopilotAnalyzer";
import { CacheManager } from "./core/cache/CacheManager";
import { Exporter } from "./core/index/Exporter";
import { IndexManager } from "./core/index/IndexManager";
import { ProjectScanner } from "./core/index/ProjectScanner";
import { AIChatViewProvider } from "./webview/AIChatViewProvider";
import { FlowChartPanel } from "./webview/FlowChartPanel";

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
    // CacheManagerを初期化
    cacheManager = new CacheManager(indexManager);
    console.log("✅ CacheManager初期化完了");

    // .prismcodeフォルダーを初期化（非同期）、完了後にファイル監視を設定
    indexManager
      .initialize()
      .then(() => {
        const config = indexManager?.getConfig();
        if (config?.autoUpdate && cacheManager) {
          setupFileWatcher(cacheManager, context);
          console.log("✅ ファイル監視を有効化（自動キャッシュ無効化）");
        }
      })
      .catch((error) => {
        console.error(".prismcode初期化エラー:", error);
      });
  }

  // サイドバーにAIチャットビューを登録
  const aiChatProvider = new AIChatViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      AIChatViewProvider.viewType,
      aiChatProvider,
    ),
  );

  // タブ切り替え時の再解析に必要な最終解析情報
  let lastAnalyzedCode = "";
  let lastAnalyzedFilePath = "";

  /**
   * コードを解析してフローチャートパネルを更新する共通処理
   */
  async function analyzeAndUpdatePanel(
    code: string,
    filePath: string,
    requestedDiagramType?: import("./core/ir/IR").DiagramType,
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration("prismcode");
    let ir: import("./core/ir/IR").IR;
    let analysisMethod = "";

    const aiResult = await AIAnalyzerFactory.analyzeCode(
      code,
      filePath,
      config,
      requestedDiagramType,
    );

    if (!aiResult) {
      vscode.window.showErrorMessage(
        "コード解析にはAIが必要です。設定で prismcode.aiProvider を確認してください（GitHub Copilot または Gemini APIキーが必要です）。",
      );
      return;
    }

    ir = aiResult.ir;
    analysisMethod =
      aiResult.provider === "copilot"
        ? `（GitHub Copilot: ${aiResult.modelInfo}）`
        : `（Gemini: ${aiResult.modelInfo}）`;

    if (ir.nodes.length === 0) {
      vscode.window.showWarningMessage(
        "可視化できる関数定義が見つかりませんでした。",
      );
      return;
    }

    const panel = FlowChartPanel.createOrShow(context.extensionUri);

    // タブ切り替え時の再解析コールバックを登録
    panel.onDiagramTypeChange(async (diagramType) => {
      try {
        vscode.window.showInformationMessage(`🔄 ${diagramType} で再解析中...`);
        await analyzeAndUpdatePanel(
          lastAnalyzedCode,
          lastAnalyzedFilePath,
          diagramType,
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`再解析エラー: ${message}`);
      }
    });

    panel.updateFlowChart(ir);

    if (analysisMethod) {
      vscode.window.showInformationMessage(
        `フローチャートを生成しました${analysisMethod}（ノード: ${ir.nodes.length}個）`,
      );
    }
  }

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
        const code = document.getText();
        const filePath = document.fileName;
        console.log("📝 Code length:", code.length);

        // 最終解析情報を保存（タブ切り替え時の再解析で使用）
        lastAnalyzedCode = code;
        lastAnalyzedFilePath = filePath;

        await analyzeAndUpdatePanel(code, filePath);
      } catch (error: unknown) {
        console.error("❌ Visualization error:", error);
        if (error instanceof Error) {
          console.error("Stack trace:", error.stack);
        }

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
        } else if (error instanceof CopilotUnavailableError) {
          const action = await vscode.window.showErrorMessage(
            error.message,
            "設定を開く",
            "Gemini APIを使用する",
          );
          if (action === "設定を開く") {
            await vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "prismcode.aiProvider",
            );
          } else if (action === "Gemini APIを使用する") {
            await vscode.workspace
              .getConfiguration("prismcode")
              .update(
                "aiProvider",
                "gemini",
                vscode.ConfigurationTarget.Global,
              );
            vscode.window.showInformationMessage(
              "AIプロバイダーを Gemini に変更しました。prismcode.geminiApiKey も設定してください。",
            );
          }
        } else {
          const message = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`エラーが発生しました: ${message}`);
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
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`インデックス生成エラー: ${message}`);
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
