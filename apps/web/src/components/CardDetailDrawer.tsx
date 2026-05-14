import { useState, useEffect, useRef } from 'react';
import type { CardDetail, Agent, ColumnDef } from '@agent-board/types';
import { api } from '../lib/api';
import { AgentChip } from './AgentChip';

interface Props {
  cardId: string;
  columns: ColumnDef[];
  agents: Record<string, Agent>;
  onClose: () => void;
}

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000 / 60;
  if (diff < 1) return 'just now';
  if (diff < 60) return `${Math.floor(diff)}m ago`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function PipelineStepper({ column, columns }: { column: string; columns: ColumnDef[] }) {
  const idx = columns.findIndex((c) => c.name === column);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 2 }}>
      {columns.map((col, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={col.name} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {i > 0 && (
              <div style={{
                width: 20, height: 1,
                background: done ? 'var(--g-color-accent)' : 'var(--g-color-border)',
              }} />
            )}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <div style={{
                width: 10, height: 10,
                borderRadius: 'var(--g-radius-full)',
                background: active
                  ? 'var(--g-color-accent)'
                  : done
                  ? 'var(--g-color-accent)'
                  : 'var(--g-color-border)',
                border: active ? '2px solid var(--g-color-accent)' : done ? 'none' : '1.5px solid var(--g-color-border)',
                boxShadow: active ? '0 0 0 3px var(--g-color-accent-border)' : 'none',
                transition: 'all 0.15s ease',
              }} />
              <span style={{
                fontSize: 10,
                fontFamily: 'var(--g-font-sans)',
                color: active ? 'var(--g-color-accent)' : done ? 'var(--g-color-text-2)' : 'var(--g-color-text-3)',
                fontWeight: active ? 600 : 400,
                whiteSpace: 'nowrap',
                letterSpacing: 'var(--g-tracking-wide)',
              }}>
                {col.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const PRIORITY_LABEL: Record<string, { label: string; color: string }> = {
  L: { label: 'Low', color: 'var(--g-color-text-3)' },
  M: { label: 'Medium', color: 'var(--g-color-accent)' },
  H: { label: 'High', color: '#f59e0b' },
};

const ACTIVITY_ICON: Record<string, string> = {
  work: '⚙',
  ok: '✓',
  warn: '⚠',
  note: '·',
  move: '→',
  block: '✕',
  unblock: '↩',
};

export function CardDetailDrawer({ cardId, columns, agents, onClose }: Props) {
  const [detail, setDetail] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ${cardId}? This cannot be undone.`)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.cards.delete(cardId);
      onClose();
    } catch (err) {
      setDeleteError(String(err));
      setDeleting(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    api.cards.get(cardId).then((d) => { setDetail(d); setLoading(false); }).catch(() => setLoading(false));
  }, [cardId]);

  const postComment = async () => {
    if (!comment.trim() || posting) return;
    setPosting(true);
    try {
      const c = await api.comments.create(cardId, { text: comment.trim() });
      setDetail((prev) => prev ? { ...prev, comments: [...prev.comments, c] } : prev);
      setComment('');
    } catch {
      // ignore
    } finally {
      setPosting(false);
    }
  };

  const pri = detail ? PRIORITY_LABEL[detail.priority] : null;

  return (
    <div className="drawer-scrim" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--g-space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--g-space-4)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--g-space-3)', marginBottom: 'var(--g-space-2)' }}>
                <span style={{ fontFamily: 'var(--g-font-mono)', fontSize: 'var(--g-text-sm)', color: 'var(--g-color-text-3)' }}>
                  {cardId}
                </span>
                {pri && (
                  <span style={{
                    fontSize: 'var(--g-text-xs)', fontWeight: 'var(--g-weight-semibold)',
                    padding: '1px 6px', borderRadius: 'var(--g-radius-sm)',
                    background: 'var(--g-color-surface-2)',
                    color: pri.color,
                  }}>
                    {pri.label}
                  </span>
                )}
                {detail?.blocked && (
                  <span style={{
                    fontSize: 'var(--g-text-xs)', fontWeight: 'var(--g-weight-semibold)',
                    padding: '1px 6px', borderRadius: 'var(--g-radius-sm)',
                    background: 'var(--g-color-warn-bg)',
                    color: 'var(--g-color-warn)',
                    border: '1px solid var(--g-color-warn-border)',
                  }}>
                    BLOCKED
                  </span>
                )}
              </div>
              <h2 style={{
                fontSize: 'var(--g-text-xl)', fontWeight: 'var(--g-weight-semibold)',
                letterSpacing: 'var(--g-tracking-tight)', lineHeight: 'var(--g-leading-snug)',
                color: 'var(--g-color-text)',
              }}>
                {loading ? '…' : detail?.title ?? cardId}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--g-space-1)', flexShrink: 0, marginTop: 2 }}>
              <button
                className="icon-btn"
                onClick={(e) => handleDelete(e)}
                disabled={deleting}
                title="Delete card"
                style={{ color: 'var(--g-color-warn)' }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1,3 12,3" />
                  <path d="M4 3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" />
                  <rect x="2" y="3" width="9" height="9" rx="1" />
                  <line x1="5" y1="6" x2="5" y2="9" />
                  <line x1="8" y1="6" x2="8" y2="9" />
                </svg>
              </button>
              <button className="icon-btn" onClick={onClose}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {detail && <PipelineStepper column={detail.column} columns={columns} />}
          {deleteError && (
            <div style={{ fontSize: 'var(--g-text-xs)', color: 'var(--g-color-warn)', fontFamily: 'var(--g-font-mono)', marginTop: 'var(--g-space-2)' }}>
              {deleteError}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="drawer-body">
          {loading ? (
            <p style={{ color: 'var(--g-color-text-3)', fontSize: 'var(--g-text-sm)' }}>Loading…</p>
          ) : !detail ? (
            <p style={{ color: 'var(--g-color-warn)', fontSize: 'var(--g-text-sm)' }}>Failed to load card.</p>
          ) : (
            <>
              {/* Blocked callout */}
              {detail.blocked && (
                <div style={{
                  background: 'var(--g-color-warn-bg)', border: '1px solid var(--g-color-warn-border)',
                  borderRadius: 'var(--g-radius-xl)', padding: 'var(--g-space-5) var(--g-space-6)',
                }}>
                  <p style={{ fontSize: 'var(--g-text-sm)', color: 'var(--g-color-warn)', fontWeight: 'var(--g-weight-semibold)', marginBottom: 4 }}>
                    Blocked
                  </p>
                  <p style={{ fontSize: 'var(--g-text-sm)', color: 'var(--g-color-warn)', fontStyle: 'italic' }}>
                    {detail.blockReason ?? 'No reason given.'}
                  </p>
                  <button
                    className="btn"
                    style={{ marginTop: 'var(--g-space-4)', fontSize: 'var(--g-text-sm)', color: 'var(--g-color-warn)', borderColor: 'var(--g-color-warn-border)' }}
                    onClick={async () => {
                      await api.cards.unblock(detail.id);
                      onClose();
                    }}
                  >
                    Unblock…
                  </button>
                </div>
              )}

              {/* Description */}
              {detail.description && (
                <section>
                  <p className="drawer-section-title">Description</p>
                  <p style={{
                    fontSize: 'var(--g-text-md)', color: 'var(--g-color-text-2)',
                    lineHeight: 'var(--g-leading-relaxed)', whiteSpace: 'pre-wrap',
                  }}>
                    {detail.description}
                  </p>
                </section>
              )}

              {/* Acceptance criteria */}
              {detail.acceptance.length > 0 && (
                <section>
                  <p className="drawer-section-title">Acceptance criteria</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--g-space-3)' }}>
                    {detail.acceptance.map((item, i) => (
                      <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--g-space-3)', cursor: 'default' }}>
                        <span style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          border: '1.5px solid',
                          borderColor: item.done ? 'var(--g-color-ok)' : 'var(--g-color-border-strong)',
                          background: item.done ? 'var(--g-color-ok-bg)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginTop: 1,
                        }}>
                          {item.done && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--g-color-ok)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="1.5,5 4,7.5 8.5,2.5" />
                            </svg>
                          )}
                        </span>
                        <span style={{
                          fontSize: 'var(--g-text-base)', color: item.done ? 'var(--g-color-text-3)' : 'var(--g-color-text-2)',
                          textDecoration: item.done ? 'line-through' : 'none', lineHeight: 1.4,
                        }}>
                          {item.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {/* Artifacts */}
              <section>
                <p className="drawer-section-title">Artifacts</p>
                {detail.artifacts.length === 0 ? (
                  <p style={{ fontSize: 'var(--g-text-sm)', color: 'var(--g-color-text-3)' }}>
                    No artifacts yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--g-space-3)' }}>
                    {detail.artifacts.map((a) => {
                      const agent = agents[a.agentId];
                      return (
                        <div key={a.id} style={{
                          display: 'flex', alignItems: 'center', gap: 'var(--g-space-3)',
                          padding: 'var(--g-space-4) var(--g-space-5)',
                          background: 'var(--g-color-surface-2)', borderRadius: 'var(--g-radius-lg)',
                          border: '1px solid var(--g-color-border)',
                        }}>
                          {agent && <AgentChip glyph={agent.glyph} hue={agent.hue} avatar={agent.avatar} size={20} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 'var(--g-text-sm)', fontFamily: 'var(--g-font-mono)', color: 'var(--g-color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {a.title}
                            </p>
                            {a.meta && <p style={{ fontSize: 'var(--g-text-xs)', color: 'var(--g-color-text-3)', marginTop: 2 }}>{a.meta}</p>}
                          </div>
                          <span style={{ fontSize: 'var(--g-text-xs)', fontFamily: 'var(--g-font-mono)', color: 'var(--g-color-text-3)', flexShrink: 0 }}>
                            {timeAgo(a.t)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Activity */}
              <section>
                <p className="drawer-section-title">Activity</p>
                {detail.activity.length === 0 ? (
                  <p style={{ fontSize: 'var(--g-text-sm)', color: 'var(--g-color-text-3)' }}>No activity yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {detail.activity.map((ev) => {
                      const agent = ev.agentId ? agents[ev.agentId] : null;
                      return (
                        <div key={ev.id} style={{
                          display: 'flex', gap: 'var(--g-space-3)', paddingBottom: 'var(--g-space-5)',
                          borderLeft: '1px solid var(--g-color-border)', paddingLeft: 'var(--g-space-5)', marginLeft: 5,
                          position: 'relative',
                        }}>
                          {/* Timeline dot */}
                          <div style={{
                            position: 'absolute', left: -5, top: 4,
                            width: 9, height: 9, borderRadius: '50%',
                            background: ev.kind === 'warn' ? 'var(--g-color-warn)'
                              : ev.kind === 'ok' ? 'var(--g-color-ok)'
                              : ev.kind === 'block' ? 'var(--g-color-warn)'
                              : 'var(--g-color-border-strong)',
                            border: '1.5px solid var(--g-color-surface)',
                          }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--g-space-2)', flexWrap: 'wrap' }}>
                              {agent && <AgentChip glyph={agent.glyph} hue={agent.hue} avatar={agent.avatar} size={16} />}
                              <span style={{ fontSize: 'var(--g-text-sm)', color: 'var(--g-color-text-2)', fontWeight: 'var(--g-weight-medium)' }}>
                                {agent ? agent.name : 'You'}
                              </span>
                              <span style={{ fontSize: 'var(--g-text-sm)', color: 'var(--g-color-text-3)' }}>
                                {ev.verb}{ev.target ? ` ${ev.target}` : ''}
                              </span>
                            </div>
                            <p style={{ fontSize: 'var(--g-text-xs)', fontFamily: 'var(--g-font-mono)', color: 'var(--g-color-text-3)', marginTop: 3 }}>
                              {timeAgo(ev.t)}
                            </p>
                          </div>
                          <span style={{
                            fontSize: 12, color: ev.kind === 'warn' ? 'var(--g-color-warn)'
                              : ev.kind === 'ok' ? 'var(--g-color-ok)'
                              : 'var(--g-color-text-3)',
                            flexShrink: 0, marginTop: 2,
                          }}>
                            {ACTIVITY_ICON[ev.kind] ?? '·'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Comments */}
              <section>
                <p className="drawer-section-title">Comments</p>
                {detail.comments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--g-space-5)', marginBottom: 'var(--g-space-6)' }}>
                    {detail.comments.map((c) => {
                      const agent = c.author !== 'human' ? agents[c.author] : null;
                      return (
                        <div key={c.id} style={{ display: 'flex', gap: 'var(--g-space-3)', alignItems: 'flex-start' }}>
                          {agent ? (
                            <AgentChip glyph={agent.glyph} hue={agent.hue} avatar={agent.avatar} size={22} />
                          ) : (
                            <div style={{
                              width: 22, height: 22, borderRadius: 'var(--g-radius-full)',
                              background: 'var(--g-color-text)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700, flexShrink: 0,
                            }}>
                              Y
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', gap: 'var(--g-space-3)', alignItems: 'baseline', marginBottom: 3 }}>
                              <span style={{ fontSize: 'var(--g-text-sm)', fontWeight: 'var(--g-weight-semibold)', color: 'var(--g-color-text-2)' }}>
                                {agent ? agent.name : 'You'}
                              </span>
                              <span style={{ fontSize: 'var(--g-text-xs)', fontFamily: 'var(--g-font-mono)', color: 'var(--g-color-text-3)' }}>
                                {timeAgo(c.t)}
                              </span>
                            </div>
                            <p style={{ fontSize: 'var(--g-text-base)', color: 'var(--g-color-text-2)', lineHeight: 'var(--g-leading-relaxed)', whiteSpace: 'pre-wrap' }}>
                              {c.text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Comment composer */}
                <div style={{
                  border: '1px solid var(--g-color-border)',
                  borderRadius: 'var(--g-radius-xl)',
                  overflow: 'hidden',
                  background: 'var(--g-color-surface)',
                }}>
                  <textarea
                    ref={commentRef}
                    className="input"
                    style={{
                      border: 'none', borderRadius: 0, resize: 'none',
                      minHeight: 72, boxShadow: 'none',
                    }}
                    placeholder="Leave a comment or intervention for the next agent…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment();
                    }}
                  />
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 'var(--g-space-3) var(--g-space-4)',
                    background: 'var(--g-color-surface-3)',
                    borderTop: '1px solid var(--g-color-border)',
                  }}>
                    <span style={{ fontSize: 'var(--g-text-xs)', color: 'var(--g-color-text-3)' }}>
                      ⌘↵ to post
                    </span>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '4px 12px', fontSize: 'var(--g-text-sm)' }}
                      disabled={!comment.trim() || posting}
                      onClick={postComment}
                    >
                      Comment
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
