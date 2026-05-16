import type { ThemeName } from '../types';

export interface ThemeVars {
  bg: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  lightSquare: string;
  darkSquare: string;
  lastMove: string;
  legalDot: string;
  hint: string;
  checkGlow: string;
  pieceLight: string;
  pieceDark: string;
  pieceOutline: string;
}

export const THEMES: Record<ThemeName, ThemeVars> = {
  'classic-wood': {
    bg: '#f5ecd6',
    surface: '#fbf6e6',
    surfaceMuted: '#e8dcb8',
    text: '#3a2a14',
    textMuted: '#7a6240',
    border: '#c2a878',
    accent: '#8b4513',
    lightSquare: '#f0d9b5',
    darkSquare: '#b58863',
    lastMove: 'rgba(255, 215, 0, 0.45)',
    legalDot: 'rgba(58, 42, 20, 0.35)',
    hint: 'rgba(139, 69, 19, 0.78)',
    checkGlow: 'rgba(220, 50, 50, 0.55)',
    pieceLight: '#ffffff',
    pieceDark: '#2a1a08',
    pieceOutline: '#1a0f04',
  },
  'tournament-green': {
    bg: '#eeeed5',
    surface: '#ffffff',
    surfaceMuted: '#e8e8d0',
    text: '#2a2a2a',
    textMuted: '#5a5a5a',
    border: '#c0c09e',
    accent: '#779556',
    lightSquare: '#ebecd0',
    darkSquare: '#779556',
    lastMove: 'rgba(255, 255, 51, 0.5)',
    legalDot: 'rgba(0, 0, 0, 0.28)',
    hint: 'rgba(96, 130, 60, 0.85)',
    checkGlow: 'rgba(220, 50, 50, 0.6)',
    pieceLight: '#ffffff',
    pieceDark: '#222222',
    pieceOutline: '#000000',
  },
  midnight: {
    bg: '#0f1419',
    surface: '#1a232c',
    surfaceMuted: '#243038',
    text: '#e6edf3',
    textMuted: '#8b949e',
    border: '#2f3b45',
    accent: '#58a6ff',
    lightSquare: '#5a6c7a',
    darkSquare: '#3a4854',
    lastMove: 'rgba(88, 166, 255, 0.4)',
    legalDot: 'rgba(230, 237, 243, 0.4)',
    hint: 'rgba(88, 166, 255, 0.85)',
    checkGlow: 'rgba(255, 110, 110, 0.6)',
    pieceLight: '#f0f0f0',
    pieceDark: '#1a1a1a',
    pieceOutline: '#000000',
  },
  'high-contrast': {
    bg: '#000000',
    surface: '#101010',
    surfaceMuted: '#202020',
    text: '#ffffff',
    textMuted: '#cccccc',
    border: '#ffffff',
    accent: '#ffff00',
    lightSquare: '#ffffff',
    darkSquare: '#000000',
    lastMove: 'rgba(255, 255, 0, 0.55)',
    legalDot: 'rgba(255, 255, 0, 0.7)',
    hint: 'rgba(255, 255, 0, 0.95)',
    checkGlow: 'rgba(255, 0, 0, 0.85)',
    pieceLight: '#ffff00',
    pieceDark: '#ff00ff',
    pieceOutline: '#000000',
  },
};

export function applyTheme(name: ThemeName, root: HTMLElement = document.documentElement): void {
  const t = THEMES[name];
  root.style.setProperty('--bg', t.bg);
  root.style.setProperty('--surface', t.surface);
  root.style.setProperty('--surface-muted', t.surfaceMuted);
  root.style.setProperty('--text', t.text);
  root.style.setProperty('--text-muted', t.textMuted);
  root.style.setProperty('--border', t.border);
  root.style.setProperty('--accent', t.accent);
  root.style.setProperty('--light-square', t.lightSquare);
  root.style.setProperty('--dark-square', t.darkSquare);
  root.style.setProperty('--last-move', t.lastMove);
  root.style.setProperty('--legal-dot', t.legalDot);
  root.style.setProperty('--hint', t.hint);
  root.style.setProperty('--check-glow', t.checkGlow);
  root.style.setProperty('--piece-light', t.pieceLight);
  root.style.setProperty('--piece-dark', t.pieceDark);
  root.style.setProperty('--piece-outline', t.pieceOutline);
  root.dataset.theme = name;
}
