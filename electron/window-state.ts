import { app, screen, BrowserWindow } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
}

const DEFAULT_STATE: WindowState = { width: 1100, height: 800 };

function stateFile(): string {
  return join(app.getPath('userData'), 'window-state.json');
}

export function loadWindowState(): WindowState {
  let saved: WindowState;
  try {
    saved = { ...DEFAULT_STATE, ...(JSON.parse(readFileSync(stateFile(), 'utf-8')) as WindowState) };
  } catch {
    return { ...DEFAULT_STATE };
  }

  // Drop a saved position that no longer lands on a connected display.
  if (saved.x !== undefined && saved.y !== undefined) {
    const area = screen.getDisplayMatching({
      x: saved.x,
      y: saved.y,
      width: saved.width,
      height: saved.height,
    }).workArea;
    const visible =
      saved.x < area.x + area.width &&
      saved.x + saved.width > area.x &&
      saved.y < area.y + area.height &&
      saved.y + saved.height > area.y;
    if (!visible) {
      delete saved.x;
      delete saved.y;
    }
  }

  return saved;
}

export function trackWindowState(win: BrowserWindow): void {
  const save = () => {
    if (win.isDestroyed()) return;
    const bounds = win.getNormalBounds();
    const state: WindowState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: win.isMaximized(),
    };
    try {
      writeFileSync(stateFile(), JSON.stringify(state));
    } catch {
      /* best effort */
    }
  };

  let timer: NodeJS.Timeout | null = null;
  const debounced = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, 400);
  };

  win.on('resize', debounced);
  win.on('move', debounced);
  win.on('close', save);
}
