import type { WsEvent } from '@agent-board/types';

type Listener = (event: WsEvent) => void;
type StatusListener = (connected: boolean) => void;

const WS_URL = 'ws://localhost:4000/ws';

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 500;
const listeners = new Set<Listener>();
let statusListener: StatusListener | null = null;

function connect() {
  // Guard against double-connect (React StrictMode fires effects twice)
  if (socket && socket.readyState < 2) return;

  socket = new WebSocket(WS_URL);

  socket.addEventListener('open', () => {
    reconnectDelay = 500;
    statusListener?.(true);
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
    statusListener?.(false);
    scheduleReconnect();
  });

  socket.addEventListener('error', () => {
    // close will fire immediately after, which handles reconnect
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

  onStatus(cb: StatusListener) {
    statusListener = cb;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};
