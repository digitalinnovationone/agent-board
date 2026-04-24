import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import db from '../db.js';
import { bus } from '../events.js';
import type { Agent, Glyph, Column } from '../types.js';

function rowToAgent(row: Record<string, unknown>): Agent {
  return {
    id: row.id as string,
    name: row.name as string,
    role: row.role as string,
    glyph: row.glyph as Glyph,
    hue: row.hue as number,
    systemPrompt: row.system_prompt as string | null,
    tools: JSON.parse(row.tools as string),
    ownsColumn: row.owns_column as Column | null,
    createdAt: row.created_at as number,
    status: 'idle',
  };
}

const AgentBody = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  glyph: z.enum(['triangle', 'square', 'diamond', 'circle', 'hex', 'chevron']),
  hue: z.number().int().min(0).max(360),
  systemPrompt: z.string().nullable().optional(),
  tools: z.array(z.string()),
  ownsColumn: z
    .enum(['Backlog', 'Specification', 'Development', 'Testing', 'Deploy', 'Done'])
    .nullable()
    .optional(),
});

export async function agentRoutes(app: FastifyInstance) {
  app.get('/api/agents', async () => {
    const rows = db.prepare('SELECT * FROM agents ORDER BY created_at ASC').all() as Record<string, unknown>[];
    return rows.map(rowToAgent);
  });

  app.post('/api/agents', async (req, reply) => {
    const body = AgentBody.parse(req.body);
    const id = body.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const now = Date.now();

    db.prepare(`
      INSERT INTO agents (id, name, role, glyph, hue, system_prompt, tools, owns_column, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.name,
      body.role,
      body.glyph,
      body.hue,
      body.systemPrompt ?? null,
      JSON.stringify(body.tools),
      body.ownsColumn ?? null,
      now,
    );

    const agent = rowToAgent(
      db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Record<string, unknown>
    );
    bus.emit('ws:broadcast', { type: 'agent:created', agent });
    reply.status(201);
    return agent;
  });

  app.patch('/api/agents/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) return reply.status(404).send({ error: 'Not found' });

    const body = AgentBody.partial().parse(req.body);
    const fields: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
    if (body.role !== undefined) { fields.push('role = ?'); values.push(body.role); }
    if (body.glyph !== undefined) { fields.push('glyph = ?'); values.push(body.glyph); }
    if (body.hue !== undefined) { fields.push('hue = ?'); values.push(body.hue); }
    if (body.systemPrompt !== undefined) { fields.push('system_prompt = ?'); values.push(body.systemPrompt); }
    if (body.tools !== undefined) { fields.push('tools = ?'); values.push(JSON.stringify(body.tools)); }
    if (body.ownsColumn !== undefined) { fields.push('owns_column = ?'); values.push(body.ownsColumn); }

    if (fields.length === 0) return reply.status(400).send({ error: 'No fields to update' });
    values.push(id);

    db.prepare(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const agent = rowToAgent(
      db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Record<string, unknown>
    );
    bus.emit('ws:broadcast', { type: 'agent:updated', agent });
    return agent;
  });

  app.delete('/api/agents/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    if (!existing) return reply.status(404).send({ error: 'Not found' });

    const agent = rowToAgent(existing as Record<string, unknown>);
    db.prepare('DELETE FROM agents WHERE id = ?').run(id);
    bus.emit('ws:broadcast', { type: 'agent:deleted', agent });
    return { ok: true };
  });
}
