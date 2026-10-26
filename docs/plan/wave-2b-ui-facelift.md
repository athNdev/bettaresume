# Wave 2B/C — UI facelift

Two agents run this brief concurrently on **disjoint surfaces**. Your message says which surface is yours. Do not touch the other one.

You are a senior product designer who ships code. Real production change: branch, PR, green CI, merge.

## Read first
- `CLAUDE.md`, `docs/AGENT-CONTEXT.md`, `docs/plan/00-conventions.md`
- `docs/research/ui-audit.md` — **this is the defect list. Its "highest-impact fixes" is your task order.**
- `docs/research/design-systems.md` — Part 3 (the Refactoring UI rules), Part 5 (component inventory and density rules)
- `docs/design-system/README.md` — the tokens that now exist. Use them.
- `test/token-scale-closure.test.ts`, `test/baselines/token-offenders.json` — the enforcement. Your surface is currently ratchet-listed; **your job is to clear your side of that baseline**, not add to it.

## The rules you are enforcing (from the research, the operative list)

1. **Greyscale first, colour last.** Hierarchy comes from weight, size and spacing — not from tinting things.
2. **At most 2 type sizes in any one view.** Everything else is weight and tone. The audit found marketing at 22 sizes and the app at 87% `xs`/`sm`.
3. **Every spacing value from the scale.** 4px base, 2px optical half-step. The audit found ~90 distinct steps and ~27 singletons (`pl-6.5`, `gap-[3px]`, `py-18`). Kill them.
4. **Not every element deserves equal weight.** Pick what the eye should land on first and make everything else quieter.
5. **Padding proportional to importance.** Tight on dense rows, generous on primary containers.
6. **Shadows and borders separate layers** — not more whitespace.
7. **Dark grey over pure black.** `color-mix` for tints.
8. **One primary button per region.** Secondary actions are secondary.
9. **Design states, not just the happy path**: default / hover / active / focus-visible / disabled / loading / error / empty.
10. **Small components before pages.** Fix the primitive, then the composition.

## Agent B's surface

```
src/features/dashboard/**
src/app/**            (marketing shell, layout)
src/components/marketing/**
src/styles/**
src/components/ui/**  (primitives only, if a primitive needs a density fix)
```

Audit items in scope for B:
- **#5 Dashboard dead space.** Lower 40% empty; titles truncate into their "…" menu ("Harvard Appli… …"); "4 resumes" duplicated in the rail. Fill the width (bigger cards or a 5th column), let the title own its row, merge the duplicated counts.
- **#8 Placeholder-looking states.** Card thumbnails are a bare icon in an empty box (`resume-thumbnail.tsx:179`); marketing template cards half-empty. Build real skeleton/thumbnail treatments.
- **#6 Typography split-brain on marketing.** 22 sizes, 4 body sizes within 0.8px. Collapse to one body step and a closed scale.
- **#9 Spacing rhythm on marketing and dashboard.**
- **#10 Status colours** in any file you own.

Also: the marketing page's empty regions and weak hierarchy.

## Agent C's surface

```
src/features/resume-editor/**   (NOT typst_templates/)
src/components/sections-forms/**
src/components/rich-text-editor/**
src/components/export/**
src/features/resume-editor/hooks/**
```

Audit items in scope for C:
- **#4 Editor hierarchy inverted.** Document name is 14px `text-sm`; its title repeats 4x; the subtitle prints raw "postgrad" (`resume-editor.tsx:1173-1177, 1427`). Make the document name the largest thing on screen (~20px), print the *template display name*, and delete the repeated title block in each form.
- **#7 Twin "%" steppers.** `formatting-toolbar.tsx:176-197, 645` has font scale 100% and zoom 67% looking identical. Label them distinctly ("Type scale" vs "Preview zoom"), give them different treatments, and tooltip the icon-only popovers.
- **#3 Review sheet tab strip** (`review-panel.tsx:193`) — "Bullets 10" clips even at 1440. Wrap or scroll the strip and move counts out of the tab labels into the panel.
- **#9 Spacing rhythm** across the 11 section forms and the editor.
- **#10 Status colours** in your files (`save-state.tsx`, `review-panel.tsx`, `change-log.tsx`, …).
- **Empty/loading/error states** in the editor: the "no sections yet" state, the preview skeleton, export in-progress.

Do **not** change document typography or the Typst templates — another agent owns those.

## Acceptance (both agents)

- The audit items assigned to you are each resolved, or explicitly deferred in your reply with a reason.
- Every spacing/size value in your surface comes from the token scale. Run the enforcement tests and **clear your side of `test/baselines/token-offenders.json`** — a stale entry also fails, so the baseline must shrink.
- No competing primary buttons in any region.
- Every empty, loading and error state is designed; none looks like a placeholder.
- Before/after screenshots for each surface at **1440 and 390**, both themes, into `.probe-shots/`.
- `test/token-scale-closure.test.ts`, `test/token-raw-colour.test.ts`, `test/token-state-matrix.test.ts`, `test/token-surface-isolation.test.ts`, `test/app-token-contrast.test.ts` all pass.

## Hard constraints
- **Do not change product copy** except where the audit found something printing a raw value (e.g. "postgrad").
- `test/marketing-claims.test.ts` pins the marketing claims. If you touch marketing copy, keep every claim true and every pinned phrase intact unless you update the test in the same PR with a reason.
- Biome baseline 0.
- `npm test -w api` wipes local D1. Re-seed with `npm run db:reset-seed` after.
- The resume *document* preview must stay paper-white and must not adopt app chrome tokens.

## Verify
```
npm run build:types && npm run typecheck && npm run typecheck -w api
npx vitest run && npx biome check . && npm run build
node scripts/probe-start.cjs api web && npm run db:reset-seed
node scripts/probe/full-pass.cjs
```

## Deliverable in your reply
1. Which audit items you fixed, and which you deferred (with reasons).
2. The spacing/type values you settled on for your surface.
3. How many `token-offenders` entries you cleared.
4. Before/after screenshot filenames.
5. Test results.
