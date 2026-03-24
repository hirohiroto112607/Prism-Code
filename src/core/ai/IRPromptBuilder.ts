import path from "node:path";
import type { DiagramType, IR } from "../ir/IR";

/**
 * AIへ送るプロンプトを構築する
 * GeminiAnalyzer と CopilotAnalyzer で共有される
 */
export function buildPrompt(
  code: string,
  filePath: string,
  requestedDiagramType?: DiagramType,
): string {
  const fileext = path.extname(filePath).toLowerCase();
  return `あなたは${fileext}コードを解析し、フローチャート用のJSON（IR: Intermediate Representation）に変換する専門家です。

## 出力するJSONのスキーマ

{
  "version": "1.0.0",
  "metadata": {
    "sourceLanguage": "${fileext}",
    "sourceFile": "ファイルパス",
    "timestamp": 数値（ミリ秒）,
    "diagramType": "コードに最も適した図の種類（下記の選択肢から1つ）",
    "aiReason": "diagramTypeを選んだ理由（日本語1文）"
  },
  "nodes": [ /* IRNodeの配列 */ ],
  "edges": [ /* IREdgeの配列 */ ]
}

## diagramType の選択肢

- "flowchart"        : 関数の制御フロー（if/for/while等が主体）
- "class-diagram"    : クラス・インターフェース構造（class/interface/extends/implements が主体）
- "screen-transition": 画面遷移（React Router / Next.js / navigate() が主体）
- "sequence-diagram" : 非同期処理・API呼び出し順序（async/await / fetch / axios が主体）
- "state-machine"    : 状態遷移（useState / useReducer / XState が主体）
- "dependency-graph" : モジュール依存関係（import/export が主体でロジックが少ない）

コードの特徴を判断して最も適切な diagramType を1つ選択し、metadata に含めてください。迷う場合は "flowchart" を選択してください。
${buildTemplateInstruction(requestedDiagramType)}
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
- ループノード → ループ本体の最初のノード: "ループ継続"
- ループノード → ループ後の次のノード: "ループ終了"
- ループ本体の最後のノード → ループノード（同一ID）へのバックエッジ: "ループ"
- 通常の遷移: labelなし（フィールド省略）

## IDの命名規則
- ノードID: node_0, node_1, node_2 ...（0からの連番）
- エッジID: edge_0, edge_1, edge_2 ...（0からの連番）

## 変換ルール
1. コード内の各関数（function宣言・アロー関数）を独立したフローとして変換する
2. 各関数は "start" ノードで始まり "end" ノードで終わる（"function" タイプは使わない）
3. if文は "if" ノードを作成し、then側は "true" エッジ、else側は "false" エッジで接続
4. for/whileループは "for"/"while" ノードを**1つだけ**作成する。追加ノードは不要。エッジのみで構造を表現する:
   - ループノード → ループ本体の最初のノード: ラベル "ループ継続"
   - ループ本体の最後のノード → ループノード（同一ID）: ラベル "ループ"（バックエッジ）
   - ループノード → ループ後の次のノード: ラベル "ループ終了"
   ⚠️ 重要: "ループ末尾" という名前・ラベルのノードを作成してはいけない。ループ本体の最後のノードのIDから直接ループノードのIDへバックエッジで接続すること。
5. 変数宣言のlabelは「変数名 = 初期値」の形式（例: x = 10）
6. return文のlabelは「return 値」の形式（例: return x + y）
7. "start" と "end" ノードにはlocationフィールドは不要

## 変換例

### 例1: 単純な関数
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

### 例2: ループを含む関数（重要）
入力:
\`\`\`typescript
function sum(n: number): number {
  let total = 0;
  for (let i = 1; i <= n; i++) {
    total += i;
  }
  return total;
}
\`\`\`

出力:
{
  "version": "1.0.0",
  "metadata": { "sourceLanguage": "TypeScript", "sourceFile": "example.ts", "timestamp": 1700000000000 },
  "nodes": [
    { "id": "node_0", "type": "start", "label": "関数開始: sum" },
    { "id": "node_1", "type": "variable", "label": "total = 0", "location": { "start": { "line": 2, "column": 2 }, "end": { "line": 2, "column": 16 } } },
    { "id": "node_2", "type": "for", "condition": "let i = 1; i <= n; i++", "branches": { "body": [] }, "location": { "start": { "line": 3, "column": 2 }, "end": { "line": 5, "column": 3 } } },
    { "id": "node_3", "type": "expression", "label": "total += i", "location": { "start": { "line": 4, "column": 4 }, "end": { "line": 4, "column": 15 } } },
    { "id": "node_4", "type": "return", "label": "return total", "location": { "start": { "line": 6, "column": 2 }, "end": { "line": 6, "column": 15 } } },
    { "id": "node_5", "type": "end", "label": "関数終了: sum" }
  ],
  "edges": [
    { "id": "edge_0", "source": "node_0", "target": "node_1", "type": "control" },
    { "id": "edge_1", "source": "node_1", "target": "node_2", "type": "control" },
    { "id": "edge_2", "source": "node_2", "target": "node_3", "label": "ループ継続", "type": "control" },
    { "id": "edge_3", "source": "node_3", "target": "node_2", "label": "ループ", "type": "control" },
    { "id": "edge_4", "source": "node_2", "target": "node_4", "label": "ループ終了", "type": "control" },
    { "id": "edge_5", "source": "node_4", "target": "node_5", "type": "control" }
  ]
}
注意: ループ本体の最後のノード（node_3）のエッジはループノード（node_2）に直接戻る。"ループ末尾"という別ノードは存在しない。

## 解析対象のコード

ファイル: ${filePath}

\`\`\`${fileext}
${code}
\`\`\`

上記コードを解析し、IRのJSONのみを出力してください。説明文は不要です。`;
}

/**
 * テンプレート種別に応じた追加指示を返す
 */
export function buildTemplateInstruction(type?: DiagramType): string {
  switch (type) {
    case "class-diagram":
      return `
## テンプレート指定: class-diagram（クラス図）
diagramType は必ず "class-diagram" にしてください。
コード内のクラス・インターフェース・抽象クラス・型定義を中心に解析してください。
- "start" ノード: クラス名（例: label="クラス: UserService"）
- "process" ノード: プロパティ（例: label="id: string"）や継承関係（例: label="extends BaseService"）
- "expression" ノード: メソッド（例: label="getUserById(id: string): User"）
- "end" ノード: クラス終了
継承・実装関係はエッジで表現（label="extends" / label="implements"）してください。
`;
    case "sequence-diagram":
      return `
## テンプレート指定: sequence-diagram（シーケンス図）
diagramType は必ず "sequence-diagram" にしてください。
非同期処理・関数呼び出しの時系列順を中心に解析してください。
- "start" ノード: 処理の起点（例: label="開始: fetchUserData"）
- "expression" ノード: 各API呼び出し・非同期操作（例: label="await api.getUser(id)"）
- "if" ノード: 成功/失敗の分岐
- "return" ノード: 最終的な戻り値
- "end" ノード: 処理完了
呼び出し順序をエッジの順番で表現してください。
`;
    case "state-machine":
      return `
## テンプレート指定: state-machine（状態遷移図）
diagramType は必ず "state-machine" にしてください。
状態管理（useState/useReducer/XState）の状態とその遷移を中心に解析してください。
- "start" ノード: 初期状態（例: label="初期状態: idle"）
- "process" ノード: 各状態（例: label="状態: loading"）
- "if" ノード: 状態遷移のトリガーとなる条件
- "expression" ノード: アクション・副作用（例: label="dispatch: SET_LOADING"）
- "end" ノード: 最終状態
状態間のエッジにはイベント名をラベルとして付けてください。
`;
    case "screen-transition":
      return `
## テンプレート指定: screen-transition（画面遷移図）
diagramType は必ず "screen-transition" にしてください。
画面・ルート遷移を中心に解析してください。
- "start" ノード: アプリの起点（例: label="アプリ起動"）
- "process" ノード: 各画面・ページ（例: label="画面: /home"）
- "if" ノード: 遷移条件（例: label="認証済み？"）
- "expression" ノード: ナビゲーションアクション（例: label="navigate('/login')"）
- "end" ノード: 終端画面
画面間のエッジには遷移のトリガーをラベルとして付けてください。
`;
    case "dependency-graph":
      return `
## テンプレート指定: dependency-graph（依存関係グラフ）
diagramType は必ず "dependency-graph" にしてください。
import/export の依存関係を中心に解析してください。
- "start" ノード: このファイル自体（例: label="モジュール: UserService"）
- "expression" ノード: 各 import（例: label="import: axios from 'axios'"）
- "process" ノード: export するシンボル（例: label="export: UserService"）
- "end" ノード: モジュール終端
依存するモジュール間の関係をエッジで表現してください。
`;
    default:
      return ""; // flowchart はデフォルト動作
  }
}

/**
 * AIのレスポンステキストをIRとしてパースする
 */
export function parseResponse(responseText: string, filePath: string): IR {
  let jsonText = responseText.trim();

  // Markdownコードブロックを除去
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (parseError) {
    console.error("AIレスポンスのJSON解析失敗:", parseError);
    console.error("レスポンス（先頭500文字）:", responseText.substring(0, 500));
    throw new Error(
      "AIのレスポンスをJSONとして解析できませんでした。再度お試しください。",
    );
  }

  if (!validateIR(parsed)) {
    console.error("IR検証失敗:", JSON.stringify(parsed).substring(0, 500));
    throw new Error(
      "AIのレスポンスがIR形式に準拠していません。コードが複雑すぎる可能性があります。",
    );
  }

  // metadataの信頼できるフィールドを上書き
  parsed.metadata.timestamp = Date.now();
  parsed.metadata.sourceFile = filePath;

  // diagramType が有効な値でなければ "flowchart" にフォールバック
  const validDiagramTypes = [
    "flowchart",
    "class-diagram",
    "screen-transition",
    "sequence-diagram",
    "state-machine",
    "dependency-graph",
  ];
  if (!validDiagramTypes.includes(parsed.metadata.diagramType)) {
    parsed.metadata.diagramType = "flowchart";
  }

  return parsed as IR;
}

/**
 * IRの最小限のバリデーション
 */
export function validateIR(obj: unknown): obj is IR {
  if (!obj || typeof obj !== "object") return false;
  if (typeof (obj as Record<string, unknown>).version !== "string")
    return false;
  if (
    !(obj as Record<string, unknown>).metadata ||
    typeof (obj as Record<string, unknown>).metadata !== "object"
  )
    return false;
  if (
    !Array.isArray((obj as Record<string, unknown>).nodes) ||
    !Array.isArray((obj as Record<string, unknown>).edges)
  )
    return false;

  const nodes = (obj as Record<string, unknown>).nodes as unknown[];
  const edges = (obj as Record<string, unknown>).edges as unknown[];

  const nodesValid = nodes.every(
    (n: unknown) =>
      typeof (n as Record<string, unknown>).id === "string" &&
      typeof (n as Record<string, unknown>).type === "string",
  );
  const edgesValid = edges.every(
    (e: unknown) =>
      typeof (e as Record<string, unknown>).id === "string" &&
      typeof (e as Record<string, unknown>).source === "string" &&
      typeof (e as Record<string, unknown>).target === "string",
  );
  return nodesValid && edgesValid;
}

/**
 * 後方互換性のための名前空間オブジェクト
 * @deprecated 各関数を直接インポートしてください
 */
export const IRPromptBuilder = {
  buildPrompt,
  buildTemplateInstruction,
  parseResponse,
  validateIR,
};
