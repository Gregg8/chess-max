import { useEffect, useRef, useState } from 'react';
import { applyUpdate, checkForUpdates, isUpdateReady, subscribeUpdateReady } from '../pwa/updates';

type Status = 'idle' | 'checking' | 'update-ready' | 'up-to-date' | 'unavailable';

const TRANSIENT_MS = 5000;

// Version label in the header. Tapping it checks for a new deploy and shows
// either "update available — tap to update" (tap again to apply) or "you have
// the latest version". Also lights up on its own when the background check
// finds an update.
export function VersionBadge() {
  const [status, setStatus] = useState<Status>(() => (isUpdateReady() ? 'update-ready' : 'idle'));
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = subscribeUpdateReady((ready) => {
      if (ready) {
        window.clearTimeout(resetTimer.current);
        setStatus('update-ready');
      }
    });
    return () => {
      unsubscribe();
      window.clearTimeout(resetTimer.current);
    };
  }, []);

  const showTransient = (s: Status) => {
    setStatus(s);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => {
      setStatus(isUpdateReady() ? 'update-ready' : 'idle');
    }, TRANSIENT_MS);
  };

  const onClick = async () => {
    if (status === 'checking') return;
    if (status === 'update-ready') {
      applyUpdate();
      return;
    }
    setStatus('checking');
    const result = await checkForUpdates();
    if (result === 'update-ready') setStatus('update-ready');
    else showTransient(result);
  };

  const suffix =
    status === 'checking'
      ? ' · checking…'
      : status === 'update-ready'
        ? ' · update available — tap to update'
        : status === 'up-to-date'
          ? ' · you have the latest version'
          : status === 'unavailable'
            ? ' · update check unavailable'
            : '';

  return (
    <button
      type="button"
      className={`app-version${status === 'update-ready' ? ' update-ready' : ''}`}
      onClick={onClick}
      aria-live="polite"
    >
      v{__APP_VERSION__}
      {suffix}
    </button>
  );
}
