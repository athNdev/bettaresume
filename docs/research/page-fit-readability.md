# Page fit and readability research — BettaResume

**Status**: research deliverable, no code changed. Produced from `docs/research/briefs/04-page-fit-readability.md`.
**Sources**: Typst official docs (block, par, pagebreak, text, query, locate, layout — all
read directly, marked **[verified]**), Typst 0.12.0 release notes (GitHub, **[verified]**),
WCAG 1.4.8 Understanding (w3.org, **[verified]**), Butterick's Practical Typography
(point size, line length, line spacing — **[verified]**), Word/InDesign/LaTeX pagination
behaviour (Microsoft support + SuperUser, Adobe community + creativepro, latexref +
tex64/CTAN — mostly snippet-level, marked accordingly), resume market norms
(commercial blogs, marked **[unverified]**), and the repo itself (`rubric.ts`,
`sections.typ`, `serialize.ts`, `fonts.ts`, `preview-pages.ts`, `formatting-toolbar.tsx`).
**Rendering caveat** (AGENT-CONTEXT §2.22): nothing here has been verified in a rendered
PDF from this node. Every claim about what a template *does* is verified in code, not in
pixels; the implementation plan assumes the offloaded browser harness for page-count
claims.

Product principles that bound every proposal below: **named pass/fail checks, never a
composite 0–100 score**, and **we never invent content for the user**. Layout is not
content: we may change spacing and type settings on request (visible, reversible), but
every content decision — hiding entries, cutting bullets, shortening text — stays a
button the user presses, never something we do.

---

## 0. Preconditions found in the code (fix before shipping any threshold)

Three unit problems make every readability threshold meaningless until they are settled.
They are stated first because the feature set below computes against *rendered* values.

1. **Typography values are labelled "pt" in the UI but rendered at ×0.75 in section
   content.** `formatting-toolbar.tsx` renders the size editor with a `pt` suffix, and
   `TYPE_RULES` in `src/lib/analysis/rubric.ts` reads `typography.body: 11` as "11.0pt".
   But every `render-*` helper in `sections.typ` goes through
   `px-to-pt(typo.body) = float(v) * 0.75pt`, so the bullet and summary text actually
   sets at **8.25pt**. The template *headers* (`minimal.typ`, `postgrad.typ`,
   `undergrad.typ`) use `float(typo.at("body")) * 1pt` — raw, no conversion — so the
   contact line is 11pt while the body below it is 8.25pt, in the same document.
   **[verified in code; unverified in render]** The existing check "Body text is 10–12pt"
   therefore passes at settings the export renders *below* its own parser floor.
   *Recommendation*: pick one convention — given the UI says "pt", drop `px-to-pt` from
   the type sizes (keep it for pixel-derived insets like badge padding) — and make
   `TYPE_RULES` read the rendered value. Until then, every band in §3 is written against
   the *rendered* point size and must be calibrated after the fix.

2. **`lineHeight` maps to `par(leading:)` with a different factor per template**:
   `minimal.typ` uses `lineHeight * 0.5em`, `postgrad.typ` `* 0.55em`,
   `undergrad.typ` `* 0.45em`. Typst `leading` is the gap between line boxes (bottom
   edge to top edge, **[verified]** `par` docs), not the CSS-style multiplier the setting
   name suggests. With Typst's default `top-edge: "cap-height"` / `bottom-edge:
   "baseline"`, baseline-to-baseline ≈ `0.7em + leading`. At `lineHeight: 1.5` in
   `minimal` that is ≈ 1.45em — accidentally inside Butterick's 120–145% band. The
   relationship is not documented anywhere and differs per template.
   *Recommendation*: define one mapping (`leading = lineHeight * 0.5em`), use it in all
   three templates, and document the rendered-ratio equivalent next to the control.

3. **`fontScale` can drive body text below the floor the rubric enforces.** The slider
   allows 80–120%; at the default 11pt body, 80% renders 8.8pt — under
   `TYPE_RULES.bodyMin = 10`. The "fit to one page" action below therefore clamps scale
   to `body × scale ≥ 10pt` (i.e. ≥ 90.9% at body 11) and reports when it hits the clamp.
   The slider itself should show the same clamp reason (the "control that promises
   something the code does not do" defect class from `UI-FEATURE-PASS.md` §8.2).

---

## 1. Prior art — how the tools we studied report overflow and control breaks

| Tool | Overflow / fit feedback | Break control | Widows/orphans |
|---|---|---|---|
| **Word** | Live page count in the status bar; no "distance over" signal **[verified]** | Paragraph pagination: **Keep with next**, **Keep lines together**, **Page break before** **[verified]** | **Widow/orphan control** on by default; guarantees ≥2 lines top/bottom **[verified]** |
| **Google Docs** | Page count only | Manual breaks only; a Google support thread titled *"Is there a 'keep with next' or widow and orphan control option in Docs?"* exists, i.e. the feature is asked for and not exposed **[verified thread exists; current state unverified]** | not exposed |
| **LaTeX** | Console warnings ("Overfull \\vbox"), not UI **[verified]** | `\\pagebreak`/`\\nopagebreak` (graded penalties 0–10000), `\\enlargethispage`, `needspace` ("new page unless N lines still fit") **[verified via latexref/tex64]** | `\\widowpenalty`/`\\clubpenalty`; `samepage` environment **[verified]** |
| **InDesign** | **Overset text**: red `+` on the frame; Story Editor lists the hidden text below a red line; Preflight panel red/green **[verified]** | **Keep Options**: Keep With Previous, Keep With Next, Keep Lines Together (all / at start / at end + N lines), **Start Paragraph** (column / frame / page / odd / even) **[verified]** | via Keep Lines Together rules |
| **Typst** (ours) | none built in | `pagebreak(weak:, to:)`, `block(breakable:)`, `block(sticky:)` (keep-with-next; headings sticky by default) **[verified]** | `text.costs(widow:, orphan:, runt:, hyphenation:)` — prevention on by default, `0%` disables **[verified]** |

Two lessons worth stealing. **InDesign's overset indicator** is the gold standard for the
feedback loop: a persistent, un-ignorable mark that says *more content exists than fits,
and here it is* — never a score. **Word's four paragraph flags** are the right vocabulary
for user-facing break semantics (keep-with-next / keep-lines / break-before), and they
map almost one-to-one onto Typst primitives (§5). We can offer the vocabulary users
already know while implementing it with primitives that are strictly better-behaved.

---

## 2. What we should build

A coherent five-part set. Order is dependency order; sizes use the roadmap convention
(S ≈ days, M ≈ 1–3 weeks). All five respect the principles: every result is a named
check, every content change is user-initiated, every layout change is visible and
reversible (revision history already exists for restore).

### F1 — Fit target and overflow meter (M) — *the anchor*

- **User does**: sets a target ("1 page", "2 pages", "none") in the editor toolbar and
  watches the meter while working. Expands the meter to see where the overflow starts
  and which layout changes would absorb it.
- **App does**: compiles the same Typst source with a small invisible probe appended
  (§5.3), reads back `pages`, the end-of-content position, and each entry's
  `(page, y)`, and derives: page count, **millimetres over target**, page fill of the
  last page, and **which entry starts the overflow page**.
- **Why**: page count is "the single most-asked question about a resume"
  (`preview-pages.ts` already says so), and today the only feedback is a bare number
  with one rubric line. "You are 0.2 pages over" tells nobody what to do; "22 mm over,
  the spill starts at Senior Engineer at Acme" is actionable. This is also the
  Brevity-dimension page-count check from `ROADMAP.md` Feature 5 given a real UI.
- **Implementation shape**: new `src/lib/typst/probe.ts` (probe source injection +
  `$typst.query` call; the local `TypstSnippet` interface in `compiler.ts` needs the
  `query` method added — it exists on the library's snippet, `snippet.d.cts` L314
  **[verified]**). Extend `src/features/resume-editor/lib/preview-pages.ts` into a fit
  store (same pattern: preview compiles and publishes, panels read; nothing imports
  nothing). `serialize.ts` emits entry markers + probe. Meter UI beside the existing
  toolbar page count (`resume-editor.tsx` L384 already reads `pageCount`).

### F2 — Density presets (S) — *the first lever*

- **User does**: picks **Compact / Normal / Relaxed** in a formatting-toolbar segment
  (or from the overflow meter). "Custom" shows when individual knobs no longer match a
  preset. Nothing else changes; typography scale and font are untouched.
- **App does**: applies one settings patch (`sectionSpacing`, `lineHeight`, `margins`,
  header gaps) atomically. One patch = one revision snapshot = one restore.
- **Why**: the knobs already exist (`resumeSettingsSchema`) but they are six separate
  controls; users do not know which combination is "tight". A preset is a *named
  composition* — the density equivalent of named pass/fail instead of a score. Because
  presets are pure functions over existing settings, **no schema change is needed**.
- **Implementation shape**: `src/lib/layout/density.ts` (pure preset functions +
  `describeDensityPatch()` for the diff line in §2.2), `formatting-toolbar.tsx` segment,
  `sections.typ` header gaps derived from `spacing-val` (§4 exact values).

### F3 — Semantic page-break controls (M) — *the real missing feature*

- **User does**: per entry/section chooses break behaviour in the same vocabulary Word
  users know: **Keep entry together** (Auto / Always / Never), **Keep section with its
  first entry**, **Start section on new page**. Defaults: entries Auto (keep together
  when they are small enough to move as a unit), headings keep-with-next (Typst default),
  no forced breaks.
- **App does**: maps flags to `block(breakable:)`, `block(sticky:)` and
  `pagebreak(weak: true)` (§5.1). "Auto" uses a measured size guard so a six-bullet
  entry can still split while a two-line entry never leaves an orphaned half.
- **Why**: "this entry must not split across pages" is the single most common
  page-break request in every tool studied (Word's Keep Lines Together, InDesign's Keep
  Options), and our templates currently have **no keep semantics at all** — `sections.typ`
  emits bare `grid`/`list` sequences, so entries split mid-bullets whenever the page
  runs out. It is also the only honest answer to awkward pagination that is not "make
  the font smaller".
- **Implementation shape**: `packages/types/src/schemas.ts` — a `layout` block on
  `ResumeSection` (and per-entry override later) with
  `keepTogether?: "auto" | "always" | "never"`, `pageBreakBefore?: boolean`. This lives
  in `Resume.metadata`/section JSON, so **no D1 migration**; mind trap 2.17
  (`resume.update` merges metadata). `sections.typ` wraps entries; `serialize.ts` passes
  flags through; fixtures in `test/typst-templates.test.ts` (a keep-together entry that
  straddles a page boundary — verify in the offloaded browser harness, §2.22).

### F4 — Overflow relief ladder (S) — *suggestions, never content edits*

- **User does**: when over target, sees an ordered list of things that would absorb the
  overflow, each with an estimated size ("Compact density ≈ 18 mm"). Layout rows have an
  **Apply** button (explicit, diff-shown, reversible). Content rows have **no apply
  button** — they navigate to the anchor and say what to consider.
- **App does**: the layout estimates come from cheap what-if probe compiles (candidate
  settings patch → measure → discard, only when the meter is expanded); the content rows
  are lifted from checks that already exist (`bullets-per-role`, `bullet-length`,
  `word-count`, section visibility) plus "hide this optional section" and "hide entries
  in this variant" (variant semantics already shipped).
- **Why**: the safe order to reclaim whitespace is a product decision we should make
  once, not leave users to discover by dragging sliders. And the ladder is where "we
  never invent content" becomes visible behaviour: bullet summarising/rewriting is
  exactly the Rezi failure mode the roadmap rejects ("detect, never invent").
- **Implementation shape**: `src/lib/analysis/relief-ladder.ts` (pure: fit metrics +
  rubric anchors → ordered rows with `kind: "layout" | "content"`), UI in the meter
  popover; what-if compiles behind a debounce in `probe.ts`.

### F5 — Readability check set (S) — *the advice layer*

- **User does**: nothing; the checks appear in the existing rubric panel as named
  pass/fail/advice rows, ranked by effort like everything else.
- **App does**: five new checks (§3) in the existing groups — mostly `soft: true`
  (advice), because typography taste is not a defect. No new rubric group: the
  four-dimension rubric (Parse-fit, Impact, Brevity, Style) is a tested surface
  (`UI-FEATURE-PASS.md` §4.1 pins it) and these checks are Style/Brevity questions.
- **Why**: "readability suggestions based on font size, white space and font family"
  (brief) fits the rubric's named-check model exactly; the `advice` status exists for
  precisely this.
- **Implementation shape**: `src/lib/analysis/rubric.ts` (new `READABILITY_RULES`
  constants alongside `TYPE_RULES`/`LENGTH_RULES`; `buildRubric` gains fit metrics in
  its options), fixtures that fail each check.

**Build order**: F2 (S, gives the first lever) → F1 (M, the meter) → F5 (S) → F3 (M) →
F4 (S). F1 without F2 is a meter with nothing to recommend; F2 without F1 is a preset
with nothing to aim at; together they are the one coherent "hit one page" release. F4
last because it composes anchors from F5 and F3.

---

## 3. The feedback loop design

### 3.1 What the user sees, moment by moment

**Toolbar chip** (always visible while the preview compiles):

| State | Copy |
|---|---|
| Not compiled | `Pages —` (same `null` semantics as `usePreviewPages` today) |
| Target met | `1 page · target 1` |
| No target set | `2 pages` |
| Over target | `1.2 pages · 22 mm over target` (amber, not red — this is not a defect) |

Compile cadence is unchanged: the preview already recompiles on edit (debounced); the
meter is a projection of the last compile. No extra compiles while typing.

**Expanded meter** (popover under the chip; this is where the loop closes):

```
Fit — 22 mm over your 1-page target
The overflow starts at: Work Experience · Senior Engineer at Acme
(the first two bullets land on page 2)

Absorb it with layout — applied changes are one restore away:
  Compact density                 ≈ 18 mm   [Apply]
  Text scale 100% → 93%           ≈ 11 mm   [Apply]  body stays at 10 pt floor
  Date format Mar 2026 → 2026     ≈  3 mm   [Apply]

Or make room in the content — this is yours to decide:
  · Hide "References" — usually optional          (24 mm of page 2)
  · "Senior Engineer at Acme" lists 8 bullets; the rubric suggests 3–6
  · 2 bullets run past 220 characters and wrap to 3 lines
```

Design rules for this surface:

- **mm first, page fraction second.** "0.2 pages" does not tell the user whether a
  margin tweak fixes it; "22 mm" maps directly onto levers whose gains are also in mm.
  The lever estimates are the answer to "what is the right feedback loop": the meter
  measures *and prices* the fixes. (Word shows neither; InDesign shows the *fact* of
  overset well and the *amount* not at all.)
- **"Where the overflow is" is an anchor, not a coordinate.** Reuse the rubric's
  `anchor` field (finding → section/item id resolution already shipped, `UI-FEATURE-PASS`
  §4.4). Row click scrolls the editor to the entry.
- **Nothing happens without a click.** Layout rows show a one-line diff before applying
  (`Density: Normal → Compact · Line spacing 1.5 → 1.25 · Margins 40 → 32 px`) via the
  existing `useConfirm` pattern. Content rows never have an apply button at all.
- **The terminal state is honest.** If the ladder bottoms out and the document is still
  over: *"Layout is at its floor — body 10 pt, margins 32 px. The remaining 12 mm have
  to come from the content: hide something, or move it to your base resume."* We do not
  cross the floor to win, and we do not cut content to win.
- **Target is a preference, not a verdict.** A three-page academic CV (`postgrad`) is
  normal; the target default should be `none` for `postgrad` and `1` for
  `minimal`/`undergrad`, overridable per resume (see open question 3).

### 3.2 How the overflow amount is derived

From the probe (§5.3): `end = position of <fit-end>`, `(page, y)`. For a 1-page target
with content ending on page 2 at `y`:

- `spillMm = (end.y − margin.top) in mm` — the vertical extent of content on the
  overflow page (plus the height of the final block below the marker; the marker goes
  after the last content so the error is under one entry).
- `lastPageFill = (end.y − margin.top) / (page.height − margin.top − margin.bottom)` —
  feeds the `last-page-fill` check (§3.3).
- `overflowEntry = first entry marker with page > target` — the "spill starts at" row.
- "1.2 pages" = `1 + spillMm / usablePageHeightMm`, rounded to one decimal.

Everything is measured on the *configured* paper (`pageSize: "A4" | "Letter"`; A4 is
narrower and taller, which changes both measure and fill).

### 3.3 Lever estimates (the what-if compile)

Each layout row's "≈ N mm" is computed, not guessed: apply the candidate settings patch
to the serialized document, run a probe-only compile (no SVG render), read `end`, diff.
One warm WASM compile per candidate, run only when the popover opens, cached per
settings-hash. Reflow is non-linear in `fontScale` (lines re-wrap), which is exactly why
we measure instead of extrapolating. If the estimate is stale after the user edits, the
meter recompiles and the rows refresh.

---

## 4. Readability check set

Constants live in `src/lib/analysis/rubric.ts` next to `TYPE_RULES` (same style: named
bands, `as const`). All bands are **rendered** values — see §0 on the unit problem.
Existing checks are referenced, not duplicated: `typography-body/name/heading` (size
bands), `contrast-body/muted` (WCAG AA 4.5:1, already computed), `word-count`,
`bullets-per-role`, `bullet-length`, `page-count` (extended with spill mm + anchor).

| id | Title (user-facing) | Group | Verdict | Effort |
|---|---|---|---|---|
| `line-spacing` | Line spacing is in the readable range | style | advice | quick |
| `line-length` | Lines are a readable length | style | advice | medium |
| `margins-printable` | Margins keep text printable | style | fail | quick |
| `font-embedded` | The export uses the font you picked | parse-fit | advice | quick |
| `last-page-fill` | The last page is substantial | brevity | advice | medium |

**`line-spacing`** — pass when `lineHeight ∈ [1.2, 1.6]`.
*Justification*: Butterick puts print body text at 120–145% of point size **[verified]**;
WCAG 1.4.8 asks ≥ space-and-a-half for screen/AAA **[verified]**. Our `lineHeight` knob
maps to leading ≈ `0.7em + lineHeight × 0.5em` baseline gap (§0.2), so the pass band
covers rendered 1.3–1.5em. Copy:

> pass — *Line spacing is 1.5, in the 1.2–1.6 range print text is read comfortably in.*
> advice (low) — *Line spacing is 0.9. Below 1.2 printed lines start to tangle when the
> page is photocopied or faxed. The setting is in the formatting toolbar.*
> advice (high) — *Line spacing is 1.9. Loose spacing reads as coursework; you are
> paying for it in page height.*

**`line-length`** — pass when a full body line holds **70–110 characters** (measured by
the probe: `contentWidth / mean width of a 50-char reference string at body size`).
*Justification, honestly*: prose guidance is 45–90 chars (Butterick **[verified]**) and
≤80 (WCAG 1.4.8 **[verified]**), but every conventional resume layout runs longer —
Letter minus 0.5in margins at 11pt is ≈ 90–97 chars — and gets away with it because most
lines are short bullets, not prose. The failure mode we actually care about is >110,
where the return sweep fails. Copy:

> pass — *About 92 characters fit on a full line. Fine for bullet-led text; prose
> usually reads better at 45–90.*
> advice — *About 118 characters fit on a full line. Above ~110 the eye loses the line
> on the return sweep. Widen the margins or raise the body size slightly — or split the
> widest section into shorter bullets.*

**`margins-printable`** — fail when any margin < 32px (8.5mm ≈ 24pt at our conversion).
*Justification*: most laser printers leave ~5mm unprintable at the edge; a resume that
clips on paper is a parse-and-print defect, not a taste question — hence fail, not
advice. The Compact preset sits exactly on this floor. Copy:

> fail — *Smallest margin is 6 mm. Printers cannot print within about 5 mm of the paper
> edge, so this may lose text on paper. 32 px is the floor the presets use.*
> pass — *Margins are 10.5 mm or wider everywhere.*

**`font-embedded`** — advice when `resolveTypstFont()` returns `substituted: true`
(`src/lib/typst/fonts.ts` — the flag exists today and nothing surfaces it).
*Justification*: substitution must preserve metrics (trap 2.13 — and the current table
does: Tinos↔Times, Arimo↔Arial, Carlito↔Calibri, **[verified in fonts.ts]**), so this is
a "looks different than picked" note, never a page-count warning. Non-preachy font
advice is advice *about rendering*, not taste. Copy:

> advice — *"'Playfair Display' is not installed in the export engine. The PDF renders
> as 'Tinos' — the same letter widths, so line and page breaks are unchanged."*
> pass — *"Inter is embedded in the PDF exactly as picked."*

That is the whole font-family story: **no taste checks, no "ATS-safe font" scoring.**
The parsing risk of fonts is embedding completeness (we embed everything we ship) and
glyph coverage (already parse-checked), not the family's fashion. What we *will* do is
document the shipped families as a neutral table (serif/sans, metric-compatible pairs)
in the font picker — information, not a verdict.

**`last-page-fill`** — advice when `pageCount ≥ 2` and the last page is under ~20% full.
*Justification*: this is the whitespace check the brief asks for, inverted — instead of a
whitespace *ratio* (which is content-dependent noise), it detects the one whitespace
failure readers actually notice: a page with three lines on it. Copy:

> advice — *Page 2 holds about 12% of a page. A page with a few lines reads as an
> accident; either pull the content back to one page (the meter has suggestions) or let
> the layout breathe to two.*

**Extended `page-count`** (existing id, richer detail):
`2 pages · 22 mm of that is spill onto page 2, starting at "Senior Engineer at Acme".`
Pass detail keeps the current career-stage wording (one page early, two later — the
Purdue OWL position **[verified via search snippet; page itself CAPTCHA-walled]**).

Checks deliberately **not** proposed: a bullet-density metric (covered by
`bullets-per-role` and `word-count`), a heading-weight check (our headings are already
size+weight differentiated by template; a check would fire on no real failure), and any
aggregation of the above into anything numeric.

---

## 5. Spacing and density system

### 5.1 Presets — exact values

One preset sets four things. Values are in the settings' existing units (margins in px
as `resumeSettingsSchema.margins` stores them; `spacing-val` in pt as `sections.typ`
evaluates it). **Normal reproduces today's defaults exactly** — the formulas below were
chosen so the default output does not move.

| Knob | Compact | **Normal (today)** | Relaxed | Where it lands |
|---|---|---|---|---|
| `sectionSpacing` | `compact` (8pt) | `normal` (12pt) | `spacious` (20pt) | `sections.typ` `spacing-val` |
| `lineHeight` | 1.25 | 1.5 | 1.65 | `par(leading: lineHeight * 0.5em)` |
| `margins` (all sides) | 32 px | 40 px | 48 px | `set page(margin:)` |
| header block `below` | `spacing-val + 2pt` (10pt) | 14pt | 22pt | `minimal/postgrad` header `block(below:)` |
| contact gap | `spacing-val * 0.5` (4pt) | 6pt | 10pt | header `#v(6pt)` |
| item gap | `spacing-val * 0.6` (unchanged) | — | — | `render-experience` etc. |
| `fontScale`, `typography`, `dateFormat`, `colors`, `accentStyle` | untouched | untouched | untouched | user's own controls |

Notes:

- The two header formulas (`below: spacing-val + 2pt`, `v(spacing-val * 0.5)`) evaluate
  to **exactly today's hardcoded `below: 14pt` / `v(6pt)`** at Normal. That is how the
  presets change the header without a second source of truth.
- Item gaps keep their existing fractional relationships to `spacing-val` (0.4–0.6), so
  the whole document moves in one rhythm instead of three independent dials.
- Compact's margins (32 px = 8.5 mm) are the `margins-printable` floor. Relaxed's 48 px
  = 12.7 mm = the classic 0.5in resume margin.
- Per-template leading factors (0.45/0.5/0.55em) are unified to 0.5em first (§0.2),
  otherwise "Compact" means three different spacings across the template picker.
- `sectionSpacing` stays the `compact | normal | spacious` enum — the presets *use* it,
  not extend it. "Custom" is a derived display state (settings don't match any preset),
  not a stored value. **No schema change for F2.**

### 5.2 Per-section vs global — and what to reclaim first

**Global wins for spacing; per-section controls get break semantics instead of dials.**
Reasons: (a) consistent rhythm across sections is most of what "readable, not busy"
means — per-section spacing knobs produce the patchwork look the brief is trying to
avoid; (b) the cases where users genuinely want per-section control are break questions
("this entry together", "this section starts fresh") which is F3; (c) three knobs × N
sections is a settings surface nobody uses. The only per-section spacing concession
worth building is a **"tighter sections" multiplier** folded into the Compact preset
later if dogfooding demands it — not now.

**Reclaim order when over target** (the whitespace budget, expressed as a ladder):

1. **Density → Compact** (gaps + leading + margins together). Largest single win
   (est. 10–18% of height), touches nothing semantic.
2. **`fontScale` down**, clamped so body stays ≥ the rendered 10pt floor. Each 5% is
   roughly 4–5% of height plus reflow.
3. **`dateFormat` → `MMM YYYY` or `YYYY`** — horizontal relief (a wrapped date line per
   entry can pull back). Caveat: `parse-fidelity.ts` marks `MMMM YYYY` and `MMM YYYY`
   safe, `MM/YYYY`/`YYYY` unsafe — so the ladder only offers parse-safe compressions
   (`MMM YYYY`) and says so.
4. **Content levers** — always manual (§2 F4).

The order encodes the principle: we spend reversibility and whitespace before we spend
readability, and we never spend content automatically.

---

## 6. Typst mechanisms (verified against the official docs)

The brief's `block(keep: true)` does not exist; the real primitives are `breakable` and
`sticky`. All syntax below is from the current Typst reference **[verified]**; `sticky`
and `text.costs` require **Typst ≥ 0.12** (both added in 0.12.0 **[verified, release
notes]**), and `query` exists on the bundled snippet API (`snippet.d.cts` L314
**[verified]**). Pin the assumption in `test/typst-templates.test.ts` with a canary
compile of `sticky`/`costs` — the bundled compiler version is not asserted anywhere
today **[inference]**.

### 6.1 Break control

```typst
// Keep an entry together — no break inside (Word: "Keep lines together")
#block(breakable: false)[
  // entry grid + bullets
]

// Keep heading with its first entry (Word: "Keep with next";
// Typst already does this for headings — block.sticky defaults true)
#show heading: set block(sticky: true)

// Start section on a new page, without leaving a blank page
// when it is already at the top of one (Word: "Page break before")
#pagebreak(weak: true)

// Widow/orphan prevention is ON by default and is what we want;
// 0% would allow single lines to strand (not offered to users)
#set text(costs: (widow: 100%, orphan: 100%, runt: 100%))
```

"Auto" keep-together (F3 default): keep the entry together **if it is small enough to
move as a unit**, measured at layout time. The documented measure+layout idiom
**[verified]**:

```typst
#let entry-block(content) = layout(size => {
  let (height,) = measure(width: size.width, content)
  // Small entries never split; page-tall entries are allowed to.
  block(breakable: height > 0.45 * size.height, content)
})
```

*Implementation caution*: `layout` forces its contents into a block-level container
**[verified]**; confirm that a `breakable: true` inner block still breaks across pages
inside it, with a fixture that straddles a boundary. If it does not, fall back to a
serializer-side shape heuristic (entries with ≤3 bullets and no description get
`breakable: false`) — deterministic, testable, slightly cruder.

Paragraph rhythm (after §0.2 unification):

```typst
#set par(
  leading: float(settings.at("lineHeight", default: 1.5)) * 0.5em,  // between lines
  spacing: 12pt,                                                    // between paragraphs (Typst ≥ 0.12)
  justify: false,
)
```

(`postgrad.typ` justifies — WCAG 1.4.8 advises against justification for screen
readers **[verified]**; keep the template's academic convention but surface it as one
`advice` note in postgrad only. See open question 4.)

### 6.2 Measuring the page (for checks and estimates)

```typst
// Remaining height on the current page (verified idiom):
#block(height: 1fr, layout(size => [/* size.height = space left */]))

// Total height of content at a given width (lever what-if estimates):
#layout(size => {
  let (height,) = measure(width: size.width, all-content)
  // height / size.height ≈ pages of content
})
```

### 6.3 The fit probe (getting measurements out of the compile)

The compiler runs in the browser; the app needs structured numbers, not PDF forensics.
Typst's introspection can compute them **inside** the document and hand them back via
`metadata`, which is invisible and layout-neutral (it cannot self-affect layout, so the
multi-pass convergence warning in the `query` docs does not bite — **[verified]**
semantics, **[inference]** on the non-bite):

```typst
// Injected by serialize.ts before each entry:
#metadata((kind: "entry", id: exp.id, label: exp.position)) <entry-0>

// Injected after the last section:
#metadata((kind: "end")) <fit-end>

// Injected last; evaluated after layout settles:
#context {
  let entries = query(metadata)
    .filter(m => type(m.value) == dictionary and m.value.at("kind", default: "") == "entry")
    .map(m => {
      let p = m.location().position()
      (id: m.value.id, page: p.page, y: p.y.pt())
    })
  let e = locate(<fit-end>).position()
  metadata((
    kind: "fit-probe",
    pages: counter(page).final().first(),
    end: (page: e.page, y: e.y.pt()),
    entries: entries,
  )) <fit-probe>
}
```

Host side (`src/lib/typst/probe.ts`, via the existing `$typst` snippet):

```ts
const probe = await $typst.query<FitProbe>(
  { mainContent },
  { selector: "<fit-probe>" },
);
```

(`locate(<label>).position()` returns `(page, x, y)` **[verified]**; convert lengths to
floats with `.pt()` inside the document so the metadata value is plain JSON.) The probe
is appended only for meter/check compiles; the PDF/SVG compiles stay byte-identical to
today's output — an important invariant given parse-fidelity checks run against the
export.

---

## 7. What NOT to build (and why)

| Rejected | Why |
|---|---|
| **A readability or page-fit score** (0–100, letter grade, "your layout is 78%") | The category's trust failure (`ROADMAP.md`, `rubric.ts` preamble). Named checks with effort-ranked fixes already direct work better. |
| **Auto-summarising / rewriting bullets to fit** | Invents content in a signed document. The roadmap's single hardest line: "Detect, never invent." Rezi's documented hallucinations are generation failures. |
| **Silent auto-fit** (shrinking type or hiding entries without an explicit action) | Fights the user and hides decisions. Layout changes are applied by click, with a diff, reversible via revision restore. Content changes are never auto-applied at all. |
| **Auto-shrink below the floor** (body < 10pt rendered, margins < 32px) | Breaks the parser/legibility contract the rubric already enforces. Hitting the floor produces an honest message, not a smaller font. |
| **Hidden-keyword / white-text density tricks** | Explicit README-policy rejection in the roadmap; ATS deception from a product whose brand is ATS legitimacy. |
| **Two-column or sidebar "fit" layouts** | Change extraction order — the product's core guarantee. `layout: "two-column"` was deliberately removed from UI (#153); do not re-enter through page-fit. |
| **A per-section whitespace budget widget** | Micromanagement surface that fights the presets; the ladder already encodes "what to reclaim first" as a product decision. |
| **Per-entry spacing sliders** | Global rhythm + break flags cover the real needs; per-entry dials produce the busy-looking document the brief is trying to avoid. |
| **"ATS-safe font" scoring or font taste checks** | The parsing risk is embedding and glyph coverage (already checked), not the family. Ship neutral facts in the picker (F5); no verdicts. |

---

## 8. Open questions for the maintainer

1. **The pt/px unit bug (§0.1) is a precondition, not a subtask.** Proposed resolution:
   treat typography values as pt everywhere (drop `px-to-pt` from type sizes in
   `sections.typ`; keep it for pixel insets) and make `TYPE_RULES` assert rendered pt.
   This changes rendered output of every existing resume (body 8.25pt → 11pt) — bigger
   pages. Is that acceptable as a one-time correction, with a revision note? The
   alternative (values are px; fix the toolbar label and multiply `TYPE_RULES` by 0.75)
   keeps current rendering but makes "10pt floor" mean 7.5pt real, which contradicts the
   parser rationale.
2. **Fit action: apply-with-confirm or preview-only?** This proposal: layout rows apply
   via a diff-confirm dialog (the `useConfirm` pattern), content rows never apply. Too
   cautious? Not cautious enough for the "workbench, not generator" line?
3. **Where do break flags live and how do variants treat them?** Proposed:
   `section.layout.{keepTogether, pageBreakBefore}` in section JSON (no D1 migration),
   and *variant copies inherit the base's flags*, changeable per variant — flags are
   layout of that document, not content. Agree? (Per-entry overrides deferred.)
4. **Page target storage.** Proposed: `pageTarget: "1" | "2" | null` in
   `resumeSettingsSchema` (Zod-only change, lives in metadata JSON), defaulting by
   template (`minimal`/`undergrad` → 1, `postgrad` → none). Or keep it UI-local state?
5. **`line-length` band 70–110** deliberately diverges from prose guidance (≤80 WCAG,
   45–90 Butterick) because resume layouts conventionally run ~90–97 chars. Accept the
   resume-pragmatic band, or hold the WCAG line and advise margins/type changes on
   default layouts (which would make the check fire on the shipped defaults)?
6. **Justified text in `postgrad`** conflicts with WCAG 1.4.8's "do not justify" but is
   academic-CV convention. Keep it and ship one template-scoped advice note (proposed),
   or drop justification?
7. **Terminal-state wording** ("the remaining millimetres have to come from the
   content…"). This is the one place the product tells the user a truth they may not
   want. Is the proposed copy the right register?
8. **Rendering verification**: every page-count/spill claim needs the offloaded browser
   harness (AGENT-CONTEXT §2.22). Who owns running it for the probe fixtures — and can
   we add one golden PDF page-count fixture to the suite as the regression gate?
