import { COLUMNS } from '@agent-board/types';
import type { Card, Agent } from '@agent-board/types';
import { Column } from './Column';
import { api } from '../lib/api';

interface Props {
  cards: Record<string, Card>;
  agents: Record<string, Agent>;
  onCardClick: (id: string) => void;
}

export function Board({ cards, agents, onCardClick }: Props) {
  const cardsByColumn = Object.fromEntries(
    COLUMNS.map((col) => [
      col,
      Object.values(cards).filter((c) => c.column === col),
    ])
  );

  const sortedBacklog = [...cardsByColumn['Backlog']].sort(
    (a, b) => (a.backlogPosition ?? 999) - (b.backlogPosition ?? 999)
  );

  async function handleReorder(ids: string[]) {
    await api.cards.reorderBacklog(ids);
  }

  async function handleStart(cardId: string) {
    await api.cards.start(cardId);
  }

  return (
    <div className="board-area">
      <div className="board-inner">
        {COLUMNS.map((col) => (
          <Column
            key={col}
            column={col}
            cards={col === 'Backlog' ? sortedBacklog : cardsByColumn[col]}
            agents={agents}
            onCardClick={onCardClick}
            onReorder={col === 'Backlog' ? handleReorder : undefined}
            onStart={col === 'Backlog' ? handleStart : undefined}
          />
        ))}
      </div>
    </div>
  );
}
