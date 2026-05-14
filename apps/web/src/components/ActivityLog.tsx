import { useEffect, useState } from 'react';
import type { ActivityFeedEntry } from '@agent-board/types';

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  feed: ActivityFeedEntry[];
}

type DotKind = 'agent' | 'card' | 'move' | 'block' | 'artifact' | 'comment' | 'note';

function dotKind(eventType: ActivityFeedEntry['eventType']): DotKind {
  if (eventType === 'agent:created' || eventType === 'agent:deleted' || eventType === 'agent:status') return 'agent';
  if (eventType === 'card:moved') return 'move';
  if (eventType === 'card:blocked' || eventType === 'card:unblocked') return 'block';
  if (eventType === 'artifact:added') return 'artifact';
  if (eventType === 'comment:added') return 'comment';
  if (eventType === 'activity:added') return 'note';
  return 'card';
}

function relativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'now';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function ActivityLog({ collapsed, onToggle, feed }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className={`activity-rail${collapsed ? ' collapsed' : ''}`}>
      <div className="activity-rail-header">
        {!collapsed && <span className="activity-rail-label">Activity</span>}
        <button className="icon-btn" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          <svg className="chevron" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {collapsed
              ? <polyline points="9,3 5,7 9,11" />
              : <polyline points="5,3 9,7 5,11" />}
          </svg>
        </button>
      </div>

      {!collapsed && (
        <div className="activity-body">
          {feed.length === 0 ? (
            <p className="activity-empty">No activity yet.</p>
          ) : (
            <ul className="activity-feed">
              {feed.map((entry) => (
                <li key={entry.id} className="activity-item">
                  <span className={`activity-dot activity-dot--${dotKind(entry.eventType)}`} />
                  <span className="activity-item-label">{entry.label}</span>
                  <span className="activity-item-time">{relativeTime(entry.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}
