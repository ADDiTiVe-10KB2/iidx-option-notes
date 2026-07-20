import { useRef, useState } from "react";
import type { StoredData } from "../types/chart";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  exportBackup,
  validateBackup,
  restoreFromBackup,
  clearAllData,
} from "../storage/storage";

interface SettingsPageProps {
  data: StoredData;
  onDataRestored: (newData: StoredData) => void;
  onDataCleared: () => void;
  onBack: () => void;
}

export function SettingsPage({
  data,
  onDataRestored,
  onDataCleared,
  onBack,
}: SettingsPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [pendingBackupJson, setPendingBackupJson] = useState<string | null>(null);
  const [pendingBackupSummary, setPendingBackupSummary] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "ok" | "error" } | null>(null);

  function showToast(message: string, type: "ok" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── エクスポート ───────────────────────────────────────────────

  function handleExport() {
    try {
      const json = exportBackup(data);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `iidx-option-notes-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("バックアップを書き出しました。", "ok");
    } catch {
      showToast("書き出しに失敗しました。", "error");
    }
  }

  // ── インポート ─────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const json = ev.target?.result;
      if (typeof json !== "string") {
        showToast("ファイルの読み込みに失敗しました。", "error");
        return;
      }

      try {
        const backup = validateBackup(json);
        setPendingBackupJson(json);
        setPendingBackupSummary(
          `${backup.charts.length} 件のデータが含まれています。現在のデータ (${data.charts.length} 件) を置き換えます。`
        );
        setRestoreConfirmOpen(true);
      } catch (err) {
        showToast(
          `インポートエラー: ${err instanceof Error ? err.message : String(err)}`,
          "error"
        );
      }
    };
    reader.readAsText(file, "utf-8");

    // 同じファイルを再選択できるようにリセット
    e.target.value = "";
  }

  function handleRestoreConfirm() {
    setRestoreConfirmOpen(false);
    if (!pendingBackupJson) return;

    try {
      const backup = validateBackup(pendingBackupJson);
      const ok = restoreFromBackup(backup);
      if (ok) {
        onDataRestored({ schemaVersion: backup.schemaVersion, charts: backup.charts });
        showToast("復元しました。", "ok");
      } else {
        showToast("保存に失敗しました。ストレージの空き容量を確認してください。", "error");
      }
    } catch (err) {
      showToast(
        `復元に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
        "error"
      );
    }
    setPendingBackupJson(null);
  }

  // ── 全削除 ────────────────────────────────────────────────────

  function handleClearConfirm() {
    setClearConfirmOpen(false);
    const ok = clearAllData();
    if (ok) {
      onDataCleared();
      showToast("全データを削除しました。", "ok");
    } else {
      showToast("削除に失敗しました。", "error");
    }
  }

  return (
    <div className="page settings-page">
      <div className="settings-header">
        <button type="button" className="btn btn--back" onClick={onBack}>
          ← 戻る
        </button>
        <h2 className="settings-title">設定・バックアップ</h2>
      </div>

      {toast && (
        <div className={`toast toast--${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}

      <div className="settings-body">
        <div className="settings-stat">
          登録件数: <strong>{data.charts.length}</strong> 件
        </div>

        <section className="settings-section">
          <h3 className="settings-section__title">バックアップ</h3>

          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={handleExport}
          >
            JSONを書き出す
          </button>

          <button
            type="button"
            className="btn btn--secondary btn--block"
            onClick={() => fileInputRef.current?.click()}
          >
            JSONから復元する
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="visually-hidden"
            onChange={handleFileChange}
            aria-label="バックアップJSONファイルを選択"
          />
        </section>

        <section className="settings-section settings-section--danger">
          <h3 className="settings-section__title">危険な操作</h3>
          <button
            type="button"
            className="btn btn--danger btn--block"
            onClick={() => setClearConfirmOpen(true)}
          >
            全データを削除する
          </button>
        </section>
      </div>

      <ConfirmDialog
        open={clearConfirmOpen}
        title="全データ削除の確認"
        message="全ての登録データを削除します。この操作は元に戻せません。削除前にバックアップを取ることをお勧めします。"
        confirmLabel="全て削除する"
        danger
        onConfirm={handleClearConfirm}
        onCancel={() => setClearConfirmOpen(false)}
      />

      <ConfirmDialog
        open={restoreConfirmOpen}
        title="バックアップから復元"
        message={pendingBackupSummary}
        confirmLabel="復元する"
        onConfirm={handleRestoreConfirm}
        onCancel={() => {
          setRestoreConfirmOpen(false);
          setPendingBackupJson(null);
        }}
      />
    </div>
  );
}
