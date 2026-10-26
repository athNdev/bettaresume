# W6 — Update the home page (the last item)

You are a senior product designer who ships code. This is the **final** item. Everything else has landed.

## Work in your own git worktree (MANDATORY — see `docs/plan/00-conventions.md`)
```
git fetch origin
git worktree add .worktrees/w6-web -b feat/home-round2 origin/main
cd .worktrees/w6-web
```
**Remove only your own worktree. Never `rm -rf .worktrees`.**

## Read first
- `CLAUDE.md`, `docs/AGENT-CONTEXT.md`, `docs/plan/00-conventions.md`
- `test/marketing-claims.test.ts` — **the gate. Read it before writing a word.**
- `docs/research/tool-visual-design.md` and `docs/design-system/brand.md` — the visual language and the brand
- `docs/research/competitor-research.md` §4 (honesty audit) — why our positioning is credibility
- `docs/research/space-efficiency.md` — the density numbers
- `docs/SHOWCASE.md`

## What has shipped since the last home-page pass

The page must reflect **this**:

1. **A real brand** — new mark (two offset sheets), wordmark ("Betta" 700 / "Resume" 400), lockups, favicon, clear-space rules. Use the brand assets in `public/brand/`.
2. **A design system with its own page** at `/design-system` — brand, colour, type, space, depth, motion, every component in every state. **Link to it.** This is a differentiator: almost no competitor publishes one.
3. **Six archetypes** — standard, compact, technical, graduate, academic, executive — differentiated by structure and density, no decorative colour. Real generated specimens.
4. **Density that actually fits one page.** The showcase one-pager now sits at **83% fill on one page** at Balanced (it used to be 93.5% and spilled to a nearly-empty page 2). The presets now reach *every* gap — entry, bullet, meta, header — which they previously did not.
5. **The page-fit suite** — page target, live meter naming the entry where the spill starts and pricing each fix in mm, three density presets, semantic page breaks (keep entry together / keep section together / start on a new page).
6. **Readability checks** — five named rows. Still **no score**.
7. **Rich-text marks reach PDF and DOCX.**
8. **Tagged PDF (PDF/UA-1)** — the export now carries `/MarkInfo`, `/StructTreeRoot` and `/Lang`, with a structural tree. This is a *real, verifiable* accessibility and parse-quality claim. Say what it means precisely; do not overclaim ("accessible" is a legal term).
9. **The showcase resume is seeded for every user** on first sign-in — so "view the example" is a real promise.
10. **A design CV export** — two-column, for people not parsers, with a permanent warning.
11. **Fully responsive to 360px**, with a designed single-pane editor mode.

## The brief

> "Update the home page to reflect the updated version of the app."

Rewrite `src/components/marketing/`. Decide the structure; the previous pass's order (hero → features → templates → page fit → readability → example → principles → FAQ → close) is a reasonable starting point but is yours to change.

New material worth its own space:
- **The brand**, properly used — the mark and wordmark, not a text heading.
- **A link to `/design-system`** — "see how it's built", as evidence of craft.
- **The tagged PDF** — this is the claim nobody else in the category makes honestly.
- **The one-page guarantee in numbers** — the fill-ratio result is concrete and verifiable.

## Hard constraints — these are tested

- **Every claim maps to a shipped code path.** `test/marketing-claims.test.ts` pins feature → module. Update it in the same PR for anything new you name.
- **No outcome claims.** No percentages about *hiring*, no "guaranteed", no "passes ATS", no "gets you interviewed". Numbers about the document itself (fill ratio, page count, mm saved) are fine and should be used — they are measurements, not promises.
- **No composite score anywhere.** The "Where the line is" band must keep "No score", "No invented content", "No tracker, no auto-apply".
- **No social proof or invented testimonials.**
- **No count the product does not have.** Hero counts are asserted against the schema.
- The exported-text panel must render `buildPlainText(SAMPLE_RESUME)` — the real exporter.
- The template gallery must be regenerated and `test/template-gallery.test.ts` must pass.
- The page must still prerender to static HTML with **no client JS**.
- Biome baseline 0. `test/baselines/token-offenders.json` stays empty.
- Do not change app code. This wave is the marketing surface only.

## Verify
```
npm run build:types && npm run typecheck && npm run typecheck -w api
npx vitest run && npx biome check . && npm run build
npm run templates:render
node scripts/probe-start.cjs api web && npm run db:reset-seed
node scripts/probe/full-pass.cjs && node scripts/probe/production.cjs
```
Then **read every sentence aloud and check it against the code.** Screenshot the full page at 1440, 1024, 768 and 390, both themes, into `.probe-shots/w6-web/`.

## Deliverable in your reply
1. The page structure and why.
2. Every claim you made and the module that backs it.
3. What you changed in `test/marketing-claims.test.ts`.
4. Screenshot filenames.
5. Test results, and what you would still change with more time.
