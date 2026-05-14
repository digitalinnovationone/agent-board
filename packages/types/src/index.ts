export type Column = string;

export type ThinkingMode = 'auto' | 'think' | 'think-hard';

export const CLAUDE_MODELS = [
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
  { id: 'claude-sonnet-4-6',         label: 'Sonnet 4.6' },
  { id: 'claude-opus-4-7',           label: 'Opus 4.7'  },
] as const;

export interface ColumnDef {
  name: string;
  position: number;
  wipCap: number;
  locked: boolean;
}

export type Glyph =
  | 'triangle'
  | 'square'
  | 'diamond'
  | 'circle'
  | 'hex'
  | 'chevron';

export type Priority = 'L' | 'M' | 'H';

export type ActivityKind =
  | 'work'
  | 'ok'
  | 'warn'
  | 'note'
  | 'move'
  | 'block'
  | 'unblock';

export type ArtifactKind = 'spec' | 'branch' | 'test' | 'deploy';

export interface Agent {
  id: string;
  name: string;
  role: string;
  glyph: Glyph;
  hue: number;
  avatar: string | null;
  systemPrompt: string | null;
  tools: string[];
  ownsColumn: Column | null;
  model: string;
  thinkingMode: ThinkingMode;
  createdAt: number;
  status?: 'idle' | 'working';
  cardId?: string;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  column: Column;
  blocked: boolean;
  blockReason: string | null;
  acceptance: AcceptanceItem[];
  createdAt: number;
  updatedAt: number;
  backlogPosition: number | null;
}

export interface AcceptanceItem {
  text: string;
  done: boolean;
}

export interface Activity {
  id: number;
  cardId: string;
  agentId: string | null;
  kind: ActivityKind;
  verb: string;
  target: string | null;
  t: number;
}

export interface Artifact {
  id: number;
  cardId: string;
  agentId: string;
  kind: ArtifactKind;
  title: string;
  meta: string | null;
  path: string | null;
  t: number;
}

export interface Comment {
  id: number;
  cardId: string;
  author: string;
  text: string;
  addresses: string | null;
  t: number;
}

export interface CardDetail extends Card {
  artifacts: Artifact[];
  activity: Activity[];
  comments: Comment[];
}

export interface StatusSnapshot {
  connected: boolean;
  model: string;
  leadAvg: number | null;
  leadMedian: number | null;
  doneWeek: number;
  inFlight: number;
  blocked: number;
}

export interface ActivityFeedEntry {
  id: string;
  timestamp: number;
  eventType: WsEvent['type'];
  label: string;
  cardId?: string;
  agentId?: string;
}

export type WsEvent =
  | { type: 'agent:created' | 'agent:updated' | 'agent:deleted'; agent: Agent }
  | { type: 'card:created' | 'card:updated'; card: Card }
  | { type: 'card:moved'; cardId: string; from: Column; to: Column }
  | { type: 'card:blocked' | 'card:unblocked'; cardId: string; reason?: string }
  | { type: 'card:deleted'; cardId: string }
  | { type: 'activity:added'; cardId: string; activity: Activity }
  | { type: 'artifact:added'; cardId: string; artifact: Artifact }
  | { type: 'comment:added'; cardId: string; comment: Comment }
  | { type: 'agent:status'; agentId: string; status: 'idle' | 'working'; cardId?: string }
  | { type: 'status'; payload: StatusSnapshot }
  | { type: 'backlog:reordered'; ids: string[] }
  | { type: 'columns:updated'; columns: ColumnDef[] };
