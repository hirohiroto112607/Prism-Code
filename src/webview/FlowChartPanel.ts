import * as vscode from 'vscode';
import { IR, MacroViewData } from '../core/ir/IR';

/**
 * エディタエリアにフローチャートを表示するWebviewPanel
 */
export class FlowChartPanel {
  public static currentPanel: FlowChartPanel | undefined;
  private static readonly viewType = 'prismcode.flowchart';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _currentViewMode: 'micro' | 'macro' = 'micro';

  /**
   * FlowChartPanelを作成または既存のものを表示
   */
  public static createOrShow(extensionUri: vscode.Uri): FlowChartPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // 既存のパネルがあれば表示
    if (FlowChartPanel.currentPanel) {
      FlowChartPanel.currentPanel._panel.reveal(column);
      return FlowChartPanel.currentPanel;
    }

    // 新しいパネルを作成
    const panel = vscode.window.createWebviewPanel(
      FlowChartPanel.viewType,
      'フローチャート',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true, // パネルが隠れても状態を保持
      }
    );

    FlowChartPanel.currentPanel = new FlowChartPanel(panel, extensionUri);
    return FlowChartPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // HTMLコンテンツを設定
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    // パネルが閉じられた際の処理
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // WebViewからのメッセージを受信
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.type) {
          case 'alert':
            vscode.window.showInformationMessage(message.text);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  /**
   * IRデータをWebViewに送信してフローチャートを更新（ミクロビュー）
   */
  public updateFlowChart(ir: IR): void {
    console.log('FlowChartPanel.updateFlowChart called with IR:', {
      nodes: ir.nodes.length,
      edges: ir.edges.length
    });
    this._currentViewMode = 'micro';
    this._panel.webview.postMessage({
      type: 'updateFlow',
      data: ir,
      viewMode: 'micro',
    });
    console.log('Message sent to webview');
  }

  /**
   * マクロビューデータをWebViewに送信
   */
  public updateMacroView(macroData: MacroViewData): void {
    console.log('FlowChartPanel.updateMacroView called with data:', macroData);
    this._currentViewMode = 'macro';
    this._panel.webview.postMessage({
      type: 'updateMacroView',
      data: macroData,
      viewMode: 'macro',
    });
    console.log('Macro view message sent to webview');
  }

  /**
   * ビューモードを切り替え
   */
  public switchToMacro(): void {
    this._currentViewMode = 'macro';
    this._panel.webview.postMessage({
      type: 'switchViewMode',
      viewMode: 'macro',
    });
  }

  public switchToMicro(): void {
    this._currentViewMode = 'micro';
    this._panel.webview.postMessage({
      type: 'switchViewMode',
      viewMode: 'micro',
    });
  }

  /**
   * パネルを破棄
   */
  public dispose(): void {
    FlowChartPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
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

    // CSPを修正: script-srcにwebview.cspSourceを追加してモジュールスクリプトを許可
    return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource};" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="${styleUri}" rel="stylesheet" />
    <title>フローチャート</title>
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
