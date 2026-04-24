import { useState, useEffect } from 'react';
import type { Column, Priority } from '@agent-board/types';
import { api } from '../lib/api';

interface Props {
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'L', label: 'Low', color: 'var(--g-color-text-3)' },
  { value: 'M', label: 'Medium', color: 'var(--g-color-accent)' },
  { value: 'H', label: 'High', color: '#f59e0b' },
];

const START_OPTIONS: { value: Column; label: string }[] = [
  { value: 'Backlog', label: 'Backlog' },
  { value: 'Specification', label: 'Specification' },
  { value: 'Development', label: 'Development' },
  { value: 'Testing', label: 'Testing' },
  { value: 'Deploy', label: 'Deploy' },
  { value: 'Done', label: 'Done' },
];

export function NewCardModal({ onClose }: Props) {
  const [nextId, setNextId] = useState('US-??');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('M');
  const [startIn, setStartIn] = useState<Column>('Backlog');
  const [criteria, setCriteria] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.cards.list().then((cards) => {
      const nums = cards.map((c) => parseInt(c.id.replace('US-', ''), 10)).filter(Number.isFinite);
      const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      setNextId(`US-${String(next).padStart(2, '0')}`);
    }).catch(() => {});
  }, []);

  const updateCriterion = (i: number, val: string) => {
    setCriteria((prev) => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  };

  const addCriterion = () => setCriteria((prev) => [...prev, '']);
  const removeCriterion = (i: number) => setCriteria((prev) => prev.filter((_, j) => j !== i));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === 'Enter') { e.preventDefault(); addCriterion(); }
    if (e.key === 'Backspace' && criteria[i] === '' && criteria.length > 1) {
      e.preventDefault();
      removeCriterion(i);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await api.cards.create({
        title: title.trim(),
        description,
        priority,
        acceptance: criteria.filter((c) => c.trim()),
        startIn,
      });
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New card</h2>
          <p className="modal-subtitle">
            Add a user story to the pipeline. It will start in Backlog unless you choose elsewhere.
          </p>
        </div>

        <div className="modal-body">
          {/* ID + Title row */}
          <div className="field-row">
            <div className="field" style={{ maxWidth: 100 }}>
              <span className="label">ID</span>
              <input className="input input-mono" value={nextId} readOnly tabIndex={-1} />
            </div>
            <div className="field">
              <span className="label">Title</span>
              <input
                className="input"
                placeholder="e.g. Password reset flow"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>

          {/* Description */}
          <div className="field">
            <span className="label">Description</span>
            <textarea
              className="input"
              placeholder="What does this story cover? Agents will use this as the starting context."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <span className="input-hint">Markdown supported. Agents will expand this into a spec during Specification.</span>
          </div>

          {/* Priority + Start In */}
          <div className="field-row" style={{ alignItems: 'flex-start' }}>
            <div className="field">
              <span className="label">Priority</span>
              <div className="pill-group">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`pill${priority === opt.value ? ' selected' : ''}`}
                    onClick={() => setPriority(opt.value)}
                    type="button"
                  >
                    <span
                      className="pill-dot"
                      style={{ background: priority === opt.value ? '#fff' : opt.color }}
                    />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="label">Start in</span>
              <div className="pill-group" style={{ flexDirection: 'column', gap: 'var(--g-space-2)' }}>
                {START_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`pill${startIn === opt.value ? ' selected' : ''}`}
                    onClick={() => setStartIn(opt.value)}
                    type="button"
                    style={{ justifyContent: 'flex-start' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Acceptance criteria */}
          <div className="field">
            <span className="label">Acceptance criteria</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--g-space-2)' }}>
              {criteria.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--g-space-2)', alignItems: 'center' }}>
                  <span style={{ color: 'var(--g-color-text-3)', fontSize: 'var(--g-text-sm)', userSelect: 'none' }}>·</span>
                  <input
                    className="input"
                    style={{ flex: 1 }}
                    placeholder="Given… When… Then…"
                    value={c}
                    onChange={(e) => updateCriterion(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                  />
                  {criteria.length > 1 && (
                    <button className="icon-btn" onClick={() => removeCriterion(i)} type="button">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              className="btn btn-ghost"
              onClick={addCriterion}
              type="button"
              style={{ alignSelf: 'flex-start', marginTop: 'var(--g-space-1)', fontSize: 'var(--g-text-sm)', color: 'var(--g-color-text-3)' }}
            >
              + Add criterion
            </button>
          </div>

          {error && (
            <p style={{ color: 'var(--g-color-warn)', fontSize: 'var(--g-text-sm)' }}>{error}</p>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !title.trim()}>
            {submitting ? 'Creating…' : 'Create card'}
          </button>
        </div>
      </div>
    </div>
  );
}
