import type { FastifyInstance } from 'fastify';
import { z } from 'zod/v4';
import db from '../db.js';

function getWorkDir(): string {
  const row = db.prepare("SELECT value FROM config WHERE key = 'work_dir'").get() as { value: string } | undefined;
  return row?.value ?? process.env.CLAUDE_CODE_WORK_DIR ?? process.cwd();
}

export async function configRoutes(app: FastifyInstance) {
  app.get('/api/config', async () => {
    return { workDir: getWorkDir() };
  });

  app.patch('/api/config', async (req, reply) => {
    const body = z.object({ workDir: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'workDir is required' });

    db.prepare("INSERT INTO config (key, value) VALUES ('work_dir', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(body.data.workDir);

    return { workDir: body.data.workDir };
  });
}
