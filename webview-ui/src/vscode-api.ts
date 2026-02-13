/**
 * VSCode API のシングルトンインスタンスを管理
 */

// VSCode API の型定義
interface VsCodeApi {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
}

// グローバル変数の拡張
declare global {
  interface Window {
    vscodeApi?: VsCodeApi;
    acquireVsCodeApi?: () => VsCodeApi;
  }
}

/**
 * VSCode API を取得（シングルトン）
 */
function getVsCodeApi(): VsCodeApi {
  // 既に取得済みの場合はそれを返す
  if (window.vscodeApi) {
    return window.vscodeApi;
  }

  // VSCode 環境の場合は API を取得
  if (typeof window.acquireVsCodeApi === 'function') {
    try {
      window.vscodeApi = window.acquireVsCodeApi();
      console.log('✅ VSCode API acquired successfully');
      return window.vscodeApi;
    } catch (error) {
      console.error('❌ Failed to acquire VSCode API:', error);
    }
  }

  // フォールバック: モック API を作成
  console.warn('⚠️  Running outside VSCode environment, using mock API');
  window.vscodeApi = {
    postMessage: (message: any) => console.log('📤 Mock postMessage:', message),
    getState: () => undefined,
    setState: (_: any) => {},
  };

  return window.vscodeApi;
}

// シングルトンインスタンスをエクスポート
export const vscode = getVsCodeApi();
