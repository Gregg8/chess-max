import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Board } from './Board';
import { GameState } from '../game/gameState';

describe('Board (render + tap input)', () => {
  it('renders 64 grid cells and 32 pieces', () => {
    const g = new GameState();
    render(
      <Board
        snapshot={g.snapshot()}
        orientation="w"
        interactive
        animate={false}
        hint={null}
        onMove={() => {}}
      />,
    );
    const cells = screen.getAllByRole('gridcell');
    expect(cells.length).toBe(64);
    // Coordinates are present.
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('completes a tap-tap move on legal squares', async () => {
    const g = new GameState();
    const onMove = vi.fn();
    render(
      <Board
        snapshot={g.snapshot()}
        orientation="w"
        interactive
        animate={false}
        hint={null}
        onMove={onMove}
      />,
    );
    const user = userEvent.setup();
    const e2 = screen.getByRole('gridcell', { name: /^e2/ });
    const e4 = screen.getByRole('gridcell', { name: /^e4/ });
    await user.click(e2);
    await user.click(e4);
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0][0]).toBe('e2');
    expect(onMove.mock.calls[0][1]).toBe('e4');
  });

  it('does not move when interactive=false', async () => {
    const g = new GameState();
    const onMove = vi.fn();
    render(
      <Board
        snapshot={g.snapshot()}
        orientation="w"
        interactive={false}
        animate={false}
        hint={null}
        onMove={onMove}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('gridcell', { name: /^e2/ }));
    await user.click(screen.getByRole('gridcell', { name: /^e4/ }));
    expect(onMove).not.toHaveBeenCalled();
  });

  it('shows hint arrow when hint is provided', () => {
    const g = new GameState();
    render(
      <Board
        snapshot={g.snapshot()}
        orientation="w"
        interactive
        animate={false}
        hint={{ from: 'e2', to: 'e4' }}
        onMove={() => {}}
      />,
    );
    expect(document.querySelector('.hint-arrow')).not.toBeNull();
  });
});
