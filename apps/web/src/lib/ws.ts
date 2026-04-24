import type { WsEvent } from '@agent-board/types';

type Listener = (event: WsEvent) => void;

const WS_URL = 'ws://localhost:4000/ws';

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 500;
const listeners = new Set<Listener>();
let onStatusChange: ((connected: boolean) => void) | null = null;

function connect() {
  socket = new WebSocket(WS_URL);

  socket.addEventListener('open', () => {
    reconnectDelay = 500;
    onStatusChange?.(true);
  });

  socket.addEventListener('message', (ev) => {
    try {
      const event = JSON.parse(ev.data as string) as WsEvent;
      for (const listener of listeners) {
        listener(event);
      }
    } catch {
      // ignore malformed messages
    }
  });

  socket.addEventListener('close', () => {
    socket = null;
    onStatusChange?.(false);
    scheduleReconnect();
  });

  socket.addEventListener('error', () => {
    socket?.close();
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 2, 5000);
    connect();
  }, reconnectDelay);
}

export const ws = {
  connect() {
    connect();
  },

  onStatus(cb: (connected: boolean) => void) {
    onStatusChange = cb;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};
