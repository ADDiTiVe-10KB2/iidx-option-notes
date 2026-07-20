import type { ChartMemo } from "../types/chart";
import { OPTION_LABELS } from "../types/chart";
import { ChartTypeTag } from "../components/ChartTypeTag";
import { OptionBadge } from "../components/OptionBadge";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useState } from "react";

interface DetailPageProps {
  chart: ChartMemo | undefined;
  onBack: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DetailPage({ chart, onBack, onEdit, onDelete }: DetailPageProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!chart) {
    return (
      <div className="page detail-page">
        <button type="button" className="btn btn--back" onClick={onBack}>
          ← 戻る
        </button>
        <p className="empty-state">譜面が見つかりません。</p>
      </div>
    );
  }

  return (
    <div className="page detail-page">
      <div className="detail-header">
        <button type="button" className="btn btn--back" onClick={onBack}>
          ← 戻る
        </button>
        <div className="detail-actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => onEdit(chart.id)}
          >
            編集
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => setConfirmOpen(true)}
          >
            削除
          </button>
        </div>
      </div>

      <div className="detail-body">
        <div className="detail-title-row">
          <h2 className="detail-title">{chart.title}</h2>
          <ChartTypeTag chartType={chart.chart} />
        </div>

        <div className="detail-clear-row">
          {chart.cleared ? (
            <span className="clear-badge clear-badge--large">CLEAR済み</span>
          ) : (
            <span className="no-clear-badge">未CLEAR</span>
          )}
        </div>

        {/* 現在選ぶべきオプション（大きく） */}
        <section className="detail-section detail-section--primary">
          <h3 className="detail-section__label">今選ぶオプション</h3>
          <div className="detail-current-option">
            <CurrentOptionDisplay chart={chart} />
          </div>
        </section>

        {/* CLEAR後の推奨オプション */}
        {chart.recommendedOptions.length > 0 && (
          <section className="detail-section">
            <h3 className="detail-section__label">推奨オプション</h3>
            <div className="badge-row">
              {chart.recommendedOptions.map((opt, i) => (
                <span key={opt} className="option-with-rank">
                  <span className="option-rank">{i + 1}</span>
                  <OptionBadge option={opt} variant="recommend" />
                </span>
              ))}
            </div>
          </section>
        )}

        {/* 避けたいオプション */}
        {chart.avoidOptions.length > 0 && (
          <section className="detail-section">
            <h3 className="detail-section__label">避けたいオプション</h3>
            <div className="badge-row">
              {chart.avoidOptions.map((opt) => (
                <OptionBadge key={opt} option={opt} variant="avoid" />
              ))}
            </div>
          </section>
        )}

        {/* 緑数字・ギアチェン */}
        {(chart.normalGreenNumber ||
          chart.startGreenNumber ||
          chart.changedGreenNumber ||
          chart.gearChangeNote) && (
          <section className="detail-section">
            <h3 className="detail-section__label">緑数字 / ギアチェン</h3>
            <dl className="detail-dl">
              {chart.normalGreenNumber && (
                <DetailRow label="通常緑数字" value={chart.normalGreenNumber} />
              )}
              {chart.startGreenNumber && (
                <DetailRow label="開幕緑数字" value={chart.startGreenNumber} />
              )}
              {chart.changedGreenNumber && (
                <DetailRow label="変更後緑数字" value={chart.changedGreenNumber} />
              )}
              {chart.gearChangeNote && (
                <DetailRow label="ギアチェン手順" value={chart.gearChangeNote} />
              )}
            </dl>
          </section>
        )}

        {/* メモ */}
        {chart.memo && (
          <section className="detail-section">
            <h3 className="detail-section__label">メモ</h3>
            <p className="detail-memo">{chart.memo}</p>
          </section>
        )}

        {/* 略称 */}
        {chart.aliases.length > 0 && (
          <section className="detail-section">
            <h3 className="detail-section__label">略称・俗称</h3>
            <div className="alias-list">
              {chart.aliases.map((a, i) => (
                <span key={i} className="alias-tag">
                  {a}
                </span>
              ))}
            </div>
          </section>
        )}

        <div className="detail-timestamps">
          <span>登録: {formatDate(chart.createdAt)}</span>
          <span>更新: {formatDate(chart.updatedAt)}</span>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="削除の確認"
        message={`「${chart.title} [${chart.chart}]」を削除しますか？この操作は元に戻せません。`}
        confirmLabel="削除する"
        danger
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete(chart.id);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function CurrentOptionDisplay({ chart }: { chart: ChartMemo }) {
  if (!chart.cleared) {
    return (
      <div className="current-option-display current-option-display--regular">
        <span className="option-badge option-badge--recommend option-badge--xl">
          {OPTION_LABELS["REGULAR"]}
        </span>
        <span className="current-option-note">未CLEARのため正規</span>
      </div>
    );
  }

  if (chart.recommendedOptions.length === 0) {
    return (
      <div className="current-option-display">
        <span className="option-badge option-badge--unset option-badge--xl">
          未設定
        </span>
      </div>
    );
  }

  return (
    <div className="current-option-display">
      {chart.recommendedOptions.map((opt, i) => (
        <span key={opt} className="option-with-rank option-with-rank--xl">
          <span className="option-rank">{i + 1}</span>
          <span className={`option-badge option-badge--recommend option-badge--xl`}>
            {OPTION_LABELS[opt]}
          </span>
        </span>
      ))}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="detail-dt">{label}</dt>
      <dd className="detail-dd">{value}</dd>
    </>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}
