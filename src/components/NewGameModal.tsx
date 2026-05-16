import { useState } from 'react';
import type { GameMode, Side } from '../types';
import { DifficultySlider } from './DifficultySlider';

interface Props {
  initialMode: GameMode;
  initialSide: Side;
  initialDifficulty: number;
  initialEveWhite: number;
  initialEveBlack: number;
  onStart: (cfg: {
    mode: GameMode;
    side: Side;
    difficulty: number;
    eveWhite: number;
    eveBlack: number;
  }) => void;
  onCancel: () => void;
}

export function NewGameModal({
  initialMode,
  initialSide,
  initialDifficulty,
  initialEveWhite,
  initialEveBlack,
  onStart,
  onCancel,
}: Props) {
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [side, setSide] = useState<Side>(initialSide);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [eveWhite, setEveWhite] = useState(initialEveWhite);
  const [eveBlack, setEveBlack] = useState(initialEveBlack);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="newgame-title">
      <div className="modal">
        <h2 id="newgame-title">New game</h2>

        <div className="field">
          <label>Mode</label>
          <div className="row">
            <button
              aria-pressed={mode === 'human-vs-engine'}
              className={mode === 'human-vs-engine' ? 'primary' : ''}
              onClick={() => setMode('human-vs-engine')}
            >
              vs Stockfish
            </button>
            <button
              aria-pressed={mode === 'pass-and-play'}
              className={mode === 'pass-and-play' ? 'primary' : ''}
              onClick={() => setMode('pass-and-play')}
            >
              Pass &amp; play
            </button>
            <button
              aria-pressed={mode === 'engine-vs-engine'}
              className={mode === 'engine-vs-engine' ? 'primary' : ''}
              onClick={() => setMode('engine-vs-engine')}
            >
              Engine vs engine
            </button>
          </div>
        </div>

        {mode === 'human-vs-engine' && (
          <>
            <div className="field">
              <label>Your side</label>
              <div className="row">
                <button aria-pressed={side === 'w'} className={side === 'w' ? 'primary' : ''} onClick={() => setSide('w')}>White</button>
                <button aria-pressed={side === 'b'} className={side === 'b' ? 'primary' : ''} onClick={() => setSide('b')}>Black</button>
                <button aria-pressed={side === 'random'} className={side === 'random' ? 'primary' : ''} onClick={() => setSide('random')}>Random</button>
              </div>
            </div>
            <div className="field">
              <label htmlFor="diff">Difficulty</label>
              <DifficultySlider id="diff" value={difficulty} onChange={setDifficulty} />
            </div>
          </>
        )}

        {mode === 'engine-vs-engine' && (
          <>
            <div className="field">
              <label>White (Stockfish)</label>
              <DifficultySlider value={eveWhite} onChange={setEveWhite} />
            </div>
            <div className="field">
              <label>Black (Stockfish)</label>
              <DifficultySlider value={eveBlack} onChange={setEveBlack} />
            </div>
          </>
        )}

        <div className="actions">
          <button onClick={onCancel}>Cancel</button>
          <button
            className="primary"
            onClick={() =>
              onStart({
                mode,
                side: mode === 'human-vs-engine' ? side : 'w',
                difficulty,
                eveWhite,
                eveBlack,
              })
            }
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
