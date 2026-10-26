# Resume space efficiency: the real density envelope

> **Status:** research deliverable for `docs/plan/round2/r2-space-efficiency.md`.
> This is the specification for a template rebuild. No code was changed to produce it.
> Companions: `docs/research/template-research.md` (typography and ATS norms),
> `docs/research/page-fit-readability.md` (the fill metric), `src/lib/layout/density.ts`
> (the preset delivery vehicle this document proposes to re-target).

---

## 0. Method, and what was actually measured

The previous pass derived its numbers from **university career-centre guides** — documents
that describe a *comfortable* document. This pass measures **working one-page resumes**:
the artefacts people actually get hired with, whose geometry is declared in their source.

**Method per row** (stated in the table):

- **Source** — exact numbers read from the template's LaTeX/Typst source (margins,
  type sizes, leading, gap constants, negative-vspace tricks). These are exact.
- **Norm** — values declared in a published career-centre guide (cited). These are
  recommendations, not measurements of a sample page.
- **Derived** — lines/page, characters/line and fill computed from the above with the
  arithmetic in §0.1. ±5% for font metric variation.

Covered: Jake's Resume, sb2nov, Awesome-CV, AltaCV, Deedy (all source-measured), four
career-centre norms, and the repo's own shipped default and compact preset (measured
from `src/features/resume-editor/typst_templates/sections.typ` and
`packages/types/src/schemas.ts`).

**Coverage gaps (honest):** `cv.jakeev.org` did not respond (unreachable at research
time); resumake.io's generator source was retired from its repo (only a landing page
remains on `main`, so its template geometry could not be verified); published sample
**PDFs** were not pixel-measured (a browser PDF render proved unreliable for margin
measurement), so career-centre rows carry their guides' declared norms instead. Every
other number in this document is either read from a source file or computed from one.

### 0.1 Arithmetic used throughout

- 1 pt = 0.352 78 mm. Letter: 612 × 792 pt. Typst points are PostScript points.
- Printable height, Letter: 792 − top − bottom. BettaResume default (43/43 pt):
  706 pt = **249.1 mm**. At the 36 pt floor: 720 pt = **254.0 mm**.
- Body line pitch = body size × line height (the `sections.typ` leading mapping makes
  baseline-to-baseline = lineHeight·em). Single-line boxes ≈ 0.7 × size (the measured
  mid-range of the bundled families, `sections.typ` §Leading).
- **Fill ratio** = content vertical extent ÷ printable height on page 1 — the same
  quantity `page-fit.ts` reports as `lastPageFill` (see
  `docs/research/page-fit-readability.md` L256). It is the actionable number for "will
  this spill"; 2-D ink coverage is not used here.

---

## 1. The measurements

| # | Resume (one page unless noted) | Method | Margins (mm / in) | Body pt / line h | Lines per page (body-line equiv.) | Chars/line | Section heading treatment & vertical cost | Section / entry / bullet gaps | Fill (sample) | Content budget on one page |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [Jake's Resume](https://github.com/jakegut/resume) — the most-used one-page LaTeX resume | source | 12.7 all (0.5 in) | 10 pt (`\small` in 11 pt class) / ≈1.2 | **~60** | ~110 | `\scshape\large` row + rule below; `−4pt` above and `−5pt` below the rule → **≈2–3 mm net** | ≈1.5 mm / ≈1.5 mm / ≈0.5–1 mm (all clawed back with `−2pt`/`−5pt`/`−7pt` vspace) | ~97% | 7 entries + 24 bullets + 4 skill lines (its own sample) |
| 2 | [sb2nov/resume](https://github.com/sb2nov/resume) — ancestor of #1 | source | 12.7 all (0.5 in) | 10 pt / ≈1.2 | ~60 | ~110 | identical to #1 (`−4pt` / `\titlerule` / `−5pt`) → ≈2–3 mm | same negative-vspace system (`−5pt` after every entry head) | ~95% | 5 entries + ~25 bullets; 2-line header (name left, contacts right) |
| 3 | [Awesome-CV](https://github.com/posquit0/Awesome-CV) (`awesome-cv.cls`) | source | L/R 20, T 15, B 20 | 9 pt desc / 10 pt title, tight (`{9pt}{1em}`) | ~65–70 | ~105 | **16 pt** bold + 0.9 pt rule below; 3 mm above, 2.5 mm below → **≈8 mm** (its one luxury) | 3 mm / −2 mm entry (`\vspace{-2.0mm}`), list itemsep **0 pt** | ~85% | name 32 pt + position + address + social rows; lists are zero-gap |
| 4 | [AltaCV](https://github.com/liantze/AltaCV) (`altacv.cls`) | source | 20 all (margin=2cm) | 10 pt / ≈1.2 (`\normalsize`) | ~57 | ~100 | `\LARGE` UPPERCASE + **2 pt rule** with `\\[-1ex]`; `\bigskip` above, `\medskip` below → **≈7 mm** | \bigskip≈4.2 mm / \medskip≈2.8 mm / itemsep 0.25\baselineskip ≈ 1.1 mm | ~88% | 4–5 `cvevent`s with date+location rows; 2-mm-chip tags |
| 5 | [Deedy Resume](https://github.com/deedy/Deedy-Resume) (`deedy-resume-openfont.cls`) | source | h 12.5, v **7.5** (1.25/0.75 cm) | 10 pt / 12 pt fixed | ~66 | ~110 | 16 pt/24 pt UPPERCASE, **no rule**; `titlespacing` 0pt/0pt/0pt + manual `\sectionsep` 8 pt → ≈2.8 mm | 0 / 0 / `itemsep 1pt` ≈ 0.35 mm | ~97% | the extreme dense end; 40 pt name over a full-width rule with `−15pt` after |
| 6 | MIT CAPD guidance | norm | ≥12.7 (0.5 in) floor | 10–12 pt | — | — | bold headings | "consistent, tight" | — | guides, not a sample page ([capd.mit.edu](https://capd.mit.edu/resources/resumes/)) |
| 7 | Georgia Tech Career Center + GT 1000 | norm | 0.5–0.75 in | 10–12 pt, name 16–18 pt | — | — | bold / ALL CAPS / lines "to facilitate scanning" | "uniformity of length and construction of bullets" | — | ([GT guide p.3–4](https://bpb-us-e1.wpmucdn.com/sites.gatech.edu/dist/c/3073/files/2024/02/Career_Center_Resume_Guide-645d43267633e4df.pdf)) |
| 8 | Harvard FAS MCS | norm | 0.5–1 in | 10–12 pt | — | — | simple | "consistent spacing" | — | ([careerservices.fas.harvard.edu](https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/)) |
| 9 | Imperial College postdoc tipsheet | norm | 25.4 (1 in) classical | 11–12 pt | — | — | bold titles; avoid rules/italics clutter | classical | — | ([Imperial tipsheet](https://www.imperial.ac.uk/media/imperial-college/administration-and-support-services/staff-development/public/postdocs/tipsheets/Academic-CVs-v2019.pdf)) |
| 10 | **BettaResume default (Normal)** — `MARGIN_DEFAULTS` + `sections.typ` | source | T/B 15.2 (43 pt), L/R 17.6 (50 pt) | 10.5 pt / **1.35** | **~50** | ~95–100 | 11 pt semibold + 1.5 pt accent rule + 2 pt over 4 pt under; 10 pt above → **≈8.9 mm/boundary** | 3.5 mm / 2.1 mm / 1.1 mm | 96.5% (reference resume, §3) | 5 sections + 6 entries ≈ full page |
| 11 | **BettaResume compact** — `density.ts` | source | 12.7 all (36 pt) | 10.5 pt / 1.25 | ~55 | ~97 | same rule stack; 8 pt above → ≈8.0 mm | 2.8 mm / **2.1 mm (fixed!)** / **1.1 mm (fixed!)** | ~80% | the best the current knobs can do (see §3.4) |
| 12 | Deedy/Jake's family, side-by-side read | derived | 12.5–12.7 | 10 pt | 60–66 | 105–110 | 2–8 mm | 0–3 mm | 93–97% | **the working band this app must match** |

**What the table says in one line:** working one-page resumes run **60–70 line
equivalents per page at 10 pt**, with **2–3 mm section boundaries** and **sub-millimetre
to 1.5 mm bullet gaps**; the current default runs **~50 lines at 8.9 mm boundaries** —
15–20 % less content per page than the artefacts that provably fit.

---

## 2. The density envelope

Three profiles. Values are **exact**; fill targets are where a one-page resume should
land (§0.1 metric). "Line budget" = printable height ÷ body line pitch — body-line
equivalents per page.

| Parameter | **Tight** | **Balanced** (ship as default) | **Relaxed** |
|---|---|---|---|
| Margins (mm / pt) | 12.7 all (36 pt) | 12.7 all (36 pt) | T/B 15.2 (43 pt), L/R 17.6 (50 pt) |
| Body | 10 pt (floor) | 10.5 pt | 10.5 pt |
| Line height (pitch) | 1.22 (12.2 pt = 4.3 mm) | 1.25 (13.1 pt = 4.6 mm) | 1.35 (14.2 pt = 5.0 mm) |
| Small / item title / heading | 9 / 10 / 10.5 pt | 9.5 / 10.5 / 11 pt | 9.5 / 10.5 / 11 pt |
| Name | 16 pt | 18 pt | 18 pt |
| Section heading | UPPERCASE 600, **no rule** | UPPERCASE 600, no rule (rule opt-in) | UPPERCASE 600 + accent rule |
| Gap above section | 6 pt (2.1 mm) | 8 pt (2.8 mm) | 10 pt (3.5 mm) |
| Heading → first entry | 3 pt (1.1 mm) | 4 pt (1.4 mm) | 4 pt (1.4 mm) |
| Entry gap | 4 pt (1.4 mm) | 4 pt (1.4 mm) | 6 pt (2.1 mm) |
| Bullet gap | 2 pt (0.7 mm) | 2 pt (0.7 mm) | 3 pt (1.1 mm) |
| Meta → first bullet | 2 pt (0.7 mm) | 3 pt (1.1 mm) | 4 pt (1.4 mm) |
| Header | name + 1 contact line, 6 pt gap | name + title line + 1 contact line, 8 pt gap, hairline | current 3-line header, 16 pt gap |
| Skills | `Category: items` lines | `Category: items` lines (chips opt-in) | chips |
| **Line budget / page** | **~59 lines** | **~55 lines** | **~50 lines** |
| **Fill-ratio target** | **88–94 %** | **78–85 %** | **68–75 %** |
| Reference resume lands at (§3) | 71 % (181/254 mm) | **79 %** (201/254 mm) | 96 % (240/249 mm) — no slack |
| Who it is for | 7+ entries, long bullets | the 5-year engineer | 3-year careers, sparse content |

Two findings the table encodes:

1. **Today's Normal values are tomorrow's Relaxed.** The 10.5 pt / 1.35 / 43-50 pt
   combination is a defensible *comfortable* profile — it just cannot be the default for
   the content users actually write. At those values the reference resume already fills
   96.5 % of the page: one extra bullet line and it spills.
2. **The fill targets sit above the plan's illustrative 78/70/60.** Measured working
   one-pagers run 93–98 % fill (rows 1, 2, 5). A "balanced" target of 70 % would recreate
   exactly the half-empty page the maintainer is complaining about. The 78–85 % band is
   where a one-page resume should land *after* it is done: packed enough to signal
   substance, with enough bottom slack that +2 wrapped lines don't force a reflow crisis.
   For a two-page CV the plan's lower numbers are fine — but that is not this problem.

---

## 3. The waste audit — where the space actually goes

### 3.1 Reference resume (used for all arithmetic)

A realistic 5-year engineer, one page intended:

- Header: name, professional title, contact line (email · phone · location · links)
- Summary: 3 body lines
- Experience: 3 roles (2-line heading blocks), 8 bullets (11 wrapped lines)
- Skills: 4 categories
- Projects: 2 entries, 4 bullets (5 wrapped lines), tech badges
- Education: 1 entry, 2-line heading block

### 3.2 mm-by-mm breakdown — current defaults (Normal, Letter)

| Element | Composed of | mm | Running total |
|---|---|---|---|
| **Header block** | name 18 pt 4.4 + title 11 pt 2.7 + contact gap 2.1 + contact line 2.3 | **11.6** | 11.6 |
| Header → body gap | block below 12 pt 4.2 + rule 0.2 + post-rule 4 pt 1.4 | **5.8** | 17.4 |
| **Section heading rows** (×5) | text 2.7 + xs gap 0.7 + accent rule 0.5 + below 1.4 = 5.4 each | **27.1** | 44.5 |
| **Gap above sections** (×4; first is exempt) | 10 pt = 3.5 each | **14.1** | 58.6 |
| Entry heading blocks | exp 3×2 rows 15.6 + edu 5.2 + proj titles 5.2 + proj tech rows 4.6 + skills labels 10.3 + skills chips 9.3 | **50.2** | 108.8 |
| Meta → first bullets (×5) | 4 pt = 1.4 each | **7.1** | 115.9 |
| **Entry gaps** (×6) | 6 pt = 2.1 each | **12.7** | 128.6 |
| **Bullet gaps** (×10) | 3 pt = 1.1 each | **10.6** | 139.2 |
| Bullet + summary text | 19 body lines × 5.0 | **80.0** (incl. summary 15.0) | 239.2 |
| **Trailing whitespace, page 1** | 249.1 printable − 239.2 | **8.7** | 249.1 ≈ 100 % |

Rounding aside, this reproduces the direct total: 681.6 pt = 240.4 mm of content in
249.1 mm of printable height — **96.5 % fill, 8.7 mm of slack**. The reference resume
fits today's default *exactly*, which is why any real resume (one more bullet, one longer
summary) spills to page 2 — while page 1 simultaneously "looks half empty" (see §3.3).

### 3.3 The named waste (vs the Balanced profile of §2)

| # | Waste | mm | Where it lives |
|---|---|---|---|
| 1 | **Leading set for comfort**: 1.35 → 1.25 across ~33 pitch-driven rows | **12.2** | `MARGIN_DEFAULTS` companion `lineHeight`, `density.ts` normal preset |
| 2 | **Margins set for comfort**: T/B 43→36 pt recovers 4.9 mm outright; L/R 50→36 pt widens the measure 512→540 pt (+5.5 % chars/line) and removes 1.5–2 wrapped lines ≈ 7.5 mm | **12.4** | `MARGIN_DEFAULTS` (`packages/types/src/schemas.ts`) |
| 3 | **The section chrome**: 5 boundaries at 8.9 mm cost 41.0 mm; working one-pagers do the same job in 15–20 mm. Of the 41 mm: heading text rows 13.6, above-gaps 14.1, heading→content 7.1, xs gaps 3.5, **rules 2.6** | **~11** recoverable (rules+xs 6.1, above-gaps 2.8, slack vs 8 mm policy) | `section-title` in `sections.typ` |
| 4 | **The header**: 17.4 mm for name+title+contacts+16 pt gap; Jake's does name+contacts in ~9.5 mm, and the professional norm is one contact line | **7.5** | `standard.typ` header block, `header-gap` |
| 5 | **Skills chip clusters**: label line + chip line per category = 8 rows, 30.3 mm; `Category: items` lines render the same information in 4 rows, 22.1 mm | **8.2** | `render-skills` `labels` branch |
| 6 | **Entry gaps**: 6 pt × 6 vs 4 pt | **4.2** | `space-l` |
| 7 | **Bullet gaps**: 3 pt × 10 vs 2 pt | **3.5** | `space-s` |
| 8 | **Meta → bullets**: 4 pt × 5 vs 3 pt | **1.8** | `space-m` uses |
| 9 | **keepTogether holes** (conditional): an entry taller than the remaining space jumps whole to page 2, leaving a hole the size of the entry at the bottom of page 1 | **25–35 per occurrence** | `entry-block` / serialiser `keepTogether` |
| | **Total recoverable (1–8)** | **≈ 60 mm = 212 pt ≈ 24 % of the page** | |

**The headline number: the default page spends ≈ 60 mm of 249 mm on comfort choices.**
The same reference resume renders in 240 mm at today's defaults, 201 mm at Balanced, and
181 mm at Tight — i.e. today's default consumes 24 % more page than the content needs.

**And the "half empty at the same time" paradox, named:** at 96.5 % fill there is no
slack, so the *first* entry that cannot fit moves whole (waste #9), leaving a 25–35 mm
hole at the bottom of page 1 and a page 2 that is ~5 % full. Spill and emptiness are the
same failure — a margin of zero plus all-or-nothing entry movement.

### 3.4 What the density controls cannot reach (audit finding)

`sections.typ` routes only **section-gap, header-gap and contact-gap** through
`sectionSpacing`. The two highest-frequency gaps — **entry gap (`space-l`, 6 pt) and
bullet gap (`space-s`, 3 pt)** — are compile-time constants. `density.ts` presets change
margins, `lineHeight` and `sectionSpacing`, so **no preset can reclaim the 23 mm those
gaps occupy** (10 bullet gaps + 6 entry gaps at the reference resume's size). Any rebuild
must make the entry and bullet gaps part of the density patch, or "Compact" will keep
missing ~a third of the available savings.

Also note: `density.ts`'s relaxed preset (1.65 line height, 54/60 pt margins) is not a
one-page profile at all — the reference resume needs ≈ 2 pages there. It is a two-page
CV profile wearing a one-page preset's name.

---

## 4. The levers — trade-off curve

Savings computed on the reference resume (§3.1); readability cost from
`template-research.md` §1 bands and the recruiter-scanning sources there.

| Lever | mm bought | Readability / ATS cost | Verdict |
|---|---|---|---|
| Margins T/B 43 → 36 pt | **4.9** (outright) | none; 0.5 in is the print-safe floor (MIT) | take it |
| Margins L/R 50 → 36 pt | **~7** (1.5–2 re-wrapped lines) | measure grows to ~105 chars/line — long but at the edge of comfortable; ATS unaffected | take it (or 40 pt if 105 chars feels wide) |
| Line height 1.35 → 1.25 | **12.2** | none; mid-band (1.2–1.45, Butterick) | take it |
| Line height 1.25 → 1.20 | **6.1** | bottom of band; visibly denser | tight profile only |
| Body 10.5 → 10 pt | **~13** (pitch + ~2 re-wrapped lines) | at the absolute floor (§1.1); print legibility at arm's length drops | tight profile only |
| Entry gap 6 → 4 pt | **4.2** | grouping stays clear (entry title block dominates) | take it |
| Entry gap 4 → 3 pt | **2.1** | entries start to blur together | tight only |
| Bullet gap 3 → 2 pt | **3.5** | none within one entry's cluster | take it |
| Bullet gap 2 → 1 pt | **3.5** | bullets read as a paragraph | avoid |
| Heading rule removed (incl. its 2 pt gap) | **6.1** (5 headings) | slight loss of "lines to facilitate scanning" (GT); uppercase+600 weight keeps scannability | default without rule; keep as `accentStyle` opt-in |
| Heading moved inline (no own row) | 13.6 | **breaks section detection and scanning** | never |
| Header compressed (contacts on one line, 8 pt gap) | **7.5** | none — Jake's/sb2nov prove 2-row headers carry the same facts | take it |
| Skills `labels` → `lines` | **8.2** | loses chip scanning for sparse categories | default lines; chips opt-in |
| Section gap 10 → 8 pt | **2.8** | minor | take it |
| Dates inline on meta line vs right column | 0 (or +5–10 if it stops a title wrap) | right column is the recruiter's scan axis; current `(1fr, auto)` grid costs almost nothing | keep right column |
| Hanging indent vs stacked markers | **~25 mm avoided** (1 line per 2 wrapped bullets would stack) | hanging indent is the standard | keep hanging (already 10 pt) |
| Widow/orphan (keepTogether) control | costs up to 25–35 per full-entry keep | splitting an entry is a layout flaw (repo rule) | keep entries whole, but the *first* fix is slack (fill ≤ 85 %), not weaker keeps |
| Keep heading + first bullet only (partial keep) | caps the hole at ~10 mm | acceptable split point if a keep is needed | fallback |

**The ordering that buys 60 mm with zero readability regret:** leading → margins → header
→ heading rules → skills lines → entry/bullet gaps. Body size and 1.20 leading are the
only levers that genuinely trade legibility; they belong to the Tight profile.

---

## 5. A recommended default

Ship **Balanced** as `normal` (and make the density preset patch the gaps too):

```
margins        36 pt (12.7 mm / 0.5 in) all sides, Letter and A4
body           10.5 pt          lineHeight  1.25
small          9.5 pt           itemTitle   10.5 pt
sectionHeading 11 pt semibold, UPPERCASE, no rule (accent rule stays as an opt-in accentStyle)
name           18 pt            title       11 pt
header         name + title row + one contact row (9.5 pt), 8 pt below the block, keep the hairline
section gap    8 pt above       heading → first entry  4 pt
entry gap      4 pt             bullet gap  2 pt        meta → first bullet  3 pt
skills         "Category: item, item" lines (chips opt-in)
```

**Why this one:** it renders the reference 5-year engineer at **201 mm of 254 mm
(79 % fill)** — one page with ~53 mm (≈10 body lines) of slack, i.e. room for a fourth
role or a longer summary without a reflow crisis. It sits in the middle of the measured
band (Jake's 60 lines / 10 pt; ours 55 lines / 10.5 pt — slightly larger type, slightly
fewer lines, same page outcome). Nothing in it is below a researched floor: body 10.5 pt
(floor 10), margins 0.5 in (floor), line height 1.25 (band 1.2–1.45), gaps within the
2/3/4/6/8/12/16 scale (which stays; the rebuild only re-maps which step each gap uses).

Mapping onto the existing code (for the rebuild, not done here):
`density.ts` `normal` ← these values; `compact` ← Tight; `relaxed` ← today's Normal
(43/50 pt, 1.35) with the current 1.65/54-60 pt preset demoted to a two-page "spacious"
document or deleted. `MARGIN_DEFAULTS` (43/50) becomes the relaxed value, not the
default. Validate with `npm run templates:render` and the showcase test
(`docs/SHOWCASE.md`), and check the fit meter reports ≥ 8 % slack on the showcase resume.

---

## 6. What must not change

Hard constraints that protect readability and ATS parsing — the envelope may move inside
these, never outside:

1. **Body ≥ 10 pt, small text ≥ 9 pt** — the serializer clamps to these floors
   (`template-research.md` §1.1); the Tight profile sits *on* the floor, never under.
2. **Single column.** No sidebars, no tables-as-layout, no multi-column sections
   (ATS extraction order failure). Dates in an `(1fr, auto)` grid stay — inline reading
   order is preserved.
3. **Standard section headings as plain text**: `Experience` / `Education` / `Skills` /
   etc. (§5 of the prior research). Never coined headings, never heading fills, never
   icons or word art (named parse failures). Emphasis = weight + case only.
4. **Printable margins: ≥ 0.5 in / 36 pt (`MARGIN_BAND.min`)**, on A4 too. Print-safe and
   scanner-safe; this is a floor, not a preference.
5. **One rule style per document** at most (0.5 pt hairline or the accent rule), and rules
   decorate headings only — never between entries, never as fills.
6. **Line height within 1.2–1.45**; the `sections.typ` leading mapping
   (`leading = (lineHeight − 0.7)em`) stays the single source so preview and PDF agree.
7. **Font metric compatibility** for substitutions (Tinos↔Times, Arimo↔Arial,
   Carlito↔Calibri) — a metric change reflows line breaks and silently changes page count
   (repo font pipeline rule, `docs/AGENT-CONTEXT.md`).
8. **Spacing is layout, not type**: `fontScale` must keep scaling type sizes only.
9. **Entry integrity**: never truncate; `keepTogether` semantics ("a split entry is a
   layout flaw, a truncated one is lost content") stay. The fix for its holes is fill
   slack, not weaker keeps.
10. **No invisible-text tricks, no tracked capitals (literal spaces), no coloured fills
    on text** — extraction failures named in Greenhouse/Workable guidance (prior research
    §2.5, §6).

---

## 7. Sources

**Template sources (measured):**
- Jake's Resume — https://github.com/jakegut/resume (`resume.tex`; fullpage ±0.5 in
  margin block, `\titleformat` with `−4pt`/`\titlerule`/`−5pt`, `−7pt` entry heads,
  `−2pt` bullets)
- sb2nov/resume — https://github.com/sb2nov/resume (`sourabh_bajaj_resume.tex`; same
  geometry, 2-row header)
- Awesome-CV — https://github.com/posquit0/Awesome-CV (`awesome-cv.cls`;
  `\geometry{left=2.0cm, top=1.5cm, right=2.0cm, bottom=2.0cm}`, `\acvSectionTopSkip`
  3 mm, `\acvSectionContentTopSkip` 2.5 mm, `cvitems` `nosep`)
- AltaCV — https://github.com/liantze/AltaCV (`altacv.cls`; `\geometry[margin=2cm]`,
  `\cvsection` `\LARGE`+2 pt rule `\\[-1ex]`, `itemsep=0.25\baselineskip`)
- Deedy Resume — https://github.com/deedy/Deedy-Resume
  (`OpenFonts/deedy-resume-openfont.cls`; `hmargin=1.25cm, vmargin=0.75cm`,
  `tightemize` `itemsep1pt`, zero `titlespacing`)

**Career-centre norms (declared, not pixel-measured):**
- MIT CAPD — https://capd.mit.edu/resources/resumes/ (0.5 in floor, 10–12 pt)
- Georgia Tech Career Center Guide —
  https://bpb-us-e1.wpmucdn.com/sites.gatech.edu/dist/c/3073/files/2024/02/Career_Center_Resume_Guide-645d43267633e4df.pdf
  and GT 1000 —
  https://sites.gatech.edu/gt1000-textbook/career-development/resumes-linkedin-and-more/resume-appearance-and-organization/
- Harvard FAS MCS — https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/
- Imperial College postdoc tipsheet —
  https://www.imperial.ac.uk/media/imperial-college/administration-and-support-services/staff-development/public/postdocs/tipsheets/Academic-CVs-v2019.pdf
- Typography bands (line height 1.2–1.45, 9 pt small-type floor, tracking limits):
  Butterick, *Practical Typography* — https://practicaltypography.com/line-spacing.html ,
  https://practicaltypography.com/point-size.html ,
  https://practicaltypography.com/letterspacing.html
- ATS parse failure causes: Greenhouse —
  https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse ;
  Workable — https://resources.workable.com/stories-and-insights/how-ATS-reads-resumes

**In-repo:** `src/features/resume-editor/typst_templates/sections.typ` (spacing scale,
leading mapping, gap routing), `src/lib/layout/density.ts` (presets),
`packages/types/src/schemas.ts` (`MARGIN_DEFAULTS`, `MARGIN_BAND`),
`src/lib/layout/page-fit.ts` (fill metric), `docs/research/template-research.md`,
`docs/research/page-fit-readability.md`.

**Unverified at research time:** cv.jakeev.org (unreachable), resumake.io template
geometry (generator source retired from the public repo), per-sample pixel measurements
of career-centre PDFs (browser PDF rendering was unreliable; norms cited instead).
