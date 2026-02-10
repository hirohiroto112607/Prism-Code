import { AST } from './AST';

/**
 * パーサーインターフェース
 * 各言語のパーサーはこのインターフェースを実装する
 * これにより、言語に依存しない疎結合な設計が可能
 */
export interface IParser {
  /**
   * ソースコードを解析してASTを返す
   * @param code ソースコード
   * @param filePath ファイルパス（オプション）
   * @returns 抽象構文木
   */
  parse(code: string, filePath?: string): AST;

  /**
   * サポートする言語名を返す
   * @returns 言語名（例: "TypeScript", "Java"）
   */
  getSupportedLanguage(): string;

  /**
   * サポートするファイル拡張子を返す
   * @returns 拡張子の配列（例: [".ts", ".tsx"]）
   */
  getSupportedExtensions(): string[];
}
