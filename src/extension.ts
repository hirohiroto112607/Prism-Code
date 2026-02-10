import * as vscode from 'vscode';
import { TypeScriptParser } from './parsers/typescript/TypeScriptParser';
import { IRTransformer } from './core/transformer/IRTransformer';
import { WebViewProvider } from './webview/WebViewProvider';

/**
 * 拡張機能のアクティベーション
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('LogicFlowBridge が起動しました！');

  // WebView Providerの登録
  const provider = new WebViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      WebViewProvider.viewType,
      provider
    )
  );

  // Visualizeコマンドの登録
  const visualizeCommand = vscode.commands.registerCommand(
    'logicflowbridge.visualize',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('アクティブなエディタがありません');
        return;
      }

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
        // ソースコードを取得
        const code = document.getText();
        const filePath = document.fileName;

        // パーサーでASTを生成
        vscode.window.showInformationMessage('コードを解析中...');
        const parser = new TypeScriptParser();
        const ast = parser.parse(code, filePath);

        // ASTをIRに変換
        const transformer = new IRTransformer();
        const ir = transformer.transform(ast, {
          language: parser.getSupportedLanguage(),
          file: filePath,
        });

        // WebViewにIRを送信
        provider.sendFlowData(ir);

        vscode.window.showInformationMessage(
          `フローチャートを生成しました（ノード: ${ir.nodes.length}個, エッジ: ${ir.edges.length}個）`
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `エラーが発生しました: ${error.message}`
        );
        console.error('可視化エラー:', error);
      }
    }
  );

  context.subscriptions.push(visualizeCommand);
}

/**
 * 拡張機能の非アクティベーション
 */
export function deactivate() {
  console.log('LogicFlowBridge が停止しました');
}
