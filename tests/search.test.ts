import { describe, it, expect } from "vitest";
import { normalize, searchCharts } from "../src/search/search";
import type { ChartMemo } from "../src/types/chart";

// ── normalize のテスト ────────────────────────────────────────

describe("normalize", () => {
  it("NFKC正規化を行う", () => {
    // 全角英数字 → 半角
    expect(normalize("ＡＢＣ")).toBe("abc");
  });

  it("ひらがなをカタカナに変換する", () => {
    expect(normalize("あいうえお")).toBe("アイウエオ");
  });

  it("カタカナはそのまま", () => {
    expect(normalize("アイウエオ")).toBe("アイウエオ");
  });

  it("大文字を小文字に変換する", () => {
    expect(normalize("FASCINATION")).toBe("fascination");
  });

  it("空白を除去する", () => {
    expect(normalize("fascination maxx")).toBe("fascinationmaxx");
    expect(normalize("  hello  world  ")).toBe("helloworld");
  });

  it("全角空白を除去する", () => {
    expect(normalize("ファシ　ネーション")).toBe("ファシネーション");
  });

  it("ASCII記号を除去する", () => {
    expect(normalize("A!!B--C")).toBe("abc");
  });

  it("空文字列を返す", () => {
    expect(normalize("")).toBe("");
  });

  it("混在文字列を正規化する", () => {
    // 混合: 全角英字、ひらがな、記号
    const result = normalize("Ａ曲 あいう!");
    // 全角A→a、ひらがな→カタカナ、空白・記号除去
    expect(result).toBe("a曲アイウ");
  });
});

// ── searchCharts のテスト ─────────────────────────────────────

function makeChart(
  overrides: Partial<ChartMemo> & { title: string }
): ChartMemo {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    title: overrides.title,
    aliases: overrides.aliases ?? [],
    chart: overrides.chart ?? "SPA",
    cleared: overrides.cleared ?? false,
    recommendedOptions: overrides.recommendedOptions ?? [],
    avoidOptions: overrides.avoidOptions ?? [],
    normalGreenNumber: "",
    startGreenNumber: "",
    changedGreenNumber: "",
    gearChangeNote: "",
    memo: "",
    createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00.000Z",
  };
}

function ids(result: ChartMemo[]): string[] {
  return result.map((c: ChartMemo) => c.id);
}

describe("searchCharts", () => {
  const charts: ChartMemo[] = [
    makeChart({ id: "1", title: "Fascination MAXX", aliases: ["FMAX", "ファシ"] }),
    makeChart({ id: "2", title: "quasar", aliases: ["クェ", "QSR"] }),
    makeChart({ id: "3", title: "MAX 300", aliases: ["サンヒャク", "300"] }),
    makeChart({ id: "4", title: "Another Title MAX", aliases: [] }),
  ];

  it("空クエリで全件返す", () => {
    const result = searchCharts(charts, "");
    expect(result).toHaveLength(4);
  });

  it("曲名部分一致で検索できる", () => {
    const result = searchCharts(charts, "max");
    // "Fascination MAXX", "MAX 300", "Another Title MAX" がヒット
    expect(ids(result)).toContain("1");
    expect(ids(result)).toContain("3");
    expect(ids(result)).toContain("4");
    expect(ids(result)).not.toContain("2");
  });

  it("略称完全一致が曲名完全一致より上位に来る", () => {
    // "QSR" は略称完全一致、"quasar" は曲名完全一致
    const chartsForRank: ChartMemo[] = [
      makeChart({ id: "a", title: "QSR EXTRA", aliases: [] }),    // 曲名前方一致
      makeChart({ id: "b", title: "quasar", aliases: ["QSR"] }), // 略称完全一致
    ];
    const result = searchCharts(chartsForRank, "QSR");
    expect(result[0].id).toBe("b"); // 略称完全一致が先
  });

  it("曲名完全一致が前方一致より上位に来る", () => {
    const chartsForRank: ChartMemo[] = [
      makeChart({ id: "a", title: "MAX 300", aliases: [] }),     // 前方一致
      makeChart({ id: "b", title: "MAX", aliases: [] }),          // 完全一致
    ];
    const result = searchCharts(chartsForRank, "max");
    expect(result[0].id).toBe("b");
  });

  it("前方一致が部分一致より上位に来る", () => {
    const chartsForRank: ChartMemo[] = [
      makeChart({ id: "a", title: "Something MAX End", aliases: [] }), // 部分一致
      makeChart({ id: "b", title: "MAX 300", aliases: [] }),           // 前方一致
    ];
    const result = searchCharts(chartsForRank, "max");
    expect(result[0].id).toBe("b");
  });

  it("ひらがなとカタカナを同一視する", () => {
    // "さんひゃく" (ひらがな) で "サンヒャク" (カタカナ) の略称にヒット
    const result = searchCharts(charts, "さんひゃく");
    expect(ids(result)).toContain("3"); // MAX 300 (alias: サンヒャク)
  });

  it("大文字小文字を無視する", () => {
    const result = searchCharts(charts, "FMAX");
    expect(ids(result)).toContain("1");
  });

  it("空白の有無を無視する", () => {
    // "FascinationMAXX" でヒット
    const result = searchCharts(charts, "FascinationMAXX");
    expect(ids(result)).toContain("1");
  });

  it("一致なしで空配列を返す", () => {
    const result = searchCharts(charts, "xyznotfound12345");
    expect(result).toHaveLength(0);
  });

  it("同一ランクでは updatedAt 降順に並ぶ", () => {
    const chartsWithDates: ChartMemo[] = [
      makeChart({ id: "old", title: "Max Tune", updatedAt: "2023-01-01T00:00:00.000Z" }),
      makeChart({ id: "new", title: "Max Power", updatedAt: "2024-06-01T00:00:00.000Z" }),
    ];
    // 両方 "max" の前方一致
    const result = searchCharts(chartsWithDates, "max");
    expect(result[0].id).toBe("new");
    expect(result[1].id).toBe("old");
  });

  it("略称前方一致が曲名部分一致より上位に来る", () => {
    const testCharts: ChartMemo[] = [
      makeChart({ id: "a", title: "Something With MAX in middle", aliases: [] }),
      makeChart({ id: "b", title: "Other Song", aliases: ["MAX Lover"] }),
    ];
    const result = searchCharts(testCharts, "max");
    // b: 略称前方一致(rank=2), a: 曲名部分一致(rank=5)
    expect(result[0].id).toBe("b");
  });
});
