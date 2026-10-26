# W5 — Multi-column "design" export (the ATS-unfriendly target)

You are a senior engineer. Real production change: branch, PR, green CI, merge.

## Work in your own git worktree (MANDATORY — see `docs/plan/00-conventions.md`)
```
git fetch origin
git worktree add .worktrees/w5-multi -b feat/multi-column-export origin/main
cd .worktrees/w5-multi
```
**Remove only your own worktree. Never `rm -rf .worktrees`.**

## Read first
- `CLAUDE.md`, `docs/AGENT-CONTEXT.md`, `docs/plan/00-conventions.md`
- `docs/research/editor-renderer.md` — the engine evaluation and the single-column guarantee
- `docs/research/template-research.md` §6 — why multi-column is advised against
- `docs/plan/round2/w2-template-density.md` — the current spacing system

## The decision

The maintainer asked for a multi-column / "design CV" export. The research says: **never inside the normal editor** — multi-column is the largest single cause of ATS parse failure, because text layers scramble by coordinate.

So this ships as a **separate, explicitly warned export target** — not a layout option in the normal flow. The product's core promise ("the text layer is single-column and readable") stays true for everything a user sends to an ATS; the design export is for a document the user will hand to a person or publish.

## Build

### 1. A distinct export target
Not a template toggle. A separate action: **"Export design CV (PDF)"**, visually and verbally distinct from the normal Export, with a permanent, non-dismissable warning:

> This layout is not parser-safe. Use the standard export for anything that goes through an applicant tracking system.

The warning must be visible at the point of export, not buried in a tooltip. Do not let the user pick this without seeing it.

### 2. One two-column template
Build `design-column.typ` — a real, considered two-column CV. Research what good two-column CVs look like (sidebar with contact/skills/languages, main column with experience/education). It must:
- use the existing type and spacing scales (`w2-template-density` established `gaps-for(spacing)`)
- be genuinely beautiful — this is a *design* export
- NOT be in `TEMPLATE_CONFIGS`' normal picker. It is a separate registry, or a flagged entry.

### 3. Tell the truth about the text layer
The plain-text and DOCX exports must **not** silently produce a scrambled column order. Either:
- refuse the multi-column source and say why, or
- produce the text in **reading order of the visual layout** (left column top-to-bottom, then right column), and label the output.

Whatever you choose, `docs/` must state it, and a test must pin it. The whole product's credibility rests on "the text layer is knowable" — a two-column export that silently produces garbage would break that.

### 4. Do not weaken the guarantee
- `test/preview-matches-exporter.test.ts` and the reading-order tests must still pass **for the standard templates**.
- Add a test that asserts the design export is **excluded** from the parser-safe guarantee, so nobody later promotes it into the normal picker.

## Hard constraints
- The standard path stays single-column. Always.
- Biome baseline 0. `test/baselines/token-offenders.json` stays empty.
- `test/marketing-claims.test.ts` must pass. Do not touch marketing copy (a later wave does that).
- Do not change the standard templates' layout or typography.
- `npm test -w api` wipes local D1. Re-seed after.

## Verify
```
npm run build:types && npm run typecheck && npm run typecheck -w api
npx vitest run && npx biome check . && npm run build
npm run templates:render
node scripts/probe-start.cjs api web && npm run db:reset-seed
node scripts/probe/full-pass.cjs && node scripts/probe/export.cjs
```
Screenshot the export menu with the design option, the warning state, and the resulting two-column PDF, into `.probe-shots/`.

## Deliverable in your reply
1. How the design export is presented and where the warning sits.
2. The two-column template's layout and why it looks that way.
3. What the text layer produces for a two-column source, and how it is labelled.
4. The tests that pin both the guarantee and the exclusion.
5. Test results and anything out of scope.
