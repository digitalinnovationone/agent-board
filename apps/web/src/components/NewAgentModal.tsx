interface Props {
  onClose: () => void;
}

export function NewAgentModal({ onClose }: Props) {
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New agent</h2>
          <p className="modal-subtitle">Spawn a Claude Code agent and assign it to a pipeline stage.</p>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--g-color-text-3)' }}>Coming in M3.</p>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
