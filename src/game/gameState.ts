import { Chess, type Move, type Square as ChessJsSquare } from 'chess.js';
import type { Color, Outcome, PieceOnSquare, PieceType, SquareName } from '../types';

// Wraps chess.js with the navigation model we want: a single linear move
// history with a cursor. Jumping backwards is read-only; making a move
// while behind the live position truncates history from the cursor forward.

export interface GameSnapshot {
  fen: string;
  turn: Color;
  history: string[]; // SAN
  cursor: number; // 0..history.length; equals history.length at live position
  pieces: PieceOnSquare[];
  legalMoves: Move[];
  lastMove: { from: SquareName; to: SquareName } | null;
  inCheck: boolean;
  outcome: Outcome;
}

export class GameState {
  private chess: Chess;
  private fullHistory: string[] = [];
  private cursor = 0;
  private resigned: Color | null = null;

  constructor(history: string[] = [], cursor?: number, resigned: Color | null = null) {
    this.chess = new Chess();
    for (const san of history) {
      this.chess.move(san);
    }
    this.fullHistory = [...history];
    this.cursor = cursor ?? history.length;
    this.resigned = resigned;
    this.seekTo(this.cursor);
  }

  static fromSan(history: string[]): GameState {
    return new GameState(history);
  }

  snapshot(): GameSnapshot {
    const pieces: PieceOnSquare[] = [];
    const board = this.chess.board();
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const cell = board[rank][file];
        if (cell) {
          const fileChar = 'abcdefgh'[file];
          const rankChar = `${8 - rank}`;
          pieces.push({
            type: cell.type as PieceType,
            color: cell.color as Color,
            square: `${fileChar}${rankChar}` as SquareName,
          });
        }
      }
    }
    const recentMove = this.chess.history({ verbose: true }).at(-1) as Move | undefined;
    return {
      fen: this.chess.fen(),
      turn: this.chess.turn() as Color,
      history: [...this.fullHistory],
      cursor: this.cursor,
      pieces,
      legalMoves: this.cursor === this.fullHistory.length ? this.chess.moves({ verbose: true }) : [],
      lastMove: recentMove
        ? { from: recentMove.from as SquareName, to: recentMove.to as SquareName }
        : null,
      inCheck: this.chess.inCheck(),
      outcome: this.computeOutcome(),
    };
  }

  private computeOutcome(): Outcome {
    if (this.resigned) {
      return { kind: 'resign', winner: this.resigned === 'w' ? 'b' : 'w' };
    }
    if (this.cursor !== this.fullHistory.length) return { kind: 'in-progress' };
    if (this.chess.isCheckmate()) {
      return { kind: 'checkmate', winner: this.chess.turn() === 'w' ? 'b' : 'w' };
    }
    if (this.chess.isStalemate()) return { kind: 'stalemate' };
    if (this.chess.isInsufficientMaterial()) return { kind: 'draw-insufficient' };
    if (this.chess.isThreefoldRepetition()) return { kind: 'draw-threefold' };
    // chess.js v1 beta exposes "halfmove clock >= 100" via isDraw + 50-move rule
    // detection on isDraw. Best-effort: if it's a draw but none of the above, call it 50-move.
    if (this.chess.isDraw()) return { kind: 'draw-50-move' };
    return { kind: 'in-progress' };
  }

  legalMovesFrom(square: SquareName): Move[] {
    if (this.cursor !== this.fullHistory.length) return [];
    return this.chess.moves({ square: square as ChessJsSquare, verbose: true });
  }

  // Returns the move if successful; null if illegal.
  move(from: SquareName, to: SquareName, promotion?: PieceType): Move | null {
    if (this.cursor !== this.fullHistory.length) {
      // Truncate forward history on fork: cursor becomes live.
      this.fullHistory = this.fullHistory.slice(0, this.cursor);
    }
    try {
      const result = this.chess.move({ from, to, promotion });
      if (!result) return null;
      this.fullHistory.push(result.san);
      this.cursor = this.fullHistory.length;
      return result;
    } catch {
      return null;
    }
  }

  // Read-only navigation.
  seekTo(index: number): void {
    const target = Math.max(0, Math.min(index, this.fullHistory.length));
    this.chess.reset();
    for (let i = 0; i < target; i++) {
      this.chess.move(this.fullHistory[i]);
    }
    this.cursor = target;
  }

  undo(): boolean {
    if (this.cursor === 0) return false;
    this.seekTo(this.cursor - 1);
    return true;
  }

  redo(): boolean {
    if (this.cursor >= this.fullHistory.length) return false;
    this.seekTo(this.cursor + 1);
    return true;
  }

  resign(side: Color): void {
    if (this.snapshot().outcome.kind !== 'in-progress') return;
    this.resigned = side;
  }

  isLive(): boolean {
    return this.cursor === this.fullHistory.length;
  }

  isPromotion(from: SquareName, to: SquareName): boolean {
    if (!this.isLive()) return false;
    const piece = this.chess.get(from as ChessJsSquare);
    if (!piece || piece.type !== 'p') return false;
    const toRank = parseInt(to[1], 10);
    return (piece.color === 'w' && toRank === 8) || (piece.color === 'b' && toRank === 1);
  }
}
