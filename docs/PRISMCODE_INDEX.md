# .prismcode フォルダー - プロジェクトインデックスシステム

## 📋 概要

`.prismcode`フォルダーは、Prism Codeプロジェクトのインデックスとメタデータを保存するための専用ディレクトリです。このシステムにより、以下のことが可能になります：

- ✅ プロジェクト全体の構造を高速に把握
- ✅ マクロビュー（俯瞰図）とミクロビュー（詳細図）の両方をサポート
- ✅ 解析結果のキャッシュによるパフォーマンス向上
- ✅ 他のAIツール（Cursor、GitHub Copilot、Clineなど）とのコンテキスト共有

## 📁 フォルダー構造

```
.prismcode/
├── index.json                    # プロジェクト全体のインデックス
├── config.json                   # 設定ファイル
├── cache/                        # キャッシュデータ
│   ├── ast-cache/               # ASTキャッシュ
│   │   └── src-extension-ts.json
│   └── ir-cache/                # IRキャッシュ
│       └── src-extension-ts.json
├── analysis/                     # 解析結果
│   ├── macro-view.json          # マクロビューデータ
│   ├── dependency-graph.json    # 依存関係グラフ
│   ├── complexity-metrics.json  # 複雑度メトリクス
│   └── ai-summaries.json        # AI生成サマリー
└── exports/                      # エクスポートデータ
    ├── markdown/                # Markdown形式
    │   ├── PROJECT_STRUCTURE.md
    │   └── ARCHITECTURE.md
    └── ai-context/              # 他のAIツール向け
        ├── cursor-rules.json    # Cursor IDE用
        ├── copilot-context.md   # GitHub Copilot用
        └── cline-context.json   # Cline用
```

## 🚀 使い方

### 1. 初回セットアップ

プロジェクトを開くと、自動的に`.prismcode`フォルダーが作成されます。

### 2. プロジェクトインデックスの生成

```
コマンドパレット (Cmd/Ctrl + Shift + P)
→ "Prism Code: プロジェクトインデックスを生成"
```

このコマンドは：

- プロジェクト内のすべてのTypeScript/JavaScriptファイルをスキャン
- 各ファイルのAST（抽象構文木）とIR（中間表現）を生成
- メトリクス（行数、関数数、複雑度）を計算
- `index.json`に保存

**実行時間の目安**:

- 小規模プロジェクト（~50ファイル）: 5-10秒
- 中規模プロジェクト（~200ファイル）: 30-60秒
- 大規模プロジェクト（~500ファイル）: 2-5分

### 3. マクロビューデータの生成

```
コマンドパレット
→ "Prism Code: マクロビューデータを生成（キャッシュ）"
```

このコマンドは：

- プロジェクト全体の関数情報を収集
- モジュールグループを生成（フォルダーベース）
- コールグラフ（関数間の呼び出し関係）を解析
- `analysis/macro-view.json`に保存
- **自動的にマクロビューを表示**

### 4. キャッシュからマクロビューを読み込み

```
コマンドパレット
→ "Prism Code: キャッシュからマクロビューを読み込み"
```

このコマンドは：

- `analysis/macro-view.json`から既存のデータを読み込み
- 再解析なしで高速にマクロビューを表示

**メリット**: 再スキャン不要で即座に表示（1秒未満）

### 5. AIツール向けコンテキストのエクスポート

```
コマンドパレット
→ "Prism Code: AIツール向けコンテキストをエクスポート"
```

このコマンドは：

- プロジェクト構造のMarkdownを生成
- Cursor IDE用のルールを生成
- GitHub Copilot用のコンテキストを生成
- Cline用のコンテキストを生成
- すべて`.prismcode/exports/`に保存

## 📊 生成されるファイルの詳細

### index.json

プロジェクト全体のインデックス情報を格納します。

```json
{
  "version": "1.0.0",
  "projectName": "Prism Code",
  "projectRoot": "/Users/hiroto/hiroto/Prism Code",
  "lastUpdated": "2026-02-14T10:30:00.000Z",
  "files": [
    {
      "filePath": "src/extension.ts",
      "fileHash": "abc123...",
      "language": "typescript",
      "lineCount": 350,
      "functionCount": 12,
      "complexity": 25,
      "imports": ["./parsers/TypeScriptParser", ...],
      "exports": ["activate", "deactivate"]
    }
  ],
  "modules": [
    {
      "id": "module_0",
      "name": "src",
      "type": "folder",
      "files": ["src/extension.ts", ...],
      "totalLines": 2500,
      "totalFunctions": 80,
      "averageComplexity": 12.5
    }
  ],
  "metadata": {
    "totalFiles": 45,
    "totalLines": 5000,
    "totalFunctions": 150,
    "languages": ["typescript"]
  }
}
```

### config.json

Prism Codeの設定を格納します。

```json
{
  "version": "1.0.0",
  "autoUpdate": true,
  "updateInterval": 5000,
  "cacheEnabled": true,
  "cacheMaxAge": 3600000,
  "aiEnabled": false,
  "exports": {
    "markdown": true,
    "cursorRules": true,
    "copilotContext": true,
    "clineContext": true
  },
  "excludePatterns": [
    "**/node_modules/**",
    ".git/**",
    "dist/**",
    "out/**"
  ]
}
```

### analysis/macro-view.json

マクロビュー用のデータを格納します。

```json
{
  "version": "1.0.0",
  "generatedAt": "2026-02-14T10:35:00.000Z",
  "modules": [
    {
      "id": "module_0",
      "name": "Extension Layer",
      "type": "feature",
      "files": ["src/extension.ts", "src/webview/FlowChartPanel.ts"],
      "description": "VSCode拡張機能のエントリーポイントとWebView管理",
      "totalLines": 800,
      "totalFunctions": 20,
      "averageComplexity": 15.2
    }
  ],
  "functions": [
    {
      "id": "func_0",
      "name": "activate",
      "sourceFile": "src/extension.ts",
      "module": "module_0",
      "lineCount": 50,
      "complexity": 8,
      "hasLoops": false,
      "hasConditionals": true
    }
  ],
  "callGraph": [
    {
      "id": "edge_0",
      "from": "func_0",
      "to": "func_5",
      "type": "call"
    }
  ],
  "metadata": {
    "fileCount": 45,
    "functionCount": 150,
    "moduleCount": 8
  }
}
```

## 🔄 ワークフロー例

### ケース1: プロジェクトを初めて開いたとき

```
1. VSCodeでプロジェクトを開く
   → .prismcodeフォルダーが自動作成される

2. コマンドパレット → "プロジェクトインデックスを生成"
   → プロジェクト全体がスキャンされる
   → index.jsonが生成される

3. コマンドパレット → "マクロビューデータを生成"
   → マクロビューが生成され、自動的に表示される
   → analysis/macro-view.jsonに保存される

4. コマンドパレット → "AIツール向けコンテキストをエクスポート"
   → exports/以下にエクスポートファイルが生成される
```

### ケース2: 日常的な使用

```
1. VSCodeでプロジェクトを開く

2. 現在のファイルの詳細を確認したい場合
   → コマンドパレット → "ミクロビュー(詳細)"

3. プロジェクト全体を俯瞰したい場合
   → コマンドパレット → "キャッシュからマクロビューを読み込み"
   → 1秒以内に表示される（再スキャン不要）

4. コードを大幅に変更した場合
   → コマンドパレット → "マクロビューデータを生成"
   → 最新のデータで再生成
```

### ケース3: 他のAIツールと連携

```
1. コマンドパレット → "AIツール向けコンテキストをエクスポート"

2. Cursor IDEの場合:
   → .prismcode/exports/ai-context/cursor-rules.json をCursorの設定に追加

3. GitHub Copilotの場合:
   → .prismcode/exports/ai-context/copilot-context.md を.github/copilot-instructions.mdにコピー

4. Clineの場合:
   → .prismcode/exports/ai-context/cline-context.json をClineの設定に追加
```

## ⚙️ 設定のカスタマイズ

`.prismcode/config.json`を編集して設定を変更できます。

### 除外パターンの追加

```json
{
  "excludePatterns": [
    "**/node_modules/**",
    ".git/**",
    "dist/**",
    "out/**",
    "test/**",           // テストファイルを除外
    "**/*.spec.ts",      // specファイルを除外
    "**/*.test.ts"       // testファイルを除外
  ]
}
```

### 自動更新の設定

```json
{
  "autoUpdate": true,      // ファイル変更時に自動更新
  "updateInterval": 5000   // 5秒ごとにチェック
}
```

### エクスポート設定

```json
{
  "exports": {
    "markdown": true,        // Markdownエクスポートを有効化
    "cursorRules": false,    // Cursorルールエクスポートを無効化
    "copilotContext": true,  // Copilotコンテキストを有効化
    "clineContext": true     // Clineコンテキストを有効化
  }
}
```

## 🎯 マクロビューとミクロビューの使い分け

### マクロビュー（俯瞰）

**用途**:

- プロジェクト全体の構造を把握したい
- 各モジュール間の関係を理解したい
- どのファイルが複雑かを確認したい
- 新しいメンバーへのプロジェクト説明

**特徴**:

- ファイル/モジュール単位でグループ化
- 関数の概要情報のみ表示
- 大量の関数を一度に俯瞰できる

**使用シーン**:

- プロジェクトに初めて参加したとき
- リファクタリングの計画を立てるとき
- コードレビュー時に全体像を把握するとき

### ミクロビュー（詳細）

**用途**:

- 特定の関数の制御フローを詳細に確認したい
- デバッグ時に処理の流れを追いたい
- アルゴリズムの理解を深めたい

**特徴**:

- if/for/while等の制御構造を詳細に表示
- ノード・エッジ形式のフローチャート
- 各ステップの詳細情報を表示

**使用シーン**:

- バグの原因を特定するとき
- 複雑なロジックを理解するとき
- コードの動作を説明するとき

## 🔍 トラブルシューティング

### Q: `.prismcode`フォルダーが作成されない

**A**: ワークスペースフォルダーが開かれているか確認してください。単一ファイルを開いている場合は作成されません。

### Q: インデックス生成が遅い

**A**: 以下の方法で高速化できます：

1. `config.json`の`excludePatterns`に不要なフォルダーを追加
2. `node_modules`や`dist`が正しく除外されているか確認
3. 大規模プロジェクトの場合は、処理対象を特定のフォルダーに絞る

### Q: キャッシュが古くなっている

**A**: 「マクロビューデータを生成」コマンドを再実行してください。最新のコードで再スキャンされます。

### Q: エクスポートファイルが生成されない

**A**: `config.json`のexports設定を確認してください。無効化されている可能性があります。

## 📝 まとめ

`.prismcode`フォルダーシステムにより、以下のメリットが得られます：

1. **パフォーマンス向上**: 一度解析した結果をキャッシュして再利用
2. **他ツールとの連携**: Cursor、Copilot、Clineなどとコンテキストを共有
3. **プロジェクト理解の促進**: マクロビューで全体像を素早く把握
4. **開発効率の向上**: 繰り返しスキャン不要で即座にビジュアライゼーション

このシステムを活用して、より効率的なコード開発を実現しましょう！

---

**作成日**: 2026-02-14
**最終更新**: 2026-02-14
**バージョン**: 1.0.0
