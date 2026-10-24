# Brief: Editor flexibility and rendering engine research

You are a technical researcher. Do NOT modify any code. Your only output is ONE markdown file: `docs/research/editor-renderer.md`.

## Why

Two connected questions:

1. **The resume editor should be as flexible as Microsoft Word**, while still providing all the assistance a user needs to polish, organise and version their resume. Current layouts are lack-luster with arbitrary formatting and space inefficiency.
2. **Do we need a different rendering engine** to achieve the required flexibility? Research the options and recommend.

## Repo context

`C:\research_learning_new\bettaresume`. Read `CLAUDE.md`, `docs/AGENT-CONTEXT.md`, `docs/adr/` (there is an ADR on structured records vs rich documents), `docs/UI-FEATURE-PASS.md` first.

Current architecture:
- **Data**: `Section` rows hold `content` JSON. 13 typed section schemas in `packages/types/src/schemas.ts`. Rich text (`summary`, `custom`) stores TipTap/ProseMirror JSON plus derived HTML.
- **Editor**: TipTap v3 (`src/components/rich-text-editor/`) for rich text; per-section React form components in `src/components/sections-forms/`; a section list with drag-and-drop (dnd-kit) and visibility toggles.
- **Rendering**: Typst WASM (`@myriaddreamin/typst.ts`) compiled in-browser for preview AND PDF. Templates are `.typ` sources serialised via `src/lib/typst/serialize.ts`. DOCX export writes WordprocessingML directly. Plain-text export mirrors the template layout.
- **Preview**: `src/features/resume-editor/components/typst-preview.tsx` renders compiled SVG pages as `<img>` with blob URLs; `preview.tsx` is a separate HTML preview used for thumbnails.
- **Constraint**: the resume text layer must stay single-column and predictable for ATS parsers. That is a hard product guarantee and a competitive differentiator.

## Research directions

### A. Editor flexibility — what "as flexible as Word" can actually mean here
Research how real document editors handle this, and what is achievable in a browser:
- **Block/section-level control**: per-section spacing, per-entry spacing, column layouts inside an entry (dates right-aligned), hanging indents.
- **Direct manipulation vs form-driven**: what does Word, Google Docs, Notion, Craft, Pages, Figma, Canva Resume, LaTeX editors give the user, and at what cost to structure?
- **What a structured editor can offer that Word cannot**: semantic keep-together, semantic page breaks, content reuse, variants, revision history, ATS checks. Lean into this rather than imitating Word's free-form canvas.
- **Formatting controls that are worth having** (and which are just noise): font family, size, weight, colour, line height, letter spacing, alignment, list type, section rules, column count.
- **Inline formatting inside structured fields**: bullets that accept bold/italic/links. What is the right model?
- **Drag-and-drop at every granularity**: section, entry, bullet. What breaks?
- **Multi-column / sidebar resume layouts**: the product deliberately forbids them for ATS reasons. Research whether an explicit "ATS-unfriendly layout" mode with a warning is worth offering, or whether it dilutes the guarantee.
- **Templates as *layout contracts* vs templates as themes** — how much should the editor let a user override a template?

### B. Rendering engine options
Evaluate honestly, with benchmarks and capability matrices where possible:
- **Typst (current)** — strengths/weaknesses, what it does not do (rich text marks? arbitrary floating elements? text wrapping around images? multi-column with balancing?), how its page model works, what `#place`, `#block(keep:)`, `#par(leading:)`, `#columns`, `#grid` can express, and what is genuinely hard.
- **HTML/CSS print + Chromium headless** (server-side) or **browser print-to-PDF** — CSS paged media, `@page`, `break-inside`, `orphans/widows`, `widows`, `page-break-after`. What breaks in the browser's own print pipeline? What about the text layer?
- **React-PDF / @react-pdf/renderer** — declarative, but limited layout primitives.
- **PDFKit, pdfmake, jsPDF** — low-level; what do we lose?
- **WeasyPrint, Prince XML, Paged.js (paged media polyfill)** — CSS paged media in a server tool.
- **Playwright/Puppeteer Chromium print-to-PDF** — the "HTML is the layout engine" option. Does it produce a clean, predictable, single-column text layer? Can we guarantee reading order?
- **SILE, ConTeXt, LaTeX (LuaLaTeX)** — academic-quality typesetting, but heavy.

For each: text-layer quality and predictability (ATS!), typographic control, page-break control, keep-together support, in-browser viability (our preview must work client-side), export fidelity between preview and PDF, bundle size, licensing, maintenance risk, and how hard it is to let users customise spacing/typography.

### C. Recommendation
- Do we stay on Typst? What would have to be true for that to be the right call?
- If we should change, what is the migration path and what is the cost?
- Could we use **two engines** (e.g. Typst for PDF, HTML for interactive preview) and how do we keep them in sync? (Note: we already have a divergence risk between `preview.tsx` and the Typst templates — call this out.)
- What is the minimal set of Typst features we must learn/adopt to reach "Word-level layout flexibility" *within* our structured model?

## Deliverable structure

1. **Editor flexibility: the target model** — what the editor should offer, in terms of capability classes, not a feature list. Concrete controls worth building, with justification.
2. **The formatting control surface** — exactly which controls, in which panels, with what ranges/defaults. Say what to leave out and why.
3. **Rendering engine comparison table** — the dimensions above, per engine.
4. **Recommendation** — stay or change; the reasoning; the risks of each way.
5. **If Typst stays: the features to adopt** — with syntax examples, to unlock the layout flexibility we want.
6. **Preview/export parity plan** — how to guarantee what the user sees is what exports, given two renderers.
7. **Open questions for the maintainer.**

Be concrete and technical. Include syntax, code sketches and specific library capabilities. This feeds an architecture decision.
