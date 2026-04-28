# Agent Board

A local supervisory dashboard for a fleet of Claude Code AI agents that collaborates on a Kanban board to ship software features autonomously.

## What it does

You create a card (user story) in the **Backlog** column. Six specialized agents then process it through a pipeline — Planner, Scribe, Forge, Loom, Sentinel, Pilot — each owning one column. Agents write specs, branches, tests, and deployment artifacts, logging every action in real time. You observe, comment, or intervene when a card gets blocked.

```
Backlog → Specification → Development → Testing → Deploy → Done
```

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 18, Vite 5, custom CSS (design tokens) |
| Backend | Fastify 5, better-sqlite3, Zod |
| Real-time | WebSocket (`@fastify/websocket`) |
| AI runtime | Claude CLI subprocess (`claude --print`) |
| Monorepo | pnpm workspaces |

## Prerequisites

- Node.js ≥ 20
- pnpm
- [Claude Code CLI](https://claude.ai/code) installed and authenticated (`claude login`), or an `ANTHROPIC_API_KEY`

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Set your Anthropic API key (skip if already authenticated via claude login)
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...

# 3. Start frontend + backend in parallel
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). The backend API runs on port 4000.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required unless authenticated via `claude login` |
| `CLAUDE_CODE_BIN` | `claude` | Path to the Claude CLI binary |
| `CLAUDE_CODE_WORK_DIR` | current directory | Working directory agents operate in |

## Project structure

```
agent-board/
├── apps/
│   ├── web/        # React frontend (Vite)
│   └── server/     # Fastify backend
├── packages/
│   └── types/      # Shared TypeScript types
├── data/           # SQLite database + agent artifacts (gitignored)
└── handoff/        # Design brief, tokens, milestone docs (reference only)
```

## Scripts

```bash
pnpm dev      # Start web (port 5173) + server (port 4000) concurrently
pnpm build    # Build both apps for production
```

## Key features

- **Autonomous pipeline** — cards advance through columns as agents complete their work
- **Blocked state** — agents can block a card with a reason; you can manually unblock
- **Acceptance criteria** — defined per card; agents mark checklist items as done
- **Artifacts** — specs, branch names, test results attached to each card
- **Activity timeline** — every agent action logged with timestamp on the card
- **Comments** — address comments to a specific agent to steer their next action
- **Live status bar** — shows API connection, model, cards done/in-flight/blocked
- **Agent customization** — edit system prompts, tool allowlist, column ownership per agent

## Architecture notes

The orchestrator listens for `card:entered` events and spawns the agent assigned to that column. Each agent runs as a `claude --print` subprocess, receives a system prompt with the card context, and returns a structured JSON outcome (`advance`, `block`, `artifacts`, acceptance updates). The frontend and backend stay in sync via WebSocket broadcasts.

All state is local — SQLite database, no auth, no external services beyond the Anthropic API.
