import { query } from '@anthropic-ai/claude-agent-sdk';
import db from '../db.js';
import { bus } from '../events.js';
import { getDefaultPrompt } from './prompts.js';
import type { Agent, CardDetail, Column, Activity, Artifact } from '../types.js';
import { COLUMNS } from '../types.js';

interface AgentOutcome {
  advance?: boolean;
  block?: boolean;
  reason?: string;
  artifacts?: Array<{ kind: string; title: string; meta?: string }>;
  acceptanceUpdates?: number[];
}

function parseOutcome(text: string): AgentOutcome {
  const match = text.match(/```agent-board-outcome\n([\s\S]*?)\n```/);
  if (!match) return {};
  try {
    return JSON.parse(match[1].trim()) as AgentOutcome;
  } catch {
    return {};
  }
}

function buildCardContext(card: CardDetail): string {
  const acceptance = card.acceptance.map((a, i) => `  ${i + 1}. [${a.done ? 'x' : ' '}] ${a.text}`).join('\n');
  const recentActivity = card.activity.slice(-10).map((a: Activity) =>
    `  [${new Date(a.t).toISOString()}] ${a.verb}${a.target ? `: ${a.target}` : ''}`
  ).join('\n');
  const comments = card.comments.map((c) =>
    `  ${c.author}: ${c.text}`
  ).join('\n');

  return `# Card: ${card.id} — ${card.title}

**Current column**: ${card.column}
**Priority**: ${card.priority}

## Description
${card.description || '(no description)'}

## Acceptance Criteria
${acceptance || '  (none)'}

## Recent Activity
${recentActivity || '  (none)'}

## Comments
${comments || '  (none)'}`;
}

function nextColumn(current: Column): Column | null {
  const idx = COLUMNS.indexOf(current);
  if (idx < 0 || idx >= COLUMNS.length - 1) return null;
  return COLUMNS[idx + 1];
}

function addActivity(cardId: string, agentId: string, kind: string, verb: string, target: string | null) {
  const now = Date.now();
  const result = db.prepare(`
    INSERT INTO activity (card_id, agent_id, kind, verb, target, t)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(cardId, agentId, kind, verb, target, now);

  const activity = db.prepare('SELECT * FROM activity WHERE id = ?').get(result.lastInsertRowid) as Activity;
  bus.emit('ws:broadcast', { type: 'activity:added', cardId, activity });
  return activity;
}

function addArtifact(cardId: string, agentId: string, kind: string, title: string, meta: string | null) {
  const now = Date.now();
  const result = db.prepare(`
    INSERT INTO artifacts (card_id, agent_id, kind, title, meta, path, t)
    VALUES (?, ?, ?, ?, ?, NULL, ?)
  `).run(cardId, agentId, kind, title, meta, now);

  const artifact = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(result.lastInsertRowid) as Artifact;
  bus.emit('ws:broadcast', { type: 'artifact:added', cardId, artifact });
  return artifact;
}

export async function runAgent(opts: { agent: Agent; card: CardDetail }): Promise<void> {
  const { agent, card } = opts;
  const now = Date.now();

  // Mark agent as working
  db.prepare('UPDATE agents SET tools = tools WHERE id = ?').run(agent.id); // no-op touch
  bus.emit('ws:broadcast', { type: 'agent:status', agentId: agent.id, status: 'working', cardId: card.id });

  // Log pickup
  addActivity(card.id, agent.id, 'work', 'picked up card', null);

  if (!process.env.ANTHROPIC_API_KEY) {
    addActivity(card.id, agent.id, 'warn', 'skipped — no ANTHROPIC_API_KEY', null);
    bus.emit('ws:broadcast', { type: 'agent:status', agentId: agent.id, status: 'idle' });
    return;
  }

  const systemPrompt = agent.systemPrompt ?? getDefaultPrompt(agent.id);
  const cardContext = buildCardContext(card);
  const fullPrompt = `${systemPrompt}\n\n---\n\n${cardContext}`;

  let lastText = '';

  try {
    for await (const message of query({
      prompt: fullPrompt,
      options: {
        model: 'claude-sonnet-4-6',
        allowedTools: [],
        permissionMode: 'bypassPermissions',
        maxTurns: 1,
      } as Parameters<typeof query>[0]['options'],
    })) {
      const msg = message as Record<string, unknown>;

      if (msg.type === 'assistant') {
        const content = (msg.message as Record<string, unknown>)?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            const b = block as Record<string, unknown>;
            if (b.type === 'text' && typeof b.text === 'string') {
              lastText = b.text;
              // Stream a progress activity (truncated)
              const preview = b.text.slice(0, 120).replace(/\n/g, ' ');
              addActivity(card.id, agent.id, 'note', 'wrote', preview);
            }
          }
        }
      }

      if (msg.type === 'result') {
        const result = msg.result as string | undefined;
        if (result) lastText = result;
      }
    }
  } catch (err) {
    console.error(`[agent:${agent.id}] SDK error:`, err);
    addActivity(card.id, agent.id, 'warn', 'error calling Claude API', String(err).slice(0, 200));
    bus.emit('ws:broadcast', { type: 'agent:status', agentId: agent.id, status: 'idle' });
    return;
  }

  // Parse structured outcome
  const outcome = parseOutcome(lastText);
  console.log(`[agent:${agent.id}] outcome:`, outcome);

  if (outcome.block) {
    const reason = outcome.reason ?? 'No reason given';
    db.prepare(`UPDATE cards SET blocked = 1, block_reason = ?, updated_at = ? WHERE id = ?`)
      .run(reason, now, card.id);
    addActivity(card.id, agent.id, 'block', 'blocked card', reason);
    bus.emit('ws:broadcast', { type: 'card:blocked', cardId: card.id, reason });

    const updatedCard = db.prepare('SELECT * FROM cards WHERE id = ?').get(card.id);
    if (updatedCard) {
      const c = updatedCard as Record<string, unknown>;
      bus.emit('ws:broadcast', {
        type: 'card:updated',
        card: {
          id: c.id, title: c.title, description: c.description,
          priority: c.priority, column: c.column,
          blocked: Boolean(c.blocked), blockReason: c.block_reason,
          acceptance: JSON.parse(c.acceptance as string),
          createdAt: c.created_at, updatedAt: c.updated_at,
        },
      });
    }

  } else if (outcome.advance !== false) {
    // Default: advance if no explicit block (also treat missing outcome as advance)
    const toColumn = nextColumn(card.column as Column);
    if (toColumn) {
      // Add artifacts
      if (outcome.artifacts) {
        for (const a of outcome.artifacts) {
          addArtifact(card.id, agent.id, a.kind, a.title, a.meta ?? null);
        }
      }

      // Update acceptance criteria
      if (outcome.acceptanceUpdates) {
        const acceptance = JSON.parse(
          (db.prepare('SELECT acceptance FROM cards WHERE id = ?').get(card.id) as { acceptance: string }).acceptance
        ) as Array<{ text: string; done: boolean }>;
        for (const idx of outcome.acceptanceUpdates) {
          if (acceptance[idx]) acceptance[idx].done = true;
        }
        db.prepare('UPDATE cards SET acceptance = ?, updated_at = ? WHERE id = ?')
          .run(JSON.stringify(acceptance), now, card.id);
      }

      // Move card
      db.prepare('UPDATE cards SET column = ?, updated_at = ? WHERE id = ?')
        .run(toColumn, now, card.id);

      addActivity(card.id, agent.id, 'move', 'moved card to', toColumn);
      bus.emit('ws:broadcast', { type: 'card:moved', cardId: card.id, from: card.column as Column, to: toColumn });

      const updatedRow = db.prepare('SELECT * FROM cards WHERE id = ?').get(card.id) as Record<string, unknown>;
      bus.emit('ws:broadcast', {
        type: 'card:updated',
        card: {
          id: updatedRow.id, title: updatedRow.title, description: updatedRow.description,
          priority: updatedRow.priority, column: updatedRow.column,
          blocked: Boolean(updatedRow.blocked), blockReason: updatedRow.block_reason,
          acceptance: JSON.parse(updatedRow.acceptance as string),
          createdAt: updatedRow.created_at, updatedAt: updatedRow.updated_at,
        },
      });

      addActivity(card.id, agent.id, 'ok', 'handoff complete', null);

      // Trigger next column's owner
      bus.emit('card:entered', { cardId: card.id, column: toColumn });
    }
  }

  bus.emit('ws:broadcast', { type: 'agent:status', agentId: agent.id, status: 'idle' });
}
