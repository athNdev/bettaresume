# W3 — App composition pass: make the app look designed

You are the product designer who ships code. Real production change: branch, PR, green CI, merge.

## Work in your own git worktree (MANDATORY — see `docs/plan/00-conventions.md`)
```
git fetch origin
git worktree add .worktrees/w3-compose -b feat/app-composition origin/main
cd .worktrees/w3-compose
```
**Remove only your own worktree when done. Never `rm -rf .worktrees`.**

## The brief

The maintainer, after the last pass: *"The UI of the app did not go any real overhauls, it looks exactly the same, I expected much more."*

The design system v2 and brand landed (PR #241) — tokens, depth model, button system, panel system, selection language, states, and a `/design-system` page. **What has not been done is the composition**: how the dashboard, the editor and the forms are actually laid out and composed. That is your job, and it must produce a **visibly different app**.

## Read first (all of it)
- `CLAUDE.md`, `docs/AGENT-CONTEXT.md`, `docs/plan/00-conventions.md`
- `docs/design-system/README.md` and the live `/design-system` page — the system you compose with
- `docs/research/tool-visual-design.md` — **the visual language spec. Its Top 20 is your task list.**
- `docs/research/refactoring-ui-rules.md` — the method. Apply rules, not vibes.
- `docs/research/ui-audit.md` — the defects, with file:line

## Your surface

```
src/features/dashboard/**
src/features/resume-editor/**     (NOT typst_templates/)
src/components/sections-forms/**
src/components/rich-text-editor/**
src/components/export/**
src/components/providers/**
src/app/**                        (the app shell, not the marketing page)
```

Another agent is doing the unblocked items (photo, multi-column export, showcase seeding, engine upgrade) concurrently. Stay out of `src/lib/export/`, `src/lib/typst/`, `api/`, and marketing copy.

## The composition work — from `tool-visual-design.md` Top 20

Items already done by the design-system wave: #1 depth, #2 buttons, #3 type roles, #5 panel framing primitives, #8 selection language primitives, #10 status tokens, #11 empty-state primitives, #12 skeleton primitives.

**Your items — the composition:**

4. **Editor top bar** — name at 20/600 shown **once** + a meta line (template · density · pages · fit), Export as the one primary. Kill the repeated title block and the raw template key.
6. **Form spine** — 640px measure cap, 12/600 tracked labels, **one** rhythm (label→control 4 / field 16 / group 24). Today there are 3 competing rhythms and 560px stretched inputs.
7. **Dashboard cards + grid** — the title owns its row, framed thumbnails, the grid fills the viewport (the dead lower 40% is the audit's #5), and the card must carry: name, template, density, page count, last edited, and the showcase badge where relevant.
9. **Adaptive three-zone shell** — the segmented `Sections | Edit | Preview` switcher below 1024px, with persistent resize grips on desktop. (The responsive wave built the switcher; make it *designed*.)
13. **Review sheet re-hierarchy** — the summary/verdict is promoted and leads; tabs become a quiet underline strip; findings lead with their verdict, not their badge.
14. **Import review re-hierarchy** — one callout, field cards lead, not three amber prose blocks.
15. **Formatting toolbar** — labelled segmented stepper groups, tooltips, kbd hints. Kill the twin "%" pill steppers.
16. **Export menu** — per-format icon tiles with one-line descriptions of what each is *for*. Export is primary, JSON secondary.
17. **The preview stage** — the hero surface. Vignette field + 3-layer paper shadow + a dark sheet edge. This is where the ornament budget is spent.
18. **Dialog pass** — destructive actions name their target, disabled controls carry a reason.
20. **Motion & micro-polish** — 120/180/240ms, hover lift on cards, reduced-motion gating, `kbd` chips on shortcuts.

Also, from `refactoring-ui-rules.md`:
- **Emphasize by de-emphasizing** — make the *content* the highest-contrast object, and the chrome quieter. Right now the loudest thing on screen is usually a button.
- **Labels are a last resort** — if a control's meaning is obvious from its icon or placement, drop the label. If it needs a label, make it a micro-label, not a field label.
- **Avoid ambiguous spacing** — related things close, unrelated things far. Audit every gap.
- **Supercharge the defaults** — the out-of-the-box experience should look designed with zero configuration.
- **Use fewer borders** — separate with spacing and tone before reaching for a border.

## Acceptance
- **A human looking at a before/after screenshot pair must say "that is a different app."** Screenshot every surface at 1440 and 390, both themes, before and after, into `.probe-shots/w3-compose/`.
- The squint test: at a glance, the eye lands on resume content, then the primary action. Not on a button, not on a border.
- No `card` inside a `card`. No competing primary buttons in a region.
- One spacing rhythm per surface. Every value from the system (`token-offenders.json` stays empty).
- The `/design-system` page must still pass its test, and the design system's own rules must hold.
- `test/marketing-claims.test.ts` still passes (do not touch marketing copy).

## Hard constraints
- **The resume document is Surface B.** Do not style it with the app's language. `test/responsive-matrix.test.ts` and `test/preview-matches-exporter.test.ts` guard this — they will fail you if you tint the paper.
- Biome baseline 0.
- Do not change product copy except where a control prints a raw value.
- `npm test -w api` wipes local D1. Re-seed after.

## Verify
```
npm run build:types && npm run typecheck && npm run typecheck -w api
npx vitest run && npx biome check . && npm run build
node scripts/probe-start.cjs api web && npm run db:reset-seed
node scripts/probe/full-pass.cjs
```
Then **look at your own work**. If it still looks like the old app, keep going.

## Deliverable in your reply
1. Before/after screenshot filenames for every surface.
2. The 10 changes that most change how the app looks, each with the rule it comes from.
3. What you deliberately left quiet, and why.
4. The squint-test result: what the eye lands on first now.
5. Test results and anything out of scope.
