// Thin wrapper around a Stockfish.wasm Worker. Handles UCI line-protocol
// command sequencing and exposes typed promises for "best move at this skill"
// queries.

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

type Resolver = (m: BestMove) => void;

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
  private pending: Resolver | null = null;
  private rejectPending: ((err: Error) => void) | null = null;
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
    if (line.startsWith('bestmove')) {
      const parts = line.split(/\s+/);
      const uci = parts[1];
      if (!uci || uci === '(none)') {
        this.rejectPending?.(new Error('no legal move'));
        this.pending = null;
        this.rejectPending = null;
        return;
      }
      const move: BestMove = {
        uci,
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
      };
      const resolver = this.pending;
      this.pending = null;
      this.rejectPending = null;
      resolver?.(move);
    }
  }

  async whenReady(): Promise<void> {
    await this.readyPromise;
  }

  async bestMove(req: MoveRequest): Promise<BestMove> {
    if (this.destroyed) throw new Error('engine destroyed');
    await this.readyPromise;
    if (!this.worker) throw new Error('engine not initialized');
    // If a previous query is in flight, cancel it. Caller is expected to
    // coordinate so this is rare; we just bail the old promise.
    if (this.rejectPending) {
      this.rejectPending(new Error('superseded'));
      this.pending = null;
      this.rejectPending = null;
    }
    return new Promise<BestMove>((resolve, reject) => {
      this.pending = resolve;
      this.rejectPending = reject;
      this.worker!.postMessage(`setoption name Skill Level value ${Math.max(0, Math.min(20, req.skillLevel))}`);
      this.worker!.postMessage(`position fen ${req.fen}`);
      this.worker!.postMessage(`go movetime ${req.movetimeMs}`);
    });
  }

  // Stop any in-flight search. Doesn't kill the worker.
  stop(): void {
    this.worker?.postMessage('stop');
    if (this.rejectPending) {
      this.rejectPending(new Error('stopped'));
      this.pending = null;
      this.rejectPending = null;
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.stop();
    this.worker?.terminate();
    this.worker = null;
  }
}
