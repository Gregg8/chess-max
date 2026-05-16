// Inline SVG chess pieces. Simple but recognizable silhouettes.
// All pieces use a 45x45 viewBox so they tile cleanly into a square.
// Color is driven by the `color` prop (mapped to --piece-light / --piece-dark
// CSS vars by the consumer), and outlines use --piece-outline.

import type { Color, PieceType } from '../types';

interface PieceProps {
  type: PieceType;
  color: Color;
  className?: string;
}

const PATHS: Record<PieceType, string> = {
  // Pawn: round head + tapered body
  p: 'M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z',
  // Rook
  r: 'M9 39h27v-3H9v3zm3.5-7l1.5-2.5h17l1.5 2.5h-20zm-.5 4v-4h21v4H12zm2-22V7h4v2h5V7h5v2h5v-2h4v9.5l-3 3v6.5h-17v-6.5l-3-3z',
  // Knight: stylized horse head
  n: 'M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21-.5-1.5-2 0-3 1-3 3.5-3.5 3-3-1-2 4-5 6-5 3 0-3.5 1-5 0-9 1.5-1.5 3-3 5-2 1-2 4-4 4-4-2 0-4 1-4 3.5 0 .5-.5 1.5-1 2-.5 0-2 0-3-.5C12.5 19.5 11 22 11 24c0 1.5 1 2 1.5 1.5.5-.5 1.5-3 2-3.5.5-.5 4-.5 4 0 0 1-1.5 3-1 4.5z',
  // Bishop
  b: 'M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zm6-4c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
  // Queen
  q: 'M9 26c8.5-1.5 21-1.5 27 0l2-12-7 9-1-15-5.5 13.5L20 8l-4.5 13.5L10 8 9 23l-7-9 7 12zm-1 8c2-2 6-2 9-1 2 .5 5 .5 7 0 3-1 7-1 9 1 1 2-1 4-3 4-4 0-7-4-12-4s-8 4-12 4c-2 0-4-2-3-4z',
  // King
  k: 'M22.5 11.63V6M20 8h5M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5zm0 0c-5-3-9-3-9 3.5 0 6 9 7.5 9 7.5s9-1.5 9-7.5c0-6.5-4-6.5-9-3.5zm-7 13c4 1 14 1 18 0',
};

export function Piece({ type, color, className }: PieceProps) {
  const fill = `var(--piece-${color === 'w' ? 'light' : 'dark'})`;
  const stroke = 'var(--piece-outline)';
  // The king is a stroked path (no fill area). Treat it differently for clarity.
  if (type === 'k') {
    return (
      <svg viewBox="0 0 45 45" className={className} aria-hidden focusable={false}>
        <g fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d={PATHS.k} fill={fill} />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 45 45" className={className} aria-hidden focusable={false}>
      <path
        d={PATHS[type]}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PIECE_NAMES: Record<PieceType, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

export function pieceLabel(p: { type: PieceType; color: Color }): string {
  return `${p.color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[p.type]}`;
}
