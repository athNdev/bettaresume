# Wave 1A — Fix the document type/spacing units and rebuild the scale

You are a senior engineer implementing a well-scoped change. This is a real production change that must be merged.

## Read first (all of it)

- `CLAUDE.md` — repo conventions, commands, pitfalls
- `docs/AGENT-CONTEXT.md` — traps that have already cost hours
- `docs/research/template-research.md` — **the evidence base. Part 3 (typographic scale) and Part 4 (spacing system) are your specification.**
- `docs/research/page-fit-readability.md` §6 — the "prerequisite bug" section
- `docs/plan/00-conventions.md` — how work is shipped in this repo

## The bug you are fixing (verified)

`src/features/resume-editor/typst_templates/sections.typ:61`:

```
#let px-to-pt(px) = { float(px) * 0.75pt }
```

Every typography value read through `typo.*` is multiplied by 0.75 before being used as a Typst `pt` size. So a setting of `body: 11` renders at **8.25pt** — below every published floor (MIT says 10pt minimum; Imperial and Georgia Tech say 11pt).

Margins have the same problem: `minimal.typ:5` does `float(margins.top) * 0.75pt`, so a setting of 40 renders at 30pt (0.42in) when the research floor is 36pt (0.5in) and the recommendation is 0.6–0.75in.

Worse, the unit split is inconsistent: the document header reads `typo.name` and `typo.title` as **pt directly** (`minimal.typ:52-55`), while body text goes through `px-to-pt`. Two scales in one document.

## What to build

### 1. One unit, honestly named
Decide and implement: `ResumeSettings.typography` values become **true points**. This is the recommendation in the research (Part 3) and it makes the numbers the UI shows mean what they say.

Migration of stored metadata: existing resumes carry px-ish values (11 for body). They must render correctly after the change. Options:
- convert on read (detect old values and rescale), or
- treat the stored values as pt and accept that old resumes render bigger.

Research recommends the first. Implement whichever you can defend, and write down the reasoning in the code comment.

### 2. The typographic scale
Implement the research's Part 3 scale as the new defaults in `packages/types/src/schemas.ts` and the shared defaults in `src/lib/typst/serialize.ts` / `preview.tsx`:

| role | pt | weight | line-height |
|---|---|---|---|
| name | 18 (band 16–20) | 700 | 1.05 |
| title (professional title under name) | 11 | 400 | 1.1 |
| sectionHeading | 11 | 600 | 1.1 |
| itemTitle | 10.5 | 600 | 1.2 |
| body | 10.5 (band 10–12, **floor 10**) | 400 | 1.25 compact / 1.35 normal |
| small (dates, meta) | 9.5 (**floor 9**) | 400 | 1.1 |

Clamp in the serialiser and in the UI: body cannot go below 10pt without an explicit, warned user action. Small cannot go below 9pt.

### 3. The spacing scale
Implement research Part 4's `2/3/4/6/8/12/16pt` scale and use it everywhere in the templates:
- 3pt between bullets
- 4pt heading → content
- 6pt between entries
- 8–12pt above a section heading (use `sectionSpacing` to pick within this band: compact 8, normal 10, relaxed 12)
- 16pt header → body

Delete the current `spacing-val` switch (`sections.typ:46-54`, 8pt/12pt/20pt) and the scattered `v(4pt)` / `v(6pt)` literals. Every `v(...)` must be one of the scale values, named.

### 4. Margins
Defaults: sides 0.7in (50pt), top/bottom 0.6in (43pt). Hard floor 0.5in (36pt). The UI must show margins in **inches and mm**, not raw numbers.

### 5. Kill dead knobs
`settings.fontSize` is never read by any template. Remove it from the type, the schema, the serialiser, the toolbar and the preview defaults. Keep `fontScale` as the single size control.

### 6. Keep `accentStyle` but stop it being decorative
Research says coloured headings, coloured body text, section background fills and tinted badges are all advised against. Audit the templates (`sections.typ`, `minimal.typ`, `postgrad.typ`, `undergrad.typ`) and remove:
- coloured section heading text (headings should be the text colour, not the accent)
- tinted section background fills
- tinted badge/chip fills (`badge` helper at `sections.typ:63-67` draws `colors.accent + "20"` fill)

Keep colour as **one accent used sparingly**: the rule under a heading, and small caps labels if needed.

## Hard constraints

- **The resume text layer must stay single-column and in reading order.** That is the product's core guarantee. Do not change document flow.
- Every template must still compile. `test/typst-compile.test.ts` and `test/typst-templates.test.ts` must pass.
- `test/marketing-claims.test.ts` pins "Three templates" and the hero's counts. Do not change the template count.
- `test/preview-matches-exporter.test.ts` pins single-column. Do not weaken it.
- Biome is at a **baseline of 0**. `npx biome check .` must report 0 findings when you are done.
- Do not raise `.github/biome-baseline.txt` above 0.

## How to verify

```
npm run build:types
npm run typecheck
npm run typecheck -w api
npx vitest run
npx biome check .
npm run build
```

Then **actually render a resume and look at it**:
```
node scripts/probe-start.cjs api web
npm run db:reset-seed
node scripts/probe/full-pass.cjs
node scripts/probe/export.cjs
```
Take screenshots at 1440 width of the editor preview before and after. Save them to `.probe-shots/`. The body text must be visibly larger and the page must still fit a realistic resume on one page.

**Important:** `npm test -w api` wipes local D1. Re-run `npm run db:reset-seed` after it.

## How to ship

Follow `docs/plan/00-conventions.md` exactly: branch, PR, green CI, merge to main. Never push to main directly.

## Deliverable in your reply

1. The decision you made about the unit and why.
2. Before/after rendered body size in pt, and the margin in inches.
3. The list of decorative things you removed from the templates.
4. Test results.
5. Anything you found that is out of scope and should become a work item.
