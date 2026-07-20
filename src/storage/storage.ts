import type { StoredData, ChartMemo, BackupData, StorageWarning } from "../types/chart";

const STORAGE_KEY = "iidx_option_notes_v1";
const CURRENT_SCHEMA_VERSION = 1;

function makeRecoveryKey(): string {
  const now = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  return `iidx_option_notes_recovery_${now}`;
}

/**
 * localStorageから全データを読み込む。
 * - 破損時: 生データを退避キーに保存し、空データで起動。警告を返す。
 * - 未対応schemaVersion: 同上。
 * - 空/未登録: 空データで起動（保存は行わない）。
 */
export function loadData(): { data: StoredData; warning: StorageWarning | null } {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (raw === null) {
    // 初回起動 or データなし
    return { data: { schemaVersion: CURRENT_SCHEMA_VERSION, charts: [] }, warning: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // JSON破損
    const recoveryKey = makeRecoveryKey();
    try {
      localStorage.setItem(recoveryKey, raw);
    } catch {
      // 退避も失敗した場合は無視（ストレージ満杯など）
    }
    return {
      data: { schemaVersion: CURRENT_SCHEMA_VERSION, charts: [] },
      warning: {
        type: "corrupt",
        recoveryKey,
        message: `データが破損していたため、空の状態で起動しました。元のデータは ${recoveryKey} に退避しています。`,
      },
    };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("schemaVersion" in parsed)
  ) {
    const recoveryKey = makeRecoveryKey();
    try {
      localStorage.setItem(recoveryKey, raw);
    } catch {
      // 退避失敗を無視
    }
    return {
      data: { schemaVersion: CURRENT_SCHEMA_VERSION, charts: [] },
      warning: {
        type: "corrupt",
        recoveryKey,
        message: `データ形式が不正なため、空の状態で起動しました。元のデータは ${recoveryKey} に退避しています。`,
      },
    };
  }

  const obj = parsed as Record<string, unknown>;

  if (obj.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    const recoveryKey = makeRecoveryKey();
    try {
      localStorage.setItem(recoveryKey, raw);
    } catch {
      // 退避失敗を無視
    }
    return {
      data: { schemaVersion: CURRENT_SCHEMA_VERSION, charts: [] },
      warning: {
        type: "unknown_schema",
        recoveryKey,
        message: `未対応のスキーマバージョン (${obj.schemaVersion}) のため、空の状態で起動しました。元のデータは ${recoveryKey} に退避しています。`,
      },
    };
  }

  if (!Array.isArray(obj.charts)) {
    const recoveryKey = makeRecoveryKey();
    try {
      localStorage.setItem(recoveryKey, raw);
    } catch {
      // 退避失敗を無視
    }
    return {
      data: { schemaVersion: CURRENT_SCHEMA_VERSION, charts: [] },
      warning: {
        type: "corrupt",
        recoveryKey,
        message: `データ構造が不正なため、空の状態で起動しました。元のデータは ${recoveryKey} に退避しています。`,
      },
    };
  }

  return { data: obj as unknown as StoredData, warning: null };
}

/**
 * 全データを保存する。
 * 失敗時は false を返す。
 */
export function saveData(data: StoredData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** 1件追加 */
export function addChart(
  data: StoredData,
  chart: ChartMemo
): { data: StoredData; ok: boolean } {
  const newData: StoredData = {
    ...data,
    charts: [...data.charts, chart],
  };
  const ok = saveData(newData);
  return { data: newData, ok };
}

/** 1件更新 */
export function updateChart(
  data: StoredData,
  chart: ChartMemo
): { data: StoredData; ok: boolean } {
  const newData: StoredData = {
    ...data,
    charts: data.charts.map((c) => (c.id === chart.id ? chart : c)),
  };
  const ok = saveData(newData);
  return { data: newData, ok };
}

/** 1件削除 */
export function deleteChart(
  data: StoredData,
  id: string
): { data: StoredData; ok: boolean } {
  const newData: StoredData = {
    ...data,
    charts: data.charts.filter((c) => c.id !== id),
  };
  const ok = saveData(newData);
  return { data: newData, ok };
}

/** 全削除（本アプリのキーのみ削除） */
export function clearAllData(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    // recoveryキーも削除する
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("iidx_option_notes_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    return true;
  } catch {
    return false;
  }
}

// ─── バックアップ ─────────────────────────────────────────────

const VALID_CHART_TYPES = new Set(["SPN", "SPH", "SPA", "SPL"]);
const VALID_PLAY_OPTIONS = new Set([
  "REGULAR",
  "MIRROR",
  "RANDOM",
  "S_RANDOM",
  "R_RANDOM",
]);

/** バックアップJSONを検証し、問題がなければ BackupData を返す。失敗時は Error を throw する。 */
export function validateBackup(json: string): BackupData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("JSONの解析に失敗しました。ファイルが壊れている可能性があります。");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("バックアップのルートがオブジェクトではありません。");
  }

  const obj = parsed as Record<string, unknown>;

  if (obj.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `未対応のスキーマバージョンです (schemaVersion: ${obj.schemaVersion})。`
    );
  }

  if (!Array.isArray(obj.charts)) {
    throw new Error("charts フィールドが配列ではありません。");
  }

  for (let i = 0; i < obj.charts.length; i++) {
    validateChartMemo(obj.charts[i] as unknown, i);
  }

  return {
    schemaVersion: obj.schemaVersion as number,
    exportedAt: typeof obj.exportedAt === "string" ? obj.exportedAt : "",
    charts: obj.charts as ChartMemo[],
  };
}

function validateChartMemo(item: unknown, index: number): void {
  if (typeof item !== "object" || item === null) {
    throw new Error(`charts[${index}] がオブジェクトではありません。`);
  }
  const c = item as Record<string, unknown>;

  const requiredStrings = ["id", "title", "createdAt", "updatedAt"];
  for (const key of requiredStrings) {
    if (typeof c[key] !== "string" || c[key] === "") {
      throw new Error(`charts[${index}].${key} が不正です (文字列必須)。`);
    }
  }

  if (!VALID_CHART_TYPES.has(c.chart as string)) {
    throw new Error(
      `charts[${index}].chart が不正な値です: ${c.chart}`
    );
  }

  if (typeof c.cleared !== "boolean") {
    throw new Error(`charts[${index}].cleared がブール値ではありません。`);
  }

  if (!Array.isArray(c.aliases)) {
    throw new Error(`charts[${index}].aliases が配列ではありません。`);
  }

  for (const arr of ["recommendedOptions", "avoidOptions"] as const) {
    if (!Array.isArray(c[arr])) {
      throw new Error(`charts[${index}].${arr} が配列ではありません。`);
    }
    for (const opt of c[arr] as unknown[]) {
      if (!VALID_PLAY_OPTIONS.has(opt as string)) {
        throw new Error(
          `charts[${index}].${arr} に不正な値が含まれています: ${opt}`
        );
      }
    }
  }
}

/** バックアップJSONを生成して返す */
export function exportBackup(data: StoredData): string {
  const backup: BackupData = {
    schemaVersion: data.schemaVersion,
    exportedAt: new Date().toISOString(),
    charts: data.charts,
  };
  return JSON.stringify(backup, null, 2);
}

/** バックアップからデータを復元する（既存データを置換する） */
export function restoreFromBackup(backup: BackupData): boolean {
  const newData: StoredData = {
    schemaVersion: backup.schemaVersion,
    charts: backup.charts,
  };
  return saveData(newData);
}
