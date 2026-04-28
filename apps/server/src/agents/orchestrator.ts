import db from '../db.js';
import { bus } from '../events.js';
import { runAgent } from './runtime.js';
import type { Agent, CardDetail, Activity, Artifact, Comment, AcceptanceItem, Column, Glyph, Priority } from '../types.js';

const activeAgents = new Set<string>(); // agentId → prevent double-pickup

function loadCardDetail(cardId: string): CardDetail | null {
  const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const activities = db.prepare('SELECT * FROM activity WHERE card_id = ? ORDER BY t ASC').all(cardId) as Activity[];
  const artifacts = db.prepare('SELECT * FROM artifacts WHERE card_id = ? ORDER BY t ASC').all(cardId) as Artifact[];
  const comments = db.prepare('SELECT * FROM comments WHERE card_id = ? ORDER BY t ASC').all(cardId) as Comment[];

  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    priority: row.priority as Priority,
    column: row.column as Column,
    blocked: Boolean(row.blocked),
    blockReason: row.block_reason as string | null,
    acceptance: JSON.parse(row.acceptance as string) as AcceptanceItem[],
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    activity: activities,
    artifacts,
    comments,
  };
}

function rowToAgent(row: Record<string, unknown>): Agent {
  return {
    id: row.id as string,
    name: row.name as string,
    role: row.role as string,
    glyph: row.glyph as Glyph,
    hue: row.hue as number,
    avatar: (row.avatar as string | null) ?? null,
    systemPrompt: row.system_prompt as string | null,
    tools: JSON.parse(row.tools as string) as string[],
    ownsColumn: row.owns_column as Column | null,
    createdAt: row.created_at as number,
    status: 'idle',
  };
}

export function startOrchestrator() {
  bus.on('card:entered', async ({ cardId, column }) => {
    // Ignore if the card is blocked
    const cardRow = db.prepare('SELECT blocked FROM cards WHERE id = ?').get(cardId) as { blocked: number } | undefined;
    if (!cardRow || cardRow.blocked) return;

    const ownerRows = db.prepare('SELECT * FROM agents WHERE owns_column = ?').all(column) as Record<string, unknown>[];
    if (ownerRows.length === 0) return;

    for (const row of ownerRows) {
      const agent = rowToAgent(row);
      if (activeAgents.has(agent.id)) continue; // agent already working

      activeAgents.add(agent.id);
      const card = loadCardDetail(cardId);
      if (!card) { activeAgents.delete(agent.id); continue; }

      // Run asynchronously so the HTTP response isn't blocked
      runAgent({ agent, card })
        .catch((err) => console.error(`[orchestrator] runAgent error:`, err))
        .finally(() => activeAgents.delete(agent.id));
    }
  });

  console.log('[orchestrator] started');
}
