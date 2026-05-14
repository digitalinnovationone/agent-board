import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import './db.js';
import { seedAgents } from './seed.js';
import { startOrchestrator } from './agents/orchestrator.js';
import { registerWs } from './ws.js';
import { statusRoutes } from './routes/status.js';
import { agentRoutes } from './routes/agents.js';
import { cardRoutes } from './routes/cards.js';
import { commentRoutes } from './routes/comments.js';
import { configRoutes } from './routes/config.js';
import { columnRoutes } from './routes/columns.js';

const app = Fastify({ logger: { level: 'warn' } });

await app.register(cors, {
  origin: 'http://localhost:5173',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
});
await app.register(websocket);

registerWs(app);
await app.register(statusRoutes);
await app.register(agentRoutes);
await app.register(cardRoutes);
await app.register(commentRoutes);
await app.register(configRoutes);
await app.register(columnRoutes);

seedAgents();
startOrchestrator();

try {
  await app.listen({ port: 4000, host: '127.0.0.1' });
  console.log('[server] Listening on http://localhost:4000');
} catch (err) {
  console.error(err);
  process.exit(1);
}
