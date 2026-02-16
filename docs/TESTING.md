# テストガイド

このドキュメントでは、Prism Codeプロジェクトのテスト方法について説明します。

## テストフレームワーク

### Extension側（Node.js環境）

- **Mocha**: テストフレームワーク
- **Chai**: アサーションライブラリ
- **@vscode/test-electron**: VSCode拡張機能のテストランナー

### WebView UI側（ブラウザ環境）

- **Vitest**: 高速なテストフレームワーク（Vite最適化）
- **@testing-library/react**: Reactコンポーネントテスト
- **jsdom**: ブラウザ環境のシミュレーション

## テストの実行方法

### WebView UIのテスト

```bash
# 通常のテスト実行
pnpm test:webview

# UIモードでテスト実行
cd webview-ui && pnpm test:ui

# カバレッジ付きでテスト実行
cd webview-ui && pnpm test:coverage
```

### Extension側のテスト

```bash
# VSCode Extension Test（統合テスト）
pnpm test

# ユニットテストのみ（Mocha）
pnpm test:unit
```

### 全てのテスト実行

```bash
pnpm test:all
```

## テストファイルの配置

### Extension側

```
src/test/
├── runTest.ts              # テストランナー
├── suite/
│   ├── index.ts            # テストスイートのエントリーポイント
│   ├── parserFactory.test.ts
│   └── [他のテストファイル].test.ts
```

### WebView UI側

```
webview-ui/src/test/
├── setup.ts                # テストセットアップ
├── flowConverter.test.ts
└── [他のテストファイル].test.ts
```

## テストの書き方

### Extension側（Mocha + Chai）

```typescript
import { expect } from 'chai';
import { ParserFactory } from '../../parsers/ParserFactory';

describe('ParserFactory', () => {
  it('TypeScriptファイルに対してTypeScriptParserを返すべき', () => {
    const parser = ParserFactory.getParser('test.ts');
    expect(parser).to.be.instanceOf(TypeScriptParser);
  });
});
```

### WebView UI側（Vitest）

```typescript
import { describe, it, expect } from 'vitest';
import { convertIRToReactFlow } from '../utils/flowConverter';

describe('flowConverter', () => {
  it('空のIRを変換できるべき', () => {
    const ir: IR = { nodes: [], edges: [] };
    const result = convertIRToReactFlow(ir);

    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });
});
```

## Reactコンポーネントのテスト

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StartNode } from '../components/nodes/StartNode';

describe('StartNode', () => {
  it('ラベルが正しく表示されるべき', () => {
    const data = { label: '関数開始: testFunction' };
    render(<StartNode data={data} />);

    expect(screen.getByText('関数開始: testFunction')).toBeInTheDocument();
  });
});
```

## カバレッジレポート

WebView UI側のテストでは、カバレッジレポートを生成できます：

```bash
cd webview-ui && pnpm test:coverage
```

カバレッジレポートは `webview-ui/coverage/` ディレクトリに生成されます。

## CI/CDでの実行

GitHub Actionsなどでテストを実行する場合の例：

```yaml
- name: Install dependencies
  run: pnpm install

- name: Run Extension tests
  run: pnpm test

- name: Run WebView UI tests
  run: pnpm test:webview
```

## トラブルシューティング

### テストが見つからない

- テストファイルが `.test.ts` の拡張子になっているか確認してください
- WebView UI側では、`vitest.config.ts` の設定を確認してください
- Extension側では、`.mocharc.json` の設定を確認してください

### VSCode Extension Testが失敗する

- VSCodeがインストールされているか確認してください
- `@vscode/test-electron` が正しくインストールされているか確認してください

### TypeScript型エラー

- `pnpm run compile` でコンパイルエラーがないか確認してください
- tsconfig.jsonの設定を確認してください

## 今後の拡張

- [ ] E2Eテストの追加（Playwright等）
- [ ] パフォーマンステストの追加
- [ ] ビジュアルリグレッションテスト
- [ ] テストカバレッジ目標の設定（80%以上）

## 参考資料

- [Mocha Documentation](https://mochajs.org/)
- [Chai Assertion Library](https://www.chaijs.com/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [VSCode Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
