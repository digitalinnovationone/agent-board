# Agent Board — Graphite Design Tokens

Tokens for the **Graphite** direction of the Agent Board. Use these as the source of truth when implementing the UI.

## Files

| File                    | Format                                                 | Use                                  |
| ----------------------- | ------------------------------------------------------ | ------------------------------------ |
| `graphite.tokens.json`  | [DTCG](https://design-tokens.github.io/) JSON          | Tool-agnostic source of truth. Feed to Style Dictionary, Tokens Studio, or any pipeline. |
| `graphite.css`          | CSS custom properties                                  | Drop-in for vanilla CSS / Tailwind `@theme` / any framework that consumes CSS vars. |
| `Tokens Preview.html`   | Visual spec sheet                                      | Reference what each token looks like — colors, agents, type, radius, spacing, shadows, live states. |

## System at a glance

- **Palette** — zinc neutrals (50→900), one violet accent (`#7c3aed`), one amber (warn), one emerald (ok). That's it.
- **Agent identity** — each agent has a fixed **hue** (0–360). The chip is always rendered as `oklch(0.97 0.02 H)` bg with `oklch(0.48 0.16 H)` glyph stroke. Add a new agent → pick a hue, nothing else.
- **Type** — Geist Sans for UI, Geist Mono for IDs, metrics, code artifacts, and status-bar readouts. Six sizes, four weights.
- **Surfaces** — three tiers: `surface` (elevated, white), `surface-2` (inset, zinc-100), `bg` (app, zinc-50). Borders are always 1px `--g-color-border`.
- **States** —
  - `accent-bg` + `accent-border` + `shadow-live-ring` → card is being actively worked
  - `warn-bg` + `warn-border` → card is blocked
  - Default `surface` + `border` → idle
- **Motion** — one pulse keyframe (`g-pulse`, 1.4s ease-in-out infinite) shared by every "live" indicator. The status-bar connection dot uses a slower 1.6s variant.

## Consuming the CSS

```html
<link rel="stylesheet" href="tokens/graphite.css">
```

```css
.card {
  background: var(--g-color-surface);
  border: var(--g-border-hair) solid var(--g-color-border);
  border-radius: var(--g-radius-xl);
  padding: var(--g-space-5) var(--g-space-6);
  font: var(--g-weight-medium) var(--g-text-base)/var(--g-leading-snug) var(--g-font-sans);
  color: var(--g-color-text);
}

.card[data-state="live"] {
  background: var(--g-color-accent-bg);
  border-color: var(--g-color-accent-border);
  box-shadow: var(--g-shadow-live-ring);
}

.card[data-state="blocked"] {
  background: var(--g-color-warn-bg);
  border-color: var(--g-color-warn-border);
}

.agent-chip {
  background: oklch(0.97 0.02 var(--g-agent-forge));
  color:      oklch(0.48 0.16 var(--g-agent-forge));
}
```

## Consuming the JSON

The JSON follows the [DTCG Design Tokens Format](https://design-tokens.github.io/community-group/format/). It can be piped through:

- [Style Dictionary](https://styledictionary.com/) — generate iOS/Android/Flutter/TS-const outputs
- [Tokens Studio](https://tokens.studio/) — round-trip with Figma
- Your own script — it's plain JSON

```js
import tokens from "./graphite.tokens.json" assert { type: "json" };
const accent = tokens.color.accent.$value; // "#7c3aed"
```

## Handoff notes for Claude Code

When implementing components against these tokens:

1. **Don't invent new colors.** If you need an interactive hover state, darken/lighten an existing surface token by ~3% via `color-mix(in oklch, var(--g-color-surface-2) 70%, var(--g-color-text) 2%)` or equivalent.
2. **Don't invent new radii.** The scale is 3/5/6/8/10/∞. Cards are always `--g-radius-xl` (8px), panels are `--g-radius-2xl` (10px).
3. **Agent hues are data, not decoration.** When a new agent is spawned, persist its hue with the agent record; never hard-code.
4. **Respect the panel collapse contract** — agents rail collapses to 32px with a left-pointing chevron, activity log collapses to 32px with a right-pointing chevron. The chevron always points *outward* (into the collapsed direction).
5. **Live states are opt-in via data attributes** (`data-state="live" | "blocked" | "idle"`). Default is `idle`. Don't default to `live`.
