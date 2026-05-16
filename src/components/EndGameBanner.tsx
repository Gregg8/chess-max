import type { Outcome } from '../types';

interface Props {
  outcome: Outcome;
  onNewGame: () => void;
  onDismiss: () => void;
}

function headline(o: Outcome): { title: string; reason: string } | null {
  switch (o.kind) {
    case 'checkmate':
      return {
        title: 'Checkmate',
        reason: `${o.winner === 'w' ? 'White' : 'Black'} wins`,
      };
    case 'stalemate':
      return { title: 'Draw', reason: 'Stalemate' };
    case 'draw-50-move':
      return { title: 'Draw', reason: '50-move rule' };
    case 'draw-threefold':
      return { title: 'Draw', reason: 'Threefold repetition' };
    case 'draw-insufficient':
      return { title: 'Draw', reason: 'Insufficient material' };
    case 'resign':
      return {
        title: `${o.winner === 'w' ? 'White' : 'Black'} wins`,
        reason: `${o.winner === 'w' ? 'Black' : 'White'} resigned`,
      };
    default:
      return null;
  }
}

export function EndGameBanner({ outcome, onNewGame, onDismiss }: Props) {
  const h = headline(outcome);
  if (!h) return null;
  return (
    <div className="banner" role="alert">
      <div className="headline">{h.title}</div>
      <div className="reason">{h.reason}</div>
      <div className="actions">
        <button onClick={onDismiss}>Review</button>
        <button className="primary" onClick={onNewGame}>New game</button>
      </div>
    </div>
  );
}
