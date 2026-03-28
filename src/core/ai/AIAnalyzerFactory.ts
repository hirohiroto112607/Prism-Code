import * as vscode from "vscode";
import type { DiagramType, IR } from "../ir/IR";
import { CopilotAnalyzer, CopilotUnavailableError } from "./CopilotAnalyzer";
import { GeminiAnalyzer, GeminiQuotaError } from "./GeminiAnalyzer";

/**
 * AIプロバイダーの種類
 *
 * - "auto"    : Copilot を優先し、利用不可なら Gemini、それも不可なら null を返す
 * - "copilot" : GitHub Copilot Language Model API のみを使用
 * - "gemini"  : Gemini API のみを使用（APIキーが必要）
 * - "none"    : AIを使用しない（可視化機能は利用不可）
 */
export type AIProvider = "auto" | "copilot" | "gemini" | "none";

/**
 * AI解析の結果
 */
export interface AnalyzerResult {
  ir: IR;
  provider: "copilot" | "gemini";
  modelInfo: string;
}

/**
 * 設定に基づいて最適なAIでコードを解析する
 *
 * @returns 解析結果、またはAI使用不要/不可の場合は null
 * @throws AIが明示指定されているが利用できない場合はエラーをスロー
 */
export async function analyzeCode(
  code: string,
  filePath: string,
  config: vscode.WorkspaceConfiguration,
  requestedDiagramType?: DiagramType,
): Promise<AnalyzerResult | null> {
  const provider = config.get<AIProvider>("aiProvider", "auto");

  if (provider === "none") {
    return null;
  }

  // Copilot を試みる
  if (provider === "copilot" || provider === "auto") {
    try {
      const analyzer = await CopilotAnalyzer.create();
      console.log(`🤖 Copilot (${analyzer.modelInfo}) でコードを解析中...`);

      const ir = await analyzer.analyzeCode(
        code,
        filePath,
        requestedDiagramType,
      );
      return { ir, provider: "copilot", modelInfo: analyzer.modelInfo };
    } catch (err) {
      if (err instanceof CopilotUnavailableError) {
        if (provider === "copilot") {
          // 明示的に Copilot 指定の場合はエラーを伝播
          throw err;
        }
        // auto モードなら次の手段へフォールスルー
        console.log(
          `⚠️ Copilot 利用不可（${(err as Error).message}）。Gemini を試みます...`,
        );
      } else {
        throw err;
      }
    }
  }

  // Gemini を試みる
  if (provider === "gemini" || provider === "auto") {
    const apiKey = config.get<string>("geminiApiKey", "");

    if (!apiKey) {
      if (provider === "gemini") {
        throw new Error(
          "Gemini APIキーが設定されていません。設定で prismcode.geminiApiKey を入力してください。",
        );
      }
      // auto モードでキーなしなら null を返す
      return null;
    }

    const modelName = config.get<string>(
      "geminiModel",
      "gemini-2.0-flash-lite",
    );
    console.log(`🤖 Gemini (${modelName}) でコードを解析中...`);

    const analyzer = new GeminiAnalyzer(apiKey, modelName);
    const ir = await analyzer.analyzeCode(code, filePath, requestedDiagramType);
    return { ir, provider: "gemini", modelInfo: modelName };
  }

  return null;
}

/**
 * GitHub Copilot が利用可能かチェックする
 */
export async function isCopilotAvailable(): Promise<boolean> {
  try {
    const models = await vscode.lm.selectChatModels({ vendor: "copilot" });
    return models.length > 0;
  } catch {
    return false;
  }
}

/**
 * 現在の設定で使用されるプロバイダー名を返す（UI表示用）
 */
export async function getActiveProviderLabel(
  config: vscode.WorkspaceConfiguration,
): Promise<{ label: string; detail: string }> {
  const provider = config.get<AIProvider>("aiProvider", "auto");

  if (provider === "none") {
    return { label: "AI 無効", detail: "可視化機能は利用不可" };
  }

  if (provider === "copilot") {
    const available = await isCopilotAvailable();
    return available
      ? { label: "GitHub Copilot", detail: "VS Code Language Model API" }
      : {
          label: "Copilot 未接続",
          detail: "GitHub Copilot をインストールしてください",
        };
  }

  if (provider === "gemini") {
    const apiKey = config.get<string>("geminiApiKey", "");
    const model = config.get<string>("geminiModel", "gemini-2.0-flash-lite");
    return apiKey
      ? { label: `Gemini (${model})`, detail: "Google Gemini API" }
      : {
          label: "Gemini (APIキー未設定)",
          detail: "prismcode.geminiApiKey を設定してください",
        };
  }

  // auto: 優先順位で判定
  const copilotOk = await isCopilotAvailable();
  if (copilotOk) {
    return {
      label: "GitHub Copilot (自動選択)",
      detail: "VS Code Language Model API",
    };
  }

  const apiKey = config.get<string>("geminiApiKey", "");
  if (apiKey) {
    const model = config.get<string>("geminiModel", "gemini-2.0-flash-lite");
    return { label: `Gemini (自動選択)`, detail: `${model}` };
  }

  return {
    label: "AI 無効 (自動選択)",
    detail: "Copilot も Gemini も利用不可 → 可視化不可",
  };
}

/**
 * 後方互換性のための名前空間オブジェクト
 * @deprecated 各関数を直接インポートしてください
 */
export const AIAnalyzerFactory = {
  analyzeCode,
  isCopilotAvailable,
  getActiveProviderLabel,
};

// GeminiQuotaError を再エクスポートして extension.ts が直接参照できるようにする
export { GeminiQuotaError };
