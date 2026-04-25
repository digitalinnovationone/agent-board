# Product — Agent Board

A local desktop web app where a roster of **Claude Code agents** collaborates on a Kanban board to ship software.

## Who it's for

A solo developer (or small team) who wants to watch a team of AI agents work a backlog the way a human scrum team would, with visibility into every step. Not a coding assistant. Not an editor plugin. A **supervisory dashboard** over a fleet of coding agents.

## Core loop

1. **User creates a card** — a user story, like "Search Product" or "Payment".
   - Card lands in `Backlog`.
2. **Planner agent picks it up**, refines the description and writes acceptance criteria, moves it to `Specification`.
3. **Scribe agent** writes the detailed spec (a markdown artifact), moves it to `Development`.
4. **Forge** (backend) and/or **Loom** (frontend) pick it up, implement it, commit to a branch, run unit tests, move it to `Testing`.
5. **Sentinel** runs integration/e2e tests. If passing, moves to `Deploy`. If failing, marks the card **blocked** with a reason and bounces it back to Development.
6. **Pilot** promotes it. Card lands in `Done`.

Every transition is a **handoff** and is logged in the card's timeline with the agent, timestamp, and any artifact produced (spec doc, branch name, test results).

## Vocabulary (use these exact terms in code)

| Term          | Meaning                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| **Agent**     | A configured Claude Agent SDK session. Has a name, role, system prompt, glyph, hue, tool allowlist. |
| **Card**      | A user story. Has `id`, `title`, `description`, `priority`, `column`, `acceptance[]`, `artifacts[]`, `activity[]`, `comments[]`. |
| **Column**    | A pipeline stage. Fixed set: `Backlog`, `Specification`, `Development`, `Testing`, `Deploy`, `Done`. |
| **Pipeline**  | The ordered list of columns.                                            |
| **Handoff**   | A card moving from column N to column N+1 (or being bounced backward).  |
| **Owner**     | The agent(s) assigned to a given column. Cards entering a column trigger the owner. |
| **Artifact**  | A file or reference produced by an agent while working a card (spec.md, branch name, test file). |
| **Activity**  | Anything an agent does on a card: pick up, commit, run tests, comment, move, block. |
| **Blocker**   | A card marked `blocked` with a human-readable `reason`. Blocked cards do not advance. |
| **Live**      | A card currently being worked by an agent. Renders with a violet halo.  |
| **WIP cap**   | Per-column limit. Exceeding it shows an `OVER` badge but does not prevent work. |
| **Intervention** | A human comment on a card, optionally addressed to a specific agent. The agent reads it before its next step. |

## Roles shipped by default

These six agents exist in the seed data. The user can edit, delete, or add more.

| Agent    | Role             | Column owned     | Glyph    | Hue |
| -------- | ---------------- | ---------------- | -------- | --- |
| Planner  | Product Owner    | Backlog          | triangle | 260 |
| Scribe   | Spec Writer      | Specification    | square   | 200 |
| Forge    | Backend Dev      | Development      | diamond  | 30  |
| Loom     | Frontend Dev     | Development      | circle   | 160 |
| Sentinel | QA / Testing     | Testing          | hex      | 340 |
| Pilot    | DevOps           | Deploy           | chevron  | 100 |

Column `Done` is unowned — cards land there and stop.

## What the user does in the UI

- **Spawn an agent** via `New agent` button → modal → configure glyph, hue, role, system prompt, tool allowlist.
- **Create a card** via `New card` → modal → title, description, priority, acceptance criteria.
- **Watch the board** — live activity halos, per-column WIP counts, Claude Code connection status in the bottom status bar.
- **Click a card** → drawer opens with pipeline stepper, description, acceptance checklist, artifacts, full activity timeline, comments.
- **Comment on a card** → posted as an intervention; the next agent to touch the card reads it first.
- **Unblock a card** → manual action, prompts for a reason, moves card back to prior column.

## What the user never does

- Edit code directly in the UI. Agents own the code.
- Drag cards between columns. Movement is driven by agent handoffs. (Manual unblock is the only exception.)
- Assign specific humans to cards. There are no humans on cards. The team is the agent roster.

## Out of scope for v1

- Multi-user / auth. Single-user, local.
- Remote git hosting, CI, actual deploys. `Pilot` writes a `DEPLOY.md` artifact and calls it done.
- Mobile / responsive < 1280px. Desktop only.
- Keyboard shortcuts beyond `Esc` to close drawers/modals.
- Dark mode. (Graphite is light-theme only.)
