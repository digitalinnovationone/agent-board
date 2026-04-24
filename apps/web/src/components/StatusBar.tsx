import type { StatusSnapshot } from '@agent-board/types';

interface Props {
  status: StatusSnapshot;
  wsConnected: boolean;
}

export function StatusBar({ status, wsConnected }: Props) {
  const hasKey = status.connected;
  const dotClass = !wsConnected ? 'disconnected' : hasKey ? 'connected' : 'missing';
  const label = !wsConnected
    ? 'reconnecting…'
    : !hasKey
    ? 'agents paused · missing key'
    : `claude-code · connected · ${status.model}`;

  return (
    <footer className="status-bar">
      <div className="status-item">
        <span className={`status-dot ${dotClass}`} />
        <span>{label}</span>
      </div>

      {wsConnected && (
        <>
          <div className="status-sep" />
          <div className="status-item">
            <span>done/wk</span>
            <span style={{ color: 'var(--g-color-text-2)' }}>{status.doneWeek}</span>
          </div>
          <div className="status-sep" />
          <div className="status-item">
            <span>in-flight</span>
            <span style={{ color: 'var(--g-color-text-2)' }}>{status.inFlight}</span>
          </div>
          {status.blocked > 0 && (
            <>
              <div className="status-sep" />
              <div className="status-item" style={{ color: 'var(--g-color-warn)' }}>
                <span>{status.blocked} blocked</span>
              </div>
            </>
          )}
        </>
      )}
    </footer>
  );
}
