import type { Agent } from '@agent-board/types';
import { AgentChip } from './AgentChip';

interface Props {
  agents: Agent[];
  collapsed: boolean;
  onToggle: () => void;
  onNewAgent: () => void;
  onAgentClick: (id: string) => void;
}

export function AgentsRail({ agents, collapsed, onToggle, onNewAgent, onAgentClick }: Props) {
  return (
    <aside className={`agents-rail${collapsed ? ' collapsed' : ''}`}>
      <div className="agents-rail-header">
        {!collapsed && (
          <>
            <span>
              <span className="agents-rail-label">Agents</span>
              <span className="agents-rail-count">{agents.length}</span>
            </span>
          </>
        )}
        <button className="icon-btn" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          <svg className="chevron" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {collapsed
              ? <polyline points="5,3 9,7 5,11" />
              : <polyline points="9,3 5,7 9,11" />}
          </svg>
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="agents-rail-body">
            {agents.length === 0 ? (
              <p className="agents-rail-empty">No agents yet.<br />Add one to start the pipeline.</p>
            ) : (
              agents.map((agent) => (
                <AgentRow key={agent.id} agent={agent} onClick={() => onAgentClick(agent.id)} />
              ))
            )}
          </div>

          <div className="agents-rail-footer">
            <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={onNewAgent}>
              + New agent
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

function AgentRow({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const isWorking = agent.status === 'working';
  return (
    <div className="agent-row" onClick={onClick} style={{ cursor: 'pointer' }} title={agent.name}>
      <AgentChip glyph={agent.glyph} hue={agent.hue} avatar={agent.avatar} size={28} />
      <div className="agent-row-info">
        <div className="agent-row-name">{agent.name}</div>
        <div className="agent-row-role">{agent.role}</div>
      </div>
      <div className={`agent-row-status${isWorking ? '' : ' idle'}`}>
        {isWorking && (
          <>
            <span className="agent-status-dot" />
            <span>live</span>
          </>
        )}
        {!isWorking && (
          <span style={{ width: 14, height: 14 }} />
        )}
      </div>
    </div>
  );
}
