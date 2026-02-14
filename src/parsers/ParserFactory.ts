import * as path from 'path';
import { IParser } from '../core/parser/IParser';
import { TypeScriptParser } from './typescript/TypeScriptParser';

/**
 * パーサーファクトリー
 * ファイル拡張子に応じて適切なパーサーを返す
 *
 * 新しい言語をサポートする場合は、以下の手順で追加：
 * 1. IParserを実装したパーサークラスを作成
 * 2. parsersリストに追加
 */
export class ParserFactory {
  // サポートされているすべてのパーサー
  private static parsers: IParser[] = [
    new TypeScriptParser(),
    // 将来的に他の言語のパーサーをここに追加
    // new JavaParser(),
    // new PythonParser(),
  ];

  /**
   * ファイルパスから適切なパーサーを取得
   * @param filePath ファイルパス
   * @returns パーサー（見つからない場合はundefined）
   */
  static getParser(filePath: string): IParser | undefined {
    const ext = path.extname(filePath);

    for (const parser of this.parsers) {
      const supportedExtensions = parser.getSupportedExtensions();
      if (supportedExtensions.includes(ext)) {
        return parser;
      }
    }

    return undefined;
  }

  /**
   * すべてのサポートされている拡張子を取得
   * @returns 拡張子の配列
   */
  static getSupportedExtensions(): string[] {
    const extensions: string[] = [];

    for (const parser of this.parsers) {
      extensions.push(...parser.getSupportedExtensions());
    }

    // 重複を削除
    return [...new Set(extensions)];
  }

  /**
   * すべてのサポートされている言語名を取得
   * @returns 言語名の配列
   */
  static getSupportedLanguages(): string[] {
    return this.parsers.map((parser) => parser.getSupportedLanguage());
  }

  /**
   * ファイル検索用のglobパターンを生成
   * @returns globパターン（例: "**\/*.{ts,tsx,js,jsx}"）
   */
  static getGlobPattern(): string {
    const extensions = this.getSupportedExtensions();
    // ".ts" -> "ts" に変換
    const extWithoutDot = extensions.map((ext) => ext.substring(1));
    return `**/*.{${extWithoutDot.join(',')}}`;
  }
}
