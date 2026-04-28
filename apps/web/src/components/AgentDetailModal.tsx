import { useState } from 'react';
import type { Agent, Glyph, Column } from '@agent-board/types';
import { COLUMNS } from '@agent-board/types';
import { AgentChip } from './AgentChip';
import { api } from '../lib/api';

interface Props {
  agentId: string;
  agents: Record<string, Agent>;
  onClose: () => void;
}

const GLYPHS: Glyph[] = ['triangle', 'square', 'diamond', 'circle', 'hex', 'chevron'];
const ACCENT_HUES = [220, 185, 0, 140, 300, 50, 260, 10, 175];

export function AgentDetailModal({ agentId, agents, onClose }: Props) {
  const agent = agents[agentId];

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [name, setName] = useState('');
  const [glyph, setGlyph] = useState<Glyph>('hex');
  const [hue, setHue] = useState(220);
  const [role, setRole] = useState('');
  const [ownsColumn, setOwnsColumn] = useState<Column | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [tools, setTools] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!agent) { onClose(); return null; }

  const seedForm = (a: Agent) => {
    setName(a.name);
    setGlyph(a.glyph);
    setHue(a.hue);
    setRole(a.role);
    setOwnsColumn(a.ownsColumn);
    setSystemPrompt(a.systemPrompt ?? '');
    setTools(a.tools);
  };

  const enterEdit = () => {
    seedForm(agent);
    setError(null);
    setConfirmDelete(false);
    setMode('edit');
  };

  const cancelEdit = () => {
    setError(null);
    setMode('view');
  };

  const toggleTool = (t: string) => {
    setTools((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await api.agents.update(agentId, {
        name: name.trim(), role, glyph, hue,
        systemPrompt: systemPrompt || null,
        tools, ownsColumn,
      });
      setMode('view');
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.agents.delete(agentId);
      onClose();
    } catch (e) {
      setError(String(e));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const isWorking = agent.status === 'working';

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--g-space-4)' }}>
          <AgentChip glyph={agent.glyph} hue={agent.hue} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="modal-title" style={{ marginBottom: 2 }}>{agent.name}</h2>
            <p className="modal-subtitle" style={{ margin: 0 }}>
              {agent.role}
              {isWorking && (
                <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--g-color-accent)' }}>
                  <span className="agent-status-dot" />
                  live
                </span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--g-space-2)', flexShrink: 0 }}>
            <button
              className="icon-btn"
              title="Delete agent"
              onClick={() => { setConfirmDelete(true); if (mode === 'view') enterEdit(); }}
              style={{ color: confirmDelete ? 'var(--g-color-warn)' : undefined }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <polyline points="2,4 14,4" />
                <path d="M5 4V2h6v2" />
                <rect x="3" y="4" width="10" height="10" rx="1" />
                <line x1="6" y1="7" x2="6" y2="11" />
                <line x1="10" y1="7" x2="10" y2="11" />
              </svg>
            </button>
            <button className="icon-btn" title={mode === 'edit' ? 'View' : 'Edit'} onClick={mode === 'edit' ? cancelEdit : enterEdit}>
              {mode === 'edit' ? (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
                  <circle cx="8" cy="8" r="2" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M11 2l3 3-8 8H3v-3l8-8z" />
                </svg>
              )}
            </button>
            <button className="icon-btn" title="Close" onClick={onClose}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="16" height="16">
                <line x1="3" y1="3" x2="13" y2="13" />
                <line x1="13" y1="3" x2="3" y2="13" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          {mode === 'view' ? (
            <>
              <div className="field">
                <span className="label">Mark</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--g-space-3)' }}>
                  <AgentChip glyph={agent.glyph} hue={agent.hue} size={32} />
                  <span style={{ fontSize: 'var(--g-text-sm)', color: 'var(--g-color-text-muted)' }}>
                    {agent.glyph} · hue {agent.hue}
                  </span>
                </div>
              </div>
              <div className="field">
                <span className="label">Pipeline stage</span>
                <span style={{ fontSize: 'var(--g-text-sm)' }}>{agent.ownsColumn ?? 'None (observer)'}</span>
              </div>
              <div className="field">
                <span className="label">System prompt</span>
                <span style={{ fontSize: 'var(--g-text-sm)', whiteSpace: 'pre-wrap', color: agent.systemPrompt ? 'var(--g-color-text)' : 'var(--g-color-text-muted)' }}>
                  {agent.systemPrompt || 'Default (role-based)'}
                </span>
              </div>
              <div className="field">
                <span className="label">Allowed tools</span>
                <div className="pill-group">
                  {(['read', 'write', 'bash', 'web', 'mcp'] as const).map((t) => (
                    <span
                      key={t}
                      className={`pill${agent.tools.includes(t) ? ' selected' : ''}`}
                      style={{ cursor: 'default', opacity: agent.tools.includes(t) ? 1 : 0.4 }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="label">Created</span>
                <span style={{ fontSize: 'var(--g-text-sm)', color: 'var(--g-color-text-muted)' }}>
                  {new Date(agent.createdAt).toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <>
              {/* Mark + Name row */}
              <div style={{ display: 'flex', gap: 'var(--g-space-5)', alignItems: 'flex-start' }}>
                <div className="field" style={{ flexShrink: 0 }}>
                  <span className="label">Mark</span>
                  <div style={{
                    width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--g-color-surface-2)', borderRadius: 'var(--g-radius-xl)',
                    border: '1px solid var(--g-color-border)',
                  }}>
                    <AgentChip glyph={glyph} hue={hue} size={36} />
                  </div>
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <span className="label">Name</span>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {/* Glyph picker */}
              <div className="field">
                <span className="label">Glyph</span>
                <div className="pill-group">
                  {GLYPHS.map((g) => (
                    <button key={g} className={`pill${glyph === g ? ' selected' : ''}`} onClick={() => setGlyph(g)} type="button">
                      <AgentChip glyph={g} hue={glyph === g ? hue : 240} size={18} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent hue */}
              <div className="field">
                <span className="label">Accent</span>
                <div className="pill-group">
                  {ACCENT_HUES.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHue(h)}
                      type="button"
                      style={{
                        width: 28, height: 28,
                        borderRadius: 'var(--g-radius-full)',
                        background: `oklch(0.6 0.18 ${h})`,
                        border: hue === h ? '2px solid var(--g-color-text)' : '2px solid transparent',
                        cursor: 'pointer', outline: 'none',
                        boxShadow: hue === h ? '0 0 0 2px var(--g-color-surface), 0 0 0 4px var(--g-color-text)' : 'none',
                        transition: 'box-shadow 0.1s ease',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Pipeline stage */}
              <div className="field">
                <span className="label">Pipeline stage</span>
                <select
                  className="input"
                  value={ownsColumn ?? ''}
                  onChange={(e) => setOwnsColumn((e.target.value as Column) || null)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">None (observer)</option>
                  {COLUMNS.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div className="field">
                <span className="label">Role description</span>
                <input
                  className="input"
                  placeholder="e.g. Backend Dev"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>

              {/* System prompt */}
              <div className="field">
                <span className="label">System prompt</span>
                <textarea
                  className="input"
                  placeholder="Leave blank to use the default prompt for this role."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Tools */}
              <div className="field">
                <span className="label">Allowed tools</span>
                <div className="pill-group">
                  {(['read', 'write', 'bash', 'web', 'mcp'] as const).map((t) => (
                    <button key={t} className={`pill${tools.includes(t) ? ' selected' : ''}`} onClick={() => toggleTool(t)} type="button">
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p style={{ color: 'var(--g-color-warn)', fontSize: 'var(--g-text-sm)' }}>{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {confirmDelete ? (
            <>
              <span style={{ fontSize: 'var(--g-text-sm)', color: 'var(--g-color-warn)', flex: 1 }}>
                Delete <strong>{agent.name}</strong>? This cannot be undone.
              </span>
              <button className="btn" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                No, keep
              </button>
              <button
                className="btn"
                style={{ color: 'var(--g-color-warn)', borderColor: 'var(--g-color-warn)' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </>
          ) : mode === 'view' ? (
            <>
              <button className="btn" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={enterEdit}>Edit</button>
            </>
          ) : (
            <>
              <button className="btn" onClick={cancelEdit} disabled={submitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={submitting}>
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
