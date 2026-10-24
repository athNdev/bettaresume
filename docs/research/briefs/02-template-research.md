# Brief: Resume template & typography research

You are a resume-formatting researcher. Do NOT modify any code. Your only output is ONE markdown file: `docs/research/template-research.md`.

## Why

Current templates are lack-luster: arbitrary formatting, massive space inefficiency, tacky font colors and section background colors. Resumes must fit a lot of information into one A4/Letter page while staying readable and not "busy". We are rebuilding the template range from scratch and want it grounded in credible sources, not invented taste.

## Repo context

`C:\research_learning_new\bettaresume` — resume builder. Templates are Typst sources at `src/features/resume-editor/typst_templates/` (`minimal.typ`, `postgrad.typ`, `undergrad.typ`, shared `sections.typ`). Settings live in `ResumeSettings` (fontFamily, fontSize, fontScale, typography scale, lineHeight, margins, sectionSpacing, colors, dateFormat, accentStyle). Read `CLAUDE.md`, `docs/AGENT-CONTEXT.md`, `docs/UI-FEATURE-PASS.md` first.

## Research — cite sources

- **University career centers** with published resume guides: Harvard, MIT, Stanford, CMU, Cornell, Michigan, Georgia Tech, Imperial College, Toronto, Melbourne.
- **Hiring agencies / recruiters**: Robert Half, Michael Page, Hays, Indeed employer guidance, LinkedIn's own guidance, Workable, Greenhouse, Lever.
- **ATS guidance**: what parsing engines (Taleo/Greenhouse/Lever/Workday parsers, Affinda, RChilli) actually need — standard section headings, single column, no tables or text boxes, no headers/footers for content, readable font sizes, standard date formats.
- **Typography for print at resume scale**: serif vs sans for resumes, accepted body-size band, line-height ratios for dense documents, heading hierarchy without size inflation, tracking/letter-spacing for small-caps labels.
- **Whitespace & density norms**: margins used by published guides, section spacing vs entry spacing, hanging indents for bullets, how much whitespace one page can afford.
- **Color**: what is accepted by industry (finance/consulting/academia vs design/tech), and why coloured section backgrounds and coloured body text are widely advised against.
- **Length norms**: one page under ~10 years experience, two pages for senior/academic — cite who says this.

## Deliverable structure

1. What the credible sources actually agree on — with citations and specific numbers (font sizes, margins, line heights, spacing).
2. Where they disagree, and how to resolve it for a product.
3. A recommended canonical typographic scale for resume documents — name/heading/body/label sizes in pt, line heights, weights, and safe font families with metric-compatible fallbacks.
4. A recommended spacing system for resume documents — a small scale in pt (e.g. 2/3/4/6/8/10/12/16) and where each is used (between entries, between sections, above headings, inside a bullet block).
5. Section heading conventions — wording parsers recognise, and safe visual treatment (uppercase, small caps, rule, weight).
6. What to delete, explicitly: tacky coloured headings, section background fills, icons in headings, photos, decorative rules, multi-column, text boxes — with the reason each is advised against.
7. Template archetypes worth building, grounded in the sources. Propose 5–7 (e.g. "Academic CV", "Compact one-page", "Standard professional", "Technical/engineering", "Executive summary-first", "Graduate/entry"). For each: who it is for, what the layout does, exact type and spacing treatment. Differentiate by structure and density, NOT by decorative colour.
8. Open questions for the maintainer.

Be concrete and cite URLs. This is the evidence base for the template rebuild.
