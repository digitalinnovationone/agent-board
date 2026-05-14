import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import db from '../db.js';
import { bus } from '../events.js';
import type { ColumnDef } from '../types.js';

function rowToColumnDef(row: Record<string, unknown>): ColumnDef {
  return {
    name: row.name as string,
    position: row.position as number,
    wipCap: row.wip_cap as number,
    locked: Boolean(row.locked),
  };
}

function broadcastColumns() {
  const columns = (db.prepare('SELECT * FROM columns ORDER BY position').all() as Record<string, unknown>[]).map(rowToColumnDef);
  bus.emit('ws:broadcast', { type: 'columns:updated', columns });
  return columns;
}

export async function columnRoutes(app: FastifyInstance) {
  app.get('/api/columns', async () => {
    const rows = db.prepare('SELECT * FROM columns ORDER BY position').all() as Record<string, unknown>[];
    return rows.map(rowToColumnDef);
  });

  app.post('/api/columns', async (req, reply) => {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);

    const existing = db.prepare('SELECT name FROM columns WHERE name = ?').get(name);
    if (existing) return reply.status(409).send({ error: 'Column name already exists' });

    const doneRow = db.prepare("SELECT position FROM columns WHERE name = 'Done'").get() as { position: number };
    const newPosition = doneRow.position;

    db.transaction(() => {
      db.prepare('UPDATE columns SET position = position + 1 WHERE position >= ?').run(newPosition);
      db.prepare('INSERT INTO columns (name, position, wip_cap, locked) VALUES (?, ?, 2, 0)').run(name, newPosition);
    })();

    const col = rowToColumnDef(db.prepare('SELECT * FROM columns WHERE name = ?').get(name) as Record<string, unknown>);
    broadcastColumns();
    reply.status(201);
    return col;
  });

  app.delete('/api/columns/:name', async (req, reply) => {
    const { name } = req.params as { name: string };
    const col = db.prepare('SELECT * FROM columns WHERE name = ?').get(name) as Record<string, unknown> | undefined;
    if (!col) return reply.status(404).send({ error: 'Not found' });
    if (col.locked) return reply.status(400).send({ error: 'Cannot delete a locked column' });

    const cardCount = (db.prepare('SELECT COUNT(*) as c FROM cards WHERE column = ?').get(name) as { c: number }).c;
    if (cardCount > 0) return reply.status(409).send({ error: `Column has ${cardCount} card(s) — move or delete them first` });

    const deletedPosition = col.position as number;
    db.transaction(() => {
      db.prepare('DELETE FROM columns WHERE name = ?').run(name);
      db.prepare('UPDATE columns SET position = position - 1 WHERE position > ?').run(deletedPosition);
    })();

    broadcastColumns();
    return { ok: true };
  });

  app.patch('/api/columns/:name', async (req, reply) => {
    const { name } = req.params as { name: string };
    const col = db.prepare('SELECT * FROM columns WHERE name = ?').get(name) as Record<string, unknown> | undefined;
    if (!col) return reply.status(404).send({ error: 'Not found' });

    const body = z.object({
      name: z.string().min(1).optional(),
      wipCap: z.number().int().min(1).optional(),
    }).parse(req.body);

    if (body.name && body.name !== name) {
      const clash = db.prepare('SELECT name FROM columns WHERE name = ?').get(body.name);
      if (clash) return reply.status(409).send({ error: 'Column name already exists' });

      db.transaction(() => {
        db.prepare('UPDATE cards SET column = ? WHERE column = ?').run(body.name, name);
        db.prepare('UPDATE agents SET owns_column = ? WHERE owns_column = ?').run(body.name, name);
        db.prepare('UPDATE columns SET name = ? WHERE name = ?').run(body.name, name);
      })();
    }

    const finalName = body.name ?? name;
    if (body.wipCap !== undefined) {
      db.prepare('UPDATE columns SET wip_cap = ? WHERE name = ?').run(body.wipCap, finalName);
    }

    const updated = rowToColumnDef(db.prepare('SELECT * FROM columns WHERE name = ?').get(finalName) as Record<string, unknown>);
    broadcastColumns();
    return updated;
  });

  app.post('/api/columns/reorder', async (req, reply) => {
    const { names } = z.object({ names: z.array(z.string()) }).parse(req.body);

    if (names[0] !== 'Backlog') return reply.status(400).send({ error: 'First column must be Backlog' });
    if (names[names.length - 1] !== 'Done') return reply.status(400).send({ error: 'Last column must be Done' });

    const allCols = (db.prepare('SELECT name FROM columns').all() as { name: string }[]).map((r) => r.name);
    const missing = allCols.filter((c) => !names.includes(c));
    if (missing.length > 0) return reply.status(400).send({ error: `Missing columns: ${missing.join(', ')}` });

    db.transaction(() => {
      names.forEach((colName, i) => {
        db.prepare('UPDATE columns SET position = ? WHERE name = ?').run(i, colName);
      });
    })();

    return broadcastColumns();
  });
}
