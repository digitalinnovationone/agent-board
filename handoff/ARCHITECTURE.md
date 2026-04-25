# Architecture

## Repo layout (target)

```
agent-board/
├── package.json              ← root, pnpm workspaces
├── pnpm-workspace.yaml
├── .env.example              ← ANTHROPIC_API_KEY=
├── README.md                 ← install + run instructions
│
├── apps/
│   ├── web/                  ← Vite + React + TS
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── styles/
│   │       │   ├── graphite.css    ← COPIED from handoff/design-tokens/graphite.css, do not edit
│   │       │   └── app.css         ← layout + component CSS that consumes tokens
│   │       ├── lib/
│   │       │   ├── api.ts          ← REST client
│   │       │   ├── ws.ts           ← WebSocket client w/ auto-reconnect
│   │       │   └── store.ts        ← app state (Zustand or plain useReducer)
│   │       ├── components/
│   │       │   ├── AgentChip.tsx   ← glyph + hue rendering, see design-tokens/README.md
│   │       │   ├── AgentGlyph.tsx  ← the 6 SVG glyphs
│   │       │   ├── Card.tsx
│   │       │   ├── Column.tsx
│   │       │   ├── Board.tsx
│   │       │   ├── AgentsRail.tsx
│   │       │   ├── ActivityLog.tsx
│   │       │   ├── StatusBar.tsx
│   │       │   ├── CardDetailDrawer.tsx
│   │       │   ├── NewCardModal.tsx
│   │       │   └── NewAgentModal.tsx
│   │       └── features/
│   │           └── (feature-level containers if needed)
│   │
│   └── server/               ← Fastify + TS
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts            ← Fastify bootstrap, port 4000
│           ├── db.ts               ← better-sqlite3 connection + migrations
│           ├── routes/
│           │   ├── agents.ts       ← GET/POST/PATCH/DELETE /api/agents
│           │   ├── cards.ts        ← GET/POST/PATCH /api/cards
│           │   ├── comments.ts     ← POST /api/cards/:id/comments
│           │   └── status.ts       ← GET /api/status
│           ├── ws.ts               ← /ws — server broadcasts events
│           ├── events.ts           ← typed event bus (EventEmitter)
│           ├── agents/
│           │   ├── runtime.ts      ← spawns Claude Agent SDK sessions
│           │   ├── orchestrator.ts ← observes card transitions, triggers owners
│           │   └── prompts.ts      ← default system prompts per role
│           └── types.ts            ← shared types (mirrors apps/web/src/lib/types.ts)
│
├── packages/
│   └── types/                ← shared TS types between web + server
│       ├── package.json
│       └── src/index.ts
│
├── data/                     ← .gitignore'd, created at first run
│   ├── agent-board.db
│   └── artifacts/            ← specs, branches-as-text, test results
│
└── handoff/                  ← this folder, read-only reference
```

## Data model (SQLite)

```sql
CREATE TABLE agents (
  id           TEXT PRIMARY KEY,          -- 'planner', 'scribe', or nanoid for user-added
  name         TEXT NOT NULL,             -- 'Planner'
  role         TEXT NOT NULL,             -- 'Product Owner'
  glyph        TEXT NOT NULL,             -- 'triangle' | 'square' | 'diamond' | 'circle' | 'hex' | 'chevron'
  hue          INTEGER NOT NULL,          -- 0..360
  system_prompt TEXT,                     -- nullable, falls back to default per role
  tools        TEXT NOT NULL,             -- JSON array of enabled tool names
  owns_column  TEXT,                      -- nullable, which column triggers this agent
  created_at   INTEGER NOT NULL
);

CREATE TABLE cards (
  id           TEXT PRIMARY KEY,          -- 'US-17' (sequential, zero-padded to 2 digits)
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  priority     TEXT NOT NULL DEFAULT 'M', -- 'L' | 'M' | 'H'
  column       TEXT NOT NULL,             -- one of the 6 pipeline columns
  blocked      INTEGER NOT NULL DEFAULT 0,-- bool
  block_reason TEXT,
  acceptance   TEXT NOT NULL DEFAULT '[]',-- JSON [{ text, done }]
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE TABLE activity (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id    TEXT NOT NULL REFERENCES cards(id),
  agent_id   TEXT REFERENCES agents(id),  -- nullable for human actions
  kind       TEXT NOT NULL,               -- 'work' | 'ok' | 'warn' | 'note' | 'move' | 'block' | 'unblock'
  verb       TEXT NOT NULL,               -- 'committed', 'moved card to', ...
  target     TEXT,                        -- free-form object of verb
  t          INTEGER NOT NULL
);

CREATE TABLE artifacts (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id   TEXT NOT NULL REFERENCES cards(id),
  agent_id  TEXT NOT NULL REFERENCES agents(id),
  kind      TEXT NOT NULL,                -- 'spec' | 'branch' | 'test' | 'deploy'
  title     TEXT NOT NULL,                -- 'spec/product-catalog.md'
  meta      TEXT,                         -- '312 lines · approved'
  path      TEXT,                         -- relative to ./data/artifacts/
  t         INTEGER NOT NULL
);

CREATE TABLE comments (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id   TEXT NOT NULL REFERENCES cards(id),
  author    TEXT NOT NULL,                -- 'human' | agent_id
  text      TEXT NOT NULL,
  addresses TEXT,                         -- optional agent_id, for interventions
  t         INTEGER NOT NULL
);
```

## REST API (Fastify, port 4000)

All responses JSON. Snake-case in DB, camelCase on the wire. Use Zod for validation.

```
GET    /api/status                   → { connected, model, leadAvg, leadMedian, doneWeek, inFlight, blocked }
GET    /api/agents                   → Agent[]
POST   /api/agents                   → Agent          body: { name, role, glyph, hue, systemPrompt?, tools, ownsColumn? }
PATCH  /api/agents/:id               → Agent
DELETE /api/agents/:id               → { ok: true }

GET    /api/cards                    → Card[]         (includes column, priority, blocked)
GET    /api/cards/:id                → CardDetail     (card + acceptance + artifacts + activity + comments)
POST   /api/cards                    → Card           body: { title, description, priority, acceptance: string[] }
PATCH  /api/cards/:id                → Card           { title?, description?, priority?, acceptance? }
POST   /api/cards/:id/unblock        → Card           body: { note? }

POST   /api/cards/:id/comments       → Comment        body: { text, addresses? }
```

Column transitions are **not** exposed as a REST route. They happen server-side inside the orchestrator.

## WebSocket (`/ws`)

Single channel. Server → client push. Client never sends.

```ts
type WsEvent =
  | { type: 'agent:created' | 'agent:updated' | 'agent:deleted', agent: Agent }
  | { type: 'card:created' | 'card:updated', card: Card }
  | { type: 'card:moved', cardId: string, from: Column, to: Column }
  | { type: 'card:blocked' | 'card:unblocked', cardId: string, reason?: string }
  | { type: 'activity:added', cardId: string, activity: Activity }
  | { type: 'artifact:added', cardId: string, artifact: Artifact }
  | { type: 'comment:added', cardId: string, comment: Comment }
  | { type: 'agent:status', agentId: string, status: 'idle' | 'working', cardId?: string }
  | { type: 'status', payload: StatusSnapshot };
```

Client state is rebuilt from REST on connect, then patched from these events. No polling.

## Orchestrator

Lives in `apps/server/src/agents/orchestrator.ts`. One instance. Subscribes to the internal event bus.

Responsibilities:

1. When a card enters a column, look up that column's owner(s).
2. If an owner is `idle`, invoke the Claude Agent SDK with:
   - The owner's system prompt (from `prompts.ts` if null).
   - A user message containing the card's full state (title, description, acceptance, prior activity, unread comments addressed to this agent).
   - The tool allowlist from the agent record.
3. Stream SDK output. For each message of interest, emit a `WsEvent`.
4. When the SDK signals completion, apply the outcome:
   - **Happy path**: add any artifacts, mark any acceptance criteria done, move card to next column, emit `card:moved`.
   - **Block**: set `blocked=1`, `block_reason=<from agent output>`, emit `card:blocked`.
5. Persist everything to SQLite before emitting WS events. WS is derived from DB state, never the other way around.

Pseudocode:

```ts
bus.on('card:entered', async ({ cardId, column }) => {
  const owners = db.agents.findOwnersOf(column);
  for (const owner of owners) {
    if (owner.status !== 'idle') continue;
    await runAgent({ agent: owner, card: db.cards.findById(cardId) });
  }
});
```

## Claude Agent SDK integration (`agents/runtime.ts`)

Use the TypeScript SDK. One function:

```ts
async function runAgent(opts: {
  agent: Agent;
  card: CardDetail;
}): Promise<AgentOutcome> { ... }
```

It should:

1. Set `agent.status = 'working'` and broadcast.
2. Build the prompt: system prompt + serialized card context.
3. Call `query()` from `@anthropic-ai/claude-agent-sdk` with `{ prompt, options: { model: 'claude-sonnet-4-5', allowedTools: agent.tools, permissionMode: 'bypassPermissions' } }` — we trust our own agents locally.
4. Iterate the async iterator. For each message, parse and emit fine-grained events (commit/test run/artifact/etc) as WS messages.
5. When the iterator ends, parse the final message for a declared outcome:
   - `{ advance: true, artifacts?, acceptanceUpdates? }` → move card forward
   - `{ block: true, reason: string }` → set block
   - default: stay in column (rare, only if agent explicitly requests more input)
6. Set `agent.status = 'idle'`, broadcast.

**Structured output protocol**: every agent's system prompt instructs it to end with a fenced JSON block describing its outcome:

````
```agent-board-outcome
{ "advance": true, "artifacts": [{ "kind": "spec", "title": "spec/foo.md", "meta": "..." }], "acceptanceUpdates": [0, 2] }
```
````

Parse the last such block in the final message. If missing, log a warning and leave the card where it is.

## Frontend state

Keep it simple. Zustand (or plain useReducer + context) with this shape:

```ts
type AppState = {
  status: { connected, model, model, leadAvg, ... };
  agents: Record<string, Agent>;
  cards: Record<string, Card>;
  cardDetails: Record<string, CardDetail>;   // lazy-populated on drawer open
  uiOpenCardId: string | null;
  uiOpenModal: 'new-card' | 'new-agent' | null;
  panels: { agentsOpen: boolean; logOpen: boolean };
  density: 'balanced' | 'compact';
};
```

Derive `HF_WORKING_ON`, column groupings, etc. in selectors — don't denormalize into state.

## Non-goals

- No optimistic UI. Wait for WS echo. Latency on `localhost` is negligible.
- No soft-delete. Agents and cards are hard-deleted. (We're local.)
- No migrations tool. Schema lives in `db.ts` as one IIFE; bump when needed.
