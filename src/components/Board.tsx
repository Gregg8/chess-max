import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Color, PieceType, SquareName } from '../types';
import type { GameSnapshot } from '../game/gameState';
import { Piece, pieceLabel } from './Pieces';

export type Orientation = 'w' | 'b';

interface HintMove {
  from: SquareName;
  to: SquareName;
}

interface BoardProps {
  snapshot: GameSnapshot;
  orientation: Orientation;
  interactive: boolean;
  animate: boolean;
  hint: HintMove | null;
  onMove: (from: SquareName, to: SquareName, promotion?: PieceType) => void;
  onIllegal?: () => void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

function squareName(file: number, rank: number): SquareName {
  return `${FILES[file]}${rank}` as SquareName;
}

function squareColor(file: number, rank: number): 'light' | 'dark' {
  return (file + rank) % 2 === 0 ? 'dark' : 'light';
}

// Maps a square to its grid row/col given orientation.
function squareToCell(square: SquareName, orientation: Orientation): { row: number; col: number } {
  const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rank = parseInt(square[1], 10);
  if (orientation === 'w') {
    return { row: 8 - rank, col: file };
  }
  return { row: rank - 1, col: 7 - file };
}

export function Board({
  snapshot,
  orientation,
  interactive,
  animate,
  hint,
  onMove,
  onIllegal,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<SquareName | null>(null);
  const [dragging, setDragging] = useState<{ square: SquareName; x: number; y: number } | null>(null);
  // Tracks a possible drag (pointerdown happened on a piece) that hasn't yet
  // exceeded the movement threshold. If pointerup happens before threshold,
  // it's treated as a tap and the click handler runs normally.
  const dragCandidateRef = useRef<{
    square: SquareName;
    startX: number;
    startY: number;
    pointerId: number;
  } | null>(null);
  // Set to true once a drag has been "promoted" from candidate to active.
  // Used to suppress the subsequent click event (which would re-trigger
  // tap-tap logic with stale state).
  const suppressNextClickRef = useRef(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: SquareName; to: SquareName; color: Color } | null>(null);
  // Cache previous piece positions for slide animation.
  const prevPiecesRef = useRef<Map<string, SquareName>>(new Map());
  const animTargetsRef = useRef<Map<string, { fromCell: { row: number; col: number } }>>(new Map());

  const DRAG_THRESHOLD = 5;

  // Build legal destinations per source square once per snapshot.
  const legalByFrom = useMemo(() => {
    const map = new Map<SquareName, Map<SquareName, { capture: boolean; promotion?: PieceType }>>();
    for (const m of snapshot.legalMoves) {
      const from = m.from as SquareName;
      const to = m.to as SquareName;
      if (!map.has(from)) map.set(from, new Map());
      const isCapture = (m.flags ?? '').includes('c') || (m.flags ?? '').includes('e');
      map.get(from)!.set(to, { capture: isCapture, promotion: m.promotion as PieceType | undefined });
    }
    return map;
  }, [snapshot.legalMoves]);

  // Pre-render: compute animation deltas for moved pieces.
  useLayoutEffect(() => {
    const next = new Map<string, SquareName>();
    const newAnim = new Map<string, { fromCell: { row: number; col: number } }>();

    // Determine the moved-from square (lastMove.from) to drive piece-tracking.
    const lastMove = snapshot.lastMove;

    for (const p of snapshot.pieces) {
      const id = `${p.color}${p.type}`;
      const key = `${id}@${p.square}`;
      next.set(key, p.square);
    }

    if (animate && lastMove) {
      // Find any piece on lastMove.to and animate it sliding from lastMove.from.
      const movedPiece = snapshot.pieces.find((p) => p.square === lastMove.to);
      if (movedPiece) {
        const key = `${movedPiece.color}${movedPiece.type}@${movedPiece.square}`;
        newAnim.set(key, { fromCell: squareToCell(lastMove.from, orientation) });
      }
    }

    prevPiecesRef.current = next;
    animTargetsRef.current = newAnim;
  }, [snapshot, orientation, animate]);

  // Global pointer tracking for drag candidates and active drags.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const cand = dragCandidateRef.current;
      if (!cand || cand.pointerId !== e.pointerId) return;
      const dx = e.clientX - cand.startX;
      const dy = e.clientY - cand.startY;
      if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        // Promote candidate to active drag.
        setDragging({ square: cand.square, x: e.clientX, y: e.clientY });
        suppressNextClickRef.current = true;
        // Selection is cleared on drag start — drag dictates the move.
        setSelected(null);
      } else if (dragging) {
        setDragging({ square: cand.square, x: e.clientX, y: e.clientY });
      }
    };
    const onUp = (e: PointerEvent) => {
      const cand = dragCandidateRef.current;
      const wasDragging = dragging !== null;
      dragCandidateRef.current = null;
      if (!wasDragging) {
        // Tap path — the click handler on the square will run.
        return;
      }
      setDragging(null);
      const board = boardRef.current;
      if (!board || !cand) return;
      const target = squareAtPoint(board, e.clientX, e.clientY, orientation);
      if (target && target !== cand.square) {
        attemptMove(cand.square, target);
      } else {
        // Dropped on origin: leave as if no action; do NOT auto-select
        // (the user dragged + released without choosing a destination).
      }
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, orientation]);

  const attemptMove = useCallback(
    (from: SquareName, to: SquareName) => {
      const dests = legalByFrom.get(from);
      const dest = dests?.get(to);
      if (!dest) {
        onIllegal?.();
        setSelected(null);
        return;
      }
      if (dest.promotion) {
        const color: Color = from[1] === '7' ? 'w' : 'b';
        setPendingPromotion({ from, to, color });
        setSelected(null);
        return;
      }
      setSelected(null);
      onMove(from, to);
    },
    [legalByFrom, onMove, onIllegal],
  );

  const onSquarePointerDown = (square: SquareName, e: React.PointerEvent) => {
    if (!interactive || pendingPromotion) return;
    const piece = snapshot.pieces.find((p) => p.square === square);
    // Set up a drag candidate ONLY if there's a piece on this square
    // belonging to the side to move. The click handler does the tap-tap work.
    if (piece && piece.color === snapshot.turn) {
      dragCandidateRef.current = {
        square,
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
      };
    }
  };

  const onSquareClick = (square: SquareName) => {
    if (!interactive || pendingPromotion) return;
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    const piece = snapshot.pieces.find((p) => p.square === square);
    if (selected) {
      if (square === selected) {
        setSelected(null);
        return;
      }
      const dests = legalByFrom.get(selected);
      if (dests?.has(square)) {
        attemptMove(selected, square);
        return;
      }
      if (piece && piece.color === snapshot.turn) {
        setSelected(square);
        return;
      }
      setSelected(null);
      return;
    }
    if (piece && piece.color === snapshot.turn) {
      setSelected(square);
    }
  };

  const onSquareKeyDown = (square: SquareName, e: React.KeyboardEvent) => {
    if (!interactive || pendingPromotion) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const piece = snapshot.pieces.find((p) => p.square === square);
      if (selected) {
        const dests = legalByFrom.get(selected);
        if (square === selected) {
          setSelected(null);
        } else if (dests?.has(square)) {
          attemptMove(selected, square);
        } else if (piece && piece.color === snapshot.turn) {
          setSelected(square);
        } else {
          setSelected(null);
        }
      } else if (piece && piece.color === snapshot.turn) {
        setSelected(square);
      }
      return;
    }
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const focusables = boardRef.current?.querySelectorAll<HTMLDivElement>('[role="gridcell"]');
      if (!focusables) return;
      const cur = Array.from(focusables).findIndex((el) => el.dataset.square === square);
      if (cur < 0) return;
      const row = Math.floor(cur / 8);
      const col = cur % 8;
      const dRow = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      const dCol = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      const nRow = Math.max(0, Math.min(7, row + dRow));
      const nCol = Math.max(0, Math.min(7, col + dCol));
      focusables[nRow * 8 + nCol]?.focus();
    }
  };

  const selectedLegalDests = selected ? legalByFrom.get(selected) ?? new Map() : new Map();

  // Determine king-in-check square for visual indication.
  const checkSquare = useMemo(() => {
    if (!snapshot.inCheck) return null;
    const king = snapshot.pieces.find((p) => p.type === 'k' && p.color === snapshot.turn);
    return king?.square ?? null;
  }, [snapshot]);

  const cells = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const file = orientation === 'w' ? col : 7 - col;
      const rank = orientation === 'w' ? 8 - row : row + 1;
      const sq = squareName(file, rank);
      const piece = snapshot.pieces.find((p) => p.square === sq);
      const isLastMove =
        snapshot.lastMove &&
        (snapshot.lastMove.from === sq || snapshot.lastMove.to === sq);
      const isSelected = selected === sq;
      const isInCheck = checkSquare === sq;
      const dest = selectedLegalDests.get(sq);

      const pieceIsDragging = dragging && dragging.square === sq;
      const animFrom = animTargetsRef.current.get(`${piece?.color}${piece?.type}@${sq}`);

      let pieceStyle: React.CSSProperties = {};
      let pieceClass = 'piece';
      if (pieceIsDragging && boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        const sqSize = rect.width / 8;
        const localX = dragging.x - rect.left - sqSize / 2;
        const localY = dragging.y - rect.top - sqSize / 2;
        const cell = squareToCell(sq, orientation);
        const dx = localX - cell.col * sqSize;
        const dy = localY - cell.row * sqSize;
        pieceStyle = { transform: `translate(${dx}px, ${dy}px) scale(1.08)` };
        pieceClass += ' dragging';
      } else if (animate && animFrom) {
        const target = { row, col };
        const dRow = animFrom.fromCell.row - target.row;
        const dCol = animFrom.fromCell.col - target.col;
        // Two-step CSS animation: render at origin offset, then transition to 0.
        pieceStyle = {
          transform: `translate(${dCol * 100}%, ${dRow * 100}%)`,
          animation: 'piece-slide-in 0.14s ease-out forwards',
        } as React.CSSProperties;
        pieceClass += ' animating';
      }

      cells.push(
        <div
          key={`${row}-${col}`}
          className={`square ${squareColor(file, rank)}${isLastMove ? ' last-move' : ''}${isSelected ? ' selected' : ''}${isInCheck ? ' in-check' : ''}`}
          data-square={sq}
          role="gridcell"
          tabIndex={interactive ? 0 : -1}
          aria-label={`${sq}${piece ? `, ${pieceLabel(piece)}` : ', empty'}${dest ? ', legal move' : ''}`}
          onPointerDown={(e) => onSquarePointerDown(sq, e)}
          onClick={() => onSquareClick(sq)}
          onKeyDown={(e) => onSquareKeyDown(sq, e)}
        >
          {col === 0 && <span className="coord rank">{rank}</span>}
          {row === 7 && <span className="coord file">{FILES[file]}</span>}
          {piece && (
            <span className={pieceClass} style={pieceStyle}>
              <Piece type={piece.type} color={piece.color} />
            </span>
          )}
          {dest && <span className={`legal-dot${dest.capture ? ' capture' : ''}`} />}
        </div>,
      );
    }
  }

  // Hint arrow overlay.
  const hintArrow = hint
    ? renderArrow(hint.from, hint.to, orientation)
    : null;

  return (
    <div className="board-wrap" aria-label="Chess board" role="application">
      <div
        className="board"
        ref={boardRef}
        role="grid"
        aria-rowcount={8}
        aria-colcount={8}
      >
        {cells}
        {hintArrow}
      </div>
      {pendingPromotion && (
        <PromotionPicker
          square={pendingPromotion.to}
          color={pendingPromotion.color}
          orientation={orientation}
          onPick={(promo) => {
            const { from, to } = pendingPromotion;
            setPendingPromotion(null);
            onMove(from, to, promo);
          }}
          onCancel={() => setPendingPromotion(null)}
        />
      )}
      <style>{`
        @keyframes piece-slide-in {
          to { transform: translate(0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .piece.animating { animation: none !important; transform: none !important; }
        }
      `}</style>
    </div>
  );
}

function squareAtPoint(
  board: HTMLDivElement,
  x: number,
  y: number,
  orientation: Orientation,
): SquareName | null {
  const rect = board.getBoundingClientRect();
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
  const col = Math.floor(((x - rect.left) / rect.width) * 8);
  const row = Math.floor(((y - rect.top) / rect.height) * 8);
  const file = orientation === 'w' ? col : 7 - col;
  const rank = orientation === 'w' ? 8 - row : row + 1;
  if (file < 0 || file > 7 || rank < 1 || rank > 8) return null;
  return squareName(file, rank);
}

interface PromoProps {
  square: SquareName;
  color: Color;
  orientation: Orientation;
  onPick: (p: PieceType) => void;
  onCancel: () => void;
}

function PromotionPicker({ square, color, orientation, onPick, onCancel }: PromoProps) {
  const cell = squareToCell(square, orientation);
  const sqPct = 12.5; // 100 / 8
  // Position: column at `cell.col * 12.5%`, top either from the cell down (if
  // the promoting piece is at the top row of the visible board) or from the
  // cell up (if at the bottom). We'll place the popup so the chosen piece
  // appears at the destination square.
  const popupBelow = cell.row === 0; // promoting at top of view → popup goes below
  const top = popupBelow ? `${cell.row * sqPct}%` : `${(cell.row - 3) * sqPct}%`;
  const left = `${cell.col * sqPct}%`;
  const flipped = !popupBelow; // when promoting at bottom, Queen should still be at the destination

  // Order: Queen first (nearest to square), then R, B, N.
  const order: PieceType[] = flipped ? ['n', 'b', 'r', 'q'] : ['q', 'r', 'b', 'n'];

  // Close on escape / outside click.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className={`promo-popup${flipped ? ' flipped' : ''}`}
      style={{ top, left, width: `${sqPct}%`, height: `${sqPct * 4}%` }}
      role="dialog"
      aria-label="Promote pawn"
    >
      {order.map((p) => (
        <button
          key={p}
          onClick={() => onPick(p)}
          aria-label={`Promote to ${pieceLabel({ type: p, color })}`}
        >
          <Piece type={p} color={color} />
        </button>
      ))}
    </div>
  );
}

function renderArrow(from: SquareName, to: SquareName, orientation: Orientation) {
  const f = squareToCell(from, orientation);
  const t = squareToCell(to, orientation);
  const sq = 12.5;
  const x1 = (f.col + 0.5) * sq;
  const y1 = (f.row + 0.5) * sq;
  const x2 = (t.col + 0.5) * sq;
  const y2 = (t.row + 0.5) * sq;
  // Shorten arrow so the head lands inside the destination square.
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const back = 2.5;
  const sx = x1 + (dx / len) * back;
  const sy = y1 + (dy / len) * back;
  const ex = x2 - (dx / len) * back;
  const ey = y2 - (dy / len) * back;
  return (
    <svg
      className="hint-arrow"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4 z" fill="var(--hint)" />
        </marker>
      </defs>
      <line
        x1={sx}
        y1={sy}
        x2={ex}
        y2={ey}
        stroke="var(--hint)"
        strokeWidth="2"
        strokeLinecap="round"
        markerEnd="url(#arrowhead)"
        opacity="0.9"
      />
    </svg>
  );
}
