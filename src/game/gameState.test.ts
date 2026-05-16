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
});
