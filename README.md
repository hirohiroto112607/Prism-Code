# LogicFlowBridge

TypeScriptコードをフローチャートで視覚化するVSCode拡張機能（Phase 1: MVP版）

## 機能

- TypeScript/JavaScriptコードの解析
- 関数、if文、for文、while文のフローチャート化
- 言語非依存の中間表現（IR）を生成

## 使い方

### 1. 依存関係のインストール

```bash
npm install
```

### 2. ビルド

```bash
npm run compile
```

### 3. デバッグ実行

1. VSCodeでこのプロジェクトを開く
2. F5キーを押してデバッグを開始
3. 新しいVSCodeウィンドウが開く
4. TypeScriptファイルを開く（例: `sample.ts`）
5. コマンドパレット（Cmd+Shift+P）を開く
6. `LogicFlow: コードを可視化` を実行

### 4. 結果の確認

- IRがJSON形式で新しいタブに表示されます
- `nodes`: フローチャートのノード情報
- `edges`: ノード間の接続情報

## Phase 1の実装範囲

✅ **実装済み**

- コード解析（TypeScript Parser）
- AST生成
- IR（中間表現）への変換
- 基本的な制御構造のサポート（if, for, while）

❌ **未実装（今後のPhase）**

- フローチャートのビジュアル表示
- 双方向編集
- クラスの詳細解析
- 他言語対応

## アーキテクチャ

```
ソースコード → TypeScriptParser → AST → IRTransformer → IR (JSON)
```

## 開発

- `npm run watch`: 監視モードでコンパイル
- `npm run compile`: 1回だけコンパイル

## ライセンス

MIT
