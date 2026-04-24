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
}

export function Column({ column, cards, agents, onCardClick }: Props) {
  const cap = WIP_CAPS[column];
  const count = cards.length;
  const over = count > cap && cap < 999;

  const owners = Object.values(agents).filter((a) => a.ownsColumn === column);

  return (
    <div className="column">
      <div className="column-header">
        <div className="column-header-left">
          <span className="column-title">{column}</span>
          <span className="column-count">{count}</span>
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
            <AgentChip key={a.id} glyph={a.glyph} hue={a.hue} size={20} />
          ))}
          <span className="column-owner-name">
            {owners.map((a) => a.name).join(' + ')}
          </span>
        </div>
      )}

      <div className="column-body">
        {cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            agents={agents}
            onClick={() => onCardClick(card.id)}
          />
        ))}
      </div>
    </div>
  );
}
