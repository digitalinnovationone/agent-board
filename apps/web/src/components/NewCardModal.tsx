interface Props {
  onClose: () => void;
}

export function NewCardModal({ onClose }: Props) {
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New card</h2>
          <p className="modal-subtitle">Add a user story to the pipeline. It will start in Backlog unless you choose elsewhere.</p>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--g-color-text-3)' }}>Coming in M4.</p>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
