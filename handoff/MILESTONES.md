# Milestones

Build in this order. Do not start milestone N+1 until N's acceptance criteria are met and shown to the user.

Each milestone ends with: run `pnpm dev`, open the browser, take a screenshot, show it.

---

## M1 — Scaffold + empty board

**Goal**: the two dev servers run, the UI renders an empty board that matches `screenshots/01-board.png` structurally.

Tasks:
- Init monorepo (pnpm workspaces, `apps/web`, `apps/server`, `packages/types`).
- Install pinned deps.
- `apps/web`: Vite + React + TS; copy `handoff/design-tokens/graphite.css` into `apps/web/src/styles/`; import at root.
- `apps/server`: Fastify on `:4000`, health route, SQLite connection, schema creation on first boot.
- Root `package.json` `dev` script runs both concurrently.
- UI: `Board` renders the 6 columns (Backlog … Done) with empty bodies, WIP caps shown as `WIP 0/n`. Agents rail empty state: "No agents yet". Activity log empty state. Status bar shows `claude-code · <missing key>` or `connected` based on `/api/status`.

Acceptance:
- `pnpm dev` starts both servers with one command.
- `http://localhost:5173` renders and visually matches the empty version of `01-board.png` (no cards, no agents).
- No TS errors, no console errors.

---

## M2 — Seed agents + rail

**Goal**: the 6 default agents exist, render in the left rail with correct glyph and hue.

Tasks:
- `apps/server`: on first boot, if `agents` table is empty, insert the 6 defaults from `PRODUCT.md`.
- `GET /api/agents` returns them.
- `AgentGlyph.tsx`: render the 6 SVG glyphs (triangle, square, diamond, circle, hex, chevron). Match `04-card-detail-active.png`'s glyph style (fine stroke, rounded joins).
- `AgentChip.tsx`: wraps glyph in an oklch-tinted tile per `design-tokens/README.md`.
- `AgentsRail.tsx`: lists all agents with name + role + status dot.
- Collapse/expand button; match screenshot chevron direction.

Acceptance:
- Left rail matches `01-board.png`'s `AGENTS` section exactly (order, glyphs, hues, role copy).
- Collapse works and collapses to a 32px vertical tab with a left-pointing chevron.

---

## M3 — New Agent modal

**Goal**: `New agent` button opens the modal from `03-new-agent-modal.png`. Submitting creates a real agent.

Tasks:
- `NewAgentModal.tsx` with all fields: name, handle (derived), glyph picker (6 options), hue swatches, role template dropdown, owns-column select, system prompt textarea (shows role default as placeholder), tools checklist (read, write, bash, web, mcp).
- `POST /api/agents` validates with Zod and inserts.
- On success, close modal; WS broadcasts `agent:created`; rail updates without refetch.

Acceptance:
- Modal matches `03-new-agent-modal.png`.
- Creating an agent adds it to the rail immediately.
- Hard-refresh: the agent persists.

---

## M4 — New Card modal + card rendering

**Goal**: create a card, it lands in Backlog and renders.

Tasks:
- `NewCardModal.tsx` matching `02-new-card-modal.png`.
- `POST /api/cards` — generates `US-NN` id (next sequential, 2-digit padded), inserts at column `Backlog`.
- WS `card:created`.
- `Card.tsx` with all three states: idle, live, blocked. Only idle matters this milestone.
- `Column.tsx` renders its cards, updates WIP badge.

Acceptance:
- Creating a card puts it in Backlog, visible immediately.
- Cards survive refresh.
- WIP counter reflects count. Over-cap cards show `OVER` badge.

---

## M5 — Card detail drawer

**Goal**: clicking a card opens the drawer from `04-card-detail-active.png`.

Tasks:
- `CardDetailDrawer.tsx`: header, pipeline stepper, description, acceptance checklist, artifacts section (empty for new cards), activity timeline, comments.
- Closes via `Esc`, backdrop click, or X button.
- `POST /api/cards/:id/comments`.
- Acceptance criteria checkboxes are visual-only this milestone.

Acceptance:
- Drawer layout matches screenshot to pixel.
- Pipeline stepper shows current column as active, prior as done.
- Commenting works, persists.

---

## M6 — WebSocket wiring

**Goal**: the UI never polls. Every server-side change appears in the UI within a frame.

Tasks:
- `/ws` on backend. On connect, sends nothing (client fetches REST first).
- Event bus emits every mutation.
- `ws.ts` on frontend reconnects with exponential backoff, capped at 5s.
- Status bar reflects WS state: green dot when connected, amber `reconnecting` when not.

Acceptance:
- Open two browser tabs. Create a card in tab A, it appears in tab B within 200ms.
- Kill the backend; status bar turns amber within 2s. Restart; reconnects automatically.

---

## M7 — Claude Agent SDK wired in

**Goal**: agents actually run. Create a card, Planner picks it up, refines it, moves it to Specification.

Tasks:
- `agents/runtime.ts`: implements `runAgent()` per `ARCHITECTURE.md`.
- `agents/orchestrator.ts`: subscribes to `card:entered` events. Finds owner. Calls runAgent.
- `agents/prompts.ts`: default system prompt for each role. Include the structured-outcome contract.
- On card creation, synthesize a `card:entered` event for `Backlog`, triggering Planner.

Acceptance:
- Create a card. Within seconds, activity log shows `Planner refining …`, card gets a live halo, then moves to Specification. Scribe picks up (but its prompt may say "wait for handoff" if not yet implemented — ok to stop there).
- No ANTHROPIC_API_KEY → card stays in Backlog, status bar shows `agents paused · missing key`, creating cards still works.

---

## M8 — Full pipeline happy path

**Goal**: a single card flows Backlog → Done end-to-end with real agent output at each step.

Tasks:
- Expand each role's system prompt to produce the right artifact at its stage.
- Forge/Loom commit text-only "branches" (diffs written to `./data/artifacts/<card-id>/...`).
- Sentinel can mark cards blocked with a reason.
- Pilot writes a `DEPLOY.md` artifact.

Acceptance:
- Create a card. Without human intervention, it ends up in Done within reasonable wall-clock time.
- Its timeline in the detail drawer tells a coherent story (real text from real agent turns).
- Artifact files exist on disk in `./data/artifacts/<card-id>/`.

---

## M9 — Blocker flow + unblock

**Goal**: Sentinel can block a card, it renders per `05-card-detail-blocked.png`, human can unblock.

Tasks:
- Sentinel's prompt must declare `{ block: true, reason }` when tests fail.
- Card renders with `warn-bg` and `BLOCKED` badge (matches screenshot).
- Drawer shows the blocker callout with `Unblock…` button.
- `POST /api/cards/:id/unblock` moves card back to Development.

Acceptance:
- A deliberately-failing spec gets blocked by Sentinel.
- Blocked card matches `05-card-detail-blocked.png`.
- Unblock moves it back and re-triggers the owner.

---

## M10 — Activity log + metrics

**Goal**: the right-hand activity log and bottom status bar match `01-board.png`.

Tasks:
- `ActivityLog.tsx` pulls last 20 global activity events, updates via WS.
- Filter chips: All, By agent, Warnings.
- Status bar: live metrics from `/api/status` (done/week, lead avg/median, in-flight, blocked, last sync). Compute server-side.

Acceptance:
- Right rail matches screenshot.
- Metrics update in real time as cards move.

---

## M11 — Polish

- `Esc` closes modals/drawer.
- Collapse state of rails persists in localStorage.
- Density toggle (balanced/compact) affects card padding only; persists.
- Empty states everywhere (no agents, no cards, no activity, no comments).
- README at repo root with install/run/troubleshooting.

Acceptance:
- Fresh clone → `pnpm install` → fill `.env` → `pnpm dev` → create an agent → create a card → watch it flow to Done. No crashes, no console errors.

---

## Out of scope (don't build these even if tempted)

- Auth, multi-user, remote sync
- Dark mode
- Mobile layouts
- Drag-and-drop card reordering
- Real git / CI integration
- Agent-to-agent direct messaging (all comms go through card comments)
