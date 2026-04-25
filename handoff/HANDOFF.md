# Agent Board — Claude Code Handoff

You (Claude Code) are being handed a finished design and asked to build the application end-to-end, running locally. This document is your brief.

Read **everything in this folder** before writing code:

```
handoff/
├── HANDOFF.md              ← this file, your brief
├── PRODUCT.md              ← what the product is and who it's for
├── ARCHITECTURE.md         ← stack, folders, data contracts
├── MILESTONES.md           ← ordered build plan with acceptance criteria
├── design-tokens/          ← the visual source of truth, do not deviate
│   ├── graphite.css        ← CSS custom properties, drop in at root
│   ├── graphite.tokens.json← DTCG JSON, same tokens, tool-agnostic
│   └── README.md           ← how to consume + handoff rules
└── screenshots/            ← what the UI must look like
    ├── 01-board.png
    ├── 02-new-card-modal.png
    ├── 03-new-agent-modal.png
    ├── 04-card-detail-active.png
    └── 05-card-detail-blocked.png
```

## Your job in one paragraph

Build a local desktop web app called **Agent Board**. It's a Kanban board where each card is a user story and the "team" is a roster of **Claude Code sub-agents** that autonomously move cards through a pipeline (Backlog → Specification → Development → Testing → Deploy → Done). The user creates a card; a Planner agent refines it and hands it to Scribe; Scribe writes the spec and hands off to Forge/Loom, who implement; Sentinel tests; Pilot deploys. Each handoff is a column transition. Every action an agent takes is streamed live into the UI: column moves, commits, test runs, warnings, comments. The human can spawn/configure agents, create cards, read any card's full timeline, and intervene via comments.

The entire thing runs on the user's machine. No cloud. No database beyond SQLite/JSON. The agent runtime is the **Claude Agent SDK**.

## Non-negotiables

1. **Use the supplied tokens.** `design-tokens/graphite.css` is the only source of color, type, spacing, radius, and shadow. Do not invent values. If a component needs a state the tokens don't cover, compose existing tokens with `color-mix()` — do not add new hex codes.
2. **Match the screenshots.** Layout, density, and hierarchy must match `screenshots/*.png`. Typography is Geist Sans + Geist Mono. Agent chips always use the `oklch()` formula documented in `design-tokens/README.md`.
3. **Agents are real.** Every agent the user spawns maps to a Claude Agent SDK session with a persisted system prompt, role, and tool allowlist. "Agent picked up card" = a real SDK invocation produced output. Do not fake activity.
4. **Local-first.** Zero network calls except to `api.anthropic.com` (the SDK). State lives on disk. The app must survive `pkill node && npm run dev` without losing cards, agents, or timelines.
5. **Stream everything.** Agent output is streamed into the UI over a local WebSocket. No polling. No page refresh to see a column move.

## Stack (pinned)

- **Frontend**: React 18 + Vite + TypeScript, plain CSS that consumes `graphite.css`. No Tailwind. No component library.
- **Backend**: Node.js 20+ with Fastify. TypeScript. WebSocket via `@fastify/websocket`.
- **Agent runtime**: [`@anthropic-ai/claude-agent-sdk`](https://docs.claude.com/en/api/agent-sdk/typescript). One SDK session per agent, spawned on demand, persisted per card.
- **Storage**: SQLite via `better-sqlite3`. One file at `./data/agent-board.db`. Schema in `ARCHITECTURE.md`.
- **Dev runner**: `concurrently` running `vite` (frontend) and `tsx watch` (backend). Single `npm run dev` from the repo root.
- **Package manager**: `pnpm` if installed, else `npm`. No yarn.

Versions you should pin at install time (use whatever is current and stable when you run, but don't drift during a session):

```
react@^18.3  vite@^5  typescript@^5
fastify@^5  @fastify/websocket  better-sqlite3
@anthropic-ai/claude-agent-sdk
concurrently  tsx
```

## Start-of-session checklist

Before you write any code, confirm these in order:

1. Read `PRODUCT.md` to understand the domain vocabulary (agent, card, pipeline, handoff, blocker).
2. Read `ARCHITECTURE.md` to understand the folder layout and data contracts. Do not rename columns, fields, or routes.
3. Open each file in `screenshots/` and verbally describe back to the user, in one sentence each, what's in it. This proves you saw them.
4. Read `design-tokens/README.md`, especially the **Handoff notes** section at the bottom.
5. Propose a build order by reading `MILESTONES.md` and confirming with the user where to start.

Then build milestone 1 end-to-end before moving to milestone 2.

## Ground rules while building

- **One milestone at a time.** Do not get ahead. Do not stub milestone 3 while on milestone 1.
- **Prove each milestone works in the browser.** Start the dev server, open the page, take a screenshot, show it to the user before marking the milestone done.
- **Commit after each milestone** with a message `feat: milestone N — <short description>`.
- **No new dependencies without asking.** If you think you need one, propose it and wait.
- **If the design is ambiguous, ask.** Do not invent UI. The screenshots and tokens are canon; fill gaps by asking the user, not by guessing.
- **Write small files.** If a file passes ~300 lines, split it.

## Environment variables

The app reads one env var:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Document this in the root `README.md` you will create. The app must refuse to start agents (but still render the board) if the key is missing, and surface that state in the UI status bar.

## How to run (the target end-state)

```
git clone <this-repo>
cd agent-board
cp .env.example .env   # then edit in your API key
pnpm install
pnpm dev               # starts frontend + backend, opens http://localhost:5173
```

Milestone 1 must get this much working: frontend renders an empty board that matches `01-board.png`, backend is up on `:4000`, WebSocket connects, status bar shows `claude-code · connected · sonnet-4.5`. No agents or cards yet.

---

**Begin by acknowledging this brief, then proceed to the start-of-session checklist.**
