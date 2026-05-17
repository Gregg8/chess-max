import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Color, GameMode, PieceType, SavedGame, Settings, Side, SquareName } from './types';
import { GameState, type GameSnapshot } from './game/gameState';
import { StockfishEngine, movetimeForDifficulty } from './engine/stockfish';
import { applyTheme } from './themes/themes';
import {
  clearGame,
  debounce,
  loadGame,
  loadSettings,
  saveGame,
  saveSettings,
} from './storage/persist';
import { play, setSoundEnabled } from './sound/sound';
import { Board, type Orientation } from './components/Board';
import { Sidebar } from './components/Sidebar';
import { NewGameModal } from './components/NewGameModal';
import { SettingsPanel } from './components/SettingsPanel';
import { EndGameBanner } from './components/EndGameBanner';
import { CapturedStrip } from './components/CapturedStrip';
import { EvalBar } from './components/EvalBar';

interface SessionState {
  mode: GameMode;
  humanSide: Color; // meaningful for human-vs-engine; arbitrary for pass-and-play
}

const SPEED_DELAY_MS: Record<Settings['eveSpeed'], number> = {
  fast: 50,
  normal: 700,
  slow: 1800,
};

export function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [session, setSession] = useState<SessionState>(() => {
    const saved = loadGame();
    if (saved) return { mode: saved.mode, humanSide: saved.humanSide };
    return {
      mode: settings.defaultMode,
      humanSide: settings.defaultSide === 'random' ? randomSide() : settings.defaultSide,
    };
  });

  const gameRef = useRef<GameState>(null!);
  if (gameRef.current === null) {
    const saved = loadGame();
    gameRef.current = saved
      ? new GameState(saved.history, saved.cursor)
      : new GameState();
  }

  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => gameRef.current.snapshot());
  const [hint, setHint] = useState<{ from: SquareName; to: SquareName } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [newGameOpen, setNewGameOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [evePlaying, setEvePlaying] = useState(false);
  const [evaluation, setEvaluation] = useState<{ cp: number | null; mate: number | null } | null>(null);

  const engineRef = useRef<StockfishEngine | null>(null);

  const refresh = useCallback(() => {
    setSnapshot(gameRef.current.snapshot());
  }, []);

  // Lazy engine init.
  const getEngine = useCallback(async (): Promise<StockfishEngine> => {
    if (!engineRef.current) {
      engineRef.current = new StockfishEngine();
    }
    await engineRef.current.whenReady();
    return engineRef.current;
  }, []);

  // Apply theme + sound settings on change.
  useEffect(() => {
    applyTheme(settings.theme);
    setSoundEnabled(settings.soundOn);
  }, [settings.theme, settings.soundOn]);

  // Persist settings.
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Persist game state (debounced).
  const debouncedSave = useMemo(
    () =>
      debounce<[SavedGame]>((g) => {
        saveGame(g);
      }, 200),
    [],
  );
  useEffect(() => {
    const g: SavedGame = {
      v: 1,
      mode: session.mode,
      humanSide: session.humanSide,
      history: snapshot.history,
      cursor: snapshot.cursor,
      outcome: snapshot.outcome,
      createdAt: Date.now(),
    };
    debouncedSave(g);
  }, [snapshot, session, debouncedSave]);

  // Cleanup engine on unmount.
  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  // Play sound for the most recent move.
  const lastSoundedCursor = useRef(snapshot.cursor);
  useEffect(() => {
    if (snapshot.cursor === lastSoundedCursor.current) return;
    // Only play sound when moving forward into new territory or after a fresh move.
    if (snapshot.cursor > lastSoundedCursor.current) {
      const lastSan = snapshot.history[snapshot.cursor - 1] ?? '';
      if (snapshot.outcome.kind === 'checkmate' || snapshot.outcome.kind === 'stalemate' || snapshot.outcome.kind.startsWith('draw')) {
        play('gameEnd');
      } else if (lastSan.includes('+') || lastSan.includes('#')) {
        play('check');
      } else if (lastSan.includes('=')) {
        play('promote');
      } else if (lastSan === 'O-O' || lastSan === 'O-O-O') {
        play('castle');
      } else if (lastSan.includes('x')) {
        play('capture');
      } else {
        play('move');
      }
    }
    lastSoundedCursor.current = snapshot.cursor;
  }, [snapshot.cursor, snapshot.history, snapshot.outcome.kind]);

  // Reset the dismissed banner state whenever a new game starts.
  useEffect(() => {
    if (snapshot.outcome.kind === 'in-progress') setBannerDismissed(false);
  }, [snapshot.outcome.kind]);

  // The orientation the board is shown in.
  const orientation: Orientation = useMemo(() => {
    if (session.mode === 'human-vs-engine') return session.humanSide;
    if (session.mode === 'pass-and-play') {
      if (settings.passPlayOrientation === 'auto-flip') return snapshot.turn;
      return 'w';
    }
    return 'w';
  }, [session.mode, session.humanSide, settings.passPlayOrientation, snapshot.turn]);

  // Whether the player can interact with the board.
  const interactive = useMemo(() => {
    if (snapshot.outcome.kind !== 'in-progress') return false;
    if (!gameRef.current.isLive()) return false;
    if (session.mode === 'engine-vs-engine') return false;
    if (session.mode === 'pass-and-play') return true;
    // human-vs-engine: only on user's turn
    return snapshot.turn === session.humanSide && !thinking;
  }, [snapshot, session, thinking]);

  // Ask the engine to move when it's the engine's turn.
  const requestEngineMove = useCallback(
    async (skillLevel: number) => {
      if (!gameRef.current.isLive()) return;
      if (snapshot.outcome.kind !== 'in-progress') return;
      const fenAtRequest = snapshot.fen;
      setThinking(true);
      try {
        const engine = await getEngine();
        const move = await engine.bestMove({
          fen: fenAtRequest,
          skillLevel,
          movetimeMs: movetimeForDifficulty(skillLevel),
        });
        // The game may have changed (user clicked new game, undid, etc).
        // Only apply if the current live FEN still matches.
        if (gameRef.current.snapshot().fen !== fenAtRequest) return;
        gameRef.current.move(
          move.from as SquareName,
          move.to as SquareName,
          move.promotion as PieceType | undefined,
        );
        setHint(null);
        refresh();
      } catch {
        // superseded / stopped / no legal — ignore
      } finally {
        setThinking(false);
      }
    },
    [snapshot.fen, snapshot.outcome.kind, getEngine, refresh],
  );

  // Trigger engine moves for human-vs-engine when it's engine's turn.
  useEffect(() => {
    if (session.mode !== 'human-vs-engine') return;
    if (snapshot.outcome.kind !== 'in-progress') return;
    if (!gameRef.current.isLive()) return;
    if (snapshot.turn === session.humanSide) return;
    if (thinking) return;
    const id = setTimeout(() => requestEngineMove(settings.difficulty), 100);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.turn, snapshot.outcome.kind, session.mode, session.humanSide, settings.difficulty]);

  // Engine-vs-engine driver loop.
  useEffect(() => {
    if (session.mode !== 'engine-vs-engine') return;
    if (!evePlaying) return;
    if (snapshot.outcome.kind !== 'in-progress') return;
    if (!gameRef.current.isLive()) return;
    if (thinking) return;
    const skill = snapshot.turn === 'w' ? settings.eveWhiteDifficulty : settings.eveBlackDifficulty;
    const id = setTimeout(() => requestEngineMove(skill), SPEED_DELAY_MS[settings.eveSpeed]);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    snapshot.turn,
    snapshot.outcome.kind,
    session.mode,
    evePlaying,
    settings.eveWhiteDifficulty,
    settings.eveBlackDifficulty,
    settings.eveSpeed,
  ]);

  // Stop EvE when game ends.
  useEffect(() => {
    if (snapshot.outcome.kind !== 'in-progress') setEvePlaying(false);
  }, [snapshot.outcome.kind]);

  // Evaluation bar: query Stockfish at full strength after each settled position.
  useEffect(() => {
    if (!settings.evalBarOn) return;
    if (!gameRef.current.isLive()) return;
    if (thinking) return;
    // In HvE: skip while it's the engine's turn — the engine query takes priority.
    if (session.mode === 'human-vs-engine' && snapshot.turn !== session.humanSide) return;
    // In EvE: only eval when paused, to avoid contending with the play-loop.
    if (session.mode === 'engine-vs-engine' && evePlaying) return;
    if (snapshot.outcome.kind !== 'in-progress') return;
    let cancelled = false;
    const fenAtRequest = snapshot.fen;
    (async () => {
      try {
        const engine = await getEngine();
        const r = await engine.evaluate(fenAtRequest, 12);
        if (cancelled) return;
        if (gameRef.current.snapshot().fen !== fenAtRequest) return;
        setEvaluation({ cp: r.cp, mate: r.mate });
      } catch {
        // superseded or destroyed — ignore
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.fen, snapshot.outcome.kind, thinking, settings.evalBarOn, session.mode, session.humanSide, evePlaying]);

  const onMove = useCallback(
    (from: SquareName, to: SquareName, promotion?: PieceType) => {
      const result = gameRef.current.move(from, to, promotion);
      if (!result) {
        play('illegal');
        return;
      }
      setHint(null);
      refresh();
    },
    [refresh],
  );

  const onUndo = useCallback(() => {
    // In human-vs-engine, undo both the engine's reply AND the user's move
    // so the user is back on move.
    if (session.mode === 'human-vs-engine') {
      gameRef.current.undo();
      if (gameRef.current.snapshot().turn !== session.humanSide) {
        gameRef.current.undo();
      }
    } else {
      gameRef.current.undo();
    }
    setHint(null);
    refresh();
  }, [session.mode, session.humanSide, refresh]);

  const onRedo = useCallback(() => {
    gameRef.current.redo();
    if (session.mode === 'human-vs-engine' && gameRef.current.snapshot().turn !== session.humanSide) {
      gameRef.current.redo();
    }
    setHint(null);
    refresh();
  }, [session.mode, session.humanSide, refresh]);

  const onHint = useCallback(async () => {
    if (snapshot.outcome.kind !== 'in-progress' || !gameRef.current.isLive()) return;
    try {
      const engine = await getEngine();
      // Ask at full strength for a meaningful hint.
      const move = await engine.bestMove({
        fen: snapshot.fen,
        skillLevel: 20,
        movetimeMs: 800,
      });
      setHint({ from: move.from as SquareName, to: move.to as SquareName });
    } catch {
      // ignore
    }
  }, [snapshot.fen, snapshot.outcome.kind, getEngine]);

  const onResign = useCallback(() => {
    if (snapshot.outcome.kind !== 'in-progress') return;
    if (session.mode === 'engine-vs-engine') return;
    const resigningSide: Color =
      session.mode === 'human-vs-engine' ? session.humanSide : snapshot.turn;
    gameRef.current.resign(resigningSide);
    refresh();
  }, [snapshot.outcome.kind, snapshot.turn, session, refresh]);

  const onJumpTo = useCallback(
    (index: number) => {
      gameRef.current.seekTo(index);
      setHint(null);
      refresh();
    },
    [refresh],
  );

  const startNewGame = useCallback(
    (cfg: { mode: GameMode; side: Side; difficulty: number; eveWhite: number; eveBlack: number }) => {
      const resolvedSide: Color = cfg.side === 'random' ? randomSide() : cfg.side;
      gameRef.current = new GameState();
      engineRef.current?.stop();
      clearGame();
      setSession({ mode: cfg.mode, humanSide: resolvedSide });
      setSettings((s) => ({
        ...s,
        defaultMode: cfg.mode,
        defaultSide: cfg.side,
        difficulty: cfg.difficulty,
        eveWhiteDifficulty: cfg.eveWhite,
        eveBlackDifficulty: cfg.eveBlack,
      }));
      setHint(null);
      setBannerDismissed(false);
      setEvePlaying(cfg.mode === 'engine-vs-engine');
      setNewGameOpen(false);
      setEvaluation(null);
      lastSoundedCursor.current = 0;
      refresh();
    },
    [refresh],
  );

  const canUndo = snapshot.cursor > 0;
  const canRedo = snapshot.cursor < snapshot.history.length;
  const canHint =
    snapshot.outcome.kind === 'in-progress' &&
    gameRef.current.isLive() &&
    session.mode !== 'engine-vs-engine' &&
    !thinking;

  const bannerVisible =
    snapshot.outcome.kind !== 'in-progress' &&
    !bannerDismissed &&
    gameRef.current.isLive();

  return (
    <div className="app">
      <header className="app-header">
        <h1>chess-max</h1>
        <div className="controls">
          <button onClick={() => setNewGameOpen(true)}>New game</button>
          {session.mode === 'engine-vs-engine' && snapshot.outcome.kind === 'in-progress' && (
            <button
              onClick={() => setEvePlaying((p) => !p)}
              className={evePlaying ? '' : 'primary'}
            >
              {evePlaying ? 'Pause' : 'Resume'}
            </button>
          )}
          <button onClick={() => setSettingsOpen(true)} aria-label="Settings">⚙</button>
        </div>
      </header>

      <div className="board-column" style={{ position: 'relative' }}>
        {(() => {
          const topSide: Color = orientation === 'w' ? 'b' : 'w';
          const bottomSide: Color = orientation;
          const topRaw = topSide === 'w' ? snapshot.materialDelta : -snapshot.materialDelta;
          const bottomRaw = bottomSide === 'w' ? snapshot.materialDelta : -snapshot.materialDelta;
          return (
            <>
              <CapturedStrip
                pieces={snapshot.captured[topSide]}
                capturedColor={bottomSide}
                advantage={Math.max(0, topRaw)}
              />
              <div className="board-and-eval">
                {settings.evalBarOn && (
                  <EvalBar
                    cp={evaluation?.cp ?? null}
                    mate={evaluation?.mate ?? null}
                    orientation={orientation}
                  />
                )}
                <Board
                  snapshot={snapshot}
                  orientation={orientation}
                  interactive={interactive}
                  animate={settings.animationOn}
                  hint={hint}
                  onMove={onMove}
                  onIllegal={() => play('illegal')}
                />
              </div>
              <CapturedStrip
                pieces={snapshot.captured[bottomSide]}
                capturedColor={topSide}
                advantage={Math.max(0, bottomRaw)}
              />
            </>
          );
        })()}
        {bannerVisible && (
          <EndGameBanner
            outcome={snapshot.outcome}
            onNewGame={() => setNewGameOpen(true)}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}
      </div>

      <Sidebar
        snapshot={snapshot}
        mode={session.mode}
        thinking={thinking}
        canUndo={canUndo}
        canRedo={canRedo}
        canHint={canHint}
        onUndo={onUndo}
        onRedo={onRedo}
        onHint={onHint}
        onResign={onResign}
        onJumpTo={onJumpTo}
      />

      {newGameOpen && (
        <NewGameModal
          initialMode={session.mode}
          initialSide={settings.defaultSide}
          initialDifficulty={settings.difficulty}
          initialEveWhite={settings.eveWhiteDifficulty}
          initialEveBlack={settings.eveBlackDifficulty}
          onStart={startNewGame}
          onCancel={() => setNewGameOpen(false)}
        />
      )}
      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function randomSide(): Color {
  return Math.random() < 0.5 ? 'w' : 'b';
}
