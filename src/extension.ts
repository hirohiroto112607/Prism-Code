import * as vscode from 'vscode';
import { TypeScriptParser } from './parsers/typescript/TypeScriptParser';
import { IRTransformer } from './core/transformer/IRTransformer';
import { FlowChartPanel } from './webview/FlowChartPanel';
import { AIChatViewProvider } from './webview/AIChatViewProvider';
import { IndexManager } from './core/index/IndexManager';
import { ProjectScanner } from './core/index/ProjectScanner';
import { Exporter } from './core/index/Exporter';

/**
 * 拡張機能のアクティベーション
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Prism Code が起動しました！');

  // IndexManagerの初期化
  let indexManager: IndexManager | undefined;
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (workspaceFolder) {
    indexManager = new IndexManager(workspaceFolder.uri.fsPath);
    // .prismcodeフォルダーを初期化
    indexManager.initialize().catch((error) => {
      console.error('.prismcode初期化エラー:', error);
    });
  }

  // サイドバーにAIチャットビューを登録
  const aiChatProvider = new AIChatViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      AIChatViewProvider.viewType,
      aiChatProvider
    )
  );

  // Visualizeコマンドの登録
  const visualizeCommand = vscode.commands.registerCommand(
    'prismcode.visualize',
    async () => {
      console.log('🚀 Visualize command executed');
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        console.error('❌ No active editor');
        vscode.window.showErrorMessage('アクティブなエディタがありません');
        return;
      }
      console.log('✅ Active editor found:', editor.document.fileName);

      const document = editor.document;
      const languageId = document.languageId;

      // TypeScriptとJavaScriptのみサポート
      if (
        languageId !== 'typescript' &&
        languageId !== 'typescriptreact' &&
        languageId !== 'javascript' &&
        languageId !== 'javascriptreact'
      ) {
        vscode.window.showErrorMessage(
          `現在、TypeScript/JavaScriptのみサポートしています（現在: ${languageId}）`
        );
        return;
      }

      try {
        console.log('📝 Getting source code...');
        // ソースコードを取得
        const code = document.getText();
        const filePath = document.fileName;
        console.log('📝 Code length:', code.length);

        // パーサーでASTを生成
        vscode.window.showInformationMessage('コードを解析中...');
        console.log('🔍 Parsing code...');
        const parser = new TypeScriptParser();
        const ast = parser.parse(code, filePath);
        console.log('✅ AST generated:', ast.body.length, 'nodes');

        // ASTをIRに変換
        console.log('🔄 Transforming to IR...');
        const transformer = new IRTransformer();
        const ir = transformer.transform(ast, {
          language: parser.getSupportedLanguage(),
          file: filePath,
        });
        console.log('✅ IR generated:', {
          nodes: ir.nodes.length,
          edges: ir.edges.length
        });

        // エディタエリアにフローチャートパネルを開く
        console.log('🎨 Creating/showing FlowChartPanel...');
        const panel = FlowChartPanel.createOrShow(context.extensionUri);
        console.log('✅ Panel created/shown');

        console.log('📤 Updating flowchart...');
        panel.updateFlowChart(ir);
        console.log('✅ Flowchart updated');

        vscode.window.showInformationMessage(
          `フローチャートを生成しました（ノード: ${ir.nodes.length}個, エッジ: ${ir.edges.length}個）`
        );
      } catch (error: any) {
        console.error('❌ Visualization error:', error);
        console.error('Stack trace:', error.stack);
        vscode.window.showErrorMessage(
          `エラーが発生しました: ${error.message}`
        );
      }
    }
  );

  context.subscriptions.push(visualizeCommand);

  // プロジェクトインデックス生成コマンド
  const generateIndexCommand = vscode.commands.registerCommand(
    'prismcode.generateIndex',
    async () => {
      try {
        if (!indexManager) {
          vscode.window.showErrorMessage('ワークスペースが開かれていません');
          return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
          return;
        }

        console.log('=== インデックス生成開始 ===');
        console.log('ワークスペースルート:', workspaceRoot);
        console.log('ワークスペースフォルダー数:', vscode.workspace.workspaceFolders?.length);

        vscode.window.showInformationMessage('プロジェクトをスキャン中...');

        const scanner = new ProjectScanner(indexManager);
        const projectIndex = await scanner.scanProject(workspaceRoot);

        console.log('=== インデックス生成完了 ===');
        console.log('総ファイル数:', projectIndex.metadata.totalFiles);
        console.log('総関数数:', projectIndex.metadata.totalFunctions);

        vscode.window.showInformationMessage(
          `インデックス生成完了！（${projectIndex.metadata.totalFiles}ファイル, ${projectIndex.metadata.totalFunctions}関数）`
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `インデックス生成エラー: ${error.message}`
        );
        console.error('インデックス生成エラー:', error);
      }
    }
  );

  // マクロビュー（ワークスペース全体の俯瞰）コマンド
  const showMacroViewCommand = vscode.commands.registerCommand(
    'prismcode.showMacroView',
    async () => {
      try {
        if (!indexManager) {
          vscode.window.showErrorMessage('ワークスペースが開かれていません');
          return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
          return;
        }

        vscode.window.showInformationMessage('マクロビュー（ワークスペース俯瞰）を生成中...');

        const scanner = new ProjectScanner(indexManager);

        // まずインデックスを生成
        await scanner.scanProject(workspaceRoot);

        // マクロビューデータを生成
        const macroViewData = await scanner.generateMacroViewData(workspaceRoot);

        // パネルを開いてマクロビューを表示
        const panel = FlowChartPanel.createOrShow(context.extensionUri);
        panel.updateProjectMacroView(macroViewData);

        vscode.window.showInformationMessage(
          `マクロビュー生成完了！（${macroViewData.metadata.moduleCount}モジュール, ${macroViewData.metadata.functionCount}関数）`
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `マクロビュー生成エラー: ${error.message}`
        );
        console.error('マクロビュー生成エラー:', error);
      }
    }
  );

  // AIツール向けエクスポートコマンド
  const exportForAIToolsCommand = vscode.commands.registerCommand(
    'prismcode.exportForAITools',
    async () => {
      try {
        if (!indexManager) {
          vscode.window.showErrorMessage('ワークスペースが開かれていません');
          return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
          return;
        }

        vscode.window.showInformationMessage('AIツール向けコンテキストをエクスポート中...');

        const exporter = new Exporter(indexManager, workspaceRoot);
        await exporter.exportAll();

        vscode.window.showInformationMessage(
          'エクスポート完了！.prismcode/exports/ フォルダーを確認してください'
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `エクスポートエラー: ${error.message}`
        );
        console.error('エクスポートエラー:', error);
      }
    }
  );

  // キャッシュからマクロビューを読み込むコマンド
  const loadCachedMacroViewCommand = vscode.commands.registerCommand(
    'prismcode.loadCachedMacroView',
    async () => {
      try {
        if (!indexManager) {
          vscode.window.showErrorMessage('ワークスペースが開かれていません');
          return;
        }

        const macroViewData = await indexManager.loadMacroViewData();
        if (!macroViewData) {
          vscode.window.showWarningMessage(
            'キャッシュされたマクロビューデータがありません。先に「マクロビューデータを生成」を実行してください。'
          );
          return;
        }

        // パネルを開いてマクロビューを表示
        const panel = FlowChartPanel.createOrShow(context.extensionUri);
        panel.updateProjectMacroView(macroViewData);

        vscode.window.showInformationMessage(
          'キャッシュからマクロビューを読み込みました'
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `読み込みエラー: ${error.message}`
        );
        console.error('読み込みエラー:', error);
      }
    }
  );

  context.subscriptions.push(
    generateIndexCommand,
    showMacroViewCommand,
    exportForAIToolsCommand,
    loadCachedMacroViewCommand
  );
}

/**
 * 拡張機能の非アクティベーション
 */
export function deactivate() {
  console.log('Prism Code が停止しました');
}
