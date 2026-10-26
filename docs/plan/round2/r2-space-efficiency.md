# R2 — Resume space efficiency: the real density envelope

You are a resume-layout researcher. Your only output: `docs/research/space-efficiency.md`.

## The problem

The maintainer says: *"The default resume design and templates is still quite lack luster, massive space wastage even after applying space recommendations."*

A previous pass set margins to 0.69in sides / 0.60in top-bottom, body 10.5pt, and a spacing scale of 2/3/4/6/8/12/16pt. Those came from **university career-centre guides**, which describe a *comfortable* document — not an *efficient* one. The result: content that should fit one page spills to two, and the page looks half empty at the same time.

## What to research

### 1. Measure real, working one-page resumes
Find and analyse **actual published one-page resume PDFs** — from university career-centre samples, recruiter-published examples, professional resume writers' portfolios, and resume-template marketplaces (LaTeX templates on Overleaf, Jake's Resume, the "Awesome CV" set, resumake, cv.jakeev.org).

For each, **measure**:
- actual margins (in inches/mm)
- body text size (pt) and line height
- the number of lines per page and the characters per line
- section heading treatment and how much vertical space it costs
- entry gap vs bullet gap vs section gap
- how much of the page is content vs whitespace (the *fill ratio*)
- how many entries and bullets fit on one page

### 2. Derive the density envelope
From the measurements, produce:
- **A tight profile** (the most content that still reads well) — exact numbers
- **A balanced profile** (the current default should probably become this)
- **A relaxed profile** (for someone who has one page to spare)
- The **fill ratio** target for each (e.g. 78% / 70% / 60% of the printable area)

### 3. Where the space actually goes
Audit the current templates in `src/features/resume-editor/typst_templates/` and compute, for a realistic resume, how many millimetres each of these costs:
- the header block
- section heading rows (including any rule/divider)
- the gap above/below each section
- the gap between entries
- the gap between bullets
- trailing whitespace at the bottom of page 1

**Identify the specific waste.** The maintainer says "massive space wastage" — find it and name it in millimetres. Look especially at: heading rules/dividers, the space a heading occupies for the information it carries, double-spaced bullet blocks, and margins that were set for comfort rather than fit.

### 4. Techniques that buy space without hurting readability
Research and quantify:
- hanging indents for bullets vs stacked
- date alignment strategy (inline vs right column) and its space cost
- section heading treatment: uppercase row vs small caps inline vs rule-and-word — how much does each cost vertically?
- combining sections (e.g. "Skills" as inline lines rather than a block)
- the header: one line vs three, and what a professional header actually contains
- widow/orphan control and its cost
- two-column *within* an entry (dates on the right) vs full-width

### 5. The trade-off curve
Produce a table: for each lever (margins -10%, body -0.5pt, line-height -0.05, entry gap -1pt, bullet gap -1pt, heading rule removed, header compressed), **how many mm it buys on a one-page resume**, and **what it costs in readability**.

## Deliverable structure
1. **The measurements** — a table of 8–12 real resumes with the numbers above.
2. **The density envelope** — three profiles with exact values and fill ratios.
3. **The waste audit** — the current templates' mm-by-mm breakdown, naming the specific waste.
4. **The levers** — the trade-off table.
5. **A recommended default** — the specific settings the app should ship with, and why. It should fit a realistic 5-year engineer's resume on ONE page while still being comfortable to read.
6. **What must not change** — the constraints that protect readability and ATS parsing (body ≥10pt, single column, standard headings, printable margins).

Cite sources with URLs. This is the specification for a template rebuild.
