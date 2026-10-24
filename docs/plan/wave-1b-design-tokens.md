# Wave 1B — Build the design system tokens and documentation

You are a senior design-systems engineer implementing a well-scoped change. This is a real production change that must be merged.

## Read first (all of it)

- `CLAUDE.md` — repo conventions
- `docs/AGENT-CONTEXT.md` — traps that have already cost hours
- `docs/research/design-systems.md` — **your specification. Part 4 (token architecture) and Part 5 (component inventory) are what you build.**
- `docs/research/ui-audit.md` — the evidence that this is needed. Its §3 (spacing audit), §4 (typography audit) and §5 (colour audit) have the measured numbers.
- `docs/plan/00-conventions.md` — how work is shipped

## What you are building

The token layer and its documentation. **Not** the full application migration — that is a later wave. Your job is to make the system real, usable and enforced, and to migrate the *primitives* (`src/components/ui/`) so the later wave is mechanical.

### 1. Tokens in Tailwind v4 `@theme`

Two-tier, per the research:
- **Primitives** (`--br-*`): neutral ramp (12 steps, ink-toned, never pure black), accent ramp, spacing scale, radius scale, type scale, elevation scale, motion, z-index.
- **Semantic roles**: what the components consume (`--color-background`, `--color-foreground`, `--color-surface`, `--color-surface-raised`, `--color-border`, `--color-muted`, `--color-accent`, `--color-destructive`, `--color-success`, `--color-warning`, `--color-info`, `--ring`, …).

Keep shadcn's existing `--color-*` names as an alias layer so the 29 existing `src/components/ui` primitives migrate with minimal class churn.

**Light and dark both complete.** The audit found the dark theme has zero surface separation (card == background == popover at 1.31:1). Adjacent surfaces must be ≥3:1 in both themes.

Status colours as `color-mix` tints of one token each — the audit found 3 greens, 4 ambers and 2 blues hardcoded across 7 files. Those files should all read from one token.

### 2. Scales — closed sets

- **Spacing**: 4px base with a 2px optical half-step. A closed set of 11 values. Anything off-scale is a bug.
- **Type**: 7 sizes. The audit found marketing rendering 22 sizes (4 body sizes within 0.8px) and the app 87% `xs`/`sm`. App chrome and marketing may have *different* scales but both must come from the tokens, and neither may exceed 7 sizes.
- **Radius**: 4/6/8/12/full.
- **Elevation**: 4 levels, surface + shadow pairs. Wire them into `Card`, `Dialog`, `Sheet`, `Popover` — the audit found `--elev-*` defined and used nowhere.
- **Motion**: 120/180/240ms with one easing.
- **z-index**: one documented ladder.

### 3. Migrate `src/components/ui/` to the tokens

Every primitive must use tokens only. No raw hex, no `text-[13px]`, no `gap-[7px]`.

### 4. Documentation

`docs/design-system/README.md` — a document a human can actually use:
- the tokens, with names, values, and *when to use which*
- the component inventory with required states (default/hover/active/focus-visible/disabled/loading/error)
- per-component density rules (padding, gap, min-height)
- the rules, numbered, so a reviewer can cite one

Include a rendered token reference (a route or a static page is fine; a markdown table with colour swatches in text is acceptable if you cannot render).

### 5. Enforcement

The research lists 8 rules that are testable in CI. Implement them as tests under `test/`:
- **Scale closure**: every `p-*`/`m-*`/`gap-*`/`text-*`/`rounded-*` in `src/` comes from the scale. A grep-based test that lists offenders.
- **No raw hex** in `src/**` outside the token file.
- **Contrast**: adjacent surfaces ≥3:1 in both themes.
- **Status colours** all come from tokens.
- **State matrix**: every primitive in `src/components/ui/` declares the required states.

Make the tests fail on a new offender. Where a rule is not yet satisfiable because of existing code, make it a **ratchet** (like the Biome baseline) and record the baseline — but prefer fixing.

## Hard constraints

- **Biome baseline is 0.** `npx biome check .` must report 0 findings when you are done.
- Do not change any user-visible layout or copy in this wave beyond what token migration forces. This is the foundation, not the facelift.
- The **resume document** (`src/features/resume-editor/typst_templates/`) is a separate design surface and must NOT share the app's scale. Do not touch it. (A different wave owns it.)
- Do not add a CSS framework dependency. Tokens live in CSS/Tailwind.
- Do not rename `--color-*` shadcn tokens in a way that breaks `src/components/ui/` without migrating them in the same PR.

## How to verify

```
npm run build:types
npm run typecheck
npm run typecheck -w api
npx vitest run
npx biome check .
npm run build
node scripts/probe-start.cjs api web
npm run db:reset-seed
node scripts/probe/full-pass.cjs
```

Take screenshots of the dashboard and editor at 1440 in **both themes** before and after, into `.probe-shots/`. The dark theme must visibly have surface separation.

**Important:** `npm test -w api` wipes local D1. Re-run `npm run db:reset-seed` after it.

## How to ship

`docs/plan/00-conventions.md` — branch, PR, green CI, merge. Never push to main.

## Deliverable in your reply

1. The token table summary (counts per scale, and the accent hue you chose and why).
2. The list of enforcement rules implemented and which are ratchets.
3. Measured dark-theme surface contrast before and after.
4. Test results.
5. Open questions for the maintainer.
