import type { DiagramType } from "../ir/IR";

/**
 * テンプレート適合スコア
 * score(code) の戻り値として使用
 */
export interface TemplateMatchScore {
  type: DiagramType;
  score: number; // 0.0 〜 1.0（高いほど適合）
  reason: string; // 選択理由（UI・デバッグ用）
}

/**
 * 可視化テンプレートのインターフェース
 *
 * 各テンプレートはこのインターフェースを実装し、
 * VisualizationSelector に登録することで AI 選択候補になる。
 */
export interface IVisualizationTemplate {
  /** テンプレートの識別子 */
  readonly type: DiagramType;

  /** UI表示名（例: 'フローチャート'） */
  readonly displayName: string;

  /** テンプレートの説明 */
  readonly description: string;

  /** UI表示用アイコン（絵文字） */
  readonly icon: string;

  /**
   * ソースコードを静的ルールで解析し、このテンプレートの適合度を返す。
   * AI が使えない場合のフォールバックとして利用する。
   *
   * @param code - 解析対象のソースコード
   * @returns TemplateMatchScore
   */
  score(code: string): TemplateMatchScore;
}
