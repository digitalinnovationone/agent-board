interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function ActivityLog({ collapsed, onToggle }: Props) {
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
          <p className="activity-empty">No activity yet.</p>
        </div>
      )}
    </aside>
  );
}
