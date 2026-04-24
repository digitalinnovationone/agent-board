import type { Card as CardType, Agent } from '@agent-board/types';
import { AgentChip } from './AgentChip';

interface Props {
  card: CardType;
  agents: Record<string, Agent>;
  onClick: () => void;
}

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000 / 60;
  if (diff < 1) return 'just now';
  if (diff < 60) return `${Math.floor(diff)}m`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function Card({ card, agents, onClick }: Props) {
  const state = card.blocked ? 'blocked' : 'idle';

  return (
    <article className="card" data-state={state} onClick={onClick}>
      <div className="card-header">
        <span className="card-id">{card.id}</span>
        {card.blocked && (
          <span className="card-badge blocked">
            <span className="card-badge-dot" />
            BLOCKED
          </span>
        )}
      </div>

      <h3 className="card-title">{card.title}</h3>

      {card.blocked && card.blockReason && (
        <p className="card-block-reason">{card.blockReason}</p>
      )}

      <div className="card-footer">
        <div className="card-agent">
          {/* placeholder — owners shown in column header */}
        </div>
        <span className="card-time">{timeAgo(card.updatedAt)}</span>
      </div>
    </article>
  );
}
