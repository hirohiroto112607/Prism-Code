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
        case 'showWorkspaceMacro':
          vscode.commands.executeCommand('prismcode.showWorkspaceMacroView');
          break;
        case 'generateIndex':
          vscode.commands.executeCommand('prismcode.generateIndex');
          break;
        case 'generateMacroData':
          vscode.commands.executeCommand('prismcode.generateMacroViewData');
          break;
        case 'loadCachedMacro':
          vscode.commands.executeCommand('prismcode.loadCachedMacroView');
          break;
        case 'exportAI':
          vscode.commands.executeCommand('prismcode.exportForAITools');
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
        padding: 0;
        margin: 0;
        color: var(--vscode-foreground);
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        overflow: hidden;
      }
      .container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        padding: 12px;
        box-sizing: border-box;
      }
      .header {
        margin-bottom: 12px;
        flex-shrink: 0;
      }
      .title {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 4px;
        color: var(--vscode-sideBarTitle-foreground);
      }
      .description {
        font-size: 11px;
        opacity: 0.7;
      }
      
      .scroll-area {
        flex: 1;
        overflow-y: auto;
        padding-right: 4px;
        margin-bottom: 12px;
      }

      .section {
        margin-bottom: 20px;
      }
      .section-title {
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 8px;
        opacity: 0.8;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .section-title::after {
        content: "";
        flex: 1;
        height: 1px;
        background: var(--vscode-panel-border);
        opacity: 0.5;
      }

      .button-grid {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .action-button {
        display: flex;
        flex-direction: column;
        width: 100%;
        padding: 8px 10px;
        background-color: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        border: 1px solid var(--vscode-button-border);
        border-radius: 4px;
        cursor: pointer;
        text-align: left;
        transition: all 0.1s ease;
      }
      .action-button:hover {
        background-color: var(--vscode-button-secondaryHoverBackground);
      }
      .action-button:active {
        transform: translateY(1px);
      }
      .btn-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: bold;
        font-size: 12px;
      }
      .btn-icon {
        font-size: 14px;
        width: 18px;
        text-align: center;
      }
      .btn-desc {
        font-size: 10px;
        opacity: 0.7;
        margin-top: 2px;
        margin-left: 26px;
      }

      .chat-section {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
        background: var(--vscode-sideBar-background);
        display: flex;
        flex-direction: column;
        margin-top: 10px;
        max-height: 250px;
        flex-shrink: 0;
      }
      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        font-size: 12px;
      }
      .message {
        margin-bottom: 8px;
        padding: 6px 10px;
        border-radius: 4px;
        line-height: 1.4;
      }
      .message.ai {
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-panel-border);
      }
      .message.user {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        align-self: flex-end;
      }

      .input-wrapper {
        display: flex;
        padding: 8px;
        gap: 6px;
        border-top: 1px solid var(--vscode-panel-border);
      }
      input {
        flex: 1;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        padding: 4px 8px;
        border-radius: 2px;
        font-size: 12px;
      }
      .send-btn {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 4px 10px;
        border-radius: 2px;
        cursor: pointer;
        font-size: 12px;
      }
      .send-btn:hover {
        background: var(--vscode-button-hoverBackground);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="title">PRISM CODE</div>
        <div class="description">コード構造を可視化し、理解を深めます。</div>
      </div>

      <div class="scroll-area">
        <!-- Visualization Section -->
        <div class="section">
          <div class="section-title">📊 Visualizations</div>
          <div class="button-grid">
            <button class="action-button" id="microButton">
              <div class="btn-header">
                <span class="btn-icon">🔬</span>
                <span>ミクロビュー (詳細フロー)</span>
              </div>
              <div class="btn-desc">現在のファイルのロジックを可視化</div>
            </button>
            <button class="action-button" id="macroButton">
              <div class="btn-header">
                <span class="btn-icon">🔭</span>
                <span>マクロビュー (俯瞰)</span>
              </div>
              <div class="btn-desc">現在のファイルの関数構造を表示</div>
            </button>
            <button class="action-button" id="workspaceMacroButton">
              <div class="btn-header">
                <span class="btn-icon">🌍</span>
                <span>ワークスペースマクロ</span>
              </div>
              <div class="btn-desc">プロジェクト全体の構造を俯瞰</div>
            </button>
          </div>
        </div>

        <!-- Project Analysis Section -->
        <div class="section">
          <div class="section-title">🔍 Project Analysis</div>
          <div class="button-grid">
            <button class="action-button" id="generateIndexButton">
              <div class="btn-header">
                <span class="btn-icon">⚡</span>
                <span>プロジェクトをスキャン</span>
              </div>
              <div class="btn-desc">インデックスを作成して解析を高速化</div>
            </button>
            <button class="action-button" id="generateMacroDataButton">
              <div class="btn-header">
                <span class="btn-icon">📦</span>
                <span>マクロデータを生成</span>
              </div>
              <div class="btn-desc">大規模プロジェクト用データをキャッシュ</div>
            </button>
            <button class="action-button" id="loadCachedButton">
              <div class="btn-header">
                <span class="btn-icon">📂</span>
                <span>キャッシュから読み込み</span>
              </div>
              <div class="btn-desc">保存済みの解析結果を表示</div>
            </button>
          </div>
        </div>

        <!-- Tools Section -->
        <div class="section">
          <div class="section-title">🛠️ Tools</div>
          <div class="button-grid">
            <button class="action-button" id="exportAIButton">
              <div class="btn-header">
                <span class="btn-icon">🤖</span>
                <span>AIツール向けエクスポート</span>
              </div>
              <div class="btn-desc">LLMへの提供用データを生成</div>
            </button>
          </div>
        </div>
      </div>

      <!-- Chat Section (Fixed at bottom) -->
      <div class="section-title">💬 AI Assistant (Beta)</div>
      <div class="chat-section">
        <div class="chat-messages" id="chatMessages">
          <div class="message ai">
            こんにちは！コードの可視化や構造について何かお手伝いできることはありますか？
          </div>
        </div>
        <div class="input-wrapper">
          <input type="text" id="messageInput" placeholder="質問を入力..." />
          <button class="send-btn" id="sendButton">送信</button>
        </div>
      </div>
    </div>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const chatMessages = document.getElementById('chatMessages');
      const messageInput = document.getElementById('messageInput');
      const sendButton = document.getElementById('sendButton');
      
      // Buttons
      const microButton = document.getElementById('microButton');
      const macroButton = document.getElementById('macroButton');
      const workspaceMacroButton = document.getElementById('workspaceMacroButton');
      const generateIndexButton = document.getElementById('generateIndexButton');
      const generateMacroDataButton = document.getElementById('generateMacroDataButton');
      const loadCachedButton = document.getElementById('loadCachedButton');
      const exportAIButton = document.getElementById('exportAIButton');

      // Functions
      function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;
        addMessage(text, 'user');
        vscode.postMessage({ type: 'sendMessage', text });
        messageInput.value = '';
      }

      function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + sender;
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }

      // Event Listeners for Commands
      microButton.addEventListener('click', () => vscode.postMessage({ type: 'switchToMicro' }));
      macroButton.addEventListener('click', () => vscode.postMessage({ type: 'switchToMacro' }));
      workspaceMacroButton.addEventListener('click', () => vscode.postMessage({ type: 'showWorkspaceMacro' }));
      generateIndexButton.addEventListener('click', () => vscode.postMessage({ type: 'generateIndex' }));
      generateMacroDataButton.addEventListener('click', () => vscode.postMessage({ type: 'generateMacroData' }));
      loadCachedButton.addEventListener('click', () => vscode.postMessage({ type: 'loadCachedMacro' }));
      exportAIButton.addEventListener('click', () => vscode.postMessage({ type: 'exportAI' }));

      // Chat events
      sendButton.addEventListener('click', sendMessage);
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
      });

      window.addEventListener('message', (event) => {
        const message = event.data;
        if (message.type === 'aiResponse') {
          addMessage(message.text, 'ai');
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
