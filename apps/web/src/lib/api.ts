import type { Agent, Card, CardDetail, Comment, StatusSnapshot } from '@agent-board/types';

const BASE = 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
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
  },
  comments: {
    create: (cardId: string, body: { text: string; addresses?: string }) =>
      request<Comment>(`/api/cards/${cardId}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  },
};
