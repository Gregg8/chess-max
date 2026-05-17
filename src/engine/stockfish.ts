// Thin wrapper around a Stockfish.wasm Worker. Handles UCI line-protocol
// command sequencing and exposes typed promises for "best move at this skill"
// and "evaluate this position" queries.

export interface MoveRequest {
  fen: string;
  skillLevel: number; // 0-20
  movetimeMs: number;
}

export interface BestMove {
  uci: string; // e.g. "e2e4" or "e7e8q"
  from: string;
  to: string;
  promotion?: string;
}

export interface EvalResult {
  // Centipawns from White's perspective. Positive = White ahead.
  cp: number | null;
  // Mate distance in plies from White's perspective. Positive = White mates;
  // negative = Black mates. Null when no forced mate detected.
  mate: number | null;
}

type Resolver<T> = (v: T) => void;

interface PendingMove {
  kind: 'move';
  resolve: Resolver<BestMove>;
  reject: (e: Error) => void;
}

interface PendingEval {
  kind: 'eval';
  fenTurn: 'w' | 'b'; // side-to-move at the evaluated position
  latestCp: number | null;
  latestMate: number | null;
  resolve: Resolver<EvalResult>;
  reject: (e: Error) => void;
}

type Pending = PendingMove | PendingEval;

const SKILL_MOVETIME: Array<[number, number]> = [
  [5, 200],
  [10, 500],
  [15, 1000],
  [20, 2000],
];

export function movetimeForDifficulty(d: number): number {
  for (const [bucket, ms] of SKILL_MOVETIME) {
    if (d <= bucket) return ms;
  }
  return 2000;
}

const STOCKFISH_URL = `${import.meta.env.BASE_URL}stockfish/stockfish-nnue-16-single.js`;

export class StockfishEngine {
  private worker: Worker | null = null;
  private ready = false;
  private readyPromise: Promise<void>;
  private pending: Pending | null = null;
  private destroyed = false;

  constructor() {
    this.readyPromise = this.init();
  }

  private init(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(STOCKFISH_URL);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
        return;
      }
      this.worker.onmessage = (ev: MessageEvent<string>) => this.onMessage(ev.data, resolve);
      this.worker.onerror = (ev) => {
        reject(new Error(`Stockfish worker error: ${ev.message}`));
      };
      this.worker.postMessage('uci');
    });
  }

  private onMessage(line: string, resolveReady?: () => void): void {
    if (typeof line !== 'string') return;
    if (line === 'uciok') {
      this.worker?.postMessage('isready');
      return;
    }
    if (line === 'readyok' && !this.ready) {
      this.ready = true;
      resolveReady?.();
      return;
    }
    // Parse info ... score cp X | score mate N — only when waiting on an eval.
    if (line.startsWith('info ') && this.pending?.kind === 'eval') {
      const cpMatch = line.match(/\bscore cp (-?\d+)/);
      const mateMatch = line.match(/\bscore mate (-?\d+)/);
      if (mateMatch) {
        const fromTurn = parseInt(mateMatch[1], 10);
        this.pending.latestMate = this.pending.fenTurn === 'w' ? fromTurn : -fromTurn;
        this.pending.latestCp = null;
      } else if (cpMatch) {
        const fromTurn = parseInt(cpMatch[1], 10);
        this.pending.latestCp = this.pending.fenTurn === 'w' ? fromTurn : -fromTurn;
        this.pending.latestMate = null;
      }
      return;
    }
    if (line.startsWith('bestmove')) {
      const parts = line.split(/\s+/);
      const uci = parts[1];
      const p = this.pending;
      this.pending = null;
      if (!p) return;
      if (p.kind === 'eval') {
        p.resolve({ cp: p.latestCp, mate: p.latestMate });
        return;
      }
      // move
      if (!uci || uci === '(none)') {
        p.reject(new Error('no legal move'));
        return;
      }
      p.resolve({
        uci,
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
      });
    }
  }

  async whenReady(): Promise<void> {
    await this.readyPromise;
  }

  private supersede(): void {
    if (this.pending) {
      this.pending.reject(new Error('superseded'));
      this.pending = null;
    }
  }

  async bestMove(req: MoveRequest): Promise<BestMove> {
    if (this.destroyed) throw new Error('engine destroyed');
    await this.readyPromise;
    if (!this.worker) throw new Error('engine not initialized');
    this.supersede();
    return new Promise<BestMove>((resolve, reject) => {
      this.pending = { kind: 'move', resolve, reject };
      this.worker!.postMessage(`setoption name Skill Level value ${Math.max(0, Math.min(20, req.skillLevel))}`);
      this.worker!.postMessage(`position fen ${req.fen}`);
      this.worker!.postMessage(`go movetime ${req.movetimeMs}`);
    });
  }

  // Evaluate position. Runs at full strength (Skill Level 20) at fixed depth.
  // Returns { cp, mate } from White's perspective.
  async evaluate(fen: string, depth = 12): Promise<EvalResult> {
    if (this.destroyed) throw new Error('engine destroyed');
    await this.readyPromise;
    if (!this.worker) throw new Error('engine not initialized');
    this.supersede();
    const fenTurn: 'w' | 'b' = fen.split(' ')[1] === 'b' ? 'b' : 'w';
    return new Promise<EvalResult>((resolve, reject) => {
      this.pending = { kind: 'eval', fenTurn, latestCp: null, latestMate: null, resolve, reject };
      this.worker!.postMessage('setoption name Skill Level value 20');
      this.worker!.postMessage(`position fen ${fen}`);
      this.worker!.postMessage(`go depth ${depth}`);
    });
  }

  // Stop any in-flight search. Doesn't kill the worker.
  stop(): void {
    this.worker?.postMessage('stop');
    this.supersede();
  }

  destroy(): void {
    this.destroyed = true;
    this.stop();
    this.worker?.terminate();
    this.worker = null;
  }
}
