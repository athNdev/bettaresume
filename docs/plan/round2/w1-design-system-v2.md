# W1 — Design system v2, brand identity, and the design-system page

You are the design-systems engineer. Real production change: branch, PR, green CI, merge.

## Work in your own git worktree (MANDATORY)
```
git fetch origin
git worktree add .worktrees/w1-ds -b feat/design-system-v2 origin/main
cd .worktrees/w1-ds
```
Branch, commit, push, open the PR from the worktree. Remove it when done.

## Read first (all of it)
- `CLAUDE.md`, `docs/AGENT-CONTEXT.md`, `docs/plan/00-conventions.md`
- `docs/research/refactoring-ui-rules.md` — **the visual method. Every rule has Rule/Mechanism/Prevents/In-the-app.**
- `docs/research/tool-visual-design.md` — **your visual language spec ("Ink, paper, and instrument") and its Top 20.**
- `docs/research/design-systems.md` — the existing token layer (this is the substrate, not the design)
- `docs/research/ui-audit.md` — what is broken today
- `docs/design-system/README.md` — what currently exists

## What to build

### 1. Brand identity (new)

The maintainer asked for **word logo, logo, sizes, and the whole brand as part of the design system.**

Deliver, as code + documentation:
- **Wordmark** — the product name set in a specific typeface, weight, tracking and size. Not a font choice made lazily: justify it against the personality (serious, precise, quiet).
- **Logo mark** — a real SVG mark. Draw it. It must work at 16px (favicon) and at 256px. Provide: full lockup (mark + wordmark), mark-only, wordmark-only, and a monochrome variant.
- **Sizes and clear space** — the lockup at its sizes, the minimum size, the clear-space rule (e.g. "one mark-width on all sides"), and the do/don't.
- **Colour for the brand** — the accent hue, its role, and where the mark uses it vs where it is monochrome.
- Files under `public/brand/` and/or `src/components/brand/` as appropriate. Also `public/favicon.ico` / `public/icon.svg` (check what Next.js static export expects).

### 2. Design system v2 — apply the book, not just the tokens

The current system is a token scale. The book is a **visual method**. Build the missing layers from `tool-visual-design.md` and `refactoring-ui-rules.md`:

- **Surface & depth model** — 4 levels (bg / surface / overlay / sunken). **In light, shadows lift; in dark, tone lifts.** Two-layer shadows (tight contact + wide ambient; dark alphas ×2.5) plus a `inset 0 1px 0 oklch(1 0 0 / 6%)` top highlight on dark floating layers. Borders split into hairline (decorative) / `--br-border-control` (≥3:1) / selected.
- **Type as roles, not sizes** — hierarchy via tone ladder → weight → spacing → case/tracking. Max two sizes per view. Field labels 12/600 tracked. Marketing body collapses to one 16px step.
- **Density** — controls 28/32/40, rows 40px, panel headers 44px, one form rhythm (label→control 4 / field 16 / group 24), 640px measure cap.
- **Button system** — primary (accent, **one per region**) / secondary (outline at 3:1) / ghost / destructive / link; 28/32/40; icon-only requires a tooltip; disabled = 50% opacity **plus a reason tooltip**, never a grey slab.
- **Panel/region system** — regions (hairline seams, no shadow) vs floating cards (hairline + elev-1). 44px headers with a micro-label and an action cluster. **No cards inside cards.**
- **Selection language** — accent tint + 2px left rule + check. Consistent across rail rows, template rows, and lists.
- **Status system** — `--success/warning/danger/info`, always as tint + hue text + **icon** (never colour alone).
- **Empty/loading/error states** — designed empty = 40px tinted icon tile + headline + one muted line + one action, centred in the region. Skeletons keep the exact final shape. Errors are `danger-soft` callouts with retry in the affected region.
- **Ornament budget** — spend on: the preview stage (vignette + 3-layer paper shadow), selection language, empty-state tiles, kbd chips, exactly one gradient hairline. Quiet everywhere else.

Apply the five **token deltas** the spec flags (dark ladder levels, border-role split, subtle-text rule in dark, card border+shadow refinement, label role) and fold them back into the tokens.

### 3. The design-system page (new route)

> "a fully professionally designed and curated design system that is documented on its own page for me to view and issue recommendations"

Build `/design-system` as a **real route in the app** that renders the whole system:
- Brand: wordmark, logo, lockups, sizes, clear space, do/don't
- Colour: the ramps, semantic roles, light and dark, contrast pairs with measured ratios
- Typography: the role scale, specimens, weights, tracking
- Spacing, radius, elevation, motion, z-index
- **Every component** in every state (default/hover/active/focus-visible/disabled/loading/error), with the density rules
- Empty/loading/error state specimens
- The ornament budget, shown
- A section listing the design rules, numbered and citable

It must be **a page a non-engineer can read and comment on**. Consider a "copy the token value" affordance. It must work in light and dark.

Note: `/design-system` lives in the hash-routed app or as a static route — decide and justify. It must not leak into the marketing nav (that copy is pinned by `test/marketing-claims.test.ts`).

## Hard constraints
- **The resume document (Surface B) is out of scope.** The book's rules stop at the chrome. `src/features/resume-editor/typst_templates/` is another agent's surface this wave.
- Biome baseline 0. `test/baselines/token-offenders.json` must stay empty (it is currently empty).
- Every spacing/size/radius/shadow value must come from the system. Extend the enforcement tests where the new layers need them (shadows, borders, motion).
- Light and dark both complete. 3:1 for control boundaries, 4.5:1 for body text.
- `npm test -w api` wipes local D1. Re-seed after.
- Do not change marketing copy.

## Verify
```
npm run build:types && npm run typecheck && npm run typecheck -w api
npx vitest run && npx biome check . && npm run build
node scripts/probe-start.cjs api web && npm run db:reset-seed
node scripts/probe/full-pass.cjs
```
Screenshot the design-system page at 1440 and 390, both themes, into `.probe-shots/`.

## Deliverable in your reply
1. The brand system: wordmark, mark, sizes, clear space. Screenshot filenames.
2. Which of the book's rules you implemented that were missing, and the visual difference each makes.
3. The design-system page: route, sections, what a reviewer can do there.
4. The token deltas you folded in.
5. Test results and anything out of scope.
