import type { DiagramType } from "../ir/IR";
import type {
  IVisualizationTemplate,
  TemplateMatchScore,
} from "./IVisualizationTemplate";

// ─────────────────────────────────────────────────────────────────────────────
// 各テンプレートの静的ルール実装
// ─────────────────────────────────────────────────────────────────────────────

class FlowchartTemplate implements IVisualizationTemplate {
  readonly type: DiagramType = "flowchart";
  readonly displayName = "フローチャート";
  readonly description = "関数の制御フロー（if/for/while）を可視化";
  readonly icon = "📊";

  score(code: string): TemplateMatchScore {
    const keywords = [
      "if",
      "else",
      "for",
      "while",
      "switch",
      "return",
      "function",
    ];
    const hits = keywords.filter((k) =>
      new RegExp(`\\b${k}\\b`).test(code),
    ).length;
    const score = Math.min(hits / keywords.length + 0.2, 1.0);
    return { type: this.type, score, reason: "制御フロー構文が検出された" };
  }
}

class ClassDiagramTemplate implements IVisualizationTemplate {
  readonly type: DiagramType = "class-diagram";
  readonly displayName = "クラス図";
  readonly description = "クラス・インターフェースの構造と継承関係を可視化";
  readonly icon = "🏛️";

  score(code: string): TemplateMatchScore {
    const patterns = [
      /\bclass\s+\w+/,
      /\binterface\s+\w+/,
      /\bextends\s+\w+/,
      /\bimplements\s+\w+/,
      /\babstract\s+class/,
      /\benum\s+\w+/,
    ];
    const hits = patterns.filter((p) => p.test(code)).length;
    const score = Math.min(hits * 0.2, 1.0);
    return {
      type: this.type,
      score,
      reason: "クラス・インターフェース定義が検出された",
    };
  }
}

class ScreenTransitionTemplate implements IVisualizationTemplate {
  readonly type: DiagramType = "screen-transition";
  readonly displayName = "画面遷移図";
  readonly description = "React Router / Next.js などの画面遷移を可視化";
  readonly icon = "📱";

  score(code: string): TemplateMatchScore {
    const patterns = [
      /<Route\b/,
      /\buseRouter\b/,
      /\bnavigator\b/,
      /\bnavigate\(/,
      /\bpush\(/,
      /\bLink\s+to=/,
      /\bhref=/,
      /\bnext\/router/,
      /\breact-router/,
    ];
    const hits = patterns.filter((p) => p.test(code)).length;
    const score = Math.min(hits * 0.2, 1.0);
    return {
      type: this.type,
      score,
      reason: "画面遷移・ルーティングパターンが検出された",
    };
  }
}

class SequenceDiagramTemplate implements IVisualizationTemplate {
  readonly type: DiagramType = "sequence-diagram";
  readonly displayName = "シーケンス図";
  readonly description = "非同期処理・API呼び出しの順序を可視化";
  readonly icon = "↔️";

  score(code: string): TemplateMatchScore {
    const patterns = [
      /\bawait\b/,
      /\basync\b/,
      /\.then\(/,
      /fetch\(/,
      /axios\./,
      /\bnew Promise\b/,
      /\.subscribe\(/,
    ];
    const hits = patterns.filter((p) => p.test(code)).length;
    const score = Math.min(hits * 0.18, 1.0);
    return {
      type: this.type,
      score,
      reason: "非同期・API呼び出しパターンが検出された",
    };
  }
}

class StateMachineTemplate implements IVisualizationTemplate {
  readonly type: DiagramType = "state-machine";
  readonly displayName = "状態遷移図";
  readonly description = "useState / useReducer / XState の状態遷移を可視化";
  readonly icon = "🔀";

  score(code: string): TemplateMatchScore {
    const patterns = [
      /\buseState\b/,
      /\buseReducer\b/,
      /\bxstate\b/i,
      /\bcreateMachine\b/,
      /\bdispatch\(/,
      /\bswitch\s*\(\s*\w*[Ss]tate/,
      /type:\s*['"][A-Z_]+['"]/,
    ];
    const hits = patterns.filter((p) => p.test(code)).length;
    const score = Math.min(hits * 0.2, 1.0);
    return { type: this.type, score, reason: "状態管理パターンが検出された" };
  }
}

class DependencyGraphTemplate implements IVisualizationTemplate {
  readonly type: DiagramType = "dependency-graph";
  readonly displayName = "依存関係グラフ";
  readonly description = "モジュール間の import / export 依存関係を可視化";
  readonly icon = "🌐";

  score(code: string): TemplateMatchScore {
    const importCount = (code.match(/\bimport\b/g) ?? []).length;
    const exportCount = (code.match(/\bexport\b/g) ?? []).length;
    const total = importCount + exportCount;
    // import/export が多くロジックが少ないファイルほどスコアが高い
    const logicKeywords = ["if", "for", "while", "function", "class"];
    const logicHits = logicKeywords.filter((k) =>
      new RegExp(`\\b${k}\\b`).test(code),
    ).length;
    const score = Math.min((total * 0.1) / Math.max(logicHits, 1), 1.0);
    return {
      type: this.type,
      score,
      reason: "import/export が主体のファイルと判断された",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VisualizationSelector
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectionResult {
  type: DiagramType;
  reason: string;
  confidence: number; // 0.0 〜 1.0
}

/**
 * 可視化テンプレートを選択するセレクター
 *
 * - AI が利用可能な場合: buildAIPrompt() でプロンプトを生成 → parseAIResponse() で結果をパース
 * - AI が利用不可な場合: selectByRules() で静的ルールによるフォールバック選択
 */
export class VisualizationSelector {
  private readonly templates: IVisualizationTemplate[] = [
    new FlowchartTemplate(),
    new ClassDiagramTemplate(),
    new ScreenTransitionTemplate(),
    new SequenceDiagramTemplate(),
    new StateMachineTemplate(),
    new DependencyGraphTemplate(),
  ];

  /**
   * 全テンプレート情報を返す（UI のテンプレート切り替えボタン用）
   */
  getTemplates(): IVisualizationTemplate[] {
    return this.templates;
  }

  /**
   * 静的ルールによるテンプレート選択（AIなし・フォールバック）
   */
  selectByRules(code: string): SelectionResult {
    const scores: TemplateMatchScore[] = this.templates.map((t) =>
      t.score(code),
    );
    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];
    return {
      type: best.type,
      reason: best.reason,
      confidence: best.score,
    };
  }

  /**
   * AI に渡すテンプレート選択プロンプトを生成する。
   * GeminiAnalyzer / OpenAIAnalyzer からこのプロンプトを使う。
   */
  buildAIPrompt(code: string): string {
    const typeList = this.templates
      .map((t) => `- "${t.type}": ${t.displayName} — ${t.description}`)
      .join("\n");

    return `以下のソースコードを最もわかりやすく表現できる図の種類を1つ選んでください。

【選択肢】
${typeList}

【ソースコード】
\`\`\`
${code}
\`\`\`

以下の JSON 形式のみで返してください（説明文不要）:
{"type": "<選択肢のいずれか>", "reason": "<日本語で選んだ理由（1文）>", "confidence": <0.0〜1.0の数値>}`;
  }

  /**
   * AI のレスポンス文字列をパースして SelectionResult を返す。
   * パース失敗時は null を返す（呼び出し元でフォールバック処理を行う）。
   */
  parseAIResponse(response: string): SelectionResult | null {
    try {
      // Markdownコードブロックを除去
      const cleaned = response.replace(/```json?\n?|```/g, "").trim();
      const parsed = JSON.parse(cleaned) as {
        type: string;
        reason: string;
        confidence: number;
      };

      const validTypes: DiagramType[] = [
        "flowchart",
        "class-diagram",
        "screen-transition",
        "sequence-diagram",
        "state-machine",
        "dependency-graph",
      ];

      if (!validTypes.includes(parsed.type as DiagramType)) {
        return null;
      }

      return {
        type: parsed.type as DiagramType,
        reason: parsed.reason ?? "",
        confidence:
          typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      };
    } catch {
      return null;
    }
  }
}
