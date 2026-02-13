import * as vscode from 'vscode';

/**
 * サイドバーにAIチャット用のUIを表示するWebViewProvider
 * Phase 3でGemini API統合予定
 */
export class AIChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'prismcode.aiChat';

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
        case 'sendMessage':
          // TODO: Phase 3でGemini APIと統合
          this._handleUserMessage(message.text);
          break;
        case 'switchToMacro':
          vscode.commands.executeCommand('prismcode.switchToMacro');
          break;
        case 'switchToMicro':
          vscode.commands.executeCommand('prismcode.switchToMicro');
          break;
      }
    });
  }

  /**
   * ユーザーメッセージを処理（Phase 3で実装）
   */
  private _handleUserMessage(text: string): void {
    // TODO: Gemini APIにリクエストを送信
    // 現在はダミーレスポンスを返す
    setTimeout(() => {
      this._view?.webview.postMessage({
        type: 'aiResponse',
        text: `[開発中] あなたのメッセージ: "${text}"`,
      });
    }, 500);
  }

  /**
   * WebView用のHTMLを生成
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        padding: 10px;
        color: var(--vscode-foreground);
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
      }
      .container {
        display: flex;
        flex-direction: column;
        height: 97vh;
      }
      .header {
        padding: 10px 0;
        border-bottom: 1px solid var(--vscode-panel-border);
        margin-bottom: 10px;
      }
      .title {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      .description {
        font-size: 12px;
        opacity: 0.7;
      }
      .chat-container {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        border: 1px solid var(--vscode-panel-border);
        border-radius: 4px;
        margin-bottom: 10px;
      }
      .message {
        margin-bottom: 10px;
        padding: 8px;
        border-radius: 4px;
      }
      .message.user {
        background-color: var(--vscode-button-background);
        text-align: right;
      }
      .message.ai {
        background-color: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
      }
      .input-container {
        display: flex;
        gap: 5px;
      }
      input {
        flex: 1;
        padding: 8px;
        background-color: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
      }
      button {
        padding: 8px 16px;
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
      }
      button:hover {
        background-color: var(--vscode-button-hoverBackground);
      }
      .view-switcher {
        margin-top: 15px;
        padding: 15px;
        background-color: var(--vscode-editor-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
      }
      .view-switcher-title {
        font-size: 13px;
        font-weight: bold;
        margin-bottom: 10px;
        color: var(--vscode-foreground);
      }
      .view-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .view-button {
        padding: 10px;
        background-color: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        border: 1px solid var(--vscode-button-border);
        border-radius: 4px;
        cursor: pointer;
        text-align: left;
        font-size: 13px;
        transition: all 0.2s;
      }
      .view-button:hover {
        background-color: var(--vscode-button-secondaryHoverBackground);
        transform: translateY(-1px);
      }
      .view-button-icon {
        font-size: 16px;
        margin-right: 8px;
      }
      .view-button-label {
        font-weight: bold;
      }
      .view-button-desc {
        font-size: 11px;
        opacity: 0.7;
        margin-top: 3px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="title">AI アシスタント</div>
        <div class="description">Phase 3で実装予定 (Gemini API)</div>
      </div>

      <div class="view-switcher">
        <div class="view-switcher-title">📊 ビューモード切り替え</div>
        <div class="view-buttons">
          <button class="view-button" id="macroButton">
            <div>
              <span class="view-button-icon">🔭</span>
              <span class="view-button-label">マクロビュー(俯瞰)</span>
            </div>
            <div class="view-button-desc">システム全体の構造を表示</div>
          </button>
          <button class="view-button" id="microButton">
            <div>
              <span class="view-button-icon">🔬</span>
              <span class="view-button-label">ミクロビュー(詳細)</span>
            </div>
            <div class="view-button-desc">詳細なフローチャートを表示</div>
          </button>
        </div>
      </div>
      <div class="chat-container" id="chatContainer">
        <div class="message ai">
          こんにちは！コードの可視化についてお手伝いします。<br>
          （現在は開発中です）
        </div>
      </div>
      <div class="input-container">
        <input type="text" id="messageInput" placeholder="メッセージを入力..." />
        <button id="sendButton">送信</button>
      </div>
    </div>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const chatContainer = document.getElementById('chatContainer');
      const messageInput = document.getElementById('messageInput');
      const sendButton = document.getElementById('sendButton');
      const macroButton = document.getElementById('macroButton');
      const microButton = document.getElementById('microButton');

      // メッセージを送信
      function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        // ユーザーメッセージを表示
        addMessage(text, 'user');

        // Extension側にメッセージを送信
        vscode.postMessage({ type: 'sendMessage', text });

        // 入力欄をクリア
        messageInput.value = '';
      }

      // メッセージをUIに追加
      function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + sender;
        messageDiv.textContent = text;
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }

      // イベントリスナー
      sendButton.addEventListener('click', sendMessage);
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
      });

      // ビュー切り替えボタンのイベントリスナー
      macroButton.addEventListener('click', () => {
        vscode.postMessage({ type: 'switchToMacro' });
      });
      microButton.addEventListener('click', () => {
        vscode.postMessage({ type: 'switchToMicro' });
      });

      // Extension側からのメッセージを受信
      window.addEventListener('message', (event) => {
        const message = event.data;
        switch (message.type) {
          case 'aiResponse':
            addMessage(message.text, 'ai');
            break;
        }
      });
    </script>
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
