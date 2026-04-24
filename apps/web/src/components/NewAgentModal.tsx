import { useState, useCallback } from 'react';
import type { Glyph, Column } from '@agent-board/types';
import { COLUMNS } from '@agent-board/types';
import { AgentChip } from './AgentChip';
import { api } from '../lib/api';

interface Props {
  onClose: () => void;
}

const GLYPHS: Glyph[] = ['triangle', 'square', 'diamond', 'circle', 'hex', 'chevron'];

const ACCENT_HUES = [220, 185, 0, 140, 300, 50, 260, 10, 175];

const ROLE_TEMPLATES = [
  { label: 'Product Owner', role: 'Product Owner', glyph: 'triangle' as Glyph, hue: 260, ownsColumn: 'Backlog' as Column },
  { label: 'Spec Writer', role: 'Spec Writer', glyph: 'square' as Glyph, hue: 200, ownsColumn: 'Specification' as Column },
  { label: 'Backend Dev', role: 'Backend Dev', glyph: 'diamond' as Glyph, hue: 30, ownsColumn: 'Development' as Column },
  { label: 'Frontend Dev', role: 'Frontend Dev', glyph: 'circle' as Glyph, hue: 160, ownsColumn: 'Development' as Column },
  { label: 'DevOps', role: 'DevOps', glyph: 'chevron' as Glyph, hue: 100, ownsColumn: 'Deploy' as Column },
  { label: 'Custom…', role: '', glyph: 'hex' as Glyph, hue: 340, ownsColumn: null },
];

function toHandle(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function NewAgentModal({ onClose }: Props) {
  const [name, setName] = useState('');
  const [glyph, setGlyph] = useState<Glyph>('hex');
  const [hue, setHue] = useState(220);
  const [roleTemplate, setRoleTemplate] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [ownsColumn, setOwnsColumn] = useState<Column | null>(null);
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
          {/* Mark preview + Name + Handle */}
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

          {/* Glyph picker */}
          <div className="field">
            <span className="label">Glyph</span>
            <div className="pill-group">
              {GLYPHS.map((g) => (
                <button
                  key={g}
                  className={`pill${glyph === g ? ' selected' : ''}`}
                  onClick={() => setGlyph(g)}
                  type="button"
                >
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
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: hue === h ? '0 0 0 2px var(--g-color-surface), 0 0 0 4px var(--g-color-text)' : 'none',
                    transition: 'box-shadow 0.1s ease',
                  }}
                />
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
