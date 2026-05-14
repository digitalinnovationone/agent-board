import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import db from '../db.js';
import { bus } from '../events.js';
import type { Card, CardDetail, Activity, Artifact, Comment, AcceptanceItem, Column, Priority } from '../types.js';

function rowToCard(row: Record<string, unknown>): Card {
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
    backlogPosition: row.backlog_position as number | null,
    hidden: Boolean(row.hidden),
  };
}

function rowToActivity(row: Record<string, unknown>): Activity {
  return {
    id: row.id as number,
    cardId: row.card_id as string,
    agentId: row.agent_id as string | null,
    kind: row.kind as Activity['kind'],
    verb: row.verb as string,
    target: row.target as string | null,
    t: row.t as number,
  };
}

function rowToArtifact(row: Record<string, unknown>): Artifact {
  return {
    id: row.id as number,
    cardId: row.card_id as string,
    agentId: row.agent_id as string,
    kind: row.kind as Artifact['kind'],
    title: row.title as string,
    meta: row.meta as string | null,
    path: row.path as string | null,
    t: row.t as number,
  };
}

function rowToComment(row: Record<string, unknown>): Comment {
  return {
    id: row.id as number,
    cardId: row.card_id as string,
    author: row.author as string,
    text: row.text as string,
    addresses: row.addresses as string | null,
    t: row.t as number,
  };
}

function nextCardId(): string {
  const last = db.prepare(`SELECT id FROM cards ORDER BY created_at DESC LIMIT 1`).get() as { id: string } | undefined;
  if (!last) return 'US-01';
  const num = parseInt(last.id.replace('US-', ''), 10);
  return `US-${String(num + 1).padStart(2, '0')}`;
}

const NewCardBody = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  priority: z.enum(['L', 'M', 'H']).default('M'),
  acceptance: z.array(z.string()).default([]),
  startIn: z.string().optional(),
});

const PatchCardBody = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['L', 'M', 'H']).optional(),
  acceptance: z.array(z.object({ text: z.string(), done: z.boolean() })).optional(),
  hidden: z.boolean().optional(),
});

export async function cardRoutes(app: FastifyInstance) {
  app.get('/api/cards', async () => {
    const rows = db.prepare('SELECT * FROM cards ORDER BY created_at DESC').all() as Record<string, unknown>[];
    return rows.map(rowToCard);
  });

  app.get('/api/cards/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return reply.status(404).send({ error: 'Not found' });

    const card = rowToCard(row);
    const activities = (db.prepare('SELECT * FROM activity WHERE card_id = ? ORDER BY t ASC').all(id) as Record<string, unknown>[]).map(rowToActivity);
    const artifacts = (db.prepare('SELECT * FROM artifacts WHERE card_id = ? ORDER BY t ASC').all(id) as Record<string, unknown>[]).map(rowToArtifact);
    const comments = (db.prepare('SELECT * FROM comments WHERE card_id = ? ORDER BY t ASC').all(id) as Record<string, unknown>[]).map(rowToComment);

    const detail: CardDetail = { ...card, activity: activities, artifacts, comments };
    return detail;
  });

  app.post('/api/cards', async (req, reply) => {
    const body = NewCardBody.parse(req.body);
    const id = nextCardId();
    const now = Date.now();
    const column: Column = body.startIn ?? 'Backlog';
    const acceptance: AcceptanceItem[] = body.acceptance.map((text) => ({ text, done: false }));

    let backlogPosition: number | null = null;
    if (column === 'Backlog') {
      const maxRow = db.prepare(
        "SELECT MAX(backlog_position) as m FROM cards WHERE column = 'Backlog'"
      ).get() as { m: number | null };
      backlogPosition = (maxRow.m ?? 0) + 1;
    }

    db.prepare(`
      INSERT INTO cards (id, title, description, priority, column, blocked, acceptance, created_at, updated_at, backlog_position)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `).run(id, body.title, body.description, body.priority, column, JSON.stringify(acceptance), now, now, backlogPosition);

    const card = rowToCard(db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Record<string, unknown>);
    bus.emit('ws:broadcast', { type: 'card:created', card });
    bus.emit('card:entered', { cardId: id, column });

    reply.status(201);
    return card;
  });

  app.patch('/api/cards/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) return reply.status(404).send({ error: 'Not found' });

    const body = PatchCardBody.parse(req.body);
    const now = Date.now();
    const fields: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title); }
    if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description); }
    if (body.priority !== undefined) { fields.push('priority = ?'); values.push(body.priority); }
    if (body.acceptance !== undefined) { fields.push('acceptance = ?'); values.push(JSON.stringify(body.acceptance)); }
    if (body.hidden !== undefined) { fields.push('hidden = ?'); values.push(body.hidden ? 1 : 0); }

    values.push(id);
    db.prepare(`UPDATE cards SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const card = rowToCard(db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Record<string, unknown>);
    bus.emit('ws:broadcast', { type: 'card:updated', card });
    return card;
  });

  app.delete('/api/cards/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT id FROM cards WHERE id = ?').get(id);
    if (!row) return reply.status(404).send({ error: 'Not found' });

    db.transaction(() => {
      db.prepare('DELETE FROM activity WHERE card_id = ?').run(id);
      db.prepare('DELETE FROM artifacts WHERE card_id = ?').run(id);
      db.prepare('DELETE FROM comments WHERE card_id = ?').run(id);
      db.prepare('DELETE FROM cards WHERE id = ?').run(id);
    })();

    bus.emit('ws:broadcast', { type: 'card:deleted', cardId: id });
    return { ok: true };
  });

  app.post('/api/cards/:id/hide', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return reply.status(404).send({ error: 'Not found' });
    const now = Date.now();
    db.prepare('UPDATE cards SET hidden = 1, updated_at = ? WHERE id = ?').run(now, id);
    const card = rowToCard(db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Record<string, unknown>);
    bus.emit('ws:broadcast', { type: 'card:updated', card });
    return card;
  });

  app.post('/api/cards/:id/unhide', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return reply.status(404).send({ error: 'Not found' });
    const now = Date.now();
    db.prepare('UPDATE cards SET hidden = 0, updated_at = ? WHERE id = ?').run(now, id);
    const card = rowToCard(db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Record<string, unknown>);
    bus.emit('ws:broadcast', { type: 'card:updated', card });
    return card;
  });

  app.post('/api/cards/backlog/reorder', async (req, reply) => {
    const { ids } = z.object({ ids: z.array(z.string()) }).parse(req.body);
    db.transaction(() => {
      ids.forEach((id, i) => db.prepare('UPDATE cards SET backlog_position = ? WHERE id = ?').run(i + 1, id));
    })();
    bus.emit('ws:broadcast', { type: 'backlog:reordered', ids });
    return { ok: true };
  });

  app.post('/api/cards/:id/start', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT id, column, blocked FROM cards WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return reply.status(404).send({ error: 'Not found' });
    if (row.column !== 'Backlog') return reply.status(400).send({ error: 'Card is not in Backlog' });
    if (row.blocked) return reply.status(400).send({ error: 'Card is blocked' });
    bus.emit('card:start', { cardId: id });
    return { ok: true };
  });

  app.post('/api/cards/:id/unblock', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return reply.status(404).send({ error: 'Not found' });

    const body = z.object({ note: z.string().optional() }).parse(req.body ?? {});
    const now = Date.now();

    db.prepare(`UPDATE cards SET blocked = 0, block_reason = NULL, updated_at = ? WHERE id = ?`).run(now, id);

    db.prepare(`INSERT INTO activity (card_id, agent_id, kind, verb, target, t) VALUES (?, NULL, 'unblock', 'unblocked card', ?, ?)`).run(
      id,
      body.note ?? null,
      now,
    );

    const card = rowToCard(db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Record<string, unknown>);
    bus.emit('ws:broadcast', { type: 'card:unblocked', cardId: id });
    bus.emit('ws:broadcast', { type: 'card:updated', card });
    bus.emit('card:entered', { cardId: id, column: card.column });
    return card;
  });
}
