# Agent Board — Handoff Package

This folder is a complete brief for building the **Agent Board** application in Claude Code. It contains the finished design, the tokens, the architecture, and an ordered build plan.

## How to use this with Claude Code

1. **Create an empty folder** on your machine where the codebase will live. Example:
   ```
   mkdir ~/code/agent-board && cd ~/code/agent-board
   ```

2. **Copy this entire `handoff/` folder into that directory.** The project's source code will be built alongside it.
   ```
   ~/code/agent-board/
   ├── handoff/           ← this package, unchanged
   ├── apps/              ← Claude Code will create these
   ├── packages/
   ├── data/
   └── package.json
   ```

3. **Open the folder in Claude Code** (`claude` from the terminal, or via the Claude Code app).

4. **Paste this as your first message:**

   > I'm handing you a finished design for a local app called **Agent Board**. Everything you need is in `./handoff/`. Start by reading `handoff/HANDOFF.md` — it's your brief. Follow the start-of-session checklist before writing any code.

5. **Claude Code will read the brief**, look at the screenshots, and propose where to start. It will build one milestone at a time, showing you each in the browser before moving on.

## What's in this package

| File                                 | Purpose                                                         |
| ------------------------------------ | --------------------------------------------------------------- |
| `HANDOFF.md`                         | The main brief. Non-negotiables, stack, ground rules.           |
| `PRODUCT.md`                         | What the product does, vocabulary, default agents.              |
| `ARCHITECTURE.md`                    | Folder layout, data model, REST/WS contracts, orchestrator.    |
| `MILESTONES.md`                      | 11 ordered build milestones with acceptance criteria.          |
| `design-tokens/graphite.css`         | The only source of visual values. Drop straight into `apps/web`.|
| `design-tokens/graphite.tokens.json` | Same tokens in DTCG JSON for tool pipelines.                    |
| `design-tokens/README.md`            | How to consume tokens + 5 handoff rules.                        |
| `screenshots/01–05*.png`             | Pixel-exact reference for every screen state.                   |

## What you need before starting

- Node.js ≥ 20, pnpm (or npm)
- An Anthropic API key (`sk-ant-…`) — goes in a `.env` you'll create during M1
- A terminal and the Claude Code CLI installed ([docs.claude.com/claude-code](https://docs.claude.com/claude-code))

## What the end-state looks like

After milestone 11 you'll have a local app that:

- Runs with a single `pnpm dev` from the repo root
- Opens at `http://localhost:5173`
- Shows a Kanban board of 6 columns
- Lets you spawn Claude Code agents, each with its own glyph, hue, role, and system prompt
- Lets you create cards; agents autonomously advance them through the pipeline
- Streams every agent action into the UI in real time
- Persists all state locally in SQLite + a `data/artifacts/` folder

That's the deliverable. Good luck.
