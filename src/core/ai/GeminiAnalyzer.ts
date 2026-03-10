import { GoogleGenAI } from '@google/genai';
import { IR } from '../ir/IR';
import path from 'path';

/**
 * Gemini APIを使用してソースコードを解析し、IRを生成するクラス
 */
export class GeminiAnalyzer {
  private genAI: GoogleGenAI;
  private modelName: string;

  constructor(apiKey: string, modelName = 'gemini-2.0-flash-lite') {
    this.genAI = new GoogleGenAI({ apiKey });
    this.modelName = modelName;
  }

  /**
   * ソースコードをGemini APIで解析してIRを返す
   */
  async analyzeCode(code: string, filePath: string): Promise<IR> {
    const prompt = this.buildPrompt(code, filePath);

    let response;
    try {
      response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    } catch (err: any) {
      throw GeminiAnalyzer.wrapApiError(err, this.modelName);
    }

    const responseText = response.text ?? '';
    return this.parseResponse(responseText, filePath);
  }

  /**
   * API エラーをユーザー向けメッセージに変換する
   */
  static wrapApiError(err: any, modelName: string): Error {
    const body = err?.errorDetails ?? err?.message ?? String(err);
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

    // 429 クォータ超過
    if (err?.status === 429 || bodyStr.includes('RESOURCE_EXHAUSTED') || bodyStr.includes('429')) {
      const retryMatch = bodyStr.match(/retryDelay["\s:]+(\d+)/);
      const retrySec = retryMatch ? `約${retryMatch[1]}秒後に再試行できます。` : '';
      return new GeminiQuotaError(
        `Gemini APIの無料枠クォータを超過しました（モデル: ${modelName}）。` +
        `${retrySec} ` +
        `"gemini-2.0-flash-lite" への切り替えか、有料プランへのアップグレードを検討してください。`,
        modelName
      );
    }

    // 401 / 403 認証エラー
    if (err?.status === 401 || err?.status === 403 || bodyStr.includes('API_KEY_INVALID')) {
      return new Error('Gemini APIキーが無効です。設定を確認してください。');
    }

    return err instanceof Error ? err : new Error(bodyStr);
  }

  /**
   * Geminiへ送るプロンプトを構築する
   */
  private buildPrompt(code: string, filePath: string): string {
    const fileext = path.extname(filePath).toLowerCase();
    return `あなたは${fileext}コードを解析し、フローチャート用のJSON（IR: Intermediate Representation）に変換する専門家です。

## 出力するJSONのスキーマ

{
  "version": "1.0.0",
  "metadata": {
    "sourceLanguage": "${fileext}",
    "sourceFile": "ファイルパス",
    "timestamp": 数値（ミリ秒）
  },
  "nodes": [ /* IRNodeの配列 */ ],
  "edges": [ /* IREdgeの配列 */ ]
}

## ノードタイプの定義

| type       | 用途             | 必須フィールド                              |
|------------|------------------|---------------------------------------------|
| "start"    | 関数の開始       | id, type, label                             |
| "end"      | 関数の終了       | id, type, label                             |
| "if"       | if/else分岐      | id, type, condition, branches, location     |
| "for"      | forループ        | id, type, condition, branches, location     |
| "while"    | whileループ      | id, type, condition, branches, location     |
| "variable" | 変数宣言         | id, type, label, location                   |
| "return"   | return文         | id, type, label, location                   |
| "expression"| 式文/関数呼び出し| id, type, label, location                   |

### location形式
{ "start": { "line": 1, "column": 0 }, "end": { "line": 5, "column": 0 } }

### branches形式（if文の例）
{ "then": [], "else": [] }（値はノードIDの配列）

## エッジ定義

{
  "id": "edge_0",
  "source": "node_0",
  "target": "node_1",
  "label": "（省略可）",
  "type": "control"
}

### エッジのlabelの規則（厳守）
- if分岐のthen側: "true"
- if分岐のelse側: "false"
- ループ本体への入口: "ループ継続"
- ループ終了後: "ループ終了"
- ループ末尾からループ先頭へのバックエッジ: "ループ"
- 通常の遷移: labelなし（フィールド省略）

## IDの命名規則
- ノードID: node_0, node_1, node_2 ...（0からの連番）
- エッジID: edge_0, edge_1, edge_2 ...（0からの連番）

## 変換ルール
1. コード内の各関数（function宣言・アロー関数）を独立したフローとして変換する
2. 各関数は "start" ノードで始まり "end" ノードで終わる（"function" タイプは使わない）
3. if文は "if" ノードを作成し、then側は "true" エッジ、else側は "false" エッジで接続
4. for/whileループは "for"/"while" ノードを作成し、ループ本体は "ループ継続"、ループ終了後は "ループ終了"、ループ末尾からループノードへは "ループ"（バックエッジ）
5. 変数宣言のlabelは「変数名 = 初期値」の形式（例: x = 10）
6. return文のlabelは「return 値」の形式（例: return x + y）
7. "start" と "end" ノードにはlocationフィールドは不要

## 変換例

入力:
\`\`\`typescript
function add(a: number, b: number): number {
  return a + b;
}
\`\`\`

出力:
{
  "version": "1.0.0",
  "metadata": { "sourceLanguage": "TypeScript", "sourceFile": "example.ts", "timestamp": 1700000000000 },
  "nodes": [
    { "id": "node_0", "type": "start", "label": "関数開始: add" },
    { "id": "node_1", "type": "return", "label": "return a + b", "location": { "start": { "line": 2, "column": 2 }, "end": { "line": 2, "column": 18 } } },
    { "id": "node_2", "type": "end", "label": "関数終了: add" }
  ],
  "edges": [
    { "id": "edge_0", "source": "node_0", "target": "node_1", "type": "control" },
    { "id": "edge_1", "source": "node_1", "target": "node_2", "type": "control" }
  ]
}

## 解析対象のコード

ファイル: ${filePath}

\`\`\`${fileext}
${code}
\`\`\`

上記コードを解析し、IRのJSONのみを出力してください。説明文は不要です。`;
  }

  /**
   * GeminiのレスポンステキストをIRとしてパースする
   */
  private parseResponse(responseText: string, filePath: string): IR {
    let jsonText = responseText.trim();

    // Markdownコードブロックを除去（フォールバック）
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('GeminiレスポンスのJSON解析失敗:', parseError);
      console.error('レスポンス（先頭500文字）:', responseText.substring(0, 500));
      throw new Error(
        `GeminiのレスポンスをJSONとして解析できませんでした。APIキーが正しいか確認してください。`
      );
    }

    if (!this.validateIR(parsed)) {
      console.error('IR検証失敗:', JSON.stringify(parsed).substring(0, 500));
      throw new Error(
        'GeminiのレスポンスがIR形式に準拠していません。コードが複雑すぎる可能性があります。'
      );
    }

    // metadataの信頼できるフィールドを上書き
    parsed.metadata.timestamp = Date.now();
    parsed.metadata.sourceFile = filePath;

    return parsed as IR;
  }

  /**
   * IRの最小限のバリデーション
   */
  private validateIR(obj: any): obj is IR {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    if (typeof obj.version !== 'string') {
      return false;
    }
    if (!obj.metadata || typeof obj.metadata !== 'object') {
      return false;
    }
    if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) {
      return false;
    }
    const nodesValid = obj.nodes.every(
      (n: any) => typeof n.id === 'string' && typeof n.type === 'string'
    );
    const edgesValid = obj.edges.every(
      (e: any) =>
        typeof e.id === 'string' &&
        typeof e.source === 'string' &&
        typeof e.target === 'string'
    );
    return nodesValid && edgesValid;
  }
}

/** クォータ超過エラー（モデル名を保持して extension 側で切り替えアクションを出せるようにする） */
export class GeminiQuotaError extends Error {
  constructor(message: string, public readonly modelName: string) {
    super(message);
    this.name = 'GeminiQuotaError';
  }
}
