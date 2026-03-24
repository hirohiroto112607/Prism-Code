import * as vscode from "vscode";
import type { DiagramType, IR } from "../ir/IR";
import { buildPrompt, parseResponse } from "./IRPromptBuilder";

/**
 * GitHub Copilot が利用できない場合にスローされるエラー
 */
export class CopilotUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CopilotUnavailableError";
  }
}

/**
 * VS Code Language Model API（GitHub Copilot）を使用してコードを解析するクラス
 *
 * VS Code 1.90+ / GitHub Copilot 拡張機能が必要です。
 * APIキー不要でユーザーの既存 Copilot サブスクリプションを利用します。
 */
export class CopilotAnalyzer {
  private constructor(private readonly model: vscode.LanguageModelChat) {}

  /**
   * 利用可能な Copilot モデルを選択して CopilotAnalyzer を生成する
   * @throws CopilotUnavailableError Copilot が利用できない場合
   */
  static async create(): Promise<CopilotAnalyzer> {
    let models: vscode.LanguageModelChat[];
    try {
      models = await vscode.lm.selectChatModels({ vendor: "copilot" });
    } catch (_err) {
      throw new CopilotUnavailableError(
        "VS Code Language Model APIの呼び出しに失敗しました。GitHub Copilot拡張機能がインストールされているか確認してください。",
      );
    }

    if (!models || models.length === 0) {
      throw new CopilotUnavailableError(
        "GitHub Copilotが利用できません。GitHub Copilot拡張機能がインストールされ、サインインされているか確認してください。",
      );
    }

    // より高性能なモデルを優先して選択
    const preferredFamilies = [
      // "claude-sonnet-4",
      // "claude-3.5-sonnet",
      "gpt-4o",
      // "gpt-4o-mini",
      // "o1-mini",
    ];
    const selected =
      preferredFamilies
        .map((family) => models.find((m) => m.family === family))
        .find(Boolean) ?? models[0];

    return new CopilotAnalyzer(selected);
  }

  /**
   * 現在選択されているモデルの情報を返す
   */
  get modelInfo(): string {
    return `${this.model.name} (${this.model.family})`;
  }

  /**
   * ソースコードを Copilot で解析して IR を返す
   */
  async analyzeCode(
    code: string,
    filePath: string,
    requestedDiagramType?: DiagramType,
  ): Promise<IR> {
    const prompt = buildPrompt(code, filePath, requestedDiagramType);
    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const cts = new vscode.CancellationTokenSource();

    try {
      const response = await this.model.sendRequest(messages, {}, cts.token);

      let responseText = "";
      for await (const chunk of response.text) {
        responseText += chunk;
      }

      return parseResponse(responseText, filePath);
    } catch (err: unknown) {
      if (err instanceof vscode.LanguageModelError) {
        if (err.code === vscode.LanguageModelError.Blocked.name) {
          throw new Error(
            "Copilotがこのリクエストをブロックしました。コンテンツポリシーに違反している可能性があります。",
          );
        }
        if (err.code === vscode.LanguageModelError.NoPermissions.name) {
          throw new Error(
            "Copilot Language Model APIへのアクセス権限がありません。拡張機能の権限を確認してください。",
          );
        }
        if (err.code === vscode.LanguageModelError.NotFound.name) {
          throw new CopilotUnavailableError(
            "指定したCopilotモデルが見つかりません。GitHub Copilotの状態を確認してください。",
          );
        }
      }
      throw err;
    } finally {
      cts.dispose();
    }
  }

  /**
   * 自由な質問に Copilot で回答する（チャット用）
   * @param question ユーザーの質問
   * @param contextCode 参照するソースコード（省略可）
   * @param contextFilePath 参照するファイルパス（省略可）
   */
  async chat(
    question: string,
    contextCode?: string,
    contextFilePath?: string,
  ): Promise<string> {
    let promptText = question;

    if (contextCode && contextFilePath) {
      promptText = `あなたはコード解析の専門家です。以下のコードについて質問に答えてください。

ファイル: ${contextFilePath}
\`\`\`
${contextCode.substring(0, 3000)}${contextCode.length > 3000 ? "\n...（省略）" : ""}
\`\`\`

質問: ${question}

簡潔で分かりやすい日本語で回答してください。`;
    }

    const messages = [vscode.LanguageModelChatMessage.User(promptText)];
    const cts = new vscode.CancellationTokenSource();

    try {
      const response = await this.model.sendRequest(messages, {}, cts.token);

      let result = "";
      for await (const chunk of response.text) {
        result += chunk;
      }
      return result;
    } finally {
      cts.dispose();
    }
  }
}
