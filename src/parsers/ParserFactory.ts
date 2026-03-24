import * as path from "node:path";
import type { IParser } from "../core/parser/IParser";
import { TypeScriptParser } from "./typescript/TypeScriptParser";

/**
 * サポートされているすべてのパーサー
 *
 * 新しい言語をサポートする場合は、以下の手順で追加：
 * 1. IParserを実装したパーサークラスを作成
 * 2. parsersリストに追加
 */
const parsers: IParser[] = [
  new TypeScriptParser(),
  // 将来的に他の言語のパーサーをここに追加
  // new JavaParser(),
  // new PythonParser(),
];

/**
 * ファイルパスから適切なパーサーを取得
 * @param filePath ファイルパス
 * @returns パーサー
 * @throws サポートされていないファイル形式の場合
 */
export function getParser(filePath: string): IParser {
  const ext = path.extname(filePath);

  for (const parser of parsers) {
    const supportedExtensions = parser.getSupportedExtensions();
    if (supportedExtensions.includes(ext)) {
      return parser;
    }
  }

  throw new Error(`サポートされていないファイル形式です: ${ext}`);
}

/**
 * すべてのサポートされている拡張子を取得
 * @returns 拡張子の配列
 */
export function getSupportedExtensions(): string[] {
  const extensions: string[] = [];

  for (const parser of parsers) {
    extensions.push(...parser.getSupportedExtensions());
  }

  // 重複を削除
  return [...new Set(extensions)];
}

/**
 * すべてのサポートされている言語名を取得
 * @returns 言語名の配列
 */
export function getSupportedLanguages(): string[] {
  return parsers.map((parser) => parser.getSupportedLanguage());
}

/**
 * ファイル検索用のglobパターンを生成
 * @returns globパターン（例: "**\/*.{ts,tsx,js,jsx}"）
 */
export function getGlobPattern(): string {
  const extensions = getSupportedExtensions();
  // ".ts" -> "ts" に変換
  const extWithoutDot = extensions.map((ext) => ext.substring(1));
  return `**/*.{${extWithoutDot.join(",")}}`;
}

/**
 * 後方互換性のための名前空間オブジェクト
 * @deprecated 各関数を直接インポートしてください
 */
export const ParserFactory = {
  getParser,
  getSupportedExtensions,
  getSupportedLanguages,
  getGlobPattern,
};
