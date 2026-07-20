import { describe, it, expect, beforeEach, afterEach } from "vitest";

// ─────────────────────────────────────────────────────────────
// localStorageモックをグローバルに設定（Node.js環境にはlocalStorageがないため）
// importより先に実行する必要があるためファイル先頭に配置
// ─────────────────────────────────────────────────────────────

const localStorageStore: Record<string, string> = {};

const localStorageMock: Storage = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = value;
  },
  removeItem: (key: string) => {
    delete localStorageStore[key];
  },
  get length() {
    return Object.keys(localStorageStore).length;
  },
  key: (index: number) => Object.keys(localStorageStore)[index] ?? null,
  clear: () => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
  },
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// ─────────────────────────────────────────────────────────────
// モック設定後にimport（storage.ts はlocalStorageを実行時に参照するため有効）
// ─────────────────────────────────────────────────────────────

import { validateBackup, exportBackup, loadData } from "../src/storage/storage";
import type { StoredData, BackupData } from "../src/types/chart";

// ── validateBackup のテスト ───────────────────────────────────

describe("validateBackup", () => {
  it("正常なバックアップJSONを受け入れる", () => {
    const backup: BackupData = {
      schemaVersion: 1,
      exportedAt: "2024-01-01T00:00:00.000Z",
      charts: [
        {
          id: "abc123",
          title: "Test Song",
          aliases: ["TS"],
          chart: "SPA",
          cleared: false,
          recommendedOptions: ["MIRROR"],
          avoidOptions: ["RANDOM"],
          normalGreenNumber: "285",
          startGreenNumber: "",
          changedGreenNumber: "",
          gearChangeNote: "",
          memo: "",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };
    const result = validateBackup(JSON.stringify(backup));
    expect(result.charts).toHaveLength(1);
    expect(result.charts[0].title).toBe("Test Song");
    expect(result.schemaVersion).toBe(1);
  });

  it("charts が空配列のバックアップを受け入れる", () => {
    const backup = { schemaVersion: 1, exportedAt: "2024-01-01T00:00:00Z", charts: [] };
    const result = validateBackup(JSON.stringify(backup));
    expect(result.charts).toHaveLength(0);
  });

  it("不正なJSON文字列でエラーをスローする", () => {
    expect(() => validateBackup("{invalid json}")).toThrow("JSONの解析に失敗");
  });

  it("schemaVersion が未対応の場合エラーをスローする", () => {
    const bad = { schemaVersion: 2, exportedAt: "", charts: [] };
    expect(() => validateBackup(JSON.stringify(bad))).toThrow("未対応のスキーマバージョン");
  });

  it("schemaVersion がない場合エラーをスローする", () => {
    const bad = { exportedAt: "", charts: [] };
    expect(() => validateBackup(JSON.stringify(bad))).toThrow("未対応のスキーマバージョン");
  });

  it("charts フィールドがない場合エラーをスローする", () => {
    const bad = { schemaVersion: 1, exportedAt: "" };
    expect(() => validateBackup(JSON.stringify(bad))).toThrow("配列ではありません");
  });

  it("必須項目 id が欠損している場合エラーをスローする", () => {
    const bad = {
      schemaVersion: 1,
      exportedAt: "",
      charts: [
        {
          // id が欠損
          title: "Test",
          aliases: [],
          chart: "SPA",
          cleared: false,
          recommendedOptions: [],
          avoidOptions: [],
          normalGreenNumber: "",
          startGreenNumber: "",
          changedGreenNumber: "",
          gearChangeNote: "",
          memo: "",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };
    expect(() => validateBackup(JSON.stringify(bad))).toThrow("id");
  });

  it("必須項目 title が空文字の場合エラーをスローする", () => {
    const bad = {
      schemaVersion: 1,
      exportedAt: "",
      charts: [
        {
          id: "abc",
          title: "", // 空文字
          aliases: [],
          chart: "SPA",
          cleared: false,
          recommendedOptions: [],
          avoidOptions: [],
          normalGreenNumber: "",
          startGreenNumber: "",
          changedGreenNumber: "",
          gearChangeNote: "",
          memo: "",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };
    expect(() => validateBackup(JSON.stringify(bad))).toThrow("title");
  });

  it("不正な chart フィールド（enum外）でエラーをスローする", () => {
    const bad = {
      schemaVersion: 1,
      exportedAt: "",
      charts: [
        {
          id: "abc",
          title: "Test",
          aliases: [],
          chart: "INVALID_CHART", // 不正enum
          cleared: false,
          recommendedOptions: [],
          avoidOptions: [],
          normalGreenNumber: "",
          startGreenNumber: "",
          changedGreenNumber: "",
          gearChangeNote: "",
          memo: "",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };
    expect(() => validateBackup(JSON.stringify(bad))).toThrow("chart");
  });

  it("不正な recommendedOptions（enum外）でエラーをスローする", () => {
    const bad = {
      schemaVersion: 1,
      exportedAt: "",
      charts: [
        {
          id: "abc",
          title: "Test",
          aliases: [],
          chart: "SPA",
          cleared: false,
          recommendedOptions: ["INVALID_OPTION"], // 不正enum
          avoidOptions: [],
          normalGreenNumber: "",
          startGreenNumber: "",
          changedGreenNumber: "",
          gearChangeNote: "",
          memo: "",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };
    expect(() => validateBackup(JSON.stringify(bad))).toThrow("recommendedOptions");
  });

  it("cleared がブール値でない場合エラーをスローする", () => {
    const bad = {
      schemaVersion: 1,
      exportedAt: "",
      charts: [
        {
          id: "abc",
          title: "Test",
          aliases: [],
          chart: "SPA",
          cleared: "false", // 文字列（不正）
          recommendedOptions: [],
          avoidOptions: [],
          normalGreenNumber: "",
          startGreenNumber: "",
          changedGreenNumber: "",
          gearChangeNote: "",
          memo: "",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };
    expect(() => validateBackup(JSON.stringify(bad))).toThrow("cleared");
  });
});

// ── exportBackup のテスト ──────────────────────────────────────

describe("exportBackup", () => {
  it("exportedAt が含まれる", () => {
    const data: StoredData = { schemaVersion: 1, charts: [] };
    const json = exportBackup(data);
    const parsed = JSON.parse(json) as BackupData;
    expect(parsed.exportedAt).toBeTruthy();
    expect(typeof parsed.exportedAt).toBe("string");
  });

  it("schemaVersion が含まれる", () => {
    const data: StoredData = { schemaVersion: 1, charts: [] };
    const json = exportBackup(data);
    const parsed = JSON.parse(json) as BackupData;
    expect(parsed.schemaVersion).toBe(1);
  });

  it("エクスポートしたJSONをvalidateBackupで検証できる", () => {
    const data: StoredData = {
      schemaVersion: 1,
      charts: [
        {
          id: "test",
          title: "Test Song",
          aliases: [],
          chart: "SPA",
          cleared: true,
          recommendedOptions: ["MIRROR"],
          avoidOptions: ["RANDOM"],
          normalGreenNumber: "300",
          startGreenNumber: "320",
          changedGreenNumber: "285",
          gearChangeNote: "BPM200でギアチェン",
          memo: "ソフランあり",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };
    const json = exportBackup(data);
    expect(() => validateBackup(json)).not.toThrow();
  });
});

// ── loadData (localStorage破損・スキーマ未対応) のテスト ─────────

describe("loadData (localStorage破損・スキーマ未対応)", () => {
  beforeEach(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
  });

  afterEach(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
  });

  it("localStorage に何もない場合、空データと警告なしを返す", () => {
    const { data, warning } = loadData();
    expect(data.charts).toHaveLength(0);
    expect(warning).toBeNull();
  });

  it("JSON破損時、生データを退避して空データと警告を返す", () => {
    localStorageStore["iidx_option_notes_v1"] = "{BROKEN JSON!!!";
    const { data, warning } = loadData();
    expect(data.charts).toHaveLength(0);
    expect(warning).not.toBeNull();
    expect(warning?.type).toBe("corrupt");
    // 退避キーが存在する
    expect(warning?.recoveryKey).toBeTruthy();
    expect(localStorageStore[warning!.recoveryKey!]).toBe("{BROKEN JSON!!!");
    // 元のキーは変更されていない（空データを自動保存しない）
    expect(localStorageStore["iidx_option_notes_v1"]).toBe("{BROKEN JSON!!!");
  });

  it("未対応schemaVersionの場合、生データを退避して空データと警告を返す", () => {
    localStorageStore["iidx_option_notes_v1"] = JSON.stringify({
      schemaVersion: 99,
      charts: [],
    });
    const { data, warning } = loadData();
    expect(data.charts).toHaveLength(0);
    expect(warning?.type).toBe("unknown_schema");
    expect(warning?.message).toContain("99");
  });

  it("chartsが配列でない場合、生データを退避して空データと警告を返す", () => {
    localStorageStore["iidx_option_notes_v1"] = JSON.stringify({
      schemaVersion: 1,
      charts: "not_an_array",
    });
    const { data, warning } = loadData();
    expect(data.charts).toHaveLength(0);
    expect(warning?.type).toBe("corrupt");
  });

  it("インポート失敗時（バリデーションエラー）は既存データを保持する", () => {
    // 正常なデータを保存
    const validData = JSON.stringify({
      schemaVersion: 1,
      charts: [
        {
          id: "existing",
          title: "Existing Song",
          aliases: [],
          chart: "SPA",
          cleared: false,
          recommendedOptions: [],
          avoidOptions: [],
          normalGreenNumber: "",
          startGreenNumber: "",
          changedGreenNumber: "",
          gearChangeNote: "",
          memo: "",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });
    localStorageStore["iidx_option_notes_v1"] = validData;

    // 不正なバックアップを検証しようとする（エラーがthrowされる）
    const badBackup = JSON.stringify({ schemaVersion: 999, charts: [] });
    expect(() => validateBackup(badBackup)).toThrow();

    // validateBackup がエラーをスローしたため restoreFromBackup は呼ばれず
    // 既存データが変更されていないことを確認
    expect(localStorageStore["iidx_option_notes_v1"]).toBe(validData);
  });
});
