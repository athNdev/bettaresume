# Wave 5 — Update the home page

You are a senior product designer who ships code. This is the **last** item: everything else has landed, and the landing page must now reflect the app as it actually is.

## Work in your own git worktree (MANDATORY)

```
git fetch origin
git worktree add .worktrees/wave5-web -b feat/home-page-refresh origin/main
cd .worktrees/wave5-web
```

Branch, commit, push and open the PR from the worktree. Remove the worktree when done.

## Read first
- `CLAUDE.md`, `docs/AGENT-CONTEXT.md`, `docs/plan/00-conventions.md`
- `test/marketing-claims.test.ts` — **this is the gate. Read it before writing a word.**
- `docs/research/competitor-research.md` §4 (honesty audit) and §5 (opportunities)
- `docs/research/design-systems.md` + `docs/design-system/README.md`
- `docs/SHOWCASE.md` — the example resume
- `docs/plan/wave-3a-page-fit.md`, `docs/plan/wave-3b-archetypes.md` — what shipped

## What actually shipped (the page must reflect THIS)

1. **Six template archetypes**, differentiated by structure and density: `standard`, `compact`, `technical`, `graduate`, `academic`, `executive`. No decorative colour anywhere in any of them. The gallery is generated from the real Typst pipeline (`npm run templates:render`) and cannot drift — a test enforces it.
2. **Page-fit suite**: a page target (1 or 2), a live meter reading "1.2 pages · 22 mm over target" that names the entry where the spill starts and prices each fix in mm, three density presets (Compact / Normal / Relaxed), and **semantic page breaks** — keep entry together, keep section together, start section on new page.
3. **Readability checks**: named pass/fail rows on line spacing, line length, printable margins, font embedding, last-page fill. **Never a score.**
4. **Rich-text marks survive export** — bold, italic, underline, strike, links now appear in PDF, DOCX and plain text.
5. **The showcase resume** — "Priya Raman", a fully-worked example the visitor can open, exercising every feature.
6. **Design system** with enforced scales; the whole app is responsive down to 360px.

## The brief from the maintainer

> "Update the home page to reflect the updated version of the app."

## What to do

Rewrite `src/components/marketing/` so a visitor sees what the product is *now*.

Suggested structure (yours to decide):
- Hero — the job the product does, with the real exported-text artefact (already generated from `buildPlainText`, keep that).
- **What's new / what it does** — the feature set, ordered by what a visitor cares about.
- **Templates** — all six archetypes with honest one-liners and the real generated specimens.
- **Page fit** — the meter and the density presets, as the answer to "will this fit on one page".
- **Readability** — named checks, and be explicit that there is no score (this is the differentiator).
- **The example resume** — a real thing they can open.
- **Where the line is** — keep "No score", "No invented content", "No tracker, no auto-apply".

## Hard constraints — these are tested

- **Every claim maps to a shipped code path.** `test/marketing-claims.test.ts` pins feature → module. Update it in the same PR for anything new you name.
- **No outcome claims.** No percentages, no "guaranteed", no "passes ATS", no "gets you hired".
- **No composite score anywhere.** The 0-100 score is the category's trust failure (see the honesty audit — identical inputs scored 85% and 61% by two vendors). Named checks only.
- **No social proof or invented testimonials.**
- **No count the product does not have.** The hero's counts are asserted against the schema.
- The "Where the line is" band must keep "No score", "No invented content", "No tracker, no auto-apply".
- The exported-text panel must render `buildPlainText(SAMPLE_RESUME)` — the real exporter. A test asserts it.
- The template gallery must be regenerated and `test/template-gallery.test.ts` must pass.
- Every page must still prerender to static HTML with no client JS (it is a `static export`).
- Biome baseline 0. `test/baselines/token-offenders.json` must stay empty.
- Do not change app code — this wave is the marketing surface only.

## Verify
```
npm run build:types && npm run typecheck && npm run typecheck -w api
npx vitest run && npx biome check . && npm run build
npm run templates:render
node scripts/probe-start.cjs api web && npm run db:reset-seed
node scripts/probe/full-pass.cjs && node scripts/probe/production.cjs
```

Then **read the whole page out loud** and check every sentence against the code. Screenshot the full page at 1440, 1024, 768 and 390, both themes, into `.probe-shots/`.

## Deliverable in your reply
1. The page structure you chose and why.
2. Every claim you made and the module that backs it.
3. What you changed in `test/marketing-claims.test.ts`.
4. Screenshot filenames.
5. Test results, and anything you would still change with more time.
