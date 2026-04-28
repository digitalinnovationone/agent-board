import { useReducer, useCallback } from 'react';
import type { Agent, Card, CardDetail, StatusSnapshot, WsEvent } from '@agent-board/types';

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
  | { type: 'APPLY_WS_EVENT'; event: WsEvent };

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
    case 'APPLY_WS_EVENT': {
      const ev = action.event;
      switch (ev.type) {
        case 'agent:created':
        case 'agent:updated':
          return { ...state, agents: { ...state.agents, [ev.agent.id]: ev.agent } };
        case 'agent:deleted': {
          const agents = { ...state.agents };
          delete agents[ev.agent.id];
          const uiOpenAgentId = state.uiOpenAgentId === ev.agent.id ? null : state.uiOpenAgentId;
          return { ...state, agents, uiOpenAgentId };
        }
        case 'card:created':
        case 'card:updated':
        case 'card:moved': {
          if (ev.type === 'card:moved') {
            const card = state.cards[ev.cardId];
            if (!card) return state;
            return { ...state, cards: { ...state.cards, [ev.cardId]: { ...card, column: ev.to } } };
          }
          return { ...state, cards: { ...state.cards, [ev.card.id]: ev.card } };
        }
        case 'card:deleted': {
          const cards = { ...state.cards };
          delete cards[ev.cardId];
          const uiOpenCardId = state.uiOpenCardId === ev.cardId ? null : state.uiOpenCardId;
          return { ...state, cards, uiOpenCardId };
        }
        case 'card:blocked': {
          const card = state.cards[ev.cardId];
          if (!card) return state;
          return { ...state, cards: { ...state.cards, [ev.cardId]: { ...card, blocked: true, blockReason: ev.reason ?? null } } };
        }
        case 'card:unblocked': {
          const card = state.cards[ev.cardId];
          if (!card) return state;
          return { ...state, cards: { ...state.cards, [ev.cardId]: { ...card, blocked: false, blockReason: null } } };
        }
        case 'agent:status': {
          const agent = state.agents[ev.agentId];
          if (!agent) return state;
          return { ...state, agents: { ...state.agents, [ev.agentId]: { ...agent, status: ev.status } } };
        }
        case 'status':
          return { ...state, status: ev.payload };
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
