import type { StatusSnapshot } from '@agent-board/types';
import type { WsState } from '../lib/store';

interface Props {
  status: StatusSnapshot;
  wsState: WsState;
}

export function StatusBar({ status, wsState }: Props) {
  const hasKey = status.connected;

  const dotClass =
    wsState === 'connecting'    ? 'missing' :
    wsState === 'disconnected'  ? 'disconnected' :
    hasKey                      ? 'connected' : 'missing';

  const label =
    wsState === 'connecting'   ? 'connecting…' :
    wsState === 'disconnected' ? 'reconnecting…' :
    !hasKey                    ? 'agents paused · missing key' :
    `claude-code · connected · ${status.model}`;

  return (
    <footer className="status-bar">
      <div className="status-item">
        <span className={`status-dot ${dotClass}`} />
        <span>{label}</span>
      </div>

      {wsState === 'connected' && (
        <>
          <div className="status-sep" />
          <div className="status-item">
            <span>done/wk</span>
            <span style={{ color: 'var(--g-color-text-2)', marginLeft: 4 }}>{status.doneWeek}</span>
          </div>
          <div className="status-sep" />
          <div className="status-item">
            <span>in-flight</span>
            <span style={{ color: 'var(--g-color-text-2)', marginLeft: 4 }}>{status.inFlight}</span>
          </div>
          {status.blocked > 0 && (
            <>
              <div className="status-sep" />
              <div className="status-item" style={{ color: 'var(--g-color-warn)' }}>
                <span>{status.blocked} blocked</span>
              </div>
            </>
          )}
          {status.leadAvg !== null && (
            <>
              <div className="status-sep" />
              <div className="status-item">
                <span>lead avg</span>
                <span style={{ color: 'var(--g-color-text-2)', marginLeft: 4, fontFamily: 'var(--g-font-mono)' }}>
                  {status.leadAvg}h
                </span>
              </div>
            </>
          )}
        </>
      )}
    </footer>
  );
}
