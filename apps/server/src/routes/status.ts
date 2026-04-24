import type { FastifyInstance } from 'fastify';
import db from '../db.js';

export async function statusRoutes(app: FastifyInstance) {
  app.get('/api/status', async () => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const doneWeek = (db.prepare(
      `SELECT COUNT(*) as c FROM cards WHERE column = 'Done' AND updated_at > ?`
    ).get(weekAgo) as { c: number }).c;

    const inFlight = (db.prepare(
      `SELECT COUNT(*) as c FROM cards WHERE column NOT IN ('Backlog','Done') AND blocked = 0`
    ).get() as { c: number }).c;

    const blocked = (db.prepare(
      `SELECT COUNT(*) as c FROM cards WHERE blocked = 1`
    ).get() as { c: number }).c;

    const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);

    return {
      connected: hasKey,
      model: 'claude-sonnet-4-5',
      leadAvg: null,
      leadMedian: null,
      doneWeek,
      inFlight,
      blocked,
    };
  });
}
