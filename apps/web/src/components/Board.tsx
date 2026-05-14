import type { Card, Agent, ColumnDef } from '@agent-board/types';
import { Column } from './Column';
import { api } from '../lib/api';

interface Props {
  columns: ColumnDef[];
  cards: Record<string, Card>;
  agents: Record<string, Agent>;
  showHidden: boolean;
  onCardClick: (id: string) => void;
}

export function Board({ columns, cards, agents, showHidden, onCardClick }: Props) {
  const visibleCards = Object.values(cards).filter((c) => showHidden || !c.hidden);

  const cardsByColumn = Object.fromEntries(
    columns.map((col) => [
      col.name,
      visibleCards.filter((c) => c.column === col.name),
    ])
  );

  const sortedBacklog = [...(cardsByColumn['Backlog'] ?? [])].sort(
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
        {columns.map((col) => (
          <Column
            key={col.name}
            column={col.name}
            wipCap={col.wipCap}
            cards={col.name === 'Backlog' ? sortedBacklog : (cardsByColumn[col.name] ?? [])}
            agents={agents}
            onCardClick={onCardClick}
            onReorder={col.name === 'Backlog' ? handleReorder : undefined}
            onStart={col.name === 'Backlog' ? handleStart : undefined}
          />
        ))}
      </div>
    </div>
  );
}
