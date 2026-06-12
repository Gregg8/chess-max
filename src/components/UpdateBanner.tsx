import { useEffect, useState } from 'react';
import { applyUpdate, isUpdateReady, subscribeUpdateReady } from '../pwa/updates';

// Update toast. On desktop (Electron) it appears when electron-updater has
// downloaded an update, offering to restart and apply it. On the web it
// appears when a new service worker is waiting, offering to reload.
export function UpdateBanner() {
  const desktop = typeof window !== 'undefined' ? window.chessMaxDesktop : undefined;
  const [version, setVersion] = useState<string | null>(null);
  const [webReady, setWebReady] = useState(() => isUpdateReady());
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

  useEffect(() => {
    if (desktop) return;
    return subscribeUpdateReady((ready) => {
      if (ready) {
        setWebReady(true);
        setDismissed(false);
      }
    });
  }, [desktop]);

  if (dismissed) return null;

  if (desktop) {
    if (version === null) return null;
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

  if (!webReady) return null;
  return (
    <div className="update-toast" role="status">
      <div className="update-toast-text">
        <strong>Update available</strong>
        <span>A new version of chess-max is ready.</span>
      </div>
      <div className="update-toast-actions">
        <button onClick={() => setDismissed(true)}>Later</button>
        <button className="primary" onClick={() => applyUpdate()}>
          Reload
        </button>
      </div>
    </div>
  );
}
