import { app, BrowserWindow, Menu, session, shell, ipcMain } from 'electron';
import { join } from 'node:path';
import { autoUpdater } from 'electron-updater';
import { buildMenu } from './menu';
import { loadWindowState, trackWindowState } from './window-state';

const RENDERER_DIR = join(__dirname, 'renderer');
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = !app.isPackaged && !!DEV_SERVER_URL;

// Fully-local app: no remote origins. wasm-unsafe-eval is required by the
// Stockfish wasm engine; worker-src covers the engine Worker.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

let mainWindow: BrowserWindow | null = null;

function applyCsp(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP],
      },
    });
  });
}

function createWindow(): void {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 480,
    minHeight: 600,
    backgroundColor: '#1a1a1a',
    show: false,
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (state.isMaximized) mainWindow.maximize();
  trackWindowState(mainWindow);

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  // Open external links in the system browser; never navigate in-app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow?.webContents.getURL() ?? '';
    try {
      if (new URL(url).origin !== new URL(current).origin) {
        event.preventDefault();
        if (url.startsWith('http')) void shell.openExternal(url);
      }
    } catch {
      event.preventDefault();
    }
  });

  if (isDev) {
    void mainWindow.loadURL(DEV_SERVER_URL!);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(join(RENDERER_DIR, 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupAutoUpdates(): void {
  // macOS auto-update requires a signed+notarized build (Squirrel.Mac
  // validates the signature). Unsigned for now → mac users update manually.
  if (process.platform === 'darwin' || !app.isPackaged) return;

  const send = (status: string, version?: string, percent?: number) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:status', { status, version, percent });
    }
  };

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => send('checking'));
  autoUpdater.on('update-available', (info) => send('available', info.version));
  autoUpdater.on('update-not-available', () => send('none'));
  autoUpdater.on('error', (err) => send('error', String(err?.message ?? err)));
  autoUpdater.on('download-progress', (p) => send('downloading', undefined, Math.round(p.percent)));
  autoUpdater.on('update-downloaded', (info) => send('downloaded', info.version));

  void autoUpdater.checkForUpdates().catch(() => {
    /* offline or no release yet — ignore */
  });
}

// Single-instance: focus the existing window instead of launching a second.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    applyCsp();
    Menu.setApplicationMenu(buildMenu());
    createWindow();
    setupAutoUpdates();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.on('update:quitAndInstall', () => {
    try {
      autoUpdater.quitAndInstall();
    } catch {
      /* no update staged */
    }
  });
}
