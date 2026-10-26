# W2 — Template space-efficiency rebuild

You are the document-layout engineer. Real production change: branch, PR, green CI, merge.

## Work in your own git worktree (MANDATORY)
```
git fetch origin
git worktree add .worktrees/w2-dens -b feat/template-density origin/main
cd .worktrees/w2-dens
```
Branch, commit, push, open the PR from the worktree. Remove it when done.

## Read first (all of it)
- `CLAUDE.md`, `docs/AGENT-CONTEXT.md`, `docs/plan/00-conventions.md`
- `docs/research/space-efficiency.md` — **your specification. Its waste audit and density envelope are the spec.**
- `docs/research/template-research.md` — the print-typography evidence
- `docs/plan/wave-3a-page-fit.md` — the density presets and page-break system already shipped

## The problem

The maintainer: *"The default resume design and templates is still quite lack luster, massive space wastage even after applying space recommendations."*

`docs/research/space-efficiency.md` quantified it. For a realistic 5-year engineer on Letter:

**Total recoverable ≈ 60 mm = 24 % of the page.** The named waste:

| # | Waste | Cost |
|---|---|---|
| 1 | Leading 1.35 → 1.25 | 12.2 mm |
| 2 | Comfort margins (43/50 pt) | 12.4 mm |
| 3 | **Section chrome** — 5 boundaries cost 41 mm where working templates spend 15–20 mm | ~11 mm |
| 4 | **Header** — 17.4 mm vs Jake's ~9.5 mm | 7.5 mm |
| 5 | Skills chip clusters (8 rows → 4 `Category: item` lines) | 8.2 mm |
| 6–8 | Entry / bullet / meta gaps | 9.5 mm |
| 9 | **`keepTogether` holes** — 25–35 mm *per occurrence* | the "half empty page" paradox |

**And the defect that makes the density presets inert:**
> `sectionSpacing` never reaches the entry (6 pt) and bullet (3 pt) gaps — they're compile-time constants, so no density preset can reclaim their 23 mm.

That is why "applying space recommendations" changed nothing.

## Build

### 1. Make the density presets actually reach every gap

Thread `sectionSpacing` (or a richer density signal) through to **entry gaps, bullet gaps, meta→bullet gaps, section heading rows, and the header block**. The three presets must change the whole document, not half of it.

Presets from the research's density envelope:

| Parameter | **Tight** | **Balanced** (new default) | **Relaxed** |
|---|---|---|---|
| Margins | 12.7 mm (36 pt) all | 12.7 mm (36 pt) all | 15.2 mm T/B, 17.6 mm L/R |
| Body / line height | 10 pt / 1.22 | 10.5 pt / 1.25 | 10.5 pt / 1.35 |
| Section gap above / heading→entry | 6 pt / 3 pt | 8 pt / 4 pt | 10 pt / 4 pt |
| Entry / bullet / meta→bullet gaps | 4 / 2 / 2 pt | 4 / 2 / 3 pt | 6 / 3 / 4 pt |
| Heading treatment | UPPERCASE 600, no rule | UPPERCASE 600, rule opt-in | UPPERCASE + accent rule |
| Header | name + 1 contact line, 6 pt gap | name + title + contact line, 8 pt gap | 3-line header, 16 pt gap |
| Line budget | ~59 lines | ~55 lines | ~50 lines |
| **Fill-ratio target** | **88–94 %** | **78–85 %** | **68–75 %** |

**`Balanced` is the new default and must land a 5-year engineer at ~79 % fill.** The research measured working one-pagers at 93–98 % fill, so 70 % would recreate the half-empty page — do not go below these targets.

### 2. Rebuild the section chrome

The single biggest structural waste. Five section boundaries currently cost 41 mm. Working templates spend 15–20 mm.

Research and adopt a heading treatment that carries the same information in less vertical space:
- UPPERCASE 600 weight with **no rule** as the default (the rule is opt-in and costs 2.6 mm per section)
- the gap above and below a heading must be asymmetric (more above, less below) — `refactoring-ui-rules.md` covers "avoid ambiguous spacing"
- a section heading must not cost more vertical space than its first line of content

### 3. Compress the header
17.4 mm → ~9.5 mm. Name + professional title + one contact line. Decide the exact treatment (inline separators vs one wrapped line) and make it a shared helper so all six archetypes agree.

### 4. Skills as lines, not chip clusters
`Category: item, item, item` as flowing lines rather than a chip cluster — 8 rows → 4 lines, saving 8.2 mm. Chips are fine as an *option*, not the default.

### 5. Fix the `keepTogether` hole
A whole entry jumping to page 2 leaves a 25–35 mm hole — that is the "page looks half empty at the same time as content overflows" paradox the maintainer described. Implement the Auto mode properly: keep small entries together only, and let large ones break with a clean hanging continuation. Also add a **"fill the hole"** hint in the relief ladder when a keep-together choice is costing page space.

### 6. All six archetypes must get the treatment
`standard`, `compact`, `technical`, `graduate`, `academic`, `executive`. They differ by structure and density — `compact` should be genuinely tight, `executive` genuinely generous. No decorative colour, no coloured headings, no section fills.

## Hard constraints
- **Body text ≥ 10 pt. Small ≥ 9 pt. Margins ≥ 0.5 in / 36 pt.** `test/typography-units.test.ts` pins this — do not regress it.
- **Single-column reading order is a guarantee.** `test/preview-matches-exporter.test.ts`, `test/typst-compile.test.ts` and the text-layer assertions protect it.
- No coloured body text, no section background fills, no icons in headings, no tinted badges.
- Every spacing value from a named scale. No raw `v(4pt)` literals.
- After touching any `.typ`, run `npm run templates:render` — `test/template-gallery.test.ts` fails on stale SVGs.
- Biome baseline 0. `test/baselines/token-offenders.json` stays empty.
- `npm test -w api` wipes local D1. Re-seed after.

## Verify
```
npm run build:types && npm run typecheck && npm run typecheck -w api
npx vitest run && npx biome check . && npm run build
npm run templates:render
node scripts/probe-start.cjs api web && npm run db:reset-seed
node scripts/probe/full-pass.cjs && node scripts/probe/export.cjs
```

**Measure, do not guess.** Render the showcase resume (Priya Raman) at each density and report the actual fill ratio and page count. Add a test that asserts the fill ratio lands in the target band — this is what stops the space from creeping back.

Screenshot every archetype at Balanced and Tight into `.probe-shots/`.

## Deliverable in your reply
1. The fill ratio and page count of the showcase resume at each of the three densities, before and after.
2. The mm recovered by each of the six fixes.
3. The new section-heading treatment and its cost in mm.
4. How `sectionSpacing` now reaches every gap (what you threaded through).
5. Test results, including the new fill-ratio test.
