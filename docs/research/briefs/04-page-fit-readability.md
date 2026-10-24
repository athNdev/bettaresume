# Brief: Page-fit and readability capability research

You are a product researcher and interaction designer. Do NOT modify any code. Your only output is ONE markdown file: `docs/research/page-fit-readability.md`.

## Why

Resumes have to fit a lot of information into one A4 page. We need:

1. **A suite of features dedicated to achieving a single-page or two-page resume** while keeping it readable and not busy-looking.
2. **Readability suggestions** based on font size, white space and font family.
3. **Template layouts that are space-efficient**, with **customisable spacing**.

We want to research what can be done, then pick a coherent set to build.

## Repo context

`C:\research_learning_new\bettaresume`. Read `CLAUDE.md`, `docs/AGENT-CONTEXT.md`, `docs/ROADMAP.md`, `docs/UI-FEATURE-PASS.md` first.

Relevant existing code and concepts:
- Typst typesetting: `src/features/resume-editor/typst_templates/` (`minimal.typ`, `postgrad.typ`, `undergrad.typ`, shared `sections.typ`), serialised from `src/lib/typst/serialize.ts`.
- `ResumeSettings` already has: `fontFamily`, `fontSize`, `fontScale` (80–120%), `typography` (name/title/sectionHeading/itemTitle/body/small), `lineHeight`, `margins`, `sectionSpacing` (compact/normal/spacious), `colors`, `dateFormat`, `accentStyle`.
- Page count is known after compile (`usePreviewPages` store, `TypstPreview`).
- An existing rubric (`src/lib/analysis/rubric.ts`) does named pass/fail checks — no composite score. Read it.
- There is already a contrast/legibility check and typography size checks.

## Research directions to investigate (be concrete, name mechanisms)

### Page-fit control
- How do professional tools let a user target N pages and actually hit it?
- Approaches: live overflow indicator ("this is 1.2 pages"), a "fit to one page" action, progressive density presets (tight / normal / relaxed), auto-scaling type, per-section compacting, whitespace budgeting.
- What is the *right* feedback loop? Live page-count + "X px over" is different from "you are 0.2 pages over".
- Truncation/condensing strategies: bullet summarising (user-approved only — we never invent content), hiding entries, dropping optional sections, date-range compression.
- What is safe and what feels like the tool is fighting the user?
- Research how Word, Google Docs, LaTeX, InDesign and page-layout tools handle "fit to page" and page-break control (keep-with-next, widow/orphan control, allow-break-inside, section-page-break-before).
- **Page-break control is a real missing feature**: research semantic page breaks (e.g. "this entry must not split across pages"), "keep section together", and how Typst supports them (pagebreak, block(keep: true), par(leading), etc.).

### Readability
- Evidence-based readability: WCAG guidance for print, typographic measure (characters per line), line-height vs font-size ratios, contrast for body text, type size bands for print vs screen.
- What is a *sensible* readability heuristic set for a resume? Font size band, line height band, measure, whitespace ratio (content area vs page area), heading weight contrast, bullet density.
- How to present these as suggestions rather than a score (our principle: named checks, never a composite score).
- Font family guidance: which families are safe for ATS and print, metric-compatible fallbacks (we already ship Arimo/Tinos/Carlito), and how to advise on a font choice without being preachy.

### Density and spacing customisation
- A spacing scale users can actually use (3–5 presets), and what each preset changes.
- Per-section vs global spacing control. Which is more useful?
- Automatic whitespace budgeting: when the page is overfull, which spacing to reclaim first?

## Deliverable structure

1. **What we should build** — a prioritised, coherent feature set (not a laundry list). For each: name, what the user does, what the app does, why it is worth it, and the implementation shape (which module).
2. **The feedback loop design** — precisely what the user sees at each moment (live page indicator, overflow amount, where the overflow is, what to change).
3. **Readability check set** — the specific named checks, their thresholds with justification, their fix suggestions, and their wording (this is user-facing copy).
4. **Spacing/density system** — the presets, what each changes, and the exact values.
5. **Typst mechanisms** needed — what page-break/keep-together/leading primitives we should use, with syntax.
6. **What NOT to build**, and why (especially anything that would invent content or produce a score).
7. **Open questions for the maintainer.**

Be concrete and cite sources. This feeds implementation directly.
