import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the engine module before importing App so the App picks up our fake.
const bestMoveMock = vi.fn();

vi.mock('../engine/stockfish', () => {
  const moves = [
    'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6',
    'd2d3', 'f8c5', 'c1e3', 'd7d6', 'b1c3', 'c8g4',
  ];
  let i = 0;
  class FakeEngine {
    whenReady() {
      return Promise.resolve();
    }
    bestMove() {
      const uci = moves[i++ % moves.length];
      const move = {
        uci,
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
      };
      bestMoveMock(move);
      // Resolve via a macrotask, mimicking the worker round-trip more realistically.
      return new Promise<typeof move>((resolve) => setTimeout(() => resolve(move), 5));
    }
    stop() {}
    destroy() {}
  }
  return {
    StockfishEngine: FakeEngine,
    movetimeForDifficulty: () => 0,
  };
});

import { App } from '../App';

describe('engine-vs-engine driver', () => {
  beforeEach(() => {
    localStorage.clear();
    bestMoveMock.mockClear();
  });

  it('keeps making moves at fast speed', async () => {
    // Pre-seed settings to fast so we don't have to drive the settings panel.
    localStorage.setItem(
      'chess-max:settings:v1',
      JSON.stringify({ eveSpeed: 'fast' }),
    );

    const user = userEvent.setup();
    render(<App />);

    // Open New Game modal and pick EvE.
    await user.click(screen.getByRole('button', { name: /new game/i }));
    await user.click(screen.getByRole('button', { name: /engine vs engine/i }));
    await user.click(screen.getByRole('button', { name: /^start$/i }));

    // Fast delay is 50ms per move; in 1500ms we should see many moves.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1500));
    });

    expect(bestMoveMock.mock.calls.length).toBeGreaterThanOrEqual(5);
  });
});
