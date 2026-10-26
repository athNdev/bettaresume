# Wave 3 — Page-fit and readability suite

You are a senior engineer. Real production change: branch, PR, green CI, merge.

## Work in your own git worktree (MANDATORY)

Other agents work in this repo concurrently. Do **not** work in the shared checkout.

```
git fetch origin
git worktree add .worktrees/wave3-fit -b feat/page-fit-suite origin/main
cd .worktrees/wave3-fit
```

Branch, commit, push and open the PR from the worktree. Do not touch the main checkout. Remove the worktree when you are done.

## Read first
- `CLAUDE.md`, `docs/AGENT-CONTEXT.md`, `docs/plan/00-conventions.md`
- `docs/research/page-fit-readability.md` — **your specification. Build §1, §2, §3, §4, §5.**
- `docs/research/template-research.md` — the typography bands the readability checks must use
- `docs/plan/wave-2a-spacing-and-marks.md` — the spacing scale and leading mapping that already landed

## What already exists (do not rebuild)
- Typst compiles in-browser; page count is published by `usePreviewPages` (`src/features/resume-editor/lib/preview-pages.ts`).
- `src/lib/analysis/rubric.ts` is the named-check system. `RubricCheck` has `id`, `group`, `title`, `ok`, `soft`, `effort`, `detail`, `anchor`. **Never add a composite score** — this is a hard product principle, tested in `test/rubric.test.ts`.
- `src/lib/analysis/parse-fidelity.ts` and `ats-match.ts` are the other two engines.
- `ResumeSettings` has `fontScale`, `typography`, `lineHeight`, `margins`, `sectionSpacing`, `dateFormat`, `accentStyle`, `fontFamily`.
- Body text floors: 10pt body, 9pt small. Margins floor 0.5in. These are clamped and tested in `test/typography-units.test.ts`.

## Build

### 1. Page target + live overflow meter
A toolbar control to set a **page target** (1 or 2), and a live chip reading like:

> **1.2 pages · 22 mm over target**

Expanding names **where the spill starts** (the entry anchor) and prices each available fix in mm.

Implement the measurement with an invisible Typst `metadata` probe read back via `$typst.query` — see the research §2 for the mechanism. The measurement must be accurate to ±2mm.

`pageTarget` should live in `resumeSettingsSchema` (Zod, metadata JSON, default per template). If you decide UI-local state is better, justify it.

### 2. Density presets
Compact / Normal / Relaxed as **atomic settings patches** touching `sectionSpacing` + `lineHeight` + `margins` + header gaps. **Normal must reproduce today's output exactly** — that is the regression test.

### 3. Semantic page-break controls
Word-vocabulary flags on sections and entries:
- "keep entry together"
- "keep section together"
- "start section on new page"

Mapped to Typst `block(breakable:)`, `block(sticky:)`, `pagebreak(weak: true)`. Plus an **Auto** mode that keeps small entries together only.

This is the genuinely missing feature — research §3. Verify with a test that compiles a resume with one long entry and asserts it does not split.

### 4. Overflow relief ladder
Ordered suggestions, each with a measured gain in mm:
- **Layout rows** (spacing, margins, type scale) get an **Apply** action with a **diff-confirm** first and a one-click undo.
- **Content rows** (hide section, hide entry, trim bullets) are **never auto-applied**. We never invent or cut content. Ever.

### 5. Readability checks
Add to `src/lib/analysis/rubric.ts` as named pass/fail/advice rows with a verdict and a fix:
- line spacing 1.2–1.6
- line length 70–110 characters
- printable margins ≥ 32px equivalent
- font embedded (via `resolveTypstFont`)
- last-page fill (how empty the final page is)

Plus **font family advice** — safe for ATS and print, with the metric-compatible fallbacks we already ship (Arimo/Tinos/Carlito). Guidance, not preachiness.

### 6. Per-section spacing overrides
On top of the global preset: a per-section spacing override.

## Hard constraints
- **No composite score anywhere.** Named checks only. `test/rubric.test.ts` and `test/marketing-claims.test.ts` assert this.
- **No silent auto-fit that cuts content.** No auto-summarising. No hidden text.
- **No sub-10pt shrink** without explicit user action and a warning.
- **Single-column reading order is a guarantee.**
- `test/typography-units.test.ts` pins the type floors — do not regress them.
- Biome baseline 0.
- `npm test -w api` wipes local D1. Re-seed with `npm run db:reset-seed` after.

## Verify
```
npm run build:types && npm run typecheck && npm run typecheck -w api
npx vitest run && npx biome check . && npm run build
npm run templates:render
node scripts/probe-start.cjs api web && npm run db:reset-seed
node scripts/probe/full-pass.cjs && node scripts/probe/export.cjs
```

Screenshots at 1440 of: the fit chip, the overflow panel expanded, a density preset change, and a semantic page break taking effect.

## Deliverable in your reply
1. The fit meter's accuracy (measured against known page geometry).
2. The readability checks added, with their thresholds and their user-facing wording.
3. The density presets and exactly what each changes.
4. How semantic page breaks are stored and what Typst they emit.
5. Test results, and anything out of scope.
