import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { bus } from './events.js';
import type { WsEvent } from './types.js';

const clients = new Set<WebSocket>();

export function registerWs(app: FastifyInstance) {
  app.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket);

    socket.on('close', () => {
      clients.delete(socket);
    });

    socket.on('error', () => {
      clients.delete(socket);
    });
  });
}

export function broadcast(event: WsEvent) {
  const msg = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(msg);
    }
  }
}

bus.on('ws:broadcast', (event) => {
  broadcast(event);
});
