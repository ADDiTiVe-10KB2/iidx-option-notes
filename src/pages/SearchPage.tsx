import { useEffect, useRef, useState } from "react";
import type { ChartMemo } from "../types/chart";
import { ChartTypeTag } from "../components/ChartTypeTag";
import { OptionBadge, UnsetBadge } from "../components/OptionBadge";
import { searchCharts } from "../search/search";

interface SearchPageProps {
  charts: ChartMemo[];
  onNavigateDetail: (id: string) => void;
  onNavigateNew: () => void;
  onNavigateSettings: () => void;
}

const SESSION_KEY_QUERY = "iidx_search_query";
const SESSION_KEY_SCROLL = "iidx_search_scroll";

export function SearchPage({
  charts,
  onNavigateDetail,
  onNavigateNew,
  onNavigateSettings,
}: SearchPageProps) {
  const [query, setQuery] = useState<string>(
    () => sessionStorage.getItem(SESSION_KEY_QUERY) ?? ""
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const results = searchCharts(charts, query);

  // 検索文字列をsessionStorageに保持
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY_QUERY, query);
  }, [query]);

  // 戻ってきたときのスクロール復元
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY_SCROLL);
    if (saved && listRef.current) {
      listRef.current.scrollTop = parseInt(saved, 10);
    }
    inputRef.current?.focus();
  }, []);

  function handleScroll() {
    if (listRef.current) {
      sessionStorage.setItem(
        SESSION_KEY_SCROLL,
        String(listRef.current.scrollTop)
      );
    }
  }

  function handleNavigateDetail(id: string) {
    onNavigateDetail(id);
  }

  return (
    <div className="page search-page">
      <header className="app-header">
        <h1 className="app-title">IIDX Option Notes</h1>
        <button
          type="button"
          className="btn btn--icon"
          aria-label="設定・バックアップ"
          onClick={onNavigateSettings}
        >
          ⚙
        </button>
      </header>

      <div className="search-bar-wrap">
        <input
          ref={inputRef}
          id="search-input"
          type="search"
          className="search-input"
          placeholder="曲名・略称で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="曲名・略称で検索"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      <div className="search-meta">
        <span className="search-count">{results.length} 件</span>
        <button
          type="button"
          className="btn btn--primary btn--new"
          onClick={onNavigateNew}
        >
          ＋ 新規登録
        </button>
      </div>

      <div
        ref={listRef}
        className="result-list"
        onScroll={handleScroll}
        role="list"
        aria-label="検索結果"
      >
        {results.length === 0 ? (
          <div className="empty-state">
            {query
              ? "一致する曲が見つかりません"
              : "まだ登録されていません。「＋ 新規登録」から追加してください。"}
          </div>
        ) : (
          results.map((chart) => (
            <SearchResultCard
              key={chart.id}
              chart={chart}
              onClick={() => handleNavigateDetail(chart.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface SearchResultCardProps {
  chart: ChartMemo;
  onClick: () => void;
}

function SearchResultCard({ chart, onClick }: SearchResultCardProps) {
  return (
    <div
      className="result-card"
      role="listitem"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      tabIndex={0}
      aria-label={`${chart.title} ${chart.chart}`}
    >
      <div className="result-card__main">
        <span className="result-card__title">{chart.title}</span>
        <div className="result-card__tags">
          <ChartTypeTag chartType={chart.chart} />
          <ResultOptionBadges chart={chart} />
          {chart.cleared && (
            <span className="clear-badge">CLEAR</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultOptionBadges({ chart }: { chart: ChartMemo }) {
  if (!chart.cleared) {
    // 未CLEAR: 必ず正規を表示
    return <OptionBadge option="REGULAR" variant="recommend" />;
  }

  if (chart.recommendedOptions.length === 0) {
    // CLEAR済み・推奨未登録
    return <UnsetBadge label="未設定" />;
  }

  // CLEAR済み・推奨あり
  return (
    <>
      {chart.recommendedOptions.map((opt) => (
        <OptionBadge key={opt} option={opt} variant="recommend" />
      ))}
    </>
  );
}
