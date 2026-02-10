import * as vscode from 'vscode';
import { IR } from '../core/ir/IR';

/**
 * WebViewを管理するプロバイダー
 */
export class WebViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'logicflowbridge.flowView';

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  /**
   * WebViewの解決
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // WebViewからのメッセージを受信
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'visualize':
          // 可視化コマンドを実行
          vscode.commands.executeCommand('logicflowbridge.visualize');
          break;
      }
    });
  }

  /**
   * IRデータをWebViewに送信
   */
  public sendFlowData(ir: IR): void {
    if (this._view) {
      this._view.show?.(true);
      this._view.webview.postMessage({
        type: 'updateFlow',
        data: ir,
      });
    } else {
      vscode.window.showErrorMessage(
        'フロービューが開かれていません。サイドバーの「LogicFlow」を開いてください。'
      );
    }
  }

  /**
   * WebView用のHTMLを生成
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    // WebView UIのビルド済みファイルへのパス
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'build', 'assets', 'index.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'build', 'assets', 'index.css')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="${styleUri}" rel="stylesheet" />
    <title>LogicFlowBridge</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
