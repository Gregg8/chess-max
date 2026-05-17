export type GameMode = 'human-vs-engine' | 'pass-and-play' | 'engine-vs-engine';

export type Color = 'w' | 'b';
export type Side = Color | 'random';

export type ThemeName = 'classic-wood' | 'tournament-green' | 'midnight' | 'high-contrast';

export type EveSpeed = 'fast' | 'normal' | 'slow';

export type PassPlayOrientation = 'auto-flip' | 'fixed-white';

export interface Settings {
  theme: ThemeName;
  defaultMode: GameMode;
  defaultSide: Side;
  difficulty: number; // 1-20 (used in human-vs-engine)
  eveWhiteDifficulty: number;
  eveBlackDifficulty: number;
  eveSpeed: EveSpeed;
  passPlayOrientation: PassPlayOrientation;
  soundOn: boolean;
  animationOn: boolean;
  evalBarOn: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'tournament-green',
  defaultMode: 'human-vs-engine',
  defaultSide: 'w',
  difficulty: 5,
  eveWhiteDifficulty: 10,
  eveBlackDifficulty: 10,
  eveSpeed: 'normal',
  passPlayOrientation: 'auto-flip',
  soundOn: true,
  animationOn: true,
  evalBarOn: false,
};

export interface Square {
  file: number; // 0-7 (a-h)
  rank: number; // 0-7 (1-8)
}

export type SquareName =
  | `a${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`
  | `b${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`
  | `c${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`
  | `d${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`
  | `e${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`
  | `f${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`
  | `g${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`
  | `h${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface PieceOnSquare {
  type: PieceType;
  color: Color;
  square: SquareName;
}

export type Outcome =
  | { kind: 'in-progress' }
  | { kind: 'checkmate'; winner: Color }
  | { kind: 'stalemate' }
  | { kind: 'draw-50-move' }
  | { kind: 'draw-threefold' }
  | { kind: 'draw-insufficient' }
  | { kind: 'resign'; winner: Color };

export interface SavedGame {
  v: 1;
  mode: GameMode;
  humanSide: Color; // meaningful for human-vs-engine
  history: string[]; // SAN move list (full game)
  cursor: number; // index into history; equals history.length when at the live position
  outcome: Outcome;
  createdAt: number;
}
