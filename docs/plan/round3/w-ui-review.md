# Behavioural correctness + the multi-dimensional UI review

You are the lead product engineer. This is a **critique → plan → implement → critique again** pass over the whole app UI.

## Work in your own git worktree (MANDATORY — `docs/plan/00-conventions.md`)
```
git fetch origin
git worktree add .worktrees/w-ui -b feat/ui-review-round3 origin/main
cd .worktrees/w-ui
```
**Remove only your own worktree. Never `rm -rf .worktrees`.**

## The maintainer's report (verbatim, treat as fact)

> "the app itself needs a lot of serious UI work, the Review panel does not scroll, the Page Breaks sections remains hidden, I don't see the example resume anywhere, the overall layout, UI/UX and features have not been meaningfully improved."

And: "There doesn't need to a massive section for design system, that is not part of the app, a link somewhere in the footer is enough."

## Priority 0 — the three named defects

I already reproduced all three. **Use my diagnosis; verify it, don't rediscover it.**

### A. Nothing scrolls — this is the root cause of two of the three

`SheetContent` is `flex flex-col`, but Radix `Tabs.Root` renders a plain **block** `div`. So `TabsContent className="min-h-0 flex-1"` receives **no height**, `ScrollArea className="h-full"` resolves against an auto-height parent, the viewport never gets `overflow-y`, and content simply overflows.

Measured, Review sheet, Checklist tab:
```
dialogScroll: 2251, dialogClient: 900, scrollables: [], rows: 82
```
82 rows of content and **zero** elements with `overflow-y: auto|scroll`.

**Fix the height chain, not the symptom.** Then audit **every scrollable region** and confirm each actually scrolls: section form, section rail, review sheet (all six tabs), library panel, history panel, template picker, export menu, long dialogs, dashboard, design-system page.

`section-break-controls.tsx` ("Page breaks") is a `<details>` below the fold in a form that cannot scroll, so it is unreachable — Playwright's `click` times out. Fixing the scroll should fix it, but **verify every collapsed panel actually opens**.

### B. "I don't see the example resume anywhere"

The showcase **is** on the dashboard (a banner plus two cards) — but the maintainer did not find it. That is a **discoverability** failure. Work out why and fix it: below the fold? banner too quiet? missing from where people actually look (marketing page, empty state, the editor's document switcher)? Make it unmissable **without** being loud.

### C. Design system is a page section — remove it

The landing page has a "Craft" section plus a footer link. **Delete the section, keep a footer link.** The design system is not part of the product. Update `test/marketing-claims.test.ts` in the same change.

## Then: the multi-dimensional review

Tear the app apart across **every** dimension below. For each: **critique → write a dev plan → implement → critique your own implementation**. Do not stop at critique.

1. **Behavioural correctness** — does every control do what it says? Click everything. Expand every collapsible. Scroll every region. Open every menu.
2. **Layout & spatial** — alignment, grid integrity, proportion, optical balance, wasted or cramped regions.
3. **Visual hierarchy** — what leads, what recedes, at a glance and at reading distance.
4. **Typography** — sizes, weights, tracking, line length, readability of every text role.
5. **Colour & contrast** — theme coherence, state colours, contrast in both themes.
6. **Interaction states** — hover / focus-visible / active / disabled / loading / error on **every** control.
7. **Navigation & information architecture** — can a user find things? Where do the showcase and the page-break controls live? Are features discoverable?
8. **Forms & input** — field design, labels, validation, error recovery, keyboard flow.
9. **Feedback & status** — save state, toasts, progress, undo, what confirms an action landed.
10. **Density & information rhythm** — is the screen efficiently used? Where is it empty or cramped?
11. **Consistency** — the same pattern doing the same job everywhere. Name the divergences.
12. **Accessibility** — keyboard reachability of *every* control, focus order, focus trapping, ARIA naming, screen-reader semantics.
13. **Copy & microcopy** — labels, help text, empty-state and error wording. Precise and honest.
14. **Empty / loading / error / edge states** — every one, designed or not.
15. **Responsive** — every surface at 360 / 390 / 768 / 1024 / 1440, both themes.

## How to verify — the part that was wrong before

**A screenshot is necessary and never sufficient.** For every change, confirm the control *works* when driven.

- `scripts/probe/behaviour.cjs` exists and already reproduces the defects. **Extend it** to drive every control and assert the outcome. Run it before and after.
- Add `test/behavioural-ui.test.ts` (Playwright, `channel: "chrome"`) that fails if a region cannot scroll, a collapsible cannot open, or a control cannot be clicked. This is the regression gate for the whole class of bug.
- `node scripts/probe/full-pass.cjs` and `production.cjs` must stay green.
- Run `RESPONSIVE_MATRIX=1 npx vitest run test/responsive-matrix.test.ts`.

**When you think you are done, drive the app yourself as a user would and try to break it.** Report what you could still break.

## Hard constraints
- **The resume document (Surface B) is out of scope.** `test/preview-matches-exporter.test.ts` and `test/token-surface-isolation.test.ts` guard it.
- Do not change product copy except where it is wrong, raw, or unclear.
- Biome baseline 0. `test/baselines/token-offenders.json` stays empty.
- `test/marketing-claims.test.ts` must pass after the design-system section removal.
- `npm test -w api` wipes local D1. Re-seed after.

## Deliverable in your reply
1. **The three named defects**: root cause, fix, and proof each now works.
2. **Per dimension**: the critique, the plan, what you implemented, and **your critique of your own implementation** — what is still weak.
3. **The behavioural test** you added and what it pins.
4. What you could still break when you tried.
5. Test results.
