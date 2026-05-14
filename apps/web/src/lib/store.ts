import { useReducer, useCallback } from 'react';
import type { ActivityFeedEntry, Agent, Card, CardDetail, ColumnDef, StatusSnapshot, WsEvent } from '@agent-board/types';

export type WsState = 'connecting' | 'connected' | 'disconnected';

export interface AppState {
  status: StatusSnapshot;
  wsConnected: boolean;
  wsState: WsState;
  agents: Record<string, Agent>;
  cards: Record<string, Card>;
  cardDetails: Record<string, CardDetail>;
  uiOpenCardId: string | null;
  uiOpenAgentId: string | null;
  uiOpenModal: 'new-card' | 'new-agent' | null;
  panels: { agentsOpen: boolean; logOpen: boolean };
  workDir: string;
  columns: ColumnDef[];
  activityFeed: ActivityFeedEntry[];
}

const initialStatus: StatusSnapshot = {
  connected: false,
  model: 'claude-sonnet-4-5',
  leadAvg: null,
  leadMedian: null,
  doneWeek: 0,
  inFlight: 0,
  blocked: 0,
};

export const initialState: AppState = {
  status: initialStatus,
  wsConnected: false,
  wsState: 'connecting',
  agents: {},
  cards: {},
  cardDetails: {},
  uiOpenCardId: null,
  uiOpenAgentId: null,
  uiOpenModal: null,
  panels: { agentsOpen: true, logOpen: true },
  workDir: '',
  columns: [],
  activityFeed: [],
};

type Action =
  | { type: 'SET_STATUS'; payload: StatusSnapshot }
  | { type: 'SET_WS_CONNECTED'; connected: boolean }
  | { type: 'SET_AGENTS'; agents: Agent[] }
  | { type: 'SET_CARDS'; cards: Card[] }
  | { type: 'UPSERT_AGENT'; agent: Agent }
  | { type: 'DELETE_AGENT'; id: string }
  | { type: 'UPSERT_CARD'; card: Card }
  | { type: 'SET_CARD_DETAIL'; detail: CardDetail }
  | { type: 'OPEN_CARD'; id: string }
  | { type: 'CLOSE_CARD' }
  | { type: 'OPEN_AGENT'; id: string }
  | { type: 'CLOSE_AGENT' }
  | { type: 'OPEN_MODAL'; modal: 'new-card' | 'new-agent' }
  | { type: 'CLOSE_MODAL' }
  | { type: 'TOGGLE_AGENTS_RAIL' }
  | { type: 'TOGGLE_LOG_RAIL' }
  | { type: 'SET_WORK_DIR'; workDir: string }
  | { type: 'SET_COLUMNS'; columns: ColumnDef[] }
  | { type: 'APPLY_WS_EVENT'; event: WsEvent };

let _feedSeq = 0;
function mkEntry(
  eventType: WsEvent['type'],
  label: string,
  extras?: { cardId?: string; agentId?: string }
): ActivityFeedEntry {
  return { id: `${Date.now()}-${++_feedSeq}`, timestamp: Date.now(), eventType, label, ...extras };
}

function pushFeed(feed: ActivityFeedEntry[], entry: ActivityFeedEntry): ActivityFeedEntry[] {
  const next = [entry, ...feed];
  return next.length > 200 ? next.slice(0, 200) : next;
}

function computeInFlight(cards: Record<string, Card>): number {
  return Object.values(cards).filter(
    (c) => c.column !== 'Backlog' && c.column !== 'Done' && !c.blocked
  ).length;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_WS_CONNECTED':
      return {
        ...state,
        wsConnected: action.connected,
        wsState: action.connected ? 'connected' : 'disconnected',
      };
    case 'SET_AGENTS': {
      const agents: Record<string, Agent> = {};
      for (const a of action.agents) agents[a.id] = a;
      return { ...state, agents };
    }
    case 'SET_CARDS': {
      const cards: Record<string, Card> = {};
      for (const c of action.cards) cards[c.id] = c;
      return { ...state, cards };
    }
    case 'UPSERT_AGENT':
      return { ...state, agents: { ...state.agents, [action.agent.id]: action.agent } };
    case 'DELETE_AGENT': {
      const agents = { ...state.agents };
      delete agents[action.id];
      return { ...state, agents };
    }
    case 'UPSERT_CARD':
      return { ...state, cards: { ...state.cards, [action.card.id]: action.card } };
    case 'SET_CARD_DETAIL': {
      const card = action.detail;
      return {
        ...state,
        cards: { ...state.cards, [card.id]: card },
        cardDetails: { ...state.cardDetails, [card.id]: action.detail },
      };
    }
    case 'OPEN_CARD':
      return { ...state, uiOpenCardId: action.id };
    case 'CLOSE_CARD':
      return { ...state, uiOpenCardId: null };
    case 'OPEN_AGENT':
      return { ...state, uiOpenAgentId: action.id };
    case 'CLOSE_AGENT':
      return { ...state, uiOpenAgentId: null };
    case 'OPEN_MODAL':
      return { ...state, uiOpenModal: action.modal };
    case 'CLOSE_MODAL':
      return { ...state, uiOpenModal: null };
    case 'TOGGLE_AGENTS_RAIL':
      return { ...state, panels: { ...state.panels, agentsOpen: !state.panels.agentsOpen } };
    case 'TOGGLE_LOG_RAIL':
      return { ...state, panels: { ...state.panels, logOpen: !state.panels.logOpen } };
    case 'SET_WORK_DIR':
      return { ...state, workDir: action.workDir };
    case 'SET_COLUMNS':
      return { ...state, columns: action.columns };
    case 'APPLY_WS_EVENT': {
      const ev = action.event;
      switch (ev.type) {
        case 'agent:created':
          return {
            ...state,
            agents: { ...state.agents, [ev.agent.id]: ev.agent },
            activityFeed: pushFeed(state.activityFeed, mkEntry('agent:created', `${ev.agent.name} joined`, { agentId: ev.agent.id })),
          };
        case 'agent:updated':
          return { ...state, agents: { ...state.agents, [ev.agent.id]: ev.agent } };
        case 'agent:deleted': {
          const agents = { ...state.agents };
          delete agents[ev.agent.id];
          const uiOpenAgentId = state.uiOpenAgentId === ev.agent.id ? null : state.uiOpenAgentId;
          return {
            ...state,
            agents,
            uiOpenAgentId,
            activityFeed: pushFeed(state.activityFeed, mkEntry('agent:deleted', `${ev.agent.name} removed`)),
          };
        }
        case 'card:created': {
          const newCards = { ...state.cards, [ev.card.id]: ev.card };
          return {
            ...state,
            cards: newCards,
            status: { ...state.status, inFlight: computeInFlight(newCards) },
            activityFeed: pushFeed(state.activityFeed, mkEntry('card:created', `"${ev.card.title}" added to ${ev.card.column}`, { cardId: ev.card.id })),
          };
        }
        case 'card:updated': {
          const newCards = { ...state.cards, [ev.card.id]: ev.card };
          return { ...state, cards: newCards, status: { ...state.status, inFlight: computeInFlight(newCards) } };
        }
        case 'card:moved': {
          const card = state.cards[ev.cardId];
          if (!card) return state;
          const newCards = { ...state.cards, [ev.cardId]: { ...card, column: ev.to } };
          return {
            ...state,
            cards: newCards,
            status: { ...state.status, inFlight: computeInFlight(newCards) },
            activityFeed: pushFeed(state.activityFeed, mkEntry('card:moved', `"${card.title}" → ${ev.to}`, { cardId: ev.cardId })),
          };
        }
        case 'card:deleted': {
          const deletedCard = state.cards[ev.cardId];
          const cards = { ...state.cards };
          delete cards[ev.cardId];
          const uiOpenCardId = state.uiOpenCardId === ev.cardId ? null : state.uiOpenCardId;
          return {
            ...state,
            cards,
            uiOpenCardId,
            status: { ...state.status, inFlight: computeInFlight(cards) },
            activityFeed: pushFeed(state.activityFeed, mkEntry('card:deleted', deletedCard ? `"${deletedCard.title}" deleted` : 'Card deleted', { cardId: ev.cardId })),
          };
        }
        case 'card:blocked': {
          const card = state.cards[ev.cardId];
          if (!card) return state;
          const newCards = { ...state.cards, [ev.cardId]: { ...card, blocked: true, blockReason: ev.reason ?? null } };
          return {
            ...state,
            cards: newCards,
            status: { ...state.status, inFlight: computeInFlight(newCards) },
            activityFeed: pushFeed(state.activityFeed, mkEntry('card:blocked', `"${card.title}" blocked${ev.reason ? `: ${ev.reason}` : ''}`, { cardId: ev.cardId })),
          };
        }
        case 'card:unblocked': {
          const card = state.cards[ev.cardId];
          if (!card) return state;
          const newCards = { ...state.cards, [ev.cardId]: { ...card, blocked: false, blockReason: null } };
          return {
            ...state,
            cards: newCards,
            status: { ...state.status, inFlight: computeInFlight(newCards) },
            activityFeed: pushFeed(state.activityFeed, mkEntry('card:unblocked', `"${card.title}" unblocked`, { cardId: ev.cardId })),
          };
        }
        case 'agent:status': {
          const agent = state.agents[ev.agentId];
          if (!agent) return state;
          const updated = { ...agent, status: ev.status, cardId: ev.status === 'working' ? ev.cardId : undefined };
          const card = ev.cardId ? state.cards[ev.cardId] : undefined;
          const label = ev.status === 'working'
            ? `${agent.name} started${card ? ` "${card.title}"` : ''}`
            : `${agent.name} idle`;
          return {
            ...state,
            agents: { ...state.agents, [ev.agentId]: updated },
            activityFeed: pushFeed(state.activityFeed, mkEntry('agent:status', label, { agentId: ev.agentId, cardId: ev.cardId })),
          };
        }
        case 'activity:added': {
          const label = ev.activity.target
            ? `${ev.activity.verb} "${ev.activity.target}"`
            : ev.activity.verb;
          return {
            ...state,
            activityFeed: pushFeed(state.activityFeed, mkEntry('activity:added', label, { cardId: ev.cardId, agentId: ev.activity.agentId ?? undefined })),
          };
        }
        case 'artifact:added': {
          const card = state.cards[ev.cardId];
          const label = card
            ? `${ev.artifact.kind}: ${ev.artifact.title} on "${card.title}"`
            : `${ev.artifact.kind}: ${ev.artifact.title}`;
          return {
            ...state,
            activityFeed: pushFeed(state.activityFeed, mkEntry('artifact:added', label, { cardId: ev.cardId })),
          };
        }
        case 'comment:added': {
          const card = state.cards[ev.cardId];
          const preview = ev.comment.text.length > 60 ? ev.comment.text.slice(0, 60) + '…' : ev.comment.text;
          const label = card ? `Comment on "${card.title}": ${preview}` : `Comment: ${preview}`;
          return {
            ...state,
            activityFeed: pushFeed(state.activityFeed, mkEntry('comment:added', label, { cardId: ev.cardId })),
          };
        }
        case 'backlog:reordered': {
          const cards = { ...state.cards };
          ev.ids.forEach((id, i) => {
            if (cards[id]) cards[id] = { ...cards[id], backlogPosition: i + 1 };
          });
          return { ...state, cards };
        }
        case 'status':
          return { ...state, status: ev.payload };
        case 'columns:updated':
          return { ...state, columns: ev.columns };
        default:
          return state;
      }
    }
    default:
      return state;
  }
}

export function useAppStore() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const applyWsEvent = useCallback((event: WsEvent) => {
    dispatch({ type: 'APPLY_WS_EVENT', event });
  }, []);

  return { state, dispatch, applyWsEvent };
}
