import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import db from '../db.js';
import { bus } from '../events.js';
import type { Comment } from '../types.js';

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

const CommentBody = z.object({
  text: z.string().min(1),
  addresses: z.string().optional(),
});

export async function commentRoutes(app: FastifyInstance) {
  app.post('/api/cards/:id/comments', async (req, reply) => {
    const { id } = req.params as { id: string };
    const card = db.prepare('SELECT id FROM cards WHERE id = ?').get(id);
    if (!card) return reply.status(404).send({ error: 'Card not found' });

    const body = CommentBody.parse(req.body);
    const now = Date.now();

    const result = db.prepare(`
      INSERT INTO comments (card_id, author, text, addresses, t)
      VALUES (?, 'human', ?, ?, ?)
    `).run(id, body.text, body.addresses ?? null, now);

    const comment = rowToComment(
      db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>
    );

    bus.emit('ws:broadcast', { type: 'comment:added', cardId: id, comment });
    reply.status(201);
    return comment;
  });
}
