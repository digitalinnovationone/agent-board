import { useEffect, useCallback, useState } from 'react';
import diomeLogo from './assets/diome-white.png';
import { useAppStore } from './lib/store';
import { api } from './lib/api';
import { ws } from './lib/ws';
import { Board } from './components/Board';
import { AgentsRail } from './components/AgentsRail';
import { ActivityLog } from './components/ActivityLog';
import { StatusBar } from './components/StatusBar';
import { NewCardModal } from './components/NewCardModal';
import { NewAgentModal } from './components/NewAgentModal';
import { OfficeView } from './components/OfficeView';
import { CardDetailDrawer } from './components/CardDetailDrawer';
import { AgentDetailModal } from './components/AgentDetailModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const { state, dispatch, applyWsEvent } = useAppStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showOffice, setShowOffice] = useState(false);

  // Bootstrap data from REST on mount
  useEffect(() => {
    async function bootstrap() {
      try {
        const [status, agents, cards, config] = await Promise.all([
          api.status(),
          api.agents.list(),
          api.cards.list(),
          api.config.get(),
        ]);
        dispatch({ type: 'SET_STATUS', payload: status });
        dispatch({ type: 'SET_AGENTS', agents });
        dispatch({ type: 'SET_CARDS', cards });
        dispatch({ type: 'SET_WORK_DIR', workDir: config.workDir });
      } catch {
        // server may not be up yet
      }
    }
    bootstrap();
  }, [dispatch]);

  // WebSocket
  useEffect(() => {
    ws.onStatus((connected) => {
      dispatch({ type: 'SET_WS_CONNECTED', connected });
      if (connected) {
        Promise.all([api.status(), api.agents.list(), api.cards.list(), api.config.get()])
          .then(([status, agents, cards, config]) => {
            dispatch({ type: 'SET_STATUS', payload: status });
            dispatch({ type: 'SET_AGENTS', agents });
            dispatch({ type: 'SET_CARDS', cards });
            dispatch({ type: 'SET_WORK_DIR', workDir: config.workDir });
          })
          .catch(() => {});
      }
    });

    const unsub = ws.subscribe(applyWsEvent);
    ws.connect();
    return () => { unsub(); };
  }, [dispatch, applyWsEvent]);

  // Esc key to close modals/drawer
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (state.uiOpenCardId) dispatch({ type: 'CLOSE_CARD' });
        else if (state.uiOpenAgentId) dispatch({ type: 'CLOSE_AGENT' });
        else if (state.uiOpenModal) dispatch({ type: 'CLOSE_MODAL' });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.uiOpenCardId, state.uiOpenAgentId, state.uiOpenModal, dispatch]);

  const agents = Object.values(state.agents);

  return (
    <div className="app-shell">
      {/* Top bar */}
      <header className="app-topbar">
        <img src={diomeLogo} alt="DIO" style={{ height: 20, width: 'auto' }} />
        <span className="app-topbar-title">Agent Board</span>
        <span className="app-topbar-sep">/</span>
        <span className="app-topbar-breadcrumb">{showOffice ? 'Office' : 'Kanban'}</span>
        <div className="app-topbar-actions">
          <button
            className="btn"
            style={{ background: showOffice ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
            onClick={() => setShowOffice(v => !v)}
            title="Office view"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="5" width="14" height="10" rx="1" />
              <path d="M5 15V10h6v5" />
              <path d="M1 9h14" />
              <path d="M5 5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            Office
          </button>
          <button
            className="btn"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
            onClick={() => dispatch({ type: 'OPEN_MODAL', modal: 'new-card' })}
          >
            + New card
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="app-body">
        <AgentsRail
          agents={agents}
          collapsed={!state.panels.agentsOpen}
          onToggle={() => dispatch({ type: 'TOGGLE_AGENTS_RAIL' })}
          onNewAgent={() => dispatch({ type: 'OPEN_MODAL', modal: 'new-agent' })}
          onAgentClick={(id) => dispatch({ type: 'OPEN_AGENT', id })}
        />

        {showOffice ? (
          <OfficeView agents={state.agents} />
        ) : (
          <Board
            cards={state.cards}
            agents={state.agents}
            onCardClick={(id) => dispatch({ type: 'OPEN_CARD', id })}
          />
        )}

        <ActivityLog
          collapsed={!state.panels.logOpen}
          onToggle={() => dispatch({ type: 'TOGGLE_LOG_RAIL' })}
        />
      </div>

      {/* Status bar */}
      <StatusBar
        status={state.status}
        wsState={state.wsState}
        workDir={state.workDir}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      {/* Overlays */}
      {state.uiOpenModal === 'new-card' && (
        <NewCardModal onClose={() => dispatch({ type: 'CLOSE_MODAL' })} />
      )}
      {state.uiOpenModal === 'new-agent' && (
        <NewAgentModal onClose={() => dispatch({ type: 'CLOSE_MODAL' })} />
      )}
      {state.uiOpenCardId && (
        <CardDetailDrawer
          cardId={state.uiOpenCardId}
          agents={state.agents}
          onClose={() => dispatch({ type: 'CLOSE_CARD' })}
        />
      )}
      {state.uiOpenAgentId && (
        <AgentDetailModal
          agentId={state.uiOpenAgentId}
          agents={state.agents}
          onClose={() => dispatch({ type: 'CLOSE_AGENT' })}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          workDir={state.workDir}
          onSave={(workDir) => dispatch({ type: 'SET_WORK_DIR', workDir })}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
