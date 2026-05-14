import type { Card as CardType, Agent } from '@agent-board/types';
import { AgentChip } from './AgentChip';

interface Props {
  card: CardType;
  agents: Record<string, Agent>;
  workingAgentId?: string;
  onClick: () => void;
  backlogRank?: number;
  isFirst?: boolean;
  onStart?: () => void;
}

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000 / 60;
  if (diff < 1) return 'just now';
  if (diff < 60) return `${Math.floor(diff)}m`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function Card({ card, agents, workingAgentId, onClick, backlogRank, isFirst, onStart }: Props) {
  const isLive = Boolean(workingAgentId);
  const state = card.blocked ? 'blocked' : isLive ? 'live' : 'idle';
  const worker = workingAgentId ? agents[workingAgentId] : null;
  const isBacklog = backlogRank !== undefined;

  return (
    <article className="card" data-state={state} onClick={onClick} style={card.hidden ? { opacity: 0.45 } : undefined}>
      <div className="card-header">
        <span className="card-id">{card.id}</span>
        {isBacklog && <span className="card-rank">#{backlogRank}</span>}
        {isLive && !card.blocked && (
          <span className="card-badge live">
            <span className="card-badge-dot" />
            LIVE
          </span>
        )}
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

      {isFirst && onStart && (
        <div className="card-backlog-controls" onClick={(e) => e.stopPropagation()}>
          <button className="backlog-btn start" onClick={onStart} title="Start development">Start</button>
        </div>
      )}

      <div className="card-footer">
        <div className="card-agent">
          {worker && <AgentChip glyph={worker.glyph} hue={worker.hue} avatar={worker.avatar} size={18} />}
          {worker && <span style={{ fontSize: 'var(--g-text-sm)', color: 'var(--g-color-text-3)' }}>{worker.name}</span>}
        </div>
        <span className="card-time">{timeAgo(card.updatedAt)}</span>
      </div>
    </article>
  );
}
