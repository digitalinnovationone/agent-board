export type {
  Agent,
  Card,
  CardDetail,
  Activity,
  Artifact,
  Comment,
  AcceptanceItem,
  Column,
  Glyph,
  Priority,
  ActivityKind,
  ArtifactKind,
  StatusSnapshot,
  WsEvent,
} from '@agent-board/types';

export const COLUMNS = [
  'Backlog',
  'Specification',
  'Development',
  'Testing',
  'Deploy',
  'Done',
] as const;
