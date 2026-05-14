import type { Agent, Card, CardDetail, ColumnDef, Comment, StatusSnapshot } from '@agent-board/types';

const BASE = 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body != null;
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...(hasBody ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status} ${err}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  status: () => request<StatusSnapshot>('/api/status'),
  config: {
    get: () => request<{ workDir: string }>('/api/config'),
    patch: (workDir: string) => request<{ workDir: string }>('/api/config', { method: 'PATCH', body: JSON.stringify({ workDir }) }),
  },
  agents: {
    list: () => request<Agent[]>('/api/agents'),
    create: (body: Partial<Agent>) => request<Agent>('/api/agents', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Agent>) => request<Agent>(`/api/agents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request<{ ok: boolean }>(`/api/agents/${id}`, { method: 'DELETE' }),
  },
  cards: {
    list: () => request<Card[]>('/api/cards'),
    get: (id: string) => request<CardDetail>(`/api/cards/${id}`),
    create: (body: { title: string; description: string; priority: string; acceptance: string[]; startIn?: string }) =>
      request<Card>('/api/cards', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Card>) => request<Card>(`/api/cards/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    unblock: (id: string, note?: string) =>
      request<Card>(`/api/cards/${id}/unblock`, { method: 'POST', body: JSON.stringify({ note }) }),
    reorderBacklog: (ids: string[]) =>
      request<{ ok: boolean }>('/api/cards/backlog/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
    start: (id: string) =>
      request<{ ok: boolean }>(`/api/cards/${id}/start`, { method: 'POST', body: JSON.stringify({}) }),
    delete: (id: string) => request<{ ok: boolean }>(`/api/cards/${id}`, { method: 'DELETE' }),
    hide: (id: string) => request<Card>(`/api/cards/${id}/hide`, { method: 'POST', body: '{}' }),
    unhide: (id: string) => request<Card>(`/api/cards/${id}/unhide`, { method: 'POST', body: '{}' }),
  },
  comments: {
    create: (cardId: string, body: { text: string; addresses?: string }) =>
      request<Comment>(`/api/cards/${cardId}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  },
  columns: {
    list: () => request<ColumnDef[]>('/api/columns'),
    create: (name: string) => request<ColumnDef>('/api/columns', { method: 'POST', body: JSON.stringify({ name }) }),
    delete: (name: string) => request<{ ok: boolean }>(`/api/columns/${encodeURIComponent(name)}`, { method: 'DELETE' }),
    patch: (name: string, body: { name?: string; wipCap?: number }) =>
      request<ColumnDef>(`/api/columns/${encodeURIComponent(name)}`, { method: 'PATCH', body: JSON.stringify(body) }),
    reorder: (names: string[]) =>
      request<ColumnDef[]>('/api/columns/reorder', { method: 'POST', body: JSON.stringify({ names }) }),
  },
};
