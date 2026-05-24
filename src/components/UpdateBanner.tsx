import { useEffect, useState } from 'react';

// Desktop-only: shows a toast when electron-updater has downloaded an update,
// offering to restart and apply it. Renders nothing in the web build (where
// window.chessMaxDesktop is undefined).
export function UpdateBanner() {
  const desktop = typeof window !== 'undefined' ? window.chessMaxDesktop : undefined;
  const [version, setVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!desktop) return;
    return desktop.onUpdateStatus((s) => {
      if (s.status === 'downloaded') {
        setVersion(s.version ?? '');
        setDismissed(false);
      }
    });
  }, [desktop]);

  if (!desktop || version === null || dismissed) return null;

  return (
    <div className="update-toast" role="status">
      <div className="update-toast-text">
        <strong>Update ready</strong>
        <span>
          {version
            ? `Version ${version} will install on restart.`
            : 'A new version will install on restart.'}
        </span>
      </div>
      <div className="update-toast-actions">
        <button onClick={() => setDismissed(true)}>Later</button>
        <button className="primary" onClick={() => desktop.quitAndInstall()}>
          Restart
        </button>
      </div>
    </div>
  );
}
