import { useState } from 'react';
import { api } from '../lib/api';

interface Props {
  workDir: string;
  onSave: (workDir: string) => void;
  onClose: () => void;
}

export function SettingsModal({ workDir, onSave, onClose }: Props) {
  const [value, setValue] = useState(workDir);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!value.trim()) { setError('Path is required'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.config.patch(value.trim());
      onSave(res.workDir);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title">Settings</div>
          <div className="modal-subtitle">Configure the Claude Code agent environment.</div>
        </div>

        <div className="modal-body">
          <div className="field">
            <label className="label">Project directory</label>
            <input
              className="input"
              style={{ fontFamily: 'var(--g-font-mono)', fontSize: 'var(--g-text-sm)' }}
              placeholder="/path/to/your/project"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              autoFocus
            />
            <span style={{ fontSize: 'var(--g-text-xs)', color: 'var(--g-color-text-3)' }}>
              Agents will read and write files in this directory.
            </span>
          </div>

          {error && (
            <div style={{ fontSize: 'var(--g-text-sm)', color: 'var(--g-color-warn)' }}>{error}</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
