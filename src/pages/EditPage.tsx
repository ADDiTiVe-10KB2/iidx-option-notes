import { useState, useRef } from "react";
import type { ChartMemo, ChartType, PlayOption } from "../types/chart";
import {
  CHART_TYPES,
  PLAY_OPTIONS,
  OPTION_LABELS,
} from "../types/chart";
import { normalize } from "../search/search";

interface EditPageProps {
  chart?: ChartMemo; // undefined = 新規登録
  allCharts: ChartMemo[];
  onSave: (chart: ChartMemo) => void;
  onCancel: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const EMPTY_FORM = {
  title: "",
  aliases: [] as string[],
  chart: "SPA" as ChartType,
  cleared: false,
  recommendedOptions: [] as PlayOption[],
  avoidOptions: [] as PlayOption[],
  normalGreenNumber: "",
  startGreenNumber: "",
  changedGreenNumber: "",
  gearChangeNote: "",
  memo: "",
};

type FormState = typeof EMPTY_FORM;

export function EditPage({ chart, allCharts, onSave, onCancel }: EditPageProps) {
  const isNew = !chart;

  const [form, setForm] = useState<FormState>(
    chart
      ? {
          title: chart.title,
          aliases: chart.aliases,
          chart: chart.chart,
          cleared: chart.cleared,
          recommendedOptions: chart.recommendedOptions,
          avoidOptions: chart.avoidOptions,
          normalGreenNumber: chart.normalGreenNumber,
          startGreenNumber: chart.startGreenNumber,
          changedGreenNumber: chart.changedGreenNumber,
          gearChangeNote: chart.gearChangeNote,
          memo: chart.memo,
        }
      : { ...EMPTY_FORM, aliases: [], recommendedOptions: [], avoidOptions: [] }
  );

  const [aliasInput, setAliasInput] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const aliasInputRef = useRef<HTMLInputElement>(null);

  // ── aliases 操作 ──────────────────────────────────────────────

  function addAliasesFromInput(input: string) {
    const newAliases = input
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !form.aliases.includes(s));
    if (newAliases.length > 0) {
      setForm((f) => ({ ...f, aliases: [...f.aliases, ...newAliases] }));
    }
    setAliasInput("");
    aliasInputRef.current?.focus();
  }

  function handleAliasKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addAliasesFromInput(aliasInput);
    }
  }

  function removeAlias(index: number) {
    setForm((f) => ({
      ...f,
      aliases: f.aliases.filter((_, i) => i !== index),
    }));
  }

  // ── recommendedOptions 操作 ────────────────────────────────────

  function toggleRecommended(opt: PlayOption) {
    setForm((f) => {
      const inRec = f.recommendedOptions.includes(opt);
      if (inRec) {
        return {
          ...f,
          recommendedOptions: f.recommendedOptions.filter((o) => o !== opt),
        };
      }
      // 避けたいとの重複防止
      const newAvoid = f.avoidOptions.filter((o) => o !== opt);
      return {
        ...f,
        recommendedOptions: [...f.recommendedOptions, opt],
        avoidOptions: newAvoid,
      };
    });
  }

  function moveRecommended(index: number, dir: -1 | 1) {
    setForm((f) => {
      const arr = [...f.recommendedOptions];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return f;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return { ...f, recommendedOptions: arr };
    });
  }

  // ── avoidOptions 操作 ──────────────────────────────────────────

  function toggleAvoid(opt: PlayOption) {
    setForm((f) => {
      const inAvoid = f.avoidOptions.includes(opt);
      if (inAvoid) {
        return {
          ...f,
          avoidOptions: f.avoidOptions.filter((o) => o !== opt),
        };
      }
      // 推奨との重複防止
      const newRec = f.recommendedOptions.filter((o) => o !== opt);
      return {
        ...f,
        avoidOptions: [...f.avoidOptions, opt],
        recommendedOptions: newRec,
      };
    });
  }

  // ── 保存 ──────────────────────────────────────────────────────

  function validate(): string[] {
    const errs: string[] = [];

    if (!form.title.trim()) {
      errs.push("曲名は必須です。");
    }

    // 重複チェック（正規化済み曲名 + ChartType、編集対象自身を除外）
    const normTitle = normalize(form.title);
    const duplicate = allCharts.some(
      (c) =>
        c.id !== chart?.id &&
        normalize(c.title) === normTitle &&
        c.chart === form.chart
    );
    if (duplicate) {
      errs.push(
        `「${form.title} [${form.chart}]」は既に登録されています。同じ曲名と譜面種別の重複登録はできません。`
      );
    }

    return errs;
  }

  function handleSave() {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    const now = new Date().toISOString();
    const saved: ChartMemo = {
      id: chart?.id ?? generateId(),
      title: form.title.trim(),
      aliases: form.aliases,
      chart: form.chart,
      cleared: form.cleared,
      recommendedOptions: form.recommendedOptions,
      avoidOptions: form.avoidOptions,
      normalGreenNumber: form.normalGreenNumber.trim(),
      startGreenNumber: form.startGreenNumber.trim(),
      changedGreenNumber: form.changedGreenNumber.trim(),
      gearChangeNote: form.gearChangeNote.trim(),
      memo: form.memo.trim(),
      createdAt: chart?.createdAt ?? now,
      updatedAt: now,
    };

    onSave(saved);
  }

  return (
    <div className="page edit-page">
      <div className="edit-header">
        <button type="button" className="btn btn--back" onClick={onCancel}>
          ← 戻る
        </button>
        <h2 className="edit-title">{isNew ? "新規登録" : "編集"}</h2>
      </div>

      {errors.length > 0 && (
        <div className="error-box" role="alert">
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      <div className="edit-body">
        {/* 曲名 */}
        <div className="form-group">
          <label className="form-label" htmlFor="edit-title">
            曲名 <span className="required">必須</span>
          </label>
          <input
            id="edit-title"
            type="text"
            className="form-input"
            value={form.title}
            onChange={(e) => {
              setForm((f) => ({ ...f, title: e.target.value }));
              setErrors([]);
            }}
            placeholder="正式曲名"
            autoComplete="off"
          />
        </div>

        {/* 譜面種別 */}
        <div className="form-group">
          <span className="form-label">
            譜面種別 <span className="required">必須</span>
          </span>
          <div className="toggle-group">
            {CHART_TYPES.map((ct) => (
              <button
                key={ct}
                type="button"
                className={`toggle-btn ${form.chart === ct ? "toggle-btn--active" : ""}`}
                onClick={() => {
                  setForm((f) => ({ ...f, chart: ct }));
                  setErrors([]);
                }}
                aria-pressed={form.chart === ct}
              >
                {ct}
              </button>
            ))}
          </div>
        </div>

        {/* CLEAR状態 */}
        <div className="form-group">
          <span className="form-label">CLEAR状態</span>
          <label className="switch-label">
            <input
              type="checkbox"
              className="switch-input"
              checked={form.cleared}
              onChange={(e) =>
                setForm((f) => ({ ...f, cleared: e.target.checked }))
              }
            />
            <span className="switch-track">
              <span className="switch-thumb" />
            </span>
            <span className="switch-text">
              {form.cleared ? "CLEAR済み" : "未CLEAR"}
            </span>
          </label>
        </div>

        {/* 推奨オプション */}
        <div className="form-group">
          <span className="form-label">推奨オプション（第1候補→第2候補の順）</span>
          <div className="toggle-group">
            {PLAY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`toggle-btn ${
                  form.recommendedOptions.includes(opt) ? "toggle-btn--active" : ""
                }`}
                onClick={() => toggleRecommended(opt)}
                aria-pressed={form.recommendedOptions.includes(opt)}
              >
                {OPTION_LABELS[opt]}
              </button>
            ))}
          </div>
          {form.recommendedOptions.length > 0 && (
            <div className="order-list">
              {form.recommendedOptions.map((opt, i) => (
                <div key={opt} className="order-item">
                  <span className="order-rank">{i + 1}</span>
                  <span className="order-label">{OPTION_LABELS[opt]}</span>
                  <button
                    type="button"
                    className="btn btn--icon-sm"
                    onClick={() => moveRecommended(i, -1)}
                    disabled={i === 0}
                    aria-label="上に移動"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="btn btn--icon-sm"
                    onClick={() => moveRecommended(i, 1)}
                    disabled={i === form.recommendedOptions.length - 1}
                    aria-label="下に移動"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    className="btn btn--icon-sm btn--remove"
                    onClick={() => toggleRecommended(opt)}
                    aria-label={`${OPTION_LABELS[opt]}を削除`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 避けたいオプション */}
        <div className="form-group">
          <span className="form-label">避けたいオプション</span>
          <div className="toggle-group">
            {PLAY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`toggle-btn toggle-btn--avoid ${
                  form.avoidOptions.includes(opt) ? "toggle-btn--avoid-active" : ""
                }`}
                onClick={() => toggleAvoid(opt)}
                aria-pressed={form.avoidOptions.includes(opt)}
              >
                {OPTION_LABELS[opt]}
              </button>
            ))}
          </div>
        </div>

        {/* 緑数字 */}
        <div className="form-group">
          <label className="form-label" htmlFor="edit-normal-gn">
            通常緑数字
          </label>
          <input
            id="edit-normal-gn"
            type="text"
            className="form-input form-input--sm"
            value={form.normalGreenNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, normalGreenNumber: e.target.value }))
            }
            placeholder="例: 285"
            inputMode="numeric"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="edit-start-gn">
            開幕緑数字
          </label>
          <input
            id="edit-start-gn"
            type="text"
            className="form-input form-input--sm"
            value={form.startGreenNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, startGreenNumber: e.target.value }))
            }
            placeholder="例: 320"
            inputMode="numeric"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="edit-changed-gn">
            変更後緑数字
          </label>
          <input
            id="edit-changed-gn"
            type="text"
            className="form-input form-input--sm"
            value={form.changedGreenNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, changedGreenNumber: e.target.value }))
            }
            placeholder="例: 250"
            inputMode="numeric"
          />
        </div>

        {/* ギアチェン手順 */}
        <div className="form-group">
          <label className="form-label" htmlFor="edit-gear-change">
            ギアチェン手順
          </label>
          <textarea
            id="edit-gear-change"
            className="form-textarea"
            value={form.gearChangeNote}
            onChange={(e) =>
              setForm((f) => ({ ...f, gearChangeNote: e.target.value }))
            }
            placeholder="ギアチェンのタイミングや手順など"
            rows={3}
          />
        </div>

        {/* メモ */}
        <div className="form-group">
          <label className="form-label" htmlFor="edit-memo">
            メモ
          </label>
          <textarea
            id="edit-memo"
            className="form-textarea"
            value={form.memo}
            onChange={(e) =>
              setForm((f) => ({ ...f, memo: e.target.value }))
            }
            placeholder="ソフラン対策、配置の特徴など"
            rows={4}
          />
        </div>

        {/* 略称・俗称 */}
        <div className="form-group">
          <label className="form-label" htmlFor="edit-alias-input">
            略称・俗称
          </label>
          <div className="alias-input-row">
            <input
              ref={aliasInputRef}
              id="edit-alias-input"
              type="text"
              className="form-input"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              onKeyDown={handleAliasKeyDown}
              placeholder="略称（Enter・追加ボタン・カンマ区切りで複数可）"
              autoComplete="off"
            />
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => addAliasesFromInput(aliasInput)}
            >
              追加
            </button>
          </div>
          {form.aliases.length > 0 && (
            <div className="alias-tags">
              {form.aliases.map((a, i) => (
                <span key={i} className="alias-tag alias-tag--edit">
                  {a}
                  <button
                    type="button"
                    className="alias-remove"
                    onClick={() => removeAlias(i)}
                    aria-label={`${a}を削除`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="edit-footer">
        <button type="button" className="btn btn--secondary" onClick={onCancel}>
          キャンセル
        </button>
        <button type="button" className="btn btn--primary" onClick={handleSave}>
          保存
        </button>
      </div>
    </div>
  );
}
