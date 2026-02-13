# Prism Code - Claude開発ガイド

このドキュメントは、Prism Codeプロジェクトの全体像、アーキテクチャ、実装の詳細を記述したものです。Claude（AI）がこのプロジェクトを理解し、効果的に開発支援を行うためのリファレンスとして機能します。

---

## 📋 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [ディレクトリ構造](#2-ディレクトリ構造)
3. [技術スタックと設計思想](#3-技術スタックと設計思想)
4. [アーキテクチャ詳細](#4-アーキテクチャ詳細)
5. [データフロー](#5-データフロー)
6. [コアコンポーネント解説](#6-コアコンポーネント解説)
7. [開発ワークフロー](#7-開発ワークフロー)
8. [拡張方法](#8-拡張方法)
9. [トラブルシューティング](#9-トラブルシューティング)
10. [今後のロードマップ](#10-今後のロードマップ)

---

## 1. プロジェクト概要

### 1.1 目的

Prism Codeは、**TypeScript/JavaScriptコードをインタラクティブなフローチャートとして視覚化する**VSCode拡張機能です。プログラムの制御フローを直感的に理解し、コードの構造を一目で把握できるようにすることを目指しています。

### 1.2 コンセプト

- **双方向性**: コードとビジュアルの相互変換（将来的にフローチャート→コード生成も実装予定）
- **疎結合設計**: 言語非依存のIR（中間表現）を採用し、将来的に複数言語に対応可能
- **インタラクティブ性**: React Flowによる自由なズーム・パン操作
- **AI統合準備**: Phase 3でGemini APIを統合し、自然言語からのフローチャート生成を実現予定

### 1.3 主要機能（現在実装済み）

- ✅ TypeScript/JavaScriptコードの解析（ts-morph使用）
- ✅ AST（抽象構文木）の生成
- ✅ IR（中間表現）への変換
- ✅ React Flowによるインタラクティブなフローチャート表示
- ✅ カスタムノード（開始/終了/プロセス/判定/ループ）
- ✅ Dagreによる自動レイアウト
- ✅ サイドバーからワンクリックで可視化

---

## 2. ディレクトリ構造

```
Prism Code/
├── .vscode/                      # VSCode設定
│   ├── launch.json               # デバッグ設定
│   └── tasks.json                # ビルドタスク
│
├── src/                          # Extension側（Node.js）
│   ├── core/                     # コアロジック（言語非依存）
│   │   ├── parser/
│   │   │   ├── IParser.ts        # パーサーインターフェース（疎結合の要）
│   │   │   └── AST.ts            # AST型定義
│   │   ├── ir/
│   │   │   └── IR.ts             # IR型定義（中間表現）
│   │   └── transformer/
│   │       └── IRTransformer.ts  # AST → IR 変換ロジック
│   │
│   ├── parsers/                  # 言語別パーサー実装
│   │   ├── typescript/
│   │   │   └── TypeScriptParser.ts  # TypeScript専用パーサー
│   │   └── ParserFactory.ts      # パーサー選択（Factory Pattern）
│   │
│   ├── webview/
│   │   └── WebViewProvider.ts    # WebView管理・メッセージング
│   │
│   └── extension.ts              # 拡張機能エントリーポイント
│
├── webview-ui/                   # WebView UI（React + Vite）
│   ├── src/
│   │   ├── components/
│   │   │   ├── FlowChart.tsx     # React Flow統合コンポーネント
│   │   │   └── nodes/            # カスタムノード
│   │   │       ├── StartNode.tsx
│   │   │       ├── EndNode.tsx
│   │   │       ├── ProcessNode.tsx
│   │   │       ├── IfNode.tsx
│   │   │       └── LoopNode.tsx
│   │   ├── types/
│   │   │   └── ir.ts             # IR型定義（Extension側と同じ）
│   │   ├── utils/
│   │   │   └── flowConverter.ts  # IR → React Flow変換
│   │   ├── App.tsx               # アプリケーションルート
│   │   └── main.tsx              # Reactエントリーポイント
│   │
│   ├── build/                    # ビルド出力（Vite）
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── out/                          # Extension側ビルド出力（tsc）
├── sample/                       # テスト用サンプルコード
│   └── sample.ts
├── media/
│   └── icon.svg                  # サイドバーアイコン
│
├── package.json                  # Extension設定・依存関係
├── tsconfig.json                 # TypeScript設定（Extension側）
├── README.md                     # ユーザー向けドキュメント
├── CLAUDE.md                     # このファイル（開発者向け）
├── 企画書.md                     # プロジェクト企画書
└── 実際の実装.md                 # 実装詳細ドキュメント
```

---

## 3. 技術スタックと設計思想

### 3.1 Extension側（Node.js環境）

| 技術 | 用途 | 選定理由 |
|------|------|----------|
| **TypeScript** | 型安全なコード記述 | 大規模プロジェクトでのメンテナンス性向上 |
| **ts-morph** | TypeScript/JavaScriptパーサー | TypeScript Compiler APIのラッパー、使いやすい |
| **VSCode Extension API** | VSCode統合 | 公式API |

### 3.2 WebView UI側（ブラウザ環境）

| 技術 | 用途 | 選定理由 |
|------|------|----------|
| **React** | UI構築 | コンポーネント指向、豊富なエコシステム |
| **React Flow** | フローチャート描画 | インタラクティブなノード・エッジ操作が可能 |
| **Vite** | ビルドツール | 高速な開発サーバー、最適化されたビルド |
| **Dagre** | レイアウト計算 | グラフの自動配置アルゴリズム |

### 3.3 設計思想

#### 3.3.1 疎結合設計

**目的**: 将来的に他言語（Java, Python等）を追加する際、最小限の変更で対応できるようにする。

**実現方法**:

- `IParser`インターフェースで言語パーサーを抽象化
- IR（中間表現）で言語固有の詳細を吸収
- `ParserFactory`でパーサーの動的選択

#### 3.3.2 レイヤードアーキテクチャ

```
┌─────────────────────────────────────┐
│  Presentation Layer                  │  ← React WebView UI
├─────────────────────────────────────┤
│  Application Layer                   │  ← VSCode Commands
├─────────────────────────────────────┤
│  Domain Layer                        │  ← IRTransformer, FlowGenerator
├─────────────────────────────────────┤
│  Infrastructure Layer                │  ← TypeScriptParser, WebViewProvider
└─────────────────────────────────────┘
```

各レイヤーは上位レイヤーにのみ依存し、下位レイヤーには依存しない。

---

## 4. アーキテクチャ詳細

### 4.1 全体フロー

```
┌──────────────┐
│  User Action │  ← サイドバーボタンクリック or コマンド実行
└──────┬───────┘
       │
       ▼
┌────────────────────────────────────────────────────────┐
│  Extension Host (Node.js)                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  1. visualizeCommand.execute()                    │  │
│  │     ↓                                             │  │
│  │  2. TypeScriptParser.parse(code)                  │  │
│  │     ↓                                             │  │
│  │  3. IRTransformer.transform(ast)                  │  │
│  │     ↓                                             │  │
│  │  4. WebViewProvider.sendFlowData(ir)              │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────┬───────────────────────────────┘
                         │ postMessage({ type: 'updateFlow', data: ir })
                         ▼
┌────────────────────────────────────────────────────────┐
│  WebView (Browser Environment)                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  1. App.tsx: メッセージ受信                       │  │
│  │     ↓                                             │  │
│  │  2. convertIRToReactFlow(ir)                      │  │
│  │     ↓                                             │  │
│  │  3. Dagreでレイアウト計算                         │  │
│  │     ↓                                             │  │
│  │  4. FlowChart.tsx: React Flow描画                 │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 4.2 疎結合を実現する設計パターン

#### 4.2.1 Strategy Pattern（IParser）

```typescript
// パーサーインターフェース（抽象）
interface IParser {
  parse(code: string): AST;
  getSupportedLanguage(): string;
  getSupportedExtensions(): string[];
}

// 具体実装（TypeScript）
class TypeScriptParser implements IParser { ... }

// 将来的に追加可能（Java）
class JavaParser implements IParser { ... }
```

#### 4.2.2 Factory Pattern（ParserFactory）

```typescript
class ParserFactory {
  static getParser(filePath: string): IParser {
    const ext = path.extname(filePath);
    // 拡張子に応じて適切なパーサーを返す
    // 新しい言語を追加する際は、ここに登録するだけ
  }
}
```

#### 4.2.3 Observer Pattern（WebView ↔ Extension メッセージング）

```typescript
// Extension → WebView
webview.postMessage({ type: 'updateFlow', data: ir });

// WebView → Extension
vscode.postMessage({ type: 'visualize' });
```

---

## 5. データフロー

### 5.1 ソースコード → フローチャート変換

```
TypeScript Source Code
    ↓
[TypeScriptParser]
    ↓ ts-morph APIでパース
AST (抽象構文木)
    {
      type: 'Program',
      body: [
        { type: 'FunctionDeclaration', name: 'foo', ... },
        { type: 'IfStatement', condition: '...', ... }
      ]
    }
    ↓
[IRTransformer]
    ↓ 言語非依存の形式に変換
IR (中間表現)
    {
      nodes: [
        { id: 'node_0', type: 'start', label: '関数開始: foo' },
        { id: 'node_1', type: 'if', condition: 'x > 0' },
        ...
      ],
      edges: [
        { id: 'edge_0', source: 'node_0', target: 'node_1' },
        ...
      ]
    }
    ↓
[FlowGenerator]
    ↓ React Flow形式に変換
React Flow Data
    {
      nodes: [
        { id: 'node_0', type: 'start', position: {x: 100, y: 0}, data: {...} },
        ...
      ],
      edges: [...]
    }
    ↓
[Dagre Layout Algorithm]
    ↓ ノードの位置を自動計算
Positioned React Flow Data
    ↓
[React Flow Component]
    ↓ レンダリング
Interactive Flowchart UI
```

### 5.2 IR（中間表現）の設計意図

**なぜIRが必要か？**

1. **言語非依存性**: TypeScript以外の言語を追加する際、IRの形式を守れば既存のビジュアライゼーションコードを再利用できる
2. **複雑さの分離**: パース処理とビジュアライゼーション処理を完全に分離
3. **テスト容易性**: IRの妥当性を独立してテストできる
4. **将来の拡張性**: Phase 3の双方向編集（フローチャート→コード生成）で、IRを経由することで実装が容易

---

## 6. コアコンポーネント解説

### 6.1 TypeScriptParser

**役割**: TypeScript/JavaScriptコードをAST（抽象構文木）に変換

**実装の詳細**:

```typescript
class TypeScriptParser implements IParser {
  private project: Project;  // ts-morphのプロジェクト

  parse(code: string, filePath?: string): AST {
    // 1. メモリ上でソースファイルを作成
    const sourceFile = this.project.createSourceFile(
      filePath || 'temp.ts',
      code,
      { overwrite: true }
    );

    // 2. ソースファイルから関数、クラス等を抽出
    return {
      type: 'Program',
      body: this.parseSourceFile(sourceFile),
      sourceFile: filePath,
    };
  }

  private parseSourceFile(sourceFile: SourceFile): ASTNode[] {
    const nodes: ASTNode[] = [];

    // 関数宣言を解析
    sourceFile.getFunctions().forEach(fn => {
      nodes.push(this.parseFunctionDeclaration(fn));
    });

    // アロー関数を含む変数宣言を解析
    sourceFile.getVariableDeclarations().forEach(varDecl => {
      const initializer = varDecl.getInitializer();
      if (Node.isArrowFunction(initializer)) {
        nodes.push(this.parseArrowFunction(varDecl.getName(), initializer));
      }
    });

    return nodes;
  }
}
```

**サポートする構文**:

- 関数宣言（`function foo() {}`）
- アロー関数（`const foo = () => {}`）
- If文（`if/else`）
- ループ（`for`, `while`）
- 変数宣言（`const`, `let`, `var`）
- Return文

**今後追加予定**:

- クラス定義
- Try-Catch
- Switch文
- Async/Await

### 6.2 IRTransformer

**役割**: ASTをIR（中間表現）に変換

**変換ルール**:

| ASTノード | IRノード | 備考 |
|-----------|----------|------|
| FunctionDeclaration | IRStartNode → 本体 → IREndNode | 関数の開始/終了を明示 |
| IfStatement | IRControlFlowNode (type: 'if') | then/elseブランチを分岐 |
| ForStatement | IRControlFlowNode (type: 'for') | ループ継続とループ終了のエッジ |
| WhileStatement | IRControlFlowNode (type: 'while') | 同上 |
| VariableDeclaration | IRProcessNode (type: 'variable') | 変数宣言ノード |
| ReturnStatement | IRProcessNode (type: 'return') | Return文ノード |

**重要な実装ポイント**:

```typescript
class IRTransformer {
  private nodeIdCounter = 0;
  private edgeIdCounter = 0;

  // If文の変換例
  private transformIf(ifNode: IfStatementNode): string {
    const nodeId = this.generateNodeId();
    const mergeId = this.generateNodeId(); // 分岐の合流点

    // Then分岐のノードを変換
    const thenIds = ifNode.thenBranch.map(stmt => this.transformNode(stmt));

    // Else分岐のノードを変換
    const elseIds = ifNode.elseBranch?.map(stmt => this.transformNode(stmt)) || [];

    // 制御フローノードを追加
    this.nodes.push({
      id: nodeId,
      type: 'if',
      condition: ifNode.condition,
      branches: { then: thenIds, else: elseIds },
      location: ifNode.location,
    });

    // エッジを接続
    if (thenIds.length > 0) {
      this.addEdge(nodeId, thenIds[0], 'true');  // if → then
      this.addEdge(thenIds[thenIds.length - 1], mergeId);  // then → merge
    }

    if (elseIds.length > 0) {
      this.addEdge(nodeId, elseIds[0], 'false');  // if → else
      this.addEdge(elseIds[elseIds.length - 1], mergeId);  // else → merge
    }

    return nodeId;
  }
}
```

### 6.3 FlowGenerator

**役割**: IRをReact Flow形式に変換

**変換処理**:

1. **ノード変換**: IRNode → React Flow Node
   - IDをそのまま使用
   - typeをReact Flowのカスタムノードタイプにマッピング
   - dataにノード固有の情報を格納

2. **エッジ変換**: IREdge → React Flow Edge
   - labelを保持（"true", "false", "ループ"等）
   - typeを`smoothstep`に設定（滑らかな曲線）
   - animatedフラグでループエッジをアニメーション

3. **レイアウト計算**: Dagreアルゴリズムでノード位置を決定
   - Top-to-Bottom（TB）方向
   - ノード間のスペーシング調整

```typescript
function calculateLayout(nodes: Node[], edges: Edge[]): Node[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setGraph({
    rankdir: 'TB',  // Top to Bottom
    nodesep: 80,    // ノード間の水平スペース
    ranksep: 100,   // ノード間の垂直スペース
  });

  // ノードとエッジを登録
  nodes.forEach(node => dagreGraph.setNode(node.id, { width: 200, height: 100 }));
  edges.forEach(edge => dagreGraph.setEdge(edge.source, edge.target));

  // レイアウト計算
  dagre.layout(dagreGraph);

  // 結果を適用
  return nodes.map(node => {
    const position = dagreGraph.node(node.id);
    return {
      ...node,
      position: { x: position.x - 100, y: position.y - 50 },
    };
  });
}
```

### 6.4 WebViewProvider

**役割**: ExtensionとWebView間の通信を管理

**メッセージング仕様**:

| 方向 | メッセージ型 | データ | 説明 |
|------|-------------|--------|------|
| Extension → WebView | `updateFlow` | `IR` | IRデータを送信してフローチャート更新 |
| WebView → Extension | `visualize` | なし | 可視化コマンドをトリガー |

**実装**:

```typescript
class WebViewProvider implements vscode.WebviewViewProvider {
  resolveWebviewView(webviewView: vscode.WebviewView): void {
    // WebViewからのメッセージを受信
    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.type === 'visualize') {
        vscode.commands.executeCommand('prismcode.visualize');
      }
    });
  }

  // IRデータをWebViewに送信
  sendFlowData(ir: IR): void {
    this._view?.webview.postMessage({
      type: 'updateFlow',
      data: ir,
    });
  }
}
```

---

## 7. 開発ワークフロー

### 7.1 初回セットアップ

```bash
# 1. 依存関係のインストール
pnpm install
cd webview-ui && pnpm install && cd ..

# 2. ビルド
pnpm run compile          # Extension側
pnpm run compile:webview  # WebView UI側
```

### 7.2 開発中

```bash
# ターミナル1: Extension側の監視モード
pnpm run watch

# ターミナル2: WebView UIの開発サーバー（オプション）
cd webview-ui && pnpm run dev
```

### 7.3 デバッグ実行

1. VSCodeで`F5`キーを押す
2. 新しいVSCodeウィンドウが開く（Extension Development Host）
3. サイドバーのPrismCodeアイコンをクリック
4. TypeScriptファイルを開く（`sample/sample.ts`）
5. サイドバーの「🔍 現在のファイルを可視化」ボタンをクリック

### 7.4 ビルド（本番用）

```bash
pnpm run vscode:prepublish
```

このコマンドで両方（Extension + WebView UI）がビルドされます。

### 7.5 コミットメッセージ規約

```
<type>: <subject>

<body>
```

**Type**:

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `refactor`: リファクタリング
- `test`: テスト追加
- `chore`: ビルド設定等

**例**:

```
feat: サイドバーに可視化ボタンを追加

WebViewからExtensionにメッセージを送信し、
可視化コマンドをトリガーできるようにした。
```

---

## 8. 拡張方法

### 8.1 新しい言語のサポートを追加する

**ステップ1**: パーサーを実装

```typescript
// src/parsers/java/JavaParser.ts
export class JavaParser implements IParser {
  parse(code: string): AST {
    // Javaコードを解析してASTを返す
    // 使用可能なライブラリ: java-parser, antlr等
  }

  getSupportedLanguage(): string {
    return 'Java';
  }

  getSupportedExtensions(): string[] {
    return ['.java'];
  }
}
```

**ステップ2**: ParserFactoryに登録

```typescript
// src/parsers/ParserFactory.ts
import { JavaParser } from './java/JavaParser';

export class ParserFactory {
  private static parsers: IParser[] = [
    new TypeScriptParser(),
    new JavaParser(),  // ← 追加
  ];
  // ...
}
```

**ステップ3**: package.jsonのactivationEventsを更新

```json
"activationEvents": [
  "onLanguage:typescript",
  "onLanguage:java"  // ← 追加
]
```

これだけで、IRTransformer以降のロジックは再利用できます。

### 8.2 新しいノードタイプを追加する

**ステップ1**: IR型定義を拡張

```typescript
// src/core/ir/IR.ts
export interface IRTryCatchNode {
  id: string;
  type: 'trycatch';
  tryBody: string[];
  catchBody: string[];
  finallyBody?: string[];
  location: SourceLocation;
}

export type IRNode =
  | IRFunctionNode
  | IRControlFlowNode
  | IRProcessNode
  | IRStartNode
  | IREndNode
  | IRTryCatchNode;  // ← 追加
```

**ステップ2**: カスタムノードを作成

```typescript
// webview-ui/src/components/nodes/TryCatchNode.tsx
export function TryCatchNode({ data }: { data: any }) {
  return (
    <div style={{ border: '2px solid orange', ... }}>
      Try-Catch
    </div>
  );
}
```

**ステップ3**: FlowChartに登録

```typescript
// webview-ui/src/components/FlowChart.tsx
import { TryCatchNode } from './nodes/TryCatchNode';

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  process: ProcessNode,
  if: IfNode,
  loop: LoopNode,
  trycatch: TryCatchNode,  // ← 追加
};
```

### 8.3 Phase 2: ノードクリックでソースコードへジャンプ

**実装案**:

1. IRノードに`location`情報（行番号）を含める（既に実装済み）
2. WebViewからExtensionにメッセージを送信

```typescript
// webview-ui/src/components/FlowChart.tsx
const onNodeClick = (event: React.MouseEvent, node: Node) => {
  vscode.postMessage({
    type: 'jumpToCode',
    data: { location: node.data.location },
  });
};
```

1. Extension側で該当行にカーソルを移動

```typescript
// src/webview/WebViewProvider.ts
webviewView.webview.onDidReceiveMessage((message) => {
  if (message.type === 'jumpToCode') {
    const location = message.data.location;
    // エディタの該当行にジャンプ
    const editor = vscode.window.activeTextEditor;
    const position = new vscode.Position(location.start.line - 1, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position));
  }
});
```

---

## 9. トラブルシューティング

### 9.1 よくある問題

#### 問題1: WebViewに何も表示されない

**原因**:

- WebView UIがビルドされていない
- ビルド出力のパスが間違っている

**解決方法**:

```bash
# WebView UIを再ビルド
pnpm run compile:webview

# ビルド出力を確認
ls webview-ui/build/assets/
# index.js, index.css が存在するか確認
```

#### 問題2: コンパイルエラー: "File is not under 'rootDir'"

**原因**:

- tsconfig.jsonのexcludeにwebview-uiが含まれていない

**解決方法**:

```json
// tsconfig.json
{
  "exclude": ["node_modules", ".vscode-test", "sample", "webview-ui"]
}
```

#### 問題3: パース失敗: "Cannot find name 'ts'"

**原因**:

- ts-morphの初期化が正しくない

**解決方法**:

```typescript
// TypeScriptParser.ts
this.project = new Project({
  useInMemoryFileSystem: true,
  compilerOptions: {
    target: 99, // Latest
  },
});
```

### 9.2 デバッグテクニック

#### Extension側のログ確認

```typescript
// src/extension.ts
console.log('Prism Code が起動しました！');
console.error('可視化エラー:', error);
```

**ログの確認方法**:

- `Help` → `Toggle Developer Tools` → `Console`タブ

#### WebView側のログ確認

```typescript
// webview-ui/src/App.tsx
console.log('フロー変換エラー:', err);
```

**ログの確認方法**:

- WebViewを右クリック → `Inspect Element` → `Console`タブ

---

## 10. 今後のロードマップ

### Phase 2: インタラクティブ性の強化（3-4週間）

- [ ] ノードクリックでソースコードへジャンプ
- [ ] コード編集時の自動更新（ファイル監視）
- [ ] より複雑な構文のサポート
  - [ ] クラス定義
  - [ ] Try-Catch
  - [ ] Switch文
  - [ ] Async/Await
- [ ] レイアウトアルゴリズムの改善
  - [ ] ユーザーによる手動配置の保存
  - [ ] 複数のレイアウトスタイル（LR, RL, BT等）

### Phase 3: 双方向編集とAI統合（2-3ヶ月）

- [ ] フローチャート編集機能
  - [ ] ノードの追加・削除
  - [ ] エッジの接続変更
- [ ] フローチャート → コード生成
  - [ ] IRからTypeScriptコードを生成
  - [ ] ユーザーが編集したフローチャートをコードに反映
- [ ] AI統合（Gemini API）
  - [ ] 自然言語からフローチャート生成
  - [ ] コードの説明生成
  - [ ] リファクタリング提案
- [ ] リアルタイム同期
  - [ ] コード編集時にフローチャートを自動更新
  - [ ] フローチャート編集時にコードを自動生成

### 長期的な目標

- [ ] 他言語対応
  - [ ] Java
  - [ ] Python
  - [ ] C#
- [ ] プラグインシステム
  - [ ] カスタムノードタイプの追加
  - [ ] カスタムレイアウトアルゴリズム
- [ ] コラボレーション機能
  - [ ] フローチャートの共有
  - [ ] リアルタイム共同編集

---

## 11. 参考資料

### 公式ドキュメント

- [VSCode Extension API](https://code.visualstudio.com/api)
- [ts-morph Documentation](https://ts-morph.com/)
- [React Flow Documentation](https://reactflow.dev/)
- [Dagre Documentation](https://github.com/dagrejs/dagre)

### 設計パターン

- [Strategy Pattern](https://refactoring.guru/design-patterns/strategy)
- [Factory Pattern](https://refactoring.guru/design-patterns/factory-method)
- [Observer Pattern](https://refactoring.guru/design-patterns/observer)

### TypeScript AST

- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [AST Explorer](https://astexplorer.net/) - ASTの構造を視覚的に確認できるツール

---

## 12. 重要な注意事項

### 12.1 パフォーマンス

- **大規模ファイルの処理**: 現在は全体を一度に解析しているため、数千行を超えるファイルではパフォーマンスが低下する可能性がある
  - **将来の改善案**: 関数単位での部分的な解析、Web Workerの活用

### 12.2 セキュリティ

- **WebView**: VSCode WebViewはサンドボックス化されているが、Content Security Policyを適切に設定している
  - `script-src 'nonce-{random}'`でインラインスクリプトを制限
  - `default-src 'none'`でデフォルトを拒否

### 12.3 型安全性

- **Extension側とWebView側で型定義を共有**: `webview-ui/src/types/ir.ts`を`src/core/ir/IR.ts`と同期させる必要がある
  - **将来の改善案**: 共有型定義を別パッケージに分離

---

## 13. まとめ

Prism Codeは、**疎結合な設計**と**レイヤードアーキテクチャ**により、将来的な拡張性を確保しています。現在はPhase 1（コア機能）が完成し、インタラクティブなフローチャート表示が実現されています。

今後のPhase 2, 3では、より高度なインタラクティブ性とAI統合を実現し、プログラミング学習やコードレビューのための強力なツールへと進化させていきます。

このドキュメントは、開発を進める中で継続的に更新されるべきものです。新しい機能を追加する際は、このドキュメントも合わせて更新してください。

---

**作成日**: 2026-02-10
**最終更新**: 2026-02-10
**バージョン**: 0.0.1
