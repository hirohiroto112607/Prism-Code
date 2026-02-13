import * as vscode from 'vscode';
import { TypeScriptParser } from './parsers/typescript/TypeScriptParser';
import { IRTransformer } from './core/transformer/IRTransformer';
import { MacroViewTransformer } from './core/transformer/MacroViewTransformer';
import { FlowChartPanel } from './webview/FlowChartPanel';
import { AIChatViewProvider } from './webview/AIChatViewProvider';

/**
 * 拡張機能のアクティベーション
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Prism Code が起動しました！');

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

  // マクロビュー切り替えコマンド
  const switchToMacroCommand = vscode.commands.registerCommand(
    'prismcode.switchToMacro',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('アクティブなエディタがありません');
        return;
      }

      const document = editor.document;
      const languageId = document.languageId;

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
        const code = document.getText();
        const filePath = document.fileName;

        vscode.window.showInformationMessage('マクロビューを生成中...');
        const parser = new TypeScriptParser();
        const ast = parser.parse(code, filePath);

        // マクロビュー用のデータを生成
        const macroTransformer = new MacroViewTransformer();
        const macroData = macroTransformer.transform(ast, {
          language: parser.getSupportedLanguage(),
          file: filePath,
        });

        // パネルを開いてマクロビューを表示
        const panel = FlowChartPanel.createOrShow(context.extensionUri);
        panel.updateMacroView(macroData);

        vscode.window.showInformationMessage(
          `マクロビューを生成しました（関数: ${macroData.functions.length}個）`
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `エラーが発生しました: ${error.message}`
        );
        console.error('マクロビュー生成エラー:', error);
      }
    }
  );

  // ミクロビュー切り替えコマンド
  const switchToMicroCommand = vscode.commands.registerCommand(
    'prismcode.switchToMicro',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('アクティブなエディタがありません');
        return;
      }

      const document = editor.document;
      const languageId = document.languageId;

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
        const code = document.getText();
        const filePath = document.fileName;

        vscode.window.showInformationMessage('ミクロビューを生成中...');
        const parser = new TypeScriptParser();
        const ast = parser.parse(code, filePath);

        // IRに変換（ミクロビュー）
        const transformer = new IRTransformer();
        const ir = transformer.transform(ast, {
          language: parser.getSupportedLanguage(),
          file: filePath,
        });

        // パネルを開いてミクロビューを表示
        const panel = FlowChartPanel.createOrShow(context.extensionUri);
        panel.updateFlowChart(ir);

        vscode.window.showInformationMessage(
          `ミクロビューを生成しました（ノード: ${ir.nodes.length}個）`
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `エラーが発生しました: ${error.message}`
        );
        console.error('ミクロビュー生成エラー:', error);
      }
    }
  );

  context.subscriptions.push(switchToMacroCommand, switchToMicroCommand);
}

/**
 * 拡張機能の非アクティベーション
 */
export function deactivate() {
  console.log('Prism Code が停止しました');
}
