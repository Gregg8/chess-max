import { DEFAULT_SETTINGS, type SavedGame, type Settings } from '../types';

const GAME_KEY = 'chess-max:game:v1';
const SETTINGS_KEY = 'chess-max:settings:v1';

function safeRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadSettings(): Settings {
  const stored = safeRead<Partial<Settings>>(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export function saveSettings(s: Settings): boolean {
  return safeWrite(SETTINGS_KEY, s);
}

export function loadGame(): SavedGame | null {
  const g = safeRead<SavedGame>(GAME_KEY);
  if (!g || g.v !== 1) return null;
  return g;
}

export function saveGame(g: SavedGame): boolean {
  return safeWrite(GAME_KEY, g);
}

export function clearGame(): void {
  try {
    localStorage.removeItem(GAME_KEY);
  } catch {
    // ignore
  }
}

// Trailing-edge debounce for game writes. We don't want a write per render.
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
