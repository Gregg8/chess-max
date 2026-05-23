import { contextBridge, ipcRenderer } from 'electron';

export interface UpdateStatus {
  status: 'checking' | 'available' | 'none' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
}

const api = {
  platform: process.platform,
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  onUpdateStatus: (cb: (status: UpdateStatus) => void): (() => void) => {
    const listener = (_event: unknown, status: UpdateStatus) => cb(status);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
  quitAndInstall: (): void => ipcRenderer.send('update:quitAndInstall'),
};

export type ChessMaxDesktopApi = typeof api;

contextBridge.exposeInMainWorld('chessMaxDesktop', api);
