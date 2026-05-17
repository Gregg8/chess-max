import type { Color, PieceType } from '../types';
import { Piece } from './Pieces';

interface Props {
  // Pieces captured by the side this strip belongs to.
  pieces: PieceType[];
  // The COLOR of those captured pieces (i.e., the opposing color).
  // This is what we render — captured-by-white = black pieces.
  capturedColor: Color;
  // Material advantage to display next to this strip (only if positive).
  advantage: number;
}

const VALUE_ORDER: PieceType[] = ['q', 'r', 'b', 'n', 'p'];

export function CapturedStrip({ pieces, capturedColor, advantage }: Props) {
  const sorted = [...pieces].sort(
    (a, b) => VALUE_ORDER.indexOf(a) - VALUE_ORDER.indexOf(b),
  );
  return (
    <div
      className="captured-strip"
      aria-label={`Pieces captured (${capturedColor === 'w' ? 'white' : 'black'}): ${sorted.length}`}
    >
      <div className="captured-pieces">
        {sorted.map((t, i) => (
          <span key={i} className="captured-piece">
            <Piece type={t} color={capturedColor} />
          </span>
        ))}
      </div>
      {advantage > 0 && (
        <span className="material-badge" aria-label={`Material advantage plus ${advantage}`}>
          +{advantage}
        </span>
      )}
    </div>
  );
}
