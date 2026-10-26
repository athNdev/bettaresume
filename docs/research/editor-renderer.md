# Editor flexibility and the rendering engine

**Date:** 2026-10-24 · **Status:** research, feeds an architecture decision
**Brief:** `docs/research/briefs/05-editor-renderer.md` · **Constraint that gates everything:** the resume
text layer must stay single-column and predictable for ATS parsers. Any engine that cannot guarantee
reading order is disqualified regardless of typographic quality.

---

## 0. Evidence base — how this was verified, and what was not

Per the repo's own rules (`docs/AGENT-CONTEXT.md` §2.12, §2.13), nothing in this document is evaluated
from memory about this codebase. What was read and what was measured:

| Evidence | How |
|---|---|
| Typst template behaviour | Read all of `src/features/resume-editor/typst_templates/` (`minimal.typ`, `postgrad.typ`, `undergrad.typ`, `sections.typ`, `index.ts`) and `src/lib/typst/serialize.ts`, `compiler.ts`, `fonts.ts`, `src/lib/rich-text.ts`, `src/lib/format-date.ts`, `src/lib/export/text.ts`, `docx.ts` |
| **PDF text-layer order** | **Measured.** Compiled the real templates with the real `typst` CLI (0.10, via `npx --no-install typst`) against a two-section sample and extracted the text stream with `pdfjs-dist` — the same harness `test/typst-compile.test.ts` uses. Result in §3.1. Caveat: CLI 0.10, not the WASM 0.14 the app ships; ordering behaviour is stable across these versions but the assertion should be pinned in CI against the shipping compiler |
| Typst language capabilities | Verified against typst.app/docs (`par`, `block`, `place`, `pagebreak`), not memory. One brief correction: `#block(keep:)` does not exist — keep-with-next is `block(sticky:)` |
| Engine landscape | Web research 2026-10: Typst 0.14/0.15 release notes, typst.ts release notes, Chrome 131+ paged-media support, WeasyPrint v66 (BSD-3), Prince licensing, @react-pdf/renderer docs |
| Version facts | `package.json` pins `@myriaddreamin/typst*` `0.7.0-rc2`; `public/wasm/` ships a 28.4 MB compiler + 0.97 MB renderer; typst.ts v0.7.x wraps **Typst 0.14** ("PDF standards supported in typst v0.14", "pdf tags options"), v0.8.0-rc tracks **Typst 0.15** |

**Unverified, and stated as such:** no PDF was produced by the *browser WASM* pipeline here
(`AGENT-CONTEXT` §2.13: rendering is unverified in CI). Page-break behaviour of long resumes,
tagged-PDF output of the shipped pipeline, and Chromium-vs-Typst extraction comparisons are
proposals for the golden tests in §6, not findings.

---

## 1. Editor flexibility: the target model

### 1.1 What "as flexible as Word" decomposes into

Word's freedom is not one thing. It is four separable capability classes, and only two of them
belong in this product:

| Word's capability | Example | Verdict for BettaResume |
|---|---|---|
| **A. Typographic theming** | font family/size/weight/colour, line height, tracking, alignment | **Yes** — bounded, document-scoped (we have most of it) |
| **B. Block-level layout control** | spacing before/after, indents, hanging indents, tab stops, keep-with-next, keep-together, page-break-before | **Yes** — this is the real gap. Every complaint in the brief ("arbitrary formatting and space inefficiency") lives here |
| **C. Inline formatting** | bold/italic/links inside a paragraph | **Yes, restricted palette** — and it must actually reach the PDF (today it does not; §1.4) |
| **D. Free canvas** | text boxes, absolute positioning, wrap-around images, section-break columns, headers/footers | **No** — this is precisely the class that destroys extraction order, and it is what ATS failures are made of |

The current editor is strong on A (document level), absent on B, half-present on C, and has
correctly never offered D. "Word-level flexibility" for a resume means **B**, and B is entirely
expressible inside the structured model — Word itself applies B to *paragraphs*, which is exactly
the granularity our sections/entries/bullets already have.

### 1.2 The target: a structured editor with a bounded layout contract

The model to build toward, in capability classes:

1. **Semantic structure editing** (exists): sections, entries, bullets, visibility, order,
   variants, content library, revisions.
2. **Document theme** (exists): family, type scale, colours, margins, spacing preset, accent style.
3. **Block layout control** (build this): spacing above/below at *section* and *entry* granularity,
   hanging bullets, keep-together and keep-with-next as *semantic* switches, semantic page breaks,
   per-section divider style and alignment.
4. **Inline marks that survive the pipeline** (finish this): bold, italic, link, underline,
   strikethrough — nothing else.
5. **Semantic operations Word cannot do** (lean in, per the brief): keep-together by *meaning*
   ("this job entry never splits"), page breaks at section boundaries ("Education starts on page 2"),
   live ATS checks, the plain-text test, content reuse, variants with per-section linkage,
   revision history. This is the differentiation; imitating Word's canvas is not.

What Word has that we deliberately refuse: text boxes, floating shapes, multi-column sections,
headers/footers, footnotes, manual line breaks inside fields, per-run font/colour overrides.
Each of these is either an ATS hazard or a second layout authority in disguise.

### 1.3 Where the "space inefficiency" actually comes from

Measured from the sources, not assumed:

- **The entry header is already efficient** — `sections.typ` draws every entry as
  `grid(columns: (1fr, auto))` with the date right-aligned on the title's line. This is the
  canonical dense resume pattern and it is already in all three templates.
- **Spacing is the problem.** The only spacing controls today are the global `sectionSpacing`
  three-position preset (8/12/20 pt in `sections.typ`) and the fixed `v(...)` values inside each
  `render-*` helper (`v(2pt)`, `v(spacing-val * 0.6)`, …). A user cannot tighten the gap under
  each entry independently, cannot reduce the header block, cannot vary one section. That is the
  whole "space inefficiency" complaint: the layout is fine, the *spacing knobs are missing*.
- **Line height is global** and maps to `par(leading:)` only; paragraph spacing
  (`par(spacing:)`) is never set, so it stays at Typst's `1.2em` default everywhere.

### 1.4 Inline formatting: the right model

Today the TipTap editor (`rich-text-editor.tsx`) enables Bold, Italic, Underline, Strikethrough
(via StarterKit), Link, plus **Colour, FontFamily, Highlight and TextAlign** — and then
`serialize.ts` runs the HTML through `richTextToPlain()` (html-to-text) and hands Typst a flat
string (`summaryText`, `custom.body`, `custom.items[].body`). **Every mark is discarded before
layout.** `preview.tsx` flattens the same way; `docx.ts` runs summaries through `htmlToPlainText`.
So the "rich editor" today changes only the editing surface; no export carries a single mark.
This is the same defect class as the dead `settings.fontSize` knob (serialised, read by no
template) and the old `settings.layout` dropdown.

The right model:

- **Marks are document-scoped in colour and family.** Allow **bold, italic, underline,
  strikethrough, link**. Remove `Color`, `FontFamily`, `Highlight` (and `TextAlign` for
  summary) from the editor palette: per-run colour/font breaks the template's typographic
  contract and is noise for a resume. This is a small TipTap configuration change and it makes
  the editor honest about what can export.
- **The serialiser becomes mark-preserving** (sketch in §5.1). Typst has first-class equivalents
  for every mark we keep: `#strong`, `#emph`, `#underline`, `#strike`, `#link`.
- **Bullets (`highlights`) stay plain strings in phase 1.** They live in typed arrays
  (`Experience.highlights: string[]`) and every parser check reads them as plain text. If ADR-0001
  is answered "load-bearing", phase 2 stores a TipTap document per bullet with a derived plain
  string (the ADR's option C), and the plain string remains what ATS text and the rubric read.
- **Custom nodes are out of scope** — `UI-FEATURE-PASS.md` records that they would re-open the
  ADR, which is deliberately undecided.

### 1.5 Drag-and-drop at every granularity

- **Section level** (dnd-kit, exists): fine. Order is a number; nothing breaks.
- **Entry level** (move a job between sections?): doable — entries carry stable ids and
  `content.data` is an array — but only *between sections of the same type*, or via the content
  library placement path which already exists. Cross-type dragging is a type error dressed as a
  gesture.
- **Bullet level**: within one entry, trivial (array reorder). Across entries, fine within one
  section. The failure mode found in `UI-FEATURE-PASS.md` §8.1 (index-keyed editable lists
  reusing DOM on delete) is the thing that breaks here — key by id everywhere.
- **What breaks conceptually**: a bullet dropped into a rich-text summary is a *paste*, not a
  move. Keep drag scoped to the structured tree.

### 1.6 Multi-column / sidebar layouts: an "ATS-unfriendly" mode?

**Recommendation: no.** The repo has already paid to remove this once — `UI-FEATURE-PASS.md` §8.2
records that `settings.layout` offered two-column/sidebar, the HTML preview drew both, and no Typst
template ever read it; the field and the dropdown are now deleted and `preview-matches-exporter.test.ts`
asserts single-column is "not a preference this product takes". `docs/ROADMAP.md` treats parse-fit
as the product. Reintroducing the mode would:

- convert the hard guarantee into an opt-out, which is exactly what the differentiator is;
- require a second template family that *cannot* run through the same text-layer tests;
- force the plain-text test and every rubric check to carry a "this document fails by design" state.

If the demand ever materialises, the honest form is a separate, loudly-labelled export target
("Design CV — not ATS-safe"), never a setting inside the normal editor. Note that even Typst's
`columns(2)` keeps *logical* reading order in tagged output (`place` docs: AT reads placed content
where it logically appears) — but plain extraction of two-column flow interleaves or reorders
depending on the extractor, and that gamble is the thing the product sells against. That target
now ships as W5's `design-column.typ` (`docs/DESIGN-CV.md`), outside `TEMPLATE_CONFIGS` and with a
permanent warning at the point of export. The standard path remains single-column.

### 1.7 Templates: layout contracts, not themes

The current split is right and should be written down as the contract:

- **A template owns layout**: header treatment, rules, justification, leading, accent usage.
  (`postgrad.typ`'s header comment already articulates this: "the difference is presentation,
  because that is the only thing a template should own".)
- **Settings own theme**: family, scale, colours, margins, spacing preset — every knob the
  templates read through `settings.at(...)`.
- **A user override must travel through settings**, never through editing the template. The
  editor's flexibility is therefore "bounded typographic ranges + block switches", and templates
  must read every one of them (the `settings.fontSize` ghost is the anti-pattern: a knob
  serialised and never read; §2 lists the audited set).

---

## 2. The formatting control surface

Concretely: which controls, in which panels, with what ranges and defaults. Ranges marked
**ATS** are clamped to the parse-fit rules already codified in `docs/UI-FEATURE-PASS.md` §1
(body 10–12 pt, name 14–16 pt→extended, headings 11–13 pt); violating values need a deliberate
"unsafe" toggle rather than a silent 6 pt body.

### 2.1 Document panel (the existing `FormattingToolbar`)

| Control | Range | Default | Maps to (Typst) | Change |
|---|---|---|---|---|
| Font family | the 9 shipped families | Inter | `settings.fontFamily` → `#set text(font:)` | keep; list is the contract (`fonts.ts`) |
| Type scale | 6 steppers | `DEFAULT_TYPOGRAPHY` | `typo.*` (already scaled by `fontScale`) | keep; clamp per-row (below) |
| Global scale | 80–120 % | 100 % | `font-scale` in `sections.typ` | keep |
| Line height | 1.0–2.0 × | 1.5 | `par(leading:)` | keep |
| Paragraph spacing | 0.5–2.0 × | 1.0 | **new** `par(spacing:)` | **add** — this plus entry spacing is the space-efficiency fix |
| Margins | 12–72 pt (per side) | 40 | `#set page(margin:)` | keep |
| Page size | Letter / A4 | Letter | `#set page(paper:)` | keep |
| Colours (text/heading/secondary/accent/divider) | presets + picker | current | `colors.*` | keep |
| Accent style | underline / bar / background / none | underline | `section-title` branches | keep |
| Section spacing | compact/normal/spacious | normal | `spacing-val` | keep |
| Date format | 4-way | MMM YYYY | `formatResumeDate` | keep |

Type-scale clamps (**ATS**): `name` 16–28, `title` 11–16, `sectionHeading` 11–14, `itemTitle` 10–13,
`body` 10–12, `small` 9–11. Below/above range: allowed only behind an "outside recommended range"
confirmation, because the toolbar currently lets a user set a 6 pt body (called out as *not checked*
in `UI-FEATURE-PASS.md` §1).

### 2.2 Section panel (new — per section)

| Control | Range | Default | Maps to |
|---|---|---|---|
| Spacing above | 0–32 pt | `spacing-val` | `section-title`'s `v()` |
| Spacing below entries | 0–16 pt | `spacing-val * 0.6` | per-entry `v()` in `render-*` |
| Keep heading with first entry | on/off | on | `block(sticky: true)` on the title |
| Keep entry together | on/off | on | `block(breakable: false)` around entry (clamped: an entry taller than a page must still break) |
| Page break before | auto/always | auto | `pagebreak(weak: true)` at section start |
| Divider | none / rule / accent | template's | `section-title`'s style branch |
| Heading text | free | `PARSER_SAFE_HEADINGS` default | — but **flag non-standard headings** (parse-fidelity already knows the safe set) |

### 2.3 Entry / bullet panel

| Control | Range | Default | Maps to |
|---|---|---|---|
| Date position | right (default) / inline-after-title | right | `grid` right cell vs plain inline |
| Bullet marker | `•` / `-` | `•` | `#set list(marker:)` — both parse; the rule in `export/rules.ts` accepts only these two |
| Bullet indent | 0–24 pt | 8 pt | `#set list(indent:, body-indent:)` |
| Hanging indent for prose | 0–24 pt | 0 | `par(hanging-indent:)` |
| Entry spacing below | 0–16 pt | inherits section | per-entry `v()` |

### 2.4 Leave out (and why)

| Control | Why not |
|---|---|
| Per-run font family / colour / highlight | breaks the template typographic contract; no ATS value; currently *offered by TipTap and silently discarded* — remove from the palette |
| Text boxes / arbitrary placement / wrap-around | the ATS guarantee, full stop |
| Columns / sidebar | §1.6 |
| Headers/footers, page numbers | "no header/footer text" is one of the parse rules the research lists; a 1–2 page resume gains nothing |
| Tab stops | the grid date pattern replaces them; tab extraction is fragile |
| Footnotes | no resume use case; extraction quirks |
| Exact-point line spacing, kerning, ligature toggles | noise at resume scale (keep `text(tracking:)` available internally for templates, e.g. the name line) |
| Manual line breaks inside fields | destroys reflow; users can use bullets |
| Auto-shrink "fit to one page" | magic reflow fights every spacing control; revisit only as an explicit action that reports what it changed |

---

## 3. Rendering engine comparison

### 3.1 The measured baseline: what our text layer looks like today

Extraction of the real templates (typst CLI 0.10 → PDF → `pdfjs-dist`, stream order):

```
"Avery Chen"                        ← name
"Engineer"                          ← title
"avery@example.test | 555-0100 | Berlin"
"Work Experience"
"Senior Engineer"                   ← entry title (y 593, x 30)
"Acme Corp • Berlin"                ← company line (y 579, x 30)
"March 2022 - Present"              ← right-aligned date (y 594, x 524) — AFTER the company line
"Built things"
"•" " " "Cut latency 41%"           ← bullets as marker + text
"•" " " "Shipped v2"
"Education"
"BSc in CS"
"Harvard University • GPA: 3.9"
"May 2020"
```

**Reading order is deterministic, single-column and entry-atomic.** The one quirk: the
right-aligned date sits on the title's *visual* line but extracts after the company line, because
the grid emits cell (1,1) then cell (1,2). This is stable and predictable — but it means the
actual PDF text layer and `buildPlainText` (which puts the date line under the headline) are
*models* of each other, not byte-identical. The plain-text test should be validated against real
extraction (§6.3) rather than assumed.

### 3.2 Capability matrix

Legend: ✅ good · ⚠️ workable with caveats · ❌ fails the bar. "Text layer" = order predictability
first, tagged structure second — the gate.

| Engine | Text layer (ATS) | Typographic control | Page-break / keep-together | In-browser preview | Preview↔export parity | Footprint | License | Maintenance risk | User-knob cost |
|---|---|---|---|---|---|---|---|---|---|
| **Typst WASM (current)** — typst.ts 0.7.0-rc2 = Typst 0.14 | ✅ deterministic stream order (measured §3.1); **tagged PDFs by default since 0.14**, PDF/UA-1 checks available; placed content reads in logical order | ✅ professional: tracking, kerning, ligatures, hyphenation, char-level justification, styles via `#show` | ✅ `block(sticky:)` (keep-with-next), `block(breakable:)`, `pagebreak(weak:/to:)`, widow/orphan costs | ✅ already ships (28.4 MB compiler WASM, 0.97 MB renderer, ~7 MB fonts once) | ✅ **same compiler, same payload** for preview SVG and PDF | ⚠️ 29 MB WASM + fonts, copied to `public/wasm/` at build | Apache-2.0 (Typst + typst.ts) | ⚠️ wrapper lags core (0.7.0-rc2 → 0.7.0 final → 0.8.0-rc tracks 0.15); pin-exact policy already handles it | ✅ settings → `#set` rules; bounded by design |
| **Chromium print-to-PDF (server: Playwright/Puppeteer)** | ⚠️ flow layout is fine, but text stream = **paint order** (floats paint before inline text — a floated date can extract before the title); tagged PDF via `generateTaggedPDF` (CDP/Playwright `tagged: true`) helps but tags come from the a11y tree, not from document semantics | ✅ all of CSS | ⚠️ `break-inside`, `orphans`/`widows` OK; margin boxes only Chrome 131+; no `string-set`/`target-counter`/footnotes | ❌ screen has **no pages** — the interactive preview would need Paged.js or CSS columns to fake pagination, which is a second paginator | ❌ the core problem: "preview" HTML paginates differently from print CSS unless you run the same print pipeline | ⚠️ server: Chromium container; **Cloudflare Workers cannot host it** — new service, new ops surface | BSD/Apache (Chromium, Playwright) | ⚠️ browser-version drift changes line breaking between releases | ✅ CSS is the most user-tunable surface ever made — that is also the problem |
| **Browser print-to-PDF (client `window.print`)** | ⚠️ same paint-order caveats; no tagging control | ✅ | ⚠️ | n/a (the screen *is* the preview) | ❌ user's browser version decides pagination; we cannot assert anything | ✅ zero | — | ✅ | ✅ but unbounded; and export is not automatable (filenames, page-count checks) |
| **@react-pdf/renderer** | ⚠️ flex flow order is deterministic but Yoga layout; no tagging; two-column flex rows are a known breakage across page wraps (react-pdf #430) | ⚠️ fontSize/leading/align/letter-spacing; hyphenation callback; no kerning/ligatures, no real styles system | ⚠️ `wrap={false}` = keep-together; `break` on elements; no widow/orphan control | ✅ same renderer client-side (React) | ✅ same renderer both sides | ✅ ~1 MB | MIT | ⚠️ community-maintained; layout bugs live long | ⚠️ its primitives *are* the contract; we'd rewrite all three templates |
| **PDFKit / pdfmake / jsPDF** | ⚠️ stream order = whatever you draw (predictable if disciplined) | ⚠️ manual | ❌ manual pagination maths for everything | ✅ all run in browsers | ✅ same code | ✅ small | MIT | ✅ stable but frozen-ish | ❌ every knob is code; no template abstraction without building one |
| **WeasyPrint (v66)** | ✅ HTML flow order + PDF tags improving; well-understood | ✅ full CSS paged media incl. `string-set`, footnotes, bookmarks | ✅ the best open paged-media story | ❌ Python server-side only | ❌ HTML preview ≠ WeasyPrint pagination unless server-rendered | server only | **BSD-3** | ✅ active (CourtBouillon) | ✅ CSS |
| **Prince XML** | ✅ the reference implementation | ✅ best in class | ✅ incl. footnotes, bookmarks, `@prince-pdf` | ❌ server only | ❌ same parity problem | 💰 ~USD 3,800 perpetual per server (plus support) | proprietary | ✅ mature | ✅ CSS |
| **Paged.js** | ⚠️ it paginates HTML in JS, then the browser prints — text layer is the browser's paint order | ✅ CSS | ✅ polyfills `string-set`, footnotes, bookmarks client-side | ✅ it *is* a client paginator | ⚠️ preview = Paged.js chunks; print = Paged.js chunks → parity OK *if* export also goes through it | ~100 KB JS | MIT (Coko) | ⚠️ polyfill tracking a moving spec; verify release cadence before adopting | ✅ |
| **SILE / ConTeXt / LuaLaTeX** | ✅ TeX-grade (well, ConTeXt/SILE: deterministic; LuaLaTeX ✅) | ✅✅ academic | ✅ | ❌ no viable WASM story (TeX-on-WASM is ~50–100 MB and fragile; SILE has no browser build) | ❌ | server/CLI | MIT (SILE) / GPL-ish (ConTeXt, LuaLaTeX) | ⚠️ heavy stacks; tiny resume-shaped communities | ❌ users will never write TeX |

### 3.3 What Typst genuinely does not do (checked against the docs)

- **Text wrapping around floating images.** Figures and floats displace content; wrap-around is
  not supported. Irrelevant for single-column resumes (a photo goes in the header block, §5.5).
- **Multi-column with balancing across page breaks** is `columns(2)` and it *does* balance within
  a container — but we are not shipping columns (§1.6).
- **`#block(keep:)` does not exist** (the brief's name); keep-with-next is `block(sticky:)`.
  Keep-*together* is `block(breakable: false)`.
- **Rich text marks** are not a gap at all — `#strong`, `#emph`, `#underline`, `#strike`, `#link`
  exist and are tagged. The gap is in our serialiser (§1.4).
- **Widow/orphan control** is not a `par` parameter; it is `text(costs: (widow: …, orphan: …))`.
- **Variable fonts**: Typst 0.15 (June 2026) adds them. The vendored-static-font instancing
  workaround in `AGENT-CONTEXT` §2.13 exists because the wrapped 0.14 does not apply the `wght`
  axis. Upgrading the wrapper retires that whole pipeline.

---

## 4. Recommendation

### **Stay on Typst.** Change the editor's control surface and finish the serialiser.

Reasoning, in the order the constraint demands:

1. **The gate is reading order, and Typst is the only engine that gives it structurally.** The
   guarantee is not "we measured it once": it is that layout is computed from our structured
   payload by templates that only use flow + one grid pattern, so the text stream is the document
   (measured §3.1); and since Typst 0.14 the PDF is **tagged by default**, with PDF/UA-1 checks
   for document title and heading hierarchy — the exact things `parse-fidelity.ts` hand-checks.
   Every HTML-based competitor (the ones the parse-fidelity module's docstring calls out) is at
   the mercy of paint order and browser versions. This is the differentiator; it should get
   *stronger*, not traded away for CSS convenience.
2. **In-browser preview is a hard requirement** and Typst is the only professional typesetting
   engine that runs there at reasonable size (28 MB compiler WASM, already vendored, no CDN).
   WeasyPrint/Prince/Paged-server/SILE are all disqualified on this alone, and
   server-Chromium forces a new hosting surface — the API is a Cloudflare Worker, which cannot
   run Chromium. A migration is not "swap a library"; it is "build a service".
3. **Preview↔export parity is already solved** for the main preview: `useTypstPreview` compiles
   the *same* `buildMainContent` payload the PDF export compiles. Any change of engine reintroduces
   the divergence class the repo has spent #153 and §2.13 removing.
4. **The brief's actual complaint is not the engine.** "Arbitrary formatting and space
   inefficiency" = missing spacing knobs (§1.3) and a serialiser that discards marks (§1.4).
   Both are small, local fixes on the current stack.
5. **Version debt is small and bounded**: `0.7.0-rc2` → `0.7.0` final (same Typst 0.14), then
   `0.8.x` (Typst 0.15: variable fonts, retiring the font-instancing workaround). The
   pin-exactly policy (`AGENT-CONTEXT` §2.1) already covers this.

### What would have to be true to change instead

- If the product ever needs **server-side batch rendering at scale with CSS-authored templates**
  (e.g. a template marketplace of HTML themes), WeasyPrint (BSD-3) is the right second engine —
  and it must be *the* engine for that path, not an extra one.
- If **in-browser preview stops being a requirement**, Prince/WeasyPrint become the best
  typographic option.
- If Typst's wrapper stagnates badly (typst.ts dropping behind core by multiple majors), the
  HTML-print path (with `generateTaggedPDF`) becomes plan B; the migration path would be:
  rewrite templates as print CSS → reimplement `serialize.ts` as an HTML emitter → re-verify the
  text layer with the golden tests of §6 (they are engine-agnostic: compile/produce PDF, extract,
  assert order) → move export to a Chromium service. Est.: templates + serialiser + parity tests
  ≈ weeks, plus permanent ops cost for the browser service.

### Risks of staying

- typst.ts is a one-maintainer wrapper around a fast-moving core; pinning exact versions is
  mandatory (already policy). Mitigation: the golden text tests (§6) fail loudly on a bad bump.
- The 28 MB compiler WASM is a real first-load cost (mitigated: local `public/wasm/`, lazy
  init, cached; SVG preview needs the 1 MB renderer only after compile).
- Typst's HTML export is still experimental — do **not** bet the preview on it.

### Risks of changing

- Losing the structural reading-order guarantee (the differentiator), or keeping it only
  approximately, validated by sampling instead of by construction.
- Two paginators (screen + print) — the single most expensive class of preview/export bug.
- New server dependency for an export that is currently client-side, private (no third party
  learns a resume is being exported — a real property `UI-FEATURE-PASS.md` §7.1 fought for), and
  free of rate limits.

---

## 5. If Typst stays: the features to adopt

Minimal set to reach Word-level *layout* flexibility inside the structured model. All syntax
verified against typst.app/docs (2026-10).

### 5.1 Mark-preserving rich text (the one structural change)

`richTextToPlain` stays for ATS text; add an HTML→Typst-inline path for what gets laid out.
Sketch (`src/lib/typst/serialize.ts`):

```ts
// summary/custom bodies: TipTap HTML → Typst inline content.
// Escape first, then rewrite only the marks we allow. Unknown tags degrade to
// their text (loud fallback: warn once per document).
function htmlToTypstInline(html: string): string {
	let out = escapeTypst(html);          // \ { } # $ * _ ` ~ ^ < > | and &
	out = out
		.replace(/<strong[^>]*>(.*?)<\/strong>/gis, "#strong[$1]")
		.replace(/<em[^>]*>(.*?)<\/em>/gis, "#emph[$1]")
		.replace(/<u[^>]*>(.*?)<\/u>/gis, "#underline[$1]")
		.replace(/<s[^>]*>(.*?)<\/s>/gis, "#strike[$1]")
		.replace(/<a\s[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gis, "#link(\"$1\")[$2]")
		.replace(/<li[^>]*>(.*?)<\/li>/gis, "$1\\,\n")   // or map whole <ul> to #list
		.replace(/<br\s*\/?>/gis, "\\")
		.replace(/<\/?(p|div)[^>]*>/gis, "\n\n")
		.replace(/<[^>]+>/g, "");
	return out;
}
```

And `render-summary` drops `#section.summaryText` for `[#eval(section.summaryText, mode: "markup")]`
or, better, the serialiser emits a `summaryRich` string the template inserts with `eval(mode:"markup")`.
(Escape discipline is the whole game here — reuse the `AGENTS` §2.12 reasoning: `JSON.stringify`
escapes are Typst-compatible for the JSON payload; the *Typst source* path needs its own escaper.)

Cost: one serialiser function + tests. `docx.ts` should then carry marks as `w:b`/`w:i`/`w:u`
instead of `htmlToPlainText` for summaries.

### 5.2 Semantic keep-together / keep-with-next

```typst
// entry header never orphaned at a page bottom:
#block(sticky: true)[
  #grid(columns: (1fr, auto), …)   // title+company / date
]
// entry as a unit (clamped: fall back to breakable when taller than a page):
#block(breakable: false)[ …whole entry… ]
```

`block(sticky:)` is Typst's keep-with-next (set on headings by default; this is how we apply it to
entry headers). Exposed as the two switches in §2.2.

### 5.3 Semantic page breaks

```typst
#if section.at("pageBreakBefore", default: false) { pagebreak(weak: true) }
```

`weak: true` skips the break at the top of a page — exactly the semantics "start this section on a
new page *if needed*" wants. `pagebreak(to: "odd")` exists if recto pages ever matter.

### 5.4 Spacing and indent model (the space-efficiency fix)

```typst
#set par(
  leading: leading-factor * 0.5em,
  spacing: para-spacing,               // NEW: currently never set (default 1.2em everywhere)
  hanging-indent: section.at("hangingIndent", default: 0pt),
  justify: settings.at("justify", default: false),
)
#set list(marker: bullet-marker, indent: 0pt, body-indent: bullet-indent)
// per section: section.at("spaceAbove") / item-level spaceBelow replace the
// hard-coded v(spacing-val * 0.6) values in render-*.
```

Also available when a template wants micro-typography: `text(tracking: 0.02em)` (name line),
`text(costs: (widow: 150%, orphan: 150%))` for aggressive widow/orphan avoidance,
`par(linebreaks: "optimized")` for even rag.

### 5.5 The photo (`personalInfo.photoUrl` is serialised and never drawn)

If the product wants a photo, the ATS-neutral placement is the header grid — and the alt text
matters for the tagged PDF:

```typst
#grid(columns: (auto, 1fr), gutter: 10pt,
  image(photoUrl, width: 60pt, alt: "Portrait of " + personal.fullName),
  [ …name/title/contacts… ])
```

(Or `figure(image(…, alt: …))` if a caption is ever wanted — 0.14 tags figures with their alt.)

### 5.6 The columns mode (for the record)

Shipped as the separate design CV target in W5:
`src/features/resume-editor/design-export/design-column.typ`. It is not an archetype, not in
`TEMPLATE_CONFIGS`, not in the gallery, and its text companion is explicitly labelled
visual-reading-order. The six standard templates still contain no `columns()` or `colbreak()`.

```typst
// ONLY in the separate "Design CV" target, never in the default path:
#columns(2, gutter: 12pt)[ …sections… ]
#place(top + center, scope: "parent", float: true)[ …full-width header… ]
```

`place(scope: "parent")` lets the header span columns; tagged output keeps logical order, plain
extraction does not. This is why the mode stays out of the normal editor (§1.6).

### 5.7 Typst 0.15 upgrade (separate, tracked work)

- Bump `@myriaddreamin/typst*` `0.7.0-rc2` → `0.7.0` (same Typst 0.14, absorbs rc fixes) then
  `0.8.x` (Typst 0.15). Watch the release notes' breaking changes (`createTypstSvgRenderer`
  removed in 0.7; snippet API changes).
- 0.15 variable fonts retire the HarfBuzz static-instancing pipeline (`AGENT-CONTEXT` §2.13) —
  **do not delete that pipeline until the bump is proven**: the measured wght-axis regression
  must be re-measured against the new compiler first.
- Enable tag/PDF-UA options in the export call (typst.ts `pdf` gained tag options in 0.7.0) and
  add PDF/UA-1 checks to the rubric — "document title set", "heading hierarchy valid" become
  engine-verified checks instead of heuristics.

---

## 6. Preview/export parity plan

### 6.1 The real inventory: there are four renderers, not two

| Renderer | Produces | Authority today |
|---|---|---|
| Typst (`compileToSvgPages` / `compileToPdf`) | preview SVG pages, PDF | **layout authority** |
| `preview.tsx` (HTML) | dashboard thumbnails | a hand-written reimplementation of the templates |
| `export/docx.ts` (WordprocessingML) | DOCX | hand-written reimplementation of the *text* layout |
| `export/text.ts` (`buildPlainText`) | plain-text layer, Plain Text Test, rubric input | the claimed parser text |

The divergence risk the brief names is real: `preview.tsx` re-implements every `render-*` helper
in React (300+ lines of parallel layout code). It has already diverged once (the two-column
layout it drew and no template read).

### 6.2 Rules that keep them in sync

1. **One payload.** Everything consumes `resumeToTypstJson`'s shape (or `buildPlainText`). No
   renderer re-resolves personal info (done: `resolvePersonalInfo`), dates (done: `format-date.ts`),
   fonts (done: `fonts.ts`) or rich text (done: `rich-text.ts`) on its own.
2. **Typst is the only layout authority.** `preview.tsx` is demoted to *indicative thumbnail* —
   visually close, never promised pixel-parity. The editor's real preview is already Typst SVG.
3. **Kill the thumbnail renderer's degrees of freedom**: assert (as `preview-matches-exporter.test.ts`
   already does for `layout`) that every knob `preview.tsx` reads exists in `serializeSettings`,
   and that every knob `serializeSettings` emits is read by `sections.typ` — the `settings.fontSize`
   ghost dies here (either the templates read it or the serialiser stops emitting it).
4. **Better still (follow-up):** generate dashboard thumbnails from compiled Typst SVGs (cached
   per resume+settings hash, rendered at save time). Then there is one visual renderer. Cost:
   thumbnail compile latency (~2–3 s WASM) must move off the dashboard path.

### 6.3 Golden text-layer tests (the guarantee, machine-checked)

Extend `test/typst-compile.test.ts` (it already compiles real templates and extracts with
`pdfjs-dist`; runs where a `typst` binary exists, skip-named otherwise — CI should install the
compiler so the skip stops hiding it):

```ts
const text = await pdfText(pdfPath);
const order = ["Avery Chen", "Work Experience", "Senior Engineer",
               "Acme Corp • Berlin", "March 2022 - Present", "Cut latency 41%"];
let cursor = -1;
for (const needle of order) {           // reading order, not just presence
	const at = text.indexOf(needle);
	expect(at, `missing: ${needle}`).toBeGreaterThan(cursor);
	cursor = at;
}
```

Plus:

- **Date attachment**: the date string appears within N chars of its entry (pins the grid pattern;
  catches a future template floating the date).
- **Plain-text fidelity**: `buildPlainText(resume)` and the PDF extraction agree after
  normalization (bullet glyph `•`→`-`, whitespace) — this *validates the model* instead of
  assuming it (§3.1).
- **The gate that matters**: run the same extraction with `pdftotext`-style raw order semantics
  (pdfjs stream order approximates it) and with the PDF's tag tree (post-0.15 bump) — both must
  satisfy the order assertions.

### 6.4 The parity contract in one sentence

> What the user approves in the Typst preview is what exports, because both compile the same
> payload with the same compiler; the thumbnail and the plain-text test are *models* of that
> output and are tested against it, not trusted.

---

## 7. Open questions for the maintainer

1. **ADR-0001 is still deliberately undecided** ("is 'rich editor' load-bearing or
   aspirational?"). Inline marks (§1.4/§5.1) are exactly the boundary: bold/italic/link finishing
   is cheap either way, but rich *bullets* and TipTap custom nodes only make sense on option C.
   Which is it?
2. **Is the ATS-unfriendly (multi-column/design) mode ever wanted?** This research says never
   inside the normal editor; if there is a target segment for it, it is a separate export target
   with its own marketing. (§1.6)
3. **Upgrade policy for typst.ts**: may we move `0.7.0-rc2` → `0.7.0` now, and is the
   Typst-0.15 bump (variable fonts, retiring the font-instancing pipeline) worth scheduling?
   Also: should CI install the `typst` CLI so the text-layer golden tests stop being a local-only
   skip? (§5.7, §6.3)
4. **Photos**: `personalInfo.photoUrl` is serialised and drawn by nothing. Is a header photo a
   feature (ATS-neutral placement + alt text exist, §5.5) or should the field go?
5. **Pagination control**: is user-facing page management (page-break-before per section,
   possibly per entry; the fictional `ResumePage` type) on the roadmap, and at what granularity?
   It gates the §2.2 "Page break before" control and the keep-together defaults.

Secondary: is DOCX first-class (then marks must reach `docx.ts` too) or best-effort? And should
the typography clamps (§2.1) hard-block out-of-ATS-range values or just warn?

---

## Appendix A — corrections to the brief

- `#block(keep:)` is not Typst. Keep-with-next = `block(sticky:)`; keep-together =
  `block(breakable: false)`.
- Typst has rich text marks (`#strong`, `#emph`, `#underline`, `#strike`, `#link`, `#highlight`,
  `#smallcaps`) and tags them in PDF. Marks are lost in *our serialiser*, not missing from the
  engine.
- Multi-column balancing: `columns(2)` balances within its container; the hard parts are
  extraction order (ATS) and `place(scope: "parent")` break-outs, not balancing.
- Widows/orphans: `text(costs: …)`, not a `par` parameter.

## Appendix B — version and footprint facts (verified)

| Thing | Value |
|---|---|
| typst.ts pin | `0.7.0-rc2` (exact, all three `@myriaddreamin/*`) — wraps **Typst 0.14** |
| typst.ts 0.7.0 final | exists (~mid-2026); same Typst 0.14; rc pin is stale, not wrong |
| typst.ts 0.8.0-rc | wraps **Typst 0.15.0-rc** (variable fonts, MathML, multiple bibliographies) |
| Typst 0.14 (2025-10-24) | tagged PDFs **by default**, PDF/UA-1 opt-in checks, PDF 1.4–2.0 & PDF/A all parts, character-level justification |
| Typst 0.15 (2026-06-15) | variable fonts (retires static-instancing workaround) |
| WASM footprint | compiler 28.4 MB + renderer 0.97 MB in `public/wasm/`; fonts ~7 MB first compile |
| Chrome paged media | `@page`, margin boxes (131+), `break-*`, `orphans`/`widows`, `counter(page)` ✅; `string-set`, `target-counter`, footnotes, bookmarks ❌ (Paged.js/WeasyPrint/Prince only) |
| WeasyPrint | v66, BSD-3, server-side |
| Prince | ~USD 3,800 perpetual/server |
