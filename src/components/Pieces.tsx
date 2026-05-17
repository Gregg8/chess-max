// Cburnett chess piece set. Pieces are static SVG files served from
// /pieces/cburnett/ (see public/pieces/cburnett/CREDITS.txt). Standard
// white/black coloring with strong outlines — looks correct on all themes.

import type { Color, PieceType } from '../types';

interface PieceProps {
  type: PieceType;
  color: Color;
  className?: string;
}

const PIECE_NAMES: Record<PieceType, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

function pieceFile(type: PieceType, color: Color): string {
  const c = color === 'w' ? 'w' : 'b';
  const t = type.toUpperCase();
  return `${import.meta.env.BASE_URL}pieces/cburnett/${c}${t}.svg`;
}

export function Piece({ type, color, className }: PieceProps) {
  return (
    <img
      src={pieceFile(type, color)}
      alt=""
      className={className}
      draggable={false}
      aria-hidden
    />
  );
}

export function pieceLabel(p: { type: PieceType; color: Color }): string {
  return `${p.color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[p.type]}`;
}
