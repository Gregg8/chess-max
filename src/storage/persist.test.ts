import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSettings,
  saveSettings,
  loadGame,
  saveGame,
  clearGame,
  debounce,
} from './persist';
import { DEFAULT_SETTINGS } from '../types';

describe('persist: settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadSettings returns defaults when nothing saved', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips settings', () => {
    const next = { ...DEFAULT_SETTINGS, theme: 'midnight' as const, difficulty: 14 };
    saveSettings(next);
    expect(loadSettings()).toEqual(next);
  });

  it('merges partial saved settings with defaults', () => {
    localStorage.setItem('chess-max:settings:v1', JSON.stringify({ theme: 'classic-wood' }));
    const loaded = loadSettings();
    expect(loaded.theme).toBe('classic-wood');
    expect(loaded.difficulty).toBe(DEFAULT_SETTINGS.difficulty);
  });

  it('tolerates corrupted JSON without throwing', () => {
    localStorage.setItem('chess-max:settings:v1', 'not json{');
    expect(() => loadSettings()).not.toThrow();
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('persist: game', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips a saved game', () => {
    const g = {
      v: 1 as const,
      mode: 'human-vs-engine' as const,
      humanSide: 'w' as const,
      history: ['e4', 'e5', 'Nf3'],
      cursor: 3,
      outcome: { kind: 'in-progress' as const },
      createdAt: 1234,
    };
    saveGame(g);
    expect(loadGame()).toEqual(g);
  });

  it('rejects games with the wrong schema version', () => {
    localStorage.setItem(
      'chess-max:game:v1',
      JSON.stringify({ v: 2, mode: 'pass-and-play', history: [] }),
    );
    expect(loadGame()).toBeNull();
  });

  it('clearGame removes the entry', () => {
    saveGame({
      v: 1,
      mode: 'pass-and-play',
      humanSide: 'w',
      history: [],
      cursor: 0,
      outcome: { kind: 'in-progress' },
      createdAt: 0,
    });
    clearGame();
    expect(loadGame()).toBeNull();
  });
});

describe('debounce', () => {
  it('coalesces rapid calls into a single trailing call', async () => {
    let count = 0;
    const fn = debounce(() => {
      count++;
    }, 20);
    fn();
    fn();
    fn();
    expect(count).toBe(0);
    await new Promise((r) => setTimeout(r, 50));
    expect(count).toBe(1);
  });
});
