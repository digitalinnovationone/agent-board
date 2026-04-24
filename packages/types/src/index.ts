export type Column =
  | 'Backlog'
  | 'Specification'
  | 'Development'
  | 'Testing'
  | 'Deploy'
  | 'Done';

export const COLUMNS: Column[] = [
  'Backlog',
  'Specification',
  'Development',
  'Testing',
  'Deploy',
  'Done',
];

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
  systemPrompt: string | null;
  tools: string[];
  ownsColumn: Column | null;
  createdAt: number;
  status?: 'idle' | 'working';
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

export type WsEvent =
  | { type: 'agent:created' | 'agent:updated' | 'agent:deleted'; agent: Agent }
  | { type: 'card:created' | 'card:updated'; card: Card }
  | { type: 'card:moved'; cardId: string; from: Column; to: Column }
  | { type: 'card:blocked' | 'card:unblocked'; cardId: string; reason?: string }
  | { type: 'activity:added'; cardId: string; activity: Activity }
  | { type: 'artifact:added'; cardId: string; artifact: Artifact }
  | { type: 'comment:added'; cardId: string; comment: Comment }
  | { type: 'agent:status'; agentId: string; status: 'idle' | 'working'; cardId?: string }
  | { type: 'status'; payload: StatusSnapshot };
