# Round 3B — polish pass, closing the critique gaps

You are the product designer who ships code. Small, surgical, high-value.

## Worktree (MANDATORY — `docs/plan/00-conventions.md`)
```
git fetch origin
git worktree add .worktrees/w-polish -b feat/ui-polish-r3 origin/main
cd .worktrees/w-polish
```
**Remove only your own worktree. Never `rm -rf .worktrees`.**

## Context

Round 3A (#248) fixed the behavioural defects and added a behavioural gate. I then critiqued the result. These are the gaps.

## The critique, verbatim

Mine:
1. **Card order is wrong.** "Showcase — Full CV" leads and "Showcase — One-pager" second. The one-pager is the stronger artefact and should lead; the two showcase cards should be adjacent and ordered deliberately.
2. **The Example resume banner has a dead gap.** Text wraps at ~52ch, the button sits far right, and ~400px of nothing sits between them at 1440. Either let the text breathe across the row or pull the button closer — do not strand it.
3. **`6 resumes` floats** disconnected at the top-right instead of anchoring the card grid. It should read as the grid's count.
4. **Dead code**: `src/components/marketing/craft.tsx` is no longer imported after the section was removed. Delete it.

The implementing agent's own self-critique (fix these too):
5. **Only the Experience form is hit-tested.** All nine section forms share the sticky-entry-toolbar pattern that broke Page breaks. Hit-test every one in `test/behavioural-ui.test.ts`.
6. **No "example unavailable" state.** If the resumes query fails, the Example entry points vanish with no message — indistinguishable from "there is no example". Add a designed state.
7. **Mobile meta truncates mid-word** (`Compact · Com…`). Give the card meta a designed small-screen variant, not a truncation.
8. **Per-entry selects use a group label**, not per-row labels — the row's entry name is adjacent text rather than its accessible name.

## Also worth checking
- The editor has **no document switcher** — the Example control is the only cross-document navigation there. Decide: add a quiet one, or deliberately leave it and say why.
- Card `Badge` tooltips are hover-only (the trigger is a `div`, not focusable). Keyboard users cannot read them.

## Hard constraints
- **Behavioural verification, not visual.** Extend `scripts/probe/behaviour.cjs` and `test/behavioural-ui.test.ts` for every fix. A screenshot is necessary and never sufficient.
- `test/marketing-claims.test.ts` must still pass after deleting `craft.tsx`.
- Biome baseline 0. `test/baselines/token-offenders.json` stays empty.
- Do not touch the resume document (Surface B).
- `npm test -w api` wipes local D1. Re-seed after.

## Verify
```
npm run build:types && npm run typecheck && npm run typecheck -w api
npx vitest run && npm test -w api && npx biome check . && npm run build
node scripts/probe-start.cjs api web && npm run db:reset-seed
node scripts/probe/behaviour.cjs && node scripts/probe/full-pass.cjs
BEHAVIOURAL_UI=1 npx vitest run test/behavioural-ui.test.ts
RESPONSIVE_MATRIX=1 npx vitest run test/responsive-matrix.test.ts
```

## Deliverable in your reply
1. Each of the eight items: what you did, or why you deliberately did not.
2. The behavioural assertions you added.
3. Before/after for the banner and the card ordering.
4. What is still weak.
5. Test results.
