# Wave 4A — Deep responsiveness pass

You are a senior engineer. Real production change: branch, PR, green CI, merge.

## Work in your own git worktree (MANDATORY)

```
git fetch origin
git worktree add .worktrees/wave4-resp -b feat/responsive-pass origin/main
cd .worktrees/wave4-resp
```

Branch, commit, push and open the PR from the worktree. Remove the worktree when done.

## Read first
- `CLAUDE.md`, `docs/AGENT-CONTEXT.md`, `docs/plan/00-conventions.md`
- `docs/research/responsiveness.md` — **your specification. §6 "Known traps" is a verified file:line defect list.**
- `docs/research/ui-audit.md` — the visual evidence
- `docs/design-system/README.md` — the tokens
- `test/baselines/token-offenders.json` — currently **empty**. Do not add to it.

## The verified defects (research §6)

- **The editor has no small-screen mode.** Three `react-resizable-panels` at 16/42/42% (`resume-editor.tsx`) squeeze into 390px. Below `md` it is unrenderable.
- **Two features silently vanish** on small screens: `VariationManager` is `hidden md:flex`, `SaveState` is `hidden lg:block`. **Never hide a feature — move it, do not remove it.**
- Review sheet's six `whitespace-nowrap` tabs clip at 390px with no overflow strategy.
- `body { overflow-x: hidden; max-width: 100vw }` in `globals.css` **masks** horizontal overflow instead of fixing it.
- `h-screen` on the editor root is the 100vh mobile-chrome trap — needs `h-dvh`.
- `grid grid-cols-2` form rows never collapse — 25+ sites in `sections-forms/`. One shared fix, not eleven.
- `history-panel.tsx` pins a `w-56` diff column. Pane drag handles are 6px. Action rows are hover-only (`sections-manager.tsx`) — unreachable on touch.
- Zero `overflow-x-*` classes in `src/`.

## Build

1. **Breakpoint strategy**: base / `sm` 640 / `md` 768 (editor three-zone begins) / `lg` 1024 / `xl` 1280, plus `pointer: coarse` and `@media (max-height: 520px)` for landscape phones. **Container queries** for the user-resizable panes and the review sheet internals — the panes are sized by the user, not the viewport.
2. **Editor small-screen model** — one column with a **section / form / preview switcher** below 1024px. Every feature reachable.
3. **Review sheet tabs** — wrap or scroll. Move counts out of tab labels into the panels.
4. **`h-dvh` migration.** Remove the `overflow-x: hidden` mask, or replace it with a test that fails on the geometry it was hiding. Tests must measure **geometry**, not scrollbars.
5. **Form grid collapse** at `sm`, shared across the 11 forms.
6. **Touch targets** ≥44px for primary actions.
7. **Mobile preview**: fit-width + pinch + page snapping.
8. **Hover-only affordances become always-visible on coarse pointers.**

## Acceptance

A **7-viewport browser matrix** runs in CI and asserts, per viewport:
- no horizontal overflow (measured on `scrollWidth` vs `clientWidth` of every element, not `body`)
- no clipped text (no `scrollWidth > clientWidth` on text nodes)
- all interactive targets ≥44px
- every action reachable (no `hidden md:`/`hidden lg:` on any feature)
- the document preview keeps its aspect ratio

Viewports: 360×640, 390×844, 414×896, 768×1024, 1024×768, 1280×800, 1440×900.

Plus **static assertions** pinning the traps above so they cannot return:
- no `h-screen` in `src/`
- no `hidden md:` / `hidden lg:` / `hidden sm:` applied to a feature (allow it for decorative elements, and say which)
- no `overflow-x: hidden` on `body`

The matrix should live as a vitest test that drives Playwright (`channel: "chrome"` — this host has Chrome but no Playwright Chromium) and runs in CI.

## Hard constraints
- **Do not change product copy.**
- Do not change document typography or the Typst templates.
- `test/marketing-claims.test.ts` pins marketing copy — leave it passing.
- Biome baseline 0. `test/baselines/token-offenders.json` must stay empty.
- `npm test -w api` wipes local D1. Re-seed with `npm run db:reset-seed` after.
- The resume document preview must stay paper-white and keep its aspect ratio at every viewport.

## Verify
```
npm run build:types && npm run typecheck && npm run typecheck -w api
npx vitest run && npx biome check . && npm run build
node scripts/probe-start.cjs api web && npm run db:reset-seed
node scripts/probe/full-pass.cjs
```

Screenshots of the editor at 390, 768 and 1024, both themes, into `.probe-shots/`.

## Deliverable in your reply
1. The breakpoint set and where each is used.
2. The editor's small-screen model and how every feature stays reachable.
3. Which traps you fixed and which you deliberately left, with reasons.
4. The viewport matrix: what it asserts and where it runs.
5. Test results, and anything out of scope.
