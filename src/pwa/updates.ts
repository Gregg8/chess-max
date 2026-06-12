// Shared state for web (PWA) updates. The service-worker side lives in
// registerWebUpdates.ts and is imported only from main.tsx, so this module
// stays importable from components in tests and the Electron build (where it
// simply reports 'unavailable').

type Listener = (ready: boolean) => void;

export type UpdateCheckResult = 'update-ready' | 'up-to-date' | 'unavailable';

let updateReady = false;
let applier: ((reloadPage?: boolean) => Promise<void>) | null = null;
let registration: ServiceWorkerRegistration | null = null;
const listeners = new Set<Listener>();

export function isUpdateReady(): boolean {
  return updateReady;
}

export function subscribeUpdateReady(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// Wired up by registerWebUpdates.ts once the service worker registers.
export function notifyUpdateReady(): void {
  updateReady = true;
  listeners.forEach((fn) => fn(true));
}

export function setUpdateApplier(fn: (reloadPage?: boolean) => Promise<void>): void {
  applier = fn;
}

export function setRegistration(reg: ServiceWorkerRegistration): void {
  registration = reg;
}

// Activates the waiting service worker; the page reloads once it takes
// control (see the 'controlling' listener in vite-plugin-pwa's registerSW).
export function applyUpdate(): void {
  void applier?.(true);
}

// Manually ask the browser to look for a new deploy. 'unavailable' means no
// service worker is registered (Electron, dev server, or offline).
export async function checkForUpdates(timeoutMs = 10_000): Promise<UpdateCheckResult> {
  if (updateReady) return 'update-ready';
  if (!registration) return 'unavailable';
  try {
    await registration.update();
  } catch {
    return 'unavailable';
  }
  if (!registration.installing && !registration.waiting) return 'up-to-date';
  // A new worker is downloading or installed; wait for onNeedRefresh.
  const ready = await waitForUpdateReady(timeoutMs);
  return ready ? 'update-ready' : 'up-to-date';
}

function waitForUpdateReady(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (updateReady) {
      resolve(true);
      return;
    }
    const listener: Listener = (ready) => {
      if (!ready) return;
      cleanup();
      resolve(true);
    };
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(updateReady);
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timer);
      listeners.delete(listener);
    };
    listeners.add(listener);
  });
}
