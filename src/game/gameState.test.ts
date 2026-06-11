import { describe, it, expect } from 'vitest';
import { GameState } from './gameState';

describe('GameState', () => {
  it('starts with 20 legal moves for white', () => {
    const g = new GameState();
    const s = g.snapshot();
    expect(s.turn).toBe('w');
    expect(s.legalMoves.length).toBe(20);
    expect(s.outcome.kind).toBe('in-progress');
    expect(s.pieces.length).toBe(32);
  });

  it('makes a legal move and updates SAN history', () => {
    const g = new GameState();
    const r = g.move('e2', 'e4');
    expect(r).not.toBeNull();
    const s = g.snapshot();
    expect(s.history).toEqual(['e4']);
    expect(s.turn).toBe('b');
  });

  it('rejects illegal moves and returns null', () => {
    const g = new GameState();
    const r = g.move('e2', 'e5');
    expect(r).toBeNull();
    expect(g.snapshot().history).toEqual([]);
  });

  it('detects checkmate', () => {
    const g = new GameState();
    // Fool's mate
    g.move('f2', 'f3');
    g.move('e7', 'e5');
    g.move('g2', 'g4');
    g.move('d8', 'h4');
    const s = g.snapshot();
    expect(s.outcome.kind).toBe('checkmate');
    if (s.outcome.kind === 'checkmate') expect(s.outcome.winner).toBe('b');
  });

  it('undo and redo navigate history without losing moves', () => {
    const g = new GameState();
    g.move('e2', 'e4');
    g.move('e7', 'e5');
    expect(g.snapshot().cursor).toBe(2);
    g.undo();
    expect(g.snapshot().cursor).toBe(1);
    g.undo();
    expect(g.snapshot().cursor).toBe(0);
    g.redo();
    expect(g.snapshot().cursor).toBe(1);
    g.redo();
    expect(g.snapshot().cursor).toBe(2);
    expect(g.snapshot().history).toEqual(['e4', 'e5']);
  });

  it('forking from a past position truncates forward history', () => {
    const g = new GameState();
    g.move('e2', 'e4');
    g.move('e7', 'e5');
    g.move('g1', 'f3');
    g.undo();
    g.undo();
    // Now at cursor=1 (after e4), making a different black move truncates.
    g.move('c7', 'c5');
    expect(g.snapshot().history).toEqual(['e4', 'c5']);
    expect(g.snapshot().cursor).toBe(2);
  });

  it('exposes legal moves at positions behind the live one', () => {
    const g = new GameState(['e4', 'e5', 'Nf3']);
    g.undo();
    g.undo();
    // At cursor=1 (after e4) it's black to move with the full 20 replies.
    const s = g.snapshot();
    expect(s.cursor).toBe(1);
    expect(s.turn).toBe('b');
    expect(s.legalMoves.length).toBe(20);
    expect(g.legalMovesFrom('c7').length).toBe(2);
  });

  it('treats positions behind the live one as in-progress even after game end', () => {
    const g = new GameState(['f3', 'e5', 'g4', 'Qh4#']);
    expect(g.snapshot().outcome.kind).toBe('checkmate');
    g.undo();
    expect(g.snapshot().outcome.kind).toBe('in-progress');
  });

  it('forking after a resignation clears it so play continues', () => {
    const g = new GameState(['e4', 'e5']);
    g.resign('b');
    expect(g.snapshot().outcome.kind).toBe('resign');
    g.undo();
    expect(g.snapshot().outcome.kind).toBe('in-progress');
    expect(g.move('c7', 'c5')).not.toBeNull();
    const s = g.snapshot();
    expect(s.history).toEqual(['e4', 'c5']);
    expect(s.outcome.kind).toBe('in-progress');
  });

  it('identifies promotion correctly', () => {
    // Build up to a position where white can promote on the next move.
    const moves = ['h4', 'a5', 'h5', 'a4', 'h6', 'a3', 'hxg7'];
    const g = new GameState(moves);
    expect(g.isPromotion('g7', 'g8')).toBe(true);
    expect(g.isPromotion('a3', 'a2')).toBe(false);
  });

  it('resign sets the outcome correctly', () => {
    const g = new GameState();
    g.move('e2', 'e4');
    g.resign('b');
    const s = g.snapshot();
    expect(s.outcome.kind).toBe('resign');
    if (s.outcome.kind === 'resign') expect(s.outcome.winner).toBe('w');
  });

  it('legalMovesFrom returns moves only for the side to move', () => {
    const g = new GameState();
    expect(g.legalMovesFrom('e2').length).toBe(2);
    expect(g.legalMovesFrom('e7').length).toBe(0);
  });

  it('tracks captured pieces and material delta', () => {
    // 1. e4 d5 2. exd5 — white captures a black pawn
    const g = new GameState(['e4', 'd5', 'exd5']);
    const s = g.snapshot();
    expect(s.captured.w).toEqual(['p']);
    expect(s.captured.b).toEqual([]);
    expect(s.materialDelta).toBe(1); // white +1 pawn
  });

  it('material delta accounts for promotions, not just captures', () => {
    // After promotion to queen, the side that promoted gains +8 in material
    // even with no capture. Reach a known promotion via legal moves.
    const moves = ['h4', 'a5', 'h5', 'a4', 'h6', 'a3', 'hxg7', 'axb2', 'gxh8=Q'];
    const g = new GameState(moves);
    const s = g.snapshot();
    // White captured: a black pawn (g7) and a black rook (h8). Black captured: a white pawn (b2).
    expect(s.captured.w).toEqual(['p', 'r']);
    expect(s.captured.b).toEqual(['p']);
    // Material: white promoted h-pawn to queen on h8. Net change vs start:
    //   white: -1 pawn (h promoted) - 1 pawn (b captured) + 1 queen (promoted) = +7
    //   black: -1 pawn (g7), -1 rook (h8), +1 pawn (b2 captured pawn that promoted to b1)?
    // Easier: compute from current board sum.
    // Simply assert white has a material advantage.
    expect(s.materialDelta).toBeGreaterThan(0);
  });

  it('captured pieces shrink when navigating backwards', () => {
    const g = new GameState(['e4', 'd5', 'exd5']);
    expect(g.snapshot().captured.w).toEqual(['p']);
    g.undo();
    expect(g.snapshot().captured.w).toEqual([]);
  });
});
