import type { ChartMemo } from "../types/chart";

// ── 正規化 ────────────────────────────────────────────────────

const KATAKANA_OFFSET = 0x60; // ひらがな → カタカナのコードポイント差

/** ひらがなをカタカナに変換する */
function hiraToKata(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCodePoint(ch.codePointAt(0)! + KATAKANA_OFFSET)
  );
}

/**
 * 検索用に文字列を正規化する。
 * - Unicode NFKC
 * - ひらがな→カタカナ統一
 * - 大文字→小文字
 * - 空白除去
 * - 一般的な記号除去（英数字・カタカナ・ひらがな・漢字以外の記号）
 */
export function normalize(str: string): string {
  if (!str) return "";
  let s = str.trim().normalize("NFKC");
  s = hiraToKata(s);
  s = s.toLowerCase();
  // 空白を全て除去
  s = s.replace(/\s+/g, "");
  // 記号を除去（Unicode一般句読点・ASCII記号。ただし通常の文字は残す）
  s = s.replace(/[!-/:-@[-`{-~\u3000-\u303F\uFF01-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF40\uFF5B-\uFF65]/g, "");
  return s;
}

// ── ランキング定数 ─────────────────────────────────────────────

/** 低いほど上位 */
const RANK = {
  ALIAS_EXACT: 0,
  TITLE_EXACT: 1,
  ALIAS_PREFIX: 2,
  TITLE_PREFIX: 3,
  ALIAS_PARTIAL: 4,
  TITLE_PARTIAL: 5,
  NO_MATCH: 6, // 空クエリの全件表示
} as const;

type RankValue = (typeof RANK)[keyof typeof RANK];

interface ScoredChart {
  chart: ChartMemo;
  rank: RankValue;
}

/**
 * クエリで ChartMemo[] を検索し、ランキング順に返す。
 * 空クエリの場合は全件を updatedAt 降順で返す。
 */
export function searchCharts(charts: ChartMemo[], query: string): ChartMemo[] {
  const q = normalize(query);

  if (!q) {
    return [...charts].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  const scored: ScoredChart[] = [];

  for (const chart of charts) {
    const titleN = normalize(chart.title);
    const aliasesN = chart.aliases.map(normalize);

    let rank: RankValue = RANK.NO_MATCH;

    // 略称完全一致
    if (aliasesN.some((a) => a === q)) {
      rank = RANK.ALIAS_EXACT;
    }
    // 曲名完全一致
    else if (titleN === q) {
      rank = RANK.TITLE_EXACT;
    }
    // 略称前方一致
    else if (aliasesN.some((a) => a.startsWith(q))) {
      rank = RANK.ALIAS_PREFIX;
    }
    // 曲名前方一致
    else if (titleN.startsWith(q)) {
      rank = RANK.TITLE_PREFIX;
    }
    // 略称部分一致
    else if (aliasesN.some((a) => a.includes(q))) {
      rank = RANK.ALIAS_PARTIAL;
    }
    // 曲名部分一致
    else if (titleN.includes(q)) {
      rank = RANK.TITLE_PARTIAL;
    }

    if (rank !== RANK.NO_MATCH) {
      scored.push({ chart, rank });
    }
  }

  // ランク昇順 → 同ランクは updatedAt 降順
  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return (
      new Date(b.chart.updatedAt).getTime() -
      new Date(a.chart.updatedAt).getTime()
    );
  });

  return scored.map((s) => s.chart);
}
