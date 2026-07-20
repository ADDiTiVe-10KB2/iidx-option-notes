import { useState, useEffect } from "react";
import type { StoredData, ChartMemo, StorageWarning } from "./types/chart";
import { loadData, addChart, updateChart, deleteChart } from "./storage/storage";
import { SearchPage } from "./pages/SearchPage";
import { DetailPage } from "./pages/DetailPage";
import { EditPage } from "./pages/EditPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PWAReloadPrompt } from "./components/PWAReloadPrompt";

// ── ハッシュルーティング ───────────────────────────────────────

type Route =
  | { name: "search" }
  | { name: "detail"; id: string }
  | { name: "edit"; id: string }
  | { name: "new" }
  | { name: "settings" };

function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, "") || "/";
  if (path === "/" || path === "") return { name: "search" };
  if (path === "/new") return { name: "new" };
  if (path === "/settings") return { name: "settings" };
  const detailMatch = path.match(/^\/detail\/(.+)$/);
  if (detailMatch) return { name: "detail", id: detailMatch[1] };
  const editMatch = path.match(/^\/edit\/(.+)$/);
  if (editMatch) return { name: "edit", id: editMatch[1] };
  return { name: "search" };
}

function navigate(route: Route) {
  switch (route.name) {
    case "search":
      window.location.hash = "#/";
      break;
    case "detail":
      window.location.hash = `#/detail/${route.id}`;
      break;
    case "edit":
      window.location.hash = `#/edit/${route.id}`;
      break;
    case "new":
      window.location.hash = "#/new";
      break;
    case "settings":
      window.location.hash = "#/settings";
      break;
  }
}

// ── App ──────────────────────────────────────────────────────

export default function App() {
  const [data, setData] = useState<StoredData>(() => ({
    schemaVersion: 1,
    charts: [],
  }));
  const [warning, setWarning] = useState<StorageWarning | null>(null);
  const [route, setRoute] = useState<Route>(() =>
    parseHash(window.location.hash)
  );
  const [saveError, setSaveError] = useState(false);

  // 初回データ読み込み
  useEffect(() => {
    const { data: loaded, warning: warn } = loadData();
    setData(loaded);
    if (warn) setWarning(warn);
  }, []);

  // ハッシュ変更を監視してルーティング
  useEffect(() => {
    function onHashChange() {
      setRoute(parseHash(window.location.hash));
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // ── データ操作 ─────────────────────────────────────────────

  function handleSaveChart(chart: ChartMemo) {
    const isNew = !data.charts.find((c) => c.id === chart.id);
    const result = isNew ? addChart(data, chart) : updateChart(data, chart);
    if (!result.ok) {
      setSaveError(true);
    } else {
      setSaveError(false);
    }
    setData(result.data);
    navigate({ name: "detail", id: chart.id });
  }

  function handleDeleteChart(id: string) {
    const result = deleteChart(data, id);
    if (!result.ok) setSaveError(true);
    else setSaveError(false);
    setData(result.data);
    navigate({ name: "search" });
  }

  function handleDataRestored(newData: StoredData) {
    setData(newData);
  }

  function handleDataCleared() {
    setData({ schemaVersion: 1, charts: [] });
  }

  // ── 現在のルートに対応するチャートを取得 ─────────────────────

  const currentChart =
    (route.name === "detail" || route.name === "edit")
      ? data.charts.find((c) => c.id === route.id)
      : undefined;

  // ── レンダリング ─────────────────────────────────────────────

  return (
    <>
      <PWAReloadPrompt />
      {/* localStorage破損警告 */}
      {warning && (
        <div className="warning-banner" role="alert">
          <p>
            <strong>⚠ データ読み込み警告</strong>
          </p>
          <p>{warning.message}</p>
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            onClick={() => setWarning(null)}
          >
            閉じる
          </button>
        </div>
      )}

      {/* 保存失敗警告 */}
      {saveError && (
        <div className="warning-banner warning-banner--error" role="alert">
          <p>
            保存に失敗しました。ストレージの空き容量を確認してください。
          </p>
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            onClick={() => setSaveError(false)}
          >
            閉じる
          </button>
        </div>
      )}

      {route.name === "search" && (
        <SearchPage
          charts={data.charts}
          onNavigateDetail={(id) => navigate({ name: "detail", id })}
          onNavigateNew={() => navigate({ name: "new" })}
          onNavigateSettings={() => navigate({ name: "settings" })}
        />
      )}

      {route.name === "detail" && (
        <DetailPage
          chart={currentChart}
          onBack={() => navigate({ name: "search" })}
          onEdit={(id) => navigate({ name: "edit", id })}
          onDelete={handleDeleteChart}
        />
      )}

      {(route.name === "new" || route.name === "edit") && (
        <EditPage
          chart={route.name === "edit" ? currentChart : undefined}
          allCharts={data.charts}
          onSave={handleSaveChart}
          onCancel={() =>
            route.name === "edit" && currentChart
              ? navigate({ name: "detail", id: currentChart.id })
              : navigate({ name: "search" })
          }
        />
      )}

      {route.name === "settings" && (
        <SettingsPage
          data={data}
          onDataRestored={handleDataRestored}
          onDataCleared={handleDataCleared}
          onBack={() => navigate({ name: "search" })}
        />
      )}
    </>
  );
}
