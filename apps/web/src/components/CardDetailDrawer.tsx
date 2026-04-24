interface Props {
  cardId: string;
  onClose: () => void;
}

export function CardDetailDrawer({ cardId, onClose }: Props) {
  return (
    <div className="drawer-scrim" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2 style={{ fontSize: 'var(--g-text-xl)', fontWeight: 'var(--g-weight-semibold)', letterSpacing: 'var(--g-tracking-tight)' }}>
            {cardId}
          </h2>
        </div>
        <div className="drawer-body">
          <p style={{ color: 'var(--g-color-text-3)' }}>Card detail coming in M5.</p>
        </div>
      </div>
    </div>
  );
}
