import { registerSW } from 'virtual:pwa-register';
import { notifyUpdateReady, setRegistration, setUpdateApplier } from './updates';

// iOS home-screen apps are almost never relaunched (the page stays alive in
// the app switcher), so the browser's on-navigation service-worker update
// check rarely runs. Re-check whenever the app returns to the foreground and
// on a timer while it stays open.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

// Registers the PWA service worker and update checks. In the Electron build
// and the dev server, vite-plugin-pwa makes registerSW a no-op, so none of
// the callbacks fire and checkForUpdates() reports 'unavailable'.
export function registerWebUpdates(): void {
  const updateSW = registerSW({
    onNeedRefresh() {
      notifyUpdateReady();
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setRegistration(registration);
      const check = () => {
        registration.update().catch(() => {});
      };
      window.setInterval(check, CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });
  setUpdateApplier(updateSW);
}
