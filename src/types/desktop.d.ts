// Shape of the API exposed by the Electron preload (electron/preload.ts) on
// `window.chessMaxDesktop`. Optional — undefined in the web build.
export interface UpdateStatus {
  status: 'checking' | 'available' | 'none' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
}

export interface ChessMaxDesktopApi {
  platform: string;
  getVersion(): Promise<string>;
  onUpdateStatus(cb: (status: UpdateStatus) => void): () => void;
  quitAndInstall(): void;
}

declare global {
  interface Window {
    chessMaxDesktop?: ChessMaxDesktopApi;
  }
}
