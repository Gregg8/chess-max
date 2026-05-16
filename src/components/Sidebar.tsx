import { useEffect, useRef } from 'react';
import type { GameMode } from '../types';
import type { GameSnapshot } from '../game/gameState';

interface SidebarProps {
  snapshot: GameSnapshot;
  mode: GameMode;
  thinking: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canHint: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onHint: () => void;
  onResign: () => void;
  onJumpTo: (index: number) => void;
}

function statusText(snapshot: GameSnapshot, mode: GameMode, thinking: boolean): string {
  if (snapshot.outcome.kind !== 'in-progress') return 'Game over';
  if (thinking) return 'Stockfish thinking…';
  const side = snapshot.turn === 'w' ? 'White' : 'Black';
  if (snapshot.inCheck) return `${side} to move — check`;
  if (mode === 'engine-vs-engine') return `${side} (engine)`;
  return `${side} to move`;
}

export function Sidebar({
  snapshot,
  mode,
  thinking,
  canUndo,
  canRedo,
  canHint,
  onUndo,
  onRedo,
  onHint,
  onResign,
  onJumpTo,
}: SidebarProps) {
  const liveRegionRef = useRef<HTMLDivElement>(null);
  // Announce the most recent move to screen readers.
  useEffect(() => {
    const lr = liveRegionRef.current;
    if (!lr) return;
    const last = snapshot.history[snapshot.cursor - 1];
    if (last) lr.textContent = `${snapshot.turn === 'w' ? 'Black' : 'White'} played ${last}`;
  }, [snapshot.cursor, snapshot.history, snapshot.turn]);

  const moveRows: { num: number; w?: string; b?: string }[] = [];
  for (let i = 0; i < snapshot.history.length; i += 2) {
    moveRows.push({
      num: Math.floor(i / 2) + 1,
      w: snapshot.history[i],
      b: snapshot.history[i + 1],
    });
  }

  return (
    <div className="sidebar">
      <div className="panel status">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {snapshot.outcome.kind === 'in-progress' && (
            <span className={`turn-dot ${snapshot.turn}`} aria-hidden />
          )}
          {statusText(snapshot, mode, thinking)}
        </span>
        {thinking && <span className="sr-only">Engine is thinking</span>}
      </div>

      <div className="panel">
        <div className="controls-row">
          <button onClick={onUndo} disabled={!canUndo} aria-label="Undo">↶ Undo</button>
          <button onClick={onRedo} disabled={!canRedo} aria-label="Redo">↷ Redo</button>
          <button onClick={onHint} disabled={!canHint} aria-label="Show hint">💡 Hint</button>
          <button onClick={onResign} className="danger" disabled={snapshot.outcome.kind !== 'in-progress' || mode === 'engine-vs-engine'} aria-label="Resign">Resign</button>
        </div>
      </div>

      <div className="panel">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Moves
        </div>
        <div className="move-list" role="log" aria-label="Move history">
          {moveRows.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: 4 }}>
              No moves yet.
            </div>
          )}
          {moveRows.map((row, idx) => {
            const wIdx = idx * 2;
            const bIdx = idx * 2 + 1;
            return (
              <div className="move-row" key={row.num}>
                <span className="num">{row.num}.</span>
                {row.w && (
                  <button
                    className={`move-cell${snapshot.cursor === wIdx + 1 ? ' current' : ''}`}
                    onClick={() => onJumpTo(wIdx + 1)}
                  >
                    {row.w}
                  </button>
                )}
                {row.b && (
                  <button
                    className={`move-cell${snapshot.cursor === bIdx + 1 ? ' current' : ''}`}
                    onClick={() => onJumpTo(bIdx + 1)}
                  >
                    {row.b}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="sr-only" aria-live="polite" ref={liveRegionRef} />
    </div>
  );
}
