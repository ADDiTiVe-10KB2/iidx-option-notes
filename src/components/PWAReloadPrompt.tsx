import { useRegisterSW } from "virtual:pwa-register/react";

export function PWAReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error("SW registration error", error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="pwa-toast" role="alert" aria-live="polite">
      <div className="pwa-toast__message">
        <span>新しいバージョンがあります</span>
      </div>
      <div className="pwa-toast__actions">
        <button
          type="button"
          className="btn btn--sm btn--primary"
          onClick={() => updateServiceWorker(true)}
        >
          更新
        </button>
        <button
          type="button"
          className="btn btn--sm btn--secondary"
          onClick={() => setNeedRefresh(false)}
        >
          後で
        </button>
      </div>
    </div>
  );
}
