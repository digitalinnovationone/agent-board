import type { StatusSnapshot } from '@agent-board/types';
import type { WsState } from '../lib/store';

interface Props {
  status: StatusSnapshot;
  wsState: WsState;
  workDir: string;
  onSettingsClick: () => void;
}

export function StatusBar({ status, wsState, workDir, onSettingsClick }: Props) {
  const dirLabel = workDir ? workDir.split('/').filter(Boolean).pop() ?? workDir : 'no project set';
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
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--g-space-3)' }}>
        <div className="status-item" style={{ opacity: workDir ? 1 : 0.45 }}>
          <span>cwd</span>
          <span style={{ color: 'var(--g-color-text-2)', fontFamily: 'var(--g-font-mono)' }}>{dirLabel}</span>
        </div>
        <button
          className="icon-btn"
          title="Settings"
          onClick={onSettingsClick}
          style={{ width: 20, height: 20 }}
        >
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="12" height="12">
            <path d="M6.5 1.5h3l.5 1.5 1.5.87 1.5-.5 2.12 2.12-.5 1.5.87 1.5 1.5.5v3l-1.5.5-.87 1.5.5 1.5-2.12 2.12-1.5-.5-1.5.87-.5 1.5h-3l-.5-1.5-1.5-.87-1.5.5L1 12.62l.5-1.5L.63 9.6 0 9.5V6.5l1.5-.5.87-1.5L1.88 3 4 .88l1.5.5 1.5-.87L6.5 1.5z" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </button>
      </div>
    </footer>
  );
}
