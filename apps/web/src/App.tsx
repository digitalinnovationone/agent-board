import { useEffect, useCallback } from 'react';
import { useAppStore } from './lib/store';
import { api } from './lib/api';
import { ws } from './lib/ws';
import { Board } from './components/Board';
import { AgentsRail } from './components/AgentsRail';
import { ActivityLog } from './components/ActivityLog';
import { StatusBar } from './components/StatusBar';
import { NewCardModal } from './components/NewCardModal';
import { NewAgentModal } from './components/NewAgentModal';
import { CardDetailDrawer } from './components/CardDetailDrawer';

export default function App() {
  const { state, dispatch, applyWsEvent } = useAppStore();

  // Bootstrap data from REST on mount
  useEffect(() => {
    async function bootstrap() {
      try {
        const [status, agents, cards] = await Promise.all([
          api.status(),
          api.agents.list(),
          api.cards.list(),
        ]);
        dispatch({ type: 'SET_STATUS', payload: status });
        dispatch({ type: 'SET_AGENTS', agents });
        dispatch({ type: 'SET_CARDS', cards });
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
        // Refresh data on reconnect
        Promise.all([api.status(), api.agents.list(), api.cards.list()])
          .then(([status, agents, cards]) => {
            dispatch({ type: 'SET_STATUS', payload: status });
            dispatch({ type: 'SET_AGENTS', agents });
            dispatch({ type: 'SET_CARDS', cards });
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
        else if (state.uiOpenModal) dispatch({ type: 'CLOSE_MODAL' });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.uiOpenCardId, state.uiOpenModal, dispatch]);

  const agents = Object.values(state.agents);

  return (
    <div className="app-shell">
      {/* Top bar */}
      <header className="app-topbar">
        <div className="app-logo">
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="16" height="16" rx="3" fill="#18181b" />
            <path d="M4 8h8M8 4v8" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="app-topbar-title">Agent Board</span>
        <span className="app-topbar-sep">/</span>
        <span className="app-topbar-breadcrumb">Pipeline</span>
        <div className="app-topbar-actions">
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
        />

        <Board
          cards={state.cards}
          agents={state.agents}
          onCardClick={(id) => dispatch({ type: 'OPEN_CARD', id })}
        />

        <ActivityLog
          collapsed={!state.panels.logOpen}
          onToggle={() => dispatch({ type: 'TOGGLE_LOG_RAIL' })}
        />
      </div>

      {/* Status bar */}
      <StatusBar status={state.status} wsState={state.wsState} />

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
    </div>
  );
}
