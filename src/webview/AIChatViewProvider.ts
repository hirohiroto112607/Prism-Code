import * as vscode from "vscode";
import { AIAnalyzerFactory } from "../core/ai/AIAnalyzerFactory";
import { CopilotAnalyzer } from "../core/ai/CopilotAnalyzer";

/**
 * サイドバーにAIアシスタントUIを表示するWebViewProvider
 */
export class AIChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "prismcode.aiChat";

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  /**
   * WebViewの解決
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // WebViewからのメッセージを受信
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "sendMessage":
          await this._handleUserMessage(message.text);
          break;
        case "visualize":
          vscode.commands.executeCommand("prismcode.visualize");
          break;
        case "showMacroView":
          vscode.commands.executeCommand("prismcode.showMacroView");
          break;
        case "generateIndex":
          vscode.commands.executeCommand("prismcode.generateIndex");
          break;
        case "loadCachedMacro":
          vscode.commands.executeCommand("prismcode.loadCachedMacroView");
          break;
        case "exportAI":
          vscode.commands.executeCommand("prismcode.exportForAITools");
          break;
        case "checkAIProvider":
          await this._sendAIProviderStatus();
          break;
        case "openSettings":
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "prismcode.aiProvider",
          );
          break;
      }
    });

    // WebView表示時にAIプロバイダーの状態を送信
    this._sendAIProviderStatus();
  }

  /**
   * AIプロバイダーの状態を WebView に送信する
   */
  private async _sendAIProviderStatus(): Promise<void> {
    const config = vscode.workspace.getConfiguration("prismcode");
    const { label, detail } =
      await AIAnalyzerFactory.getActiveProviderLabel(config);

    const copilotAvailable = await AIAnalyzerFactory.isCopilotAvailable();

    this._view?.webview.postMessage({
      type: "aiProviderStatus",
      label,
      detail,
      copilotAvailable,
    });
  }

  /**
   * ユーザーメッセージを処理して Copilot（または Gemini）で回答する
   */
  private async _handleUserMessage(text: string): Promise<void> {
    // 処理中インジケーターを送信
    this._view?.webview.postMessage({
      type: "aiResponse",
      text: "...",
      isThinking: true,
    });

    try {
      // 現在のエディタのコードをコンテキストとして提供
      const editor = vscode.window.activeTextEditor;
      const contextCode = editor?.document.getText();
      const contextFilePath = editor?.document.fileName;

      let responseText: string;

      // Copilot が利用可能なら優先して使用
      const copilotAvailable = await AIAnalyzerFactory.isCopilotAvailable();
      if (copilotAvailable) {
        const analyzer = await CopilotAnalyzer.create();
        responseText = await analyzer.chat(text, contextCode, contextFilePath);
      } else {
        // フォールバック: Copilot なし
        responseText =
          "GitHub Copilotが利用できないため、チャット機能は現在使用できません。\n" +
          "設定で `prismcode.aiProvider` を確認してください。";
      }

      this._view?.webview.postMessage({
        type: "aiResponse",
        text: responseText,
        isThinking: false,
      });
    } catch (err: any) {
      this._view?.webview.postMessage({
        type: "aiResponse",
        text: `エラーが発生しました: ${err.message}`,
        isThinking: false,
      });
    }
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

      /* AI Provider Status */
      .ai-status {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 4px;
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-panel-border);
        margin-bottom: 12px;
        cursor: pointer;
        transition: background 0.1s;
        flex-shrink: 0;
      }
      .ai-status:hover {
        background: var(--vscode-list-hoverBackground);
      }
      .ai-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .ai-status-dot.copilot { background: #58a6ff; }
      .ai-status-dot.gemini  { background: #4ade80; }
      .ai-status-dot.offline { background: #6b7280; }
      .ai-status-text {
        flex: 1;
        min-width: 0;
      }
      .ai-status-label {
        font-size: 11px;
        font-weight: bold;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ai-status-detail {
        font-size: 10px;
        opacity: 0.6;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ai-status-refresh {
        font-size: 12px;
        opacity: 0.5;
        flex-shrink: 0;
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
        max-height: 260px;
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
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .message.ai {
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-panel-border);
      }
      .message.ai.thinking {
        opacity: 0.6;
        font-style: italic;
      }
      .message.user {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
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
      input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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
      .send-btn:hover { background: var(--vscode-button-hoverBackground); }
      .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="title">PRISM CODE</div>
        <div class="description">コード構造を可視化し、理解を深めます。</div>
      </div>

      <!-- AI Provider Status -->
      <div class="ai-status" id="aiStatus" title="クリックして設定を開く">
        <div class="ai-status-dot offline" id="aiStatusDot"></div>
        <div class="ai-status-text">
          <div class="ai-status-label" id="aiStatusLabel">AI プロバイダーを確認中...</div>
          <div class="ai-status-detail" id="aiStatusDetail"></div>
        </div>
        <div class="ai-status-refresh">⟳</div>
      </div>

      <div class="scroll-area">
        <!-- Visualization Section -->
        <div class="section">
          <div class="section-title">📊 Visualizations</div>
          <div class="button-grid">
            <button class="action-button" id="visualizeButton">
              <div class="btn-header">
                <span class="btn-icon">🔬</span>
                <span>ミクロビュー (詳細フロー)</span>
              </div>
              <div class="btn-desc">現在のファイルのロジックを可視化</div>
            </button>
            <button class="action-button" id="macroButton">
              <div class="btn-header">
                <span class="btn-icon">🔭</span>
                <span>マクロビュー (ワークスペース俯瞰)</span>
              </div>
              <div class="btn-desc">プロジェクト全体の関数構造を表示</div>
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
      <div class="section-title">💬 AI Chat</div>
      <div class="chat-section">
        <div class="chat-messages" id="chatMessages">
          <div class="message ai" id="welcomeMsg">
            Copilotが利用可能な場合、現在のファイルについて質問できます。
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
      const aiStatus = document.getElementById('aiStatus');
      const aiStatusDot = document.getElementById('aiStatusDot');
      const aiStatusLabel = document.getElementById('aiStatusLabel');
      const aiStatusDetail = document.getElementById('aiStatusDetail');
      const welcomeMsg = document.getElementById('welcomeMsg');

      let isThinking = false;
      let thinkingMsgEl = null;

      // Buttons
      document.getElementById('visualizeButton').addEventListener('click', () => vscode.postMessage({ type: 'visualize' }));
      document.getElementById('macroButton').addEventListener('click', () => vscode.postMessage({ type: 'loadCachedMacro' }));
      document.getElementById('generateIndexButton').addEventListener('click', () => vscode.postMessage({ type: 'generateIndex' }));
      document.getElementById('loadCachedButton').addEventListener('click', () => vscode.postMessage({ type: 'loadCachedMacro' }));
      document.getElementById('exportAIButton').addEventListener('click', () => vscode.postMessage({ type: 'exportAI' }));

      // AI Status クリックで設定を開く
      aiStatus.addEventListener('click', () => {
        vscode.postMessage({ type: 'openSettings' });
      });
      // ⟳ ホバーでリフレッシュ
      aiStatus.addEventListener('dblclick', () => {
        vscode.postMessage({ type: 'checkAIProvider' });
      });

      function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || isThinking) return;

        addMessage(text, 'user');
        vscode.postMessage({ type: 'sendMessage', text });
        messageInput.value = '';

        isThinking = true;
        messageInput.disabled = true;
        sendButton.disabled = true;
      }

      function addMessage(text, sender, isThinkingMsg = false) {
        if (welcomeMsg && welcomeMsg.parentNode) {
          welcomeMsg.parentNode.removeChild(welcomeMsg);
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + sender + (isThinkingMsg ? ' thinking' : '');
        messageDiv.textContent = isThinkingMsg ? '考え中...' : text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (isThinkingMsg) thinkingMsgEl = messageDiv;
        return messageDiv;
      }

      sendButton.addEventListener('click', sendMessage);
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
      });

      window.addEventListener('message', (event) => {
        const message = event.data;

        if (message.type === 'aiResponse') {
          // 考え中メッセージを削除
          if (thinkingMsgEl) {
            thinkingMsgEl.parentNode && thinkingMsgEl.parentNode.removeChild(thinkingMsgEl);
            thinkingMsgEl = null;
          }

          if (!message.isThinking) {
            addMessage(message.text, 'ai');
            isThinking = false;
            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.focus();
          } else {
            addMessage('', 'ai', true);
          }
        }

        if (message.type === 'aiProviderStatus') {
          aiStatusLabel.textContent = message.label;
          aiStatusDetail.textContent = message.detail;

          // ドットの色を更新
          aiStatusDot.className = 'ai-status-dot ';
          if (message.copilotAvailable) {
            aiStatusDot.className += 'copilot';
          } else if (message.label.includes('Gemini')) {
            aiStatusDot.className += 'gemini';
          } else {
            aiStatusDot.className += 'offline';
          }
        }
      });

      // 初期状態でAIプロバイダーを確認
      vscode.postMessage({ type: 'checkAIProvider' });
    </script>
  </body>
</html>`;
  }
}

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
