# Wave 4B — The showcase resume

You are a senior engineer. Real production change: branch, PR, green CI, merge.

## Work in your own git worktree (MANDATORY)

```
git fetch origin
git worktree add .worktrees/wave4-show -b feat/showcase-resume origin/main
cd .worktrees/wave4-show
```

Branch, commit, push and open the PR from the worktree. Remove the worktree when done.

## Read first
- `CLAUDE.md`, `docs/AGENT-CONTEXT.md`, `docs/plan/00-conventions.md`
- `docs/research/template-research.md` — what a *good* resume looks like, section by section
- `docs/plan/wave-3b-archetypes.md` — the six archetypes now shipped
- `docs/plan/wave-3a-page-fit.md` — the page-fit and readability features now shipped

## What the maintainer asked for

> "Have the option to view a pre-done resume for users to see how a fully-done resume looks in the app, this resume and its versions should fully leverage the app's features and will be updated as more features are added. This will act as a showcase as well as a way for me to manually review new features better."

## Build

### 1. A complete, realistic example resume

Not lorem ipsum. A resume a real person would send — grounded in the research's guidance (quantified bullets, action verbs, no duty phrasing, consistent date format, standard section headings).

It must exercise **every** feature the app has:
- all 13 section types (or as many as make sense for one person — and say which you left out and why)
- rich-text marks in a summary and in bullets (bold, italic, links) — these now export
- a content-library item placed in it, with one placement diverged from its master
- a variant (fork) with some sections linked and some detached
- revision history: several automatic snapshots plus at least two named versions
- a job target set, so the job-match panel has something to score
- `section.layout` flags: one `keepTogether: "always"`, one `pageBreakBefore`, one per-section spacing override
- a page target set (1 or 2), so the fit meter has something to say
- two templates represented: one dense one-pager, one two-pager

### 2. Ship it as a seeded, read-only-ish example

`api/src/db/seed.sql` already seeds four resumes. Add the showcase as a distinct, clearly-named record. Decide and justify:
- Should it be **editable** (so the maintainer can play) or **protected** (so it cannot be accidentally destroyed)? Recommend: editable, but restorable — i.e. its revision history is the restore path, and it is re-seedable.
- It must be obvious in the UI which resume is the showcase. A badge or a distinct name.

### 3. A "View the example" entry point

From the dashboard **and** from the empty state. Do not change marketing copy (that is the last wave).

### 4. Keep it alive as features land

Add a **test** that fails when the showcase stops exercising a feature. If a new section type, a new setting, or a new flag is added and the showcase does not use it, the test says so. This is what makes the showcase a real review fixture rather than a snapshot that rots.

Specifically: assert the showcase's JSON covers every key in `sectionTypeSchema`, every key of `ResumeSettings`, and `section.layout`'s flag set.

### 5. Document it

`docs/SHOWCASE.md`: what the showcase is, what it exercises, how to re-seed it, and the rule for updating it when a feature ships.

## Hard constraints
- **No invented claims about a real person.** This is a fictional but realistic persona. Say so in the seed.
- Do not change marketing copy — `test/marketing-claims.test.ts` is pinned and a later wave owns it.
- Do not change document typography or the Typst templates.
- Body text ≥10pt, small ≥9pt, margins ≥0.5in — `test/typography-units.test.ts` pins this.
- Biome baseline 0. `test/baselines/token-offenders.json` must stay empty.
- `npm test -w api` wipes local D1. Re-seed with `npm run db:reset-seed` after.
- The seed must stay valid against the Zod contracts — there is a test for that (`b3d9420d` fixed seed data violating them once).

## Verify
```
npm run build:types && npm run typecheck && npm run typecheck -w api
npx vitest run && npx biome check . && npm run build
npm run templates:render
node scripts/probe-start.cjs api web && npm run db:reset-seed
node scripts/probe/full-pass.cjs
```

Then open the showcase in the browser and **look at it**. Screenshot the dashboard entry, the editor, the review sheet, and the exported PDF's page 1. Save to `.probe-shots/`.

## Deliverable in your reply
1. What the showcase persona is and which features it exercises (and which it does not, and why).
2. Editable or protected, and your reasoning.
3. The test that keeps it alive — what it asserts.
4. Screenshot filenames.
5. Test results, and anything out of scope.
