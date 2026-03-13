# .prismcode フォルダー - プロジェクトインデックスシステム

最終更新: 2026-03-10

---

## 概要

`.prismcode` フォルダーは、Prism Codeプロジェクトのインデックス・キャッシュ・エクスポートデータを保存する専用ディレクトリです。

主な役割:

- プロジェクト全体の構造を高速に把握（マクロビュー用データ）
- 解析結果のキャッシュによるパフォーマンス向上（SHA-256ハッシュで鮮度管理）
- AI解析結果の保存（Gemini / OpenAI による意味的なフロー解析）
- 他のAIツール（Cursor, GitHub Copilot, Cline など）とのコンテキスト共有

---

## フォルダー構造

```text
.prismcode/
├── index.json                    # プロジェクト全体のインデックス
├── config.json                   # 設定ファイル
├── cache/                        # キャッシュデータ
│   ├── ast-cache/               # AST解析結果（ts-morphパス）
│   │   └── src-extension-ts.json
│   └── ir-cache/                # IR変換結果
│       └── src-extension-ts.json
├── analysis/                     # 解析結果
│   ├── macro-view.json          # マクロビューデータ（関数・依存関係グラフ）
│   ├── dependency-graph.json    # ファイル間依存関係グラフ
│   └── ai-summaries.json        # AI生成サマリー（各関数の自然言語説明）
└── exports/                      # エクスポートデータ
    ├── markdown/
    │   ├── PROJECT_STRUCTURE.md
    │   └── ARCHITECTURE.md
    └── ai-context/
        ├── cursor-rules.json    # Cursor IDE用
        ├── copilot-context.md   # GitHub Copilot用
        └── cline-context.json   # Cline用
```

---

## コマンド一覧

コマンドパレット（`Cmd/Ctrl + Shift + P`）から実行できます。

### Prism Code: プロジェクトインデックスを生成

プロジェクト内の全TypeScript/JavaScriptファイルをスキャンし、`index.json` を生成します。

実行時間の目安:

- 小規模（〜50ファイル）: 5〜10秒
- 中規模（〜200ファイル）: 30〜60秒
- 大規模（〜500ファイル）: 2〜5分

### Prism Code: マクロビューデータを生成（キャッシュ）

プロジェクト全体の関数・モジュール情報・コールグラフを生成し、マクロビューを表示します。
`analysis/macro-view.json` に保存されます。

### Prism Code: キャッシュからマクロビューを読み込み

再解析なしに `analysis/macro-view.json` から即座にマクロビューを表示します（1秒未満）。

### Prism Code: AIツール向けコンテキストをエクスポート

プロジェクト構造の Markdown・Cursor ルール・Copilot コンテキスト等を `exports/` に生成します。

### Prism Code: キャッシュ統計を表示

キャッシュヒット率・サイズ・処理時間などの統計を表示します。

### Prism Code: キャッシュをクリア

全キャッシュを削除します。次回の可視化時に再生成されます。

---

## 主要ファイルの仕様

### index.json

```json
{
  "version": "1.0.0",
  "projectName": "Prism Code",
  "projectRoot": "/path/to/project",
  "lastUpdated": "2026-03-10T10:30:00.000Z",
  "files": [
    {
      "filePath": "src/extension.ts",
      "fileHash": "sha256...",
      "language": "typescript",
      "lineCount": 465,
      "functionCount": 8,
      "complexity": 25,
      "imports": ["./webview/FlowChartPanel", "..."],
      "exports": ["activate", "deactivate"]
    }
  ],
  "metadata": {
    "totalFiles": 21,
    "totalLines": 5000,
    "totalFunctions": 150,
    "languages": ["typescript"]
  }
}
```

### config.json

```json
{
  "version": "1.0.0",
  "autoUpdate": true,
  "updateInterval": 5000,
  "cacheEnabled": true,
  "cacheMaxAge": 3600000,
  "aiEnabled": false,
  "excludePatterns": [
    "**/node_modules/**",
    ".git/**",
    "dist/**",
    "out/**"
  ]
}
```

---

## マクロビュー / ミクロビューの使い分け

### マクロビュー（俯瞰）

- プロジェクト全体のファイル・モジュール依存関係を鳥瞰
- 各モジュールのAI生成サマリー付き
- リファクタリング計画・新メンバーへの説明に最適

### ミクロビュー（詳細）

- 単一関数の制御フローをフローチャートで詳細表示
- ノードクリックで元のコード行にジャンプ（Phase 2以降）
- AI解説付き（「なぜこの分岐になるか」をノードごとに表示）
- ライブデバッグ時は変数状態がリアルタイム更新（Phase 3以降）

---

## 設定カスタマイズ

`.prismcode/config.json` を直接編集することで設定を変更できます。

除外パターンの追加例:

```json
{
  "excludePatterns": [
    "**/node_modules/**",
    ".git/**",
    "dist/**",
    "out/**",
    "**/*.spec.ts",
    "**/*.test.ts"
  ]
}
```

---

## トラブルシューティング

**`.prismcode` フォルダーが作成されない**
→ ワークスペースフォルダーが開かれているか確認してください。単一ファイルを開いている場合は作成されません。

**インデックス生成が遅い**
→ `config.json` の `excludePatterns` に不要なフォルダーを追加してください。`node_modules` や `dist` が除外されているか確認してください。

**キャッシュが古い**
→ 「Prism Code: キャッシュをクリア」コマンドを実行してください。

**Gemini APIの解析結果が保存されない**
→ AI解析結果のキャッシュ（`ir-cache`）は `config.json` の `cacheEnabled: true` が必要です。
