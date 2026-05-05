import { useState } from 'react';
import type { Column as ColumnType, Card as CardType, Agent } from '@agent-board/types';
import { Card } from './Card';
import { AgentChip } from './AgentChip';

const WIP_CAPS: Record<ColumnType, number> = {
  Backlog: 10,
  Specification: 2,
  Development: 2,
  Testing: 2,
  Deploy: 2,
  Done: 999,
};

interface Props {
  column: ColumnType;
  cards: CardType[];
  agents: Record<string, Agent>;
  onCardClick: (id: string) => void;
  onReorder?: (ids: string[]) => void;
  onStart?: (id: string) => void;
}

export function Column({ column, cards, agents, onCardClick, onReorder, onStart }: Props) {
  const cap = WIP_CAPS[column];
  const count = cards.length;
  const over = count > cap && cap < 999;
  const isBacklog = onReorder !== undefined;

  const owners = Object.values(agents).filter((a) => a.ownsColumn === column);
  const workingAgents = Object.values(agents).filter((a) => a.status === 'working');

  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  function handleDragStart(idx: number) {
    setDraggingIdx(idx);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, idx: number) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const insertBefore = e.clientY < rect.top + rect.height / 2;
    setDropIdx(insertBefore ? idx : idx + 1);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (draggingIdx === null || dropIdx === null || !onReorder) {
      setDraggingIdx(null);
      setDropIdx(null);
      return;
    }
    // No-op if dropped in same position
    if (dropIdx === draggingIdx || dropIdx === draggingIdx + 1) {
      setDraggingIdx(null);
      setDropIdx(null);
      return;
    }
    const ids = cards.map((c) => c.id);
    const [removed] = ids.splice(draggingIdx, 1);
    const insertAt = dropIdx > draggingIdx ? dropIdx - 1 : dropIdx;
    ids.splice(insertAt, 0, removed);
    onReorder(ids);
    setDraggingIdx(null);
    setDropIdx(null);
  }

  function handleDragEnd() {
    setDraggingIdx(null);
    setDropIdx(null);
  }

  return (
    <div className="column">
      <div className="column-header">
        <div className="column-header-left">
          <span className="column-title">{column}</span>
          {count > 0 && <span className="column-count">{count}</span>}
        </div>
        {cap < 999 && (
          <span className={`wip-badge${over ? ' over' : ''}`}>
            {over ? 'OVER' : `WIP ${count}/${cap}`}
          </span>
        )}
      </div>

      {owners.length > 0 && (
        <div className="column-owner">
          {owners.map((a) => (
            <AgentChip key={a.id} glyph={a.glyph} hue={a.hue} avatar={a.avatar} size={18} />
          ))}
          <span className="column-owner-name">
            {owners.map((a) => a.name).join(' + ')}
          </span>
        </div>
      )}

      <div
        className="column-body"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {cards.map((card, idx) => {
          const worker = workingAgents.find((a) => a.cardId === card.id);
          return (
            <div
              key={card.id}
              draggable={isBacklog}
              className={`backlog-card-wrap${draggingIdx === idx ? ' dragging' : ''}`}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
            >
              {isBacklog && dropIdx === idx && <div className="drop-indicator" />}
              <Card
                card={card}
                agents={agents}
                workingAgentId={worker?.id}
                onClick={() => onCardClick(card.id)}
                backlogRank={isBacklog ? idx + 1 : undefined}
                isFirst={isBacklog && idx === 0}
                onStart={onStart ? () => onStart(card.id) : undefined}
              />
            </div>
          );
        })}
        {isBacklog && dropIdx === cards.length && <div className="drop-indicator" />}
      </div>
    </div>
  );
}
