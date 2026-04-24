import { COLUMNS } from '@agent-board/types';
import type { Card, Agent } from '@agent-board/types';
import { Column } from './Column';

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

  return (
    <div className="board-area">
      <div className="board-inner">
        {COLUMNS.map((col) => (
          <Column
            key={col}
            column={col}
            cards={cardsByColumn[col]}
            agents={agents}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
}
