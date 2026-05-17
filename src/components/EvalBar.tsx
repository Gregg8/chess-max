import type { Orientation } from './Board';

interface Props {
  // Centipawns from white's perspective. null = unknown.
  cp: number | null;
  // Forced-mate distance from white's perspective. null = none.
  mate: number | null;
  orientation: Orientation;
}

// Lichess-style sigmoid mapping centipawns to win-probability for the side
// to move. https://lichess.org/page/accuracy
function cpToWhiteWinPercent(cp: number): number {
  const clamped = Math.max(-1500, Math.min(1500, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

function ariaLabel(cp: number | null, mate: number | null): string {
  if (mate != null) {
    if (mate === 0) return 'checkmate';
    return mate > 0 ? `white mates in ${mate}` : `black mates in ${-mate}`;
  }
  if (cp == null) return 'unknown';
  const pawns = (cp / 100).toFixed(1);
  return cp >= 0 ? `white plus ${pawns}` : `black plus ${(-cp / 100).toFixed(1)}`;
}

export function EvalBar({ cp, mate, orientation }: Props) {
  let whitePercent: number;
  if (mate != null) {
    whitePercent = mate > 0 ? 100 : 0;
  } else if (cp != null) {
    whitePercent = cpToWhiteWinPercent(cp);
  } else {
    whitePercent = 50;
  }

  // White fills from the white-side end of the bar. orientation='w' means
  // white is at the bottom of the board, so white fills from the bottom up.
  const dir = orientation === 'w' ? 'to top' : 'to bottom';
  const style: React.CSSProperties = {
    background: `linear-gradient(${dir}, var(--eval-white) 0%, var(--eval-white) ${whitePercent}%, var(--eval-black) ${whitePercent}%, var(--eval-black) 100%)`,
  };

  return (
    <div
      className="eval-bar"
      style={style}
      role="img"
      aria-label={`Evaluation: ${ariaLabel(cp, mate)}`}
    />
  );
}
