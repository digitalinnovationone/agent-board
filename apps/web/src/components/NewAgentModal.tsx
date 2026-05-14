import { useState, useCallback } from 'react';
import type { Glyph, ColumnDef } from '@agent-board/types';
import { AgentChip } from './AgentChip';
import { api } from '../lib/api';

interface Props {
  columns: ColumnDef[];
  onClose: () => void;
}

const AVATAR_SEEDS = [
  'felix', 'luna', 'max', 'aria', 'kai', 'nova',
  'zoe', 'ryu', 'sage', 'ivy', 'leo', 'mia',
];

const ROLE_TEMPLATES = [
  { label: 'Product Owner', role: 'Product Owner', glyph: 'triangle' as Glyph, hue: 260, ownsColumn: 'Backlog' },
  { label: 'Spec Writer', role: 'Spec Writer', glyph: 'square' as Glyph, hue: 200, ownsColumn: 'Specification' },
  { label: 'Backend Dev', role: 'Backend Dev', glyph: 'diamond' as Glyph, hue: 30, ownsColumn: 'Development' },
  { label: 'Frontend Dev', role: 'Frontend Dev', glyph: 'circle' as Glyph, hue: 160, ownsColumn: 'Development' },
  { label: 'DevOps', role: 'DevOps', glyph: 'chevron' as Glyph, hue: 100, ownsColumn: 'Deploy' },
  { label: 'Custom…', role: '', glyph: 'hex' as Glyph, hue: 340, ownsColumn: null },
];

function toHandle(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function NewAgentModal({ columns, onClose }: Props) {
  const [name, setName] = useState('');
  const [glyph, setGlyph] = useState<Glyph>('hex');
  const [hue, setHue] = useState(220);
  const [avatar, setAvatar] = useState(AVATAR_SEEDS[0]);
  const [roleTemplate, setRoleTemplate] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [ownsColumn, setOwnsColumn] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [tools, setTools] = useState<string[]>(['read', 'write']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyTemplate = useCallback((tpl: typeof ROLE_TEMPLATES[0]) => {
    setRoleTemplate(tpl.label);
    setGlyph(tpl.glyph);
    setHue(tpl.hue);
    if (tpl.role) setRole(tpl.role);
    setOwnsColumn(tpl.ownsColumn);
  }, []);

  const toggleTool = (t: string) => {
    setTools((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await api.agents.create({
        name: name.trim(),
        role: role || name.trim(),
        glyph,
        hue,
        avatar,
        systemPrompt: systemPrompt || null,
        tools,
        ownsColumn,
      } as Parameters<typeof api.agents.create>[0]);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handle = toHandle(name);

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New agent</h2>
          <p className="modal-subtitle">Spawn a Claude Code agent and assign it to a pipeline stage.</p>
        </div>

        <div className="modal-body">
          {/* Avatar preview + Name + Handle */}
          <div style={{ display: 'flex', gap: 'var(--g-space-5)', alignItems: 'flex-start' }}>
            <div className="field" style={{ flexShrink: 0 }}>
              <span className="label">Avatar</span>
              <div style={{
                width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--g-color-surface-2)', borderRadius: 'var(--g-radius-xl)',
                border: '1px solid var(--g-color-border)',
              }}>
                <AgentChip glyph={glyph} hue={hue} avatar={avatar} size={36} />
              </div>
            </div>

            <div className="field" style={{ flex: 1 }}>
              <span className="label">Name</span>
              <input
                className="input"
                placeholder="e.g. Orbit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="field" style={{ width: 100 }}>
              <span className="label">Handle</span>
              <input
                className="input input-mono"
                value={handle || '—'}
                readOnly
                tabIndex={-1}
              />
            </div>
          </div>

          {/* Avatar picker */}
          <div className="field">
            <span className="label">Look</span>
            <div className="avatar-grid">
              {AVATAR_SEEDS.map((seed) => (
                <button
                  key={seed}
                  className={`avatar-option${avatar === seed ? ' selected' : ''}`}
                  onClick={() => setAvatar(seed)}
                  type="button"
                >
                  <AgentChip glyph={glyph} hue={hue} avatar={seed} size={36} />
                </button>
              ))}
            </div>
          </div>

          {/* Role template */}
          <div className="field">
            <span className="label">Role template</span>
            <div className="pill-group">
              {ROLE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  className={`pill${roleTemplate === tpl.label ? ' selected' : ''}`}
                  onClick={() => applyTemplate(tpl)}
                  type="button"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
            <span className="input-hint">Determines which stage this agent owns by default.</span>
          </div>

          {/* Pipeline stage */}
          <div className="field">
            <span className="label">Pipeline stage</span>
            <select
              className="input"
              value={ownsColumn ?? ''}
              onChange={(e) => setOwnsColumn(e.target.value || null)}
              style={{ cursor: 'pointer' }}
            >
              <option value="">None (observer)</option>
              {columns.map((col) => (
                <option key={col.name} value={col.name}>{col.name}</option>
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
                <button
                  key={t}
                  className={`pill${tools.includes(t) ? ' selected' : ''}`}
                  onClick={() => toggleTool(t)}
                  type="button"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p style={{ color: 'var(--g-color-warn)', fontSize: 'var(--g-text-sm)' }}>{error}</p>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create agent'}
          </button>
        </div>
      </div>
    </div>
  );
}
