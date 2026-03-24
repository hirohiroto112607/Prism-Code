import type { DiagramType, IR } from "../ir/IR";
import { buildPrompt, parseResponse } from "./IRPromptBuilder";

interface ApiErrorObject {
  status?: number;
  errorDetails?: string;
  message?: string;
}

interface GenerateResponseCandidate {
  output?: string;
  content?: Array<{ text?: string }>;
}

interface GenerateResponseOutput {
  content?: Array<{ text?: string }>;
}

interface GenerateResponseJson {
  outputs?: GenerateResponseOutput[];
  candidates?: GenerateResponseCandidate[];
  outputText?: string;
  text?: string;
}

/**
 * Gemini APIを使用してソースコードを解析し、IRを生成するクラス
 */
export class GeminiAnalyzer {
  private apiKey: string;
  private modelName: string;

  constructor(apiKey: string, modelName = "gemini-2.0-flash-lite") {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  /**
   * ソースコードをGemini APIで解析してIRを返す
   */
  async analyzeCode(
    code: string,
    filePath: string,
    requestedDiagramType?: DiagramType,
  ): Promise<IR> {
    const prompt = buildPrompt(code, filePath, requestedDiagramType);

    let responseText = "";
    try {
      const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(
        this.modelName,
      )}:generate?key=${encodeURIComponent(this.apiKey)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: { text: prompt } }),
      });

      if (!res.ok) {
        const detail = await res.text();
        const errObj: ApiErrorObject = {
          status: res.status,
          errorDetails: detail,
        };
        throw GeminiAnalyzer.wrapApiError(errObj, this.modelName);
      }

      const json = (await res.json()) as GenerateResponseJson;
      responseText = GeminiAnalyzer.extractTextFromGenerateResponse(json);
    } catch (err: unknown) {
      if (err instanceof Error) throw err;
      throw GeminiAnalyzer.wrapApiError(err as ApiErrorObject, this.modelName);
    }

    return parseResponse(responseText, filePath);
  }

  /**
   * API エラーをユーザー向けメッセージに変換する
   */
  static wrapApiError(err: ApiErrorObject, modelName: string): Error {
    const body = err?.errorDetails ?? err?.message ?? String(err);
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);

    // 429 クォータ超過
    if (
      err?.status === 429 ||
      bodyStr.includes("RESOURCE_EXHAUSTED") ||
      bodyStr.includes("429")
    ) {
      const retryMatch = bodyStr.match(/retryDelay["\s:]+(\d+)/);
      const retrySec = retryMatch
        ? `約${retryMatch[1]}秒後に再試行できます。`
        : "";
      return new GeminiQuotaError(
        `Gemini APIの無料枠クォータを超過しました（モデル: ${modelName}）。` +
          `${retrySec} ` +
          `"gemini-2.0-flash-lite" への切り替えか、有料プランへのアップグレードを検討してください。`,
        modelName,
      );
    }

    // 401 / 403 認証エラー
    if (
      err?.status === 401 ||
      err?.status === 403 ||
      bodyStr.includes("API_KEY_INVALID")
    ) {
      return new Error("Gemini APIキーが無効です。設定を確認してください。");
    }

    return err instanceof Error ? err : new Error(bodyStr);
  }

  /**
   * 新APIのレスポンスからテキスト出力を抽出する（多様なレスポンス形式に対応）
   */
  private static extractTextFromGenerateResponse(
    json: GenerateResponseJson,
  ): string {
    if (!json) return "";

    // v1: generativelanguage -> outputs[].content[].text
    if (Array.isArray(json.outputs) && json.outputs[0]) {
      const out = json.outputs[0];
      if (Array.isArray(out.content)) {
        return out.content.map((c) => c?.text ?? "").join("");
      }
    }

    // candidates形式
    if (Array.isArray(json.candidates) && json.candidates[0]) {
      const cand = json.candidates[0];
      if (typeof cand.output === "string") return cand.output;
      if (Array.isArray(cand.content))
        return cand.content.map((c) => c?.text ?? "").join("");
    }

    // 単純フィールド
    if (typeof json.outputText === "string") return json.outputText;
    if (typeof json.text === "string") return json.text;

    // フォールバック: JSONを文字列化して返す
    try {
      return JSON.stringify(json);
    } catch (_e) {
      return "";
    }
  }
}

/** クォータ超過エラー（モデル名を保持して extension 側で切り替えアクションを出せるようにする） */
export class GeminiQuotaError extends Error {
  constructor(
    message: string,
    public readonly modelName: string,
  ) {
    super(message);
    this.name = "GeminiQuotaError";
  }
}
