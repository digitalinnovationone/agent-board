import { useState } from 'react';
import type { ColumnDef } from '@agent-board/types';
import { api } from '../lib/api';

interface Props {
  workDir: string;
  columns: ColumnDef[];
  onSave: (workDir: string) => void;
  onColumnsChange: (columns: ColumnDef[]) => void;
  onClose: () => void;
}

export function SettingsModal({ workDir, columns, onSave, onColumnsChange, onClose }: Props) {
  const [value, setValue] = useState(workDir);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newColName, setNewColName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [colErrors, setColErrors] = useState<Record<string, string>>({});

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

  const handleAddColumn = async () => {
    const name = newColName.trim();
    if (!name) return;
    setAddError(null);
    try {
      await api.columns.create(name);
      const updated = await api.columns.list();
      onColumnsChange(updated);
      setNewColName('');
    } catch (e) {
      setAddError(String(e));
    }
  };

  const handleDeleteColumn = async (name: string) => {
    setColErrors((prev) => ({ ...prev, [name]: '' }));
    try {
      await api.columns.delete(name);
      const updated = await api.columns.list();
      onColumnsChange(updated);
    } catch (e) {
      const msg = String(e);
      setColErrors((prev) => ({ ...prev, [name]: msg.replace(/^\d+ /, '') }));
    }
  };

  const handleWipChange = async (name: string, wipCap: number) => {
    try {
      await api.columns.patch(name, { wipCap });
      const updated = await api.columns.list();
      onColumnsChange(updated);
    } catch {
      // ignore
    }
  };

  const handleMove = async (idx: number, dir: -1 | 1) => {
    const names = columns.map((c) => c.name);
    const target = idx + dir;
    if (target < 0 || target >= names.length) return;
    // Don't allow swapping with Backlog (idx 0) or Done (last)
    if (target === 0 || target === names.length - 1) return;
    [names[idx], names[target]] = [names[target], names[idx]];
    try {
      const updated = await api.columns.reorder(names);
      onColumnsChange(updated);
    } catch {
      // ignore
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

          <div className="field" style={{ marginTop: 'var(--g-space-6)' }}>
            <label className="label">Pipeline stages</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--g-space-2)' }}>
              {columns.map((col, idx) => (
                <div key={col.name}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--g-space-3)',
                    padding: 'var(--g-space-3) var(--g-space-4)',
                    background: 'var(--g-color-surface-2)',
                    border: '1px solid var(--g-color-border)',
                    borderRadius: 'var(--g-radius-lg)',
                  }}>
                    {/* Reorder buttons (only for non-locked middle columns) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <button
                        className="icon-btn"
                        style={{ opacity: col.locked || idx <= 1 ? 0.2 : 1, cursor: col.locked || idx <= 1 ? 'default' : 'pointer' }}
                        disabled={col.locked || idx <= 1}
                        onClick={() => handleMove(idx, -1)}
                        title="Move up"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="2,7 5,3 8,7" />
                        </svg>
                      </button>
                      <button
                        className="icon-btn"
                        style={{ opacity: col.locked || idx >= columns.length - 2 ? 0.2 : 1, cursor: col.locked || idx >= columns.length - 2 ? 'default' : 'pointer' }}
                        disabled={col.locked || idx >= columns.length - 2}
                        onClick={() => handleMove(idx, 1)}
                        title="Move down"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="2,3 5,7 8,3" />
                        </svg>
                      </button>
                    </div>

                    <span style={{
                      flex: 1, fontSize: 'var(--g-text-sm)', fontWeight: 'var(--g-weight-medium)',
                      color: col.locked ? 'var(--g-color-text-3)' : 'var(--g-color-text)',
                    }}>
                      {col.name}
                      {col.locked && (
                        <span style={{ marginLeft: 6, fontSize: 'var(--g-text-xs)', color: 'var(--g-color-text-3)' }}>locked</span>
                      )}
                    </span>

                    {/* WIP cap */}
                    {col.wipCap < 999 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--g-space-2)' }}>
                        <span style={{ fontSize: 'var(--g-text-xs)', color: 'var(--g-color-text-3)' }}>WIP</span>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          className="input"
                          style={{ width: 48, padding: '2px 6px', fontSize: 'var(--g-text-sm)', textAlign: 'center' }}
                          defaultValue={col.wipCap}
                          onBlur={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (v > 0 && v !== col.wipCap) handleWipChange(col.name, v);
                          }}
                        />
                      </div>
                    )}

                    {/* Delete button */}
                    <button
                      className="icon-btn"
                      style={{ opacity: col.locked ? 0.2 : 1, cursor: col.locked ? 'default' : 'pointer', color: 'var(--g-color-warn)' }}
                      disabled={col.locked}
                      onClick={() => handleDeleteColumn(col.name)}
                      title={col.locked ? 'Locked' : `Delete ${col.name}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1,3 11,3" />
                        <path d="M4 3V2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" />
                        <rect x="2" y="3" width="8" height="8" rx="1" />
                        <line x1="5" y1="6" x2="5" y2="9" />
                        <line x1="7" y1="6" x2="7" y2="9" />
                      </svg>
                    </button>
                  </div>
                  {colErrors[col.name] && (
                    <div style={{ fontSize: 'var(--g-text-xs)', color: 'var(--g-color-warn)', marginTop: 4, paddingLeft: 'var(--g-space-2)' }}>
                      {colErrors[col.name]}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add new column */}
            <div style={{ display: 'flex', gap: 'var(--g-space-2)', marginTop: 'var(--g-space-3)' }}>
              <input
                className="input"
                style={{ flex: 1, fontSize: 'var(--g-text-sm)' }}
                placeholder="New stage name…"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddColumn(); }}
              />
              <button
                className="btn btn-primary"
                style={{ fontSize: 'var(--g-text-sm)', padding: '0 var(--g-space-4)' }}
                disabled={!newColName.trim()}
                onClick={handleAddColumn}
              >
                Add
              </button>
            </div>
            {addError && (
              <div style={{ fontSize: 'var(--g-text-xs)', color: 'var(--g-color-warn)', marginTop: 4 }}>{addError}</div>
            )}
            <span style={{ fontSize: 'var(--g-text-xs)', color: 'var(--g-color-text-3)', marginTop: 'var(--g-space-2)', display: 'block' }}>
              New stages are inserted before Done. Backlog and Done are always present.
            </span>
          </div>
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
