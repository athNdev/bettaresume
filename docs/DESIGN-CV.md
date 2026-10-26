# The design CV — a separate, not-parser-safe export target

BettaResume's core promise is that the document's text layer is single-column and its
reading order is knowable. Multi-column layouts are the largest single cause of ATS parse
failure, because a text layer produced from coordinates loses the order a parser depends
on. The six standard archetypes are therefore single-column, `preview-matches-exporter`
pins that, and the plain-text layer is built from the same document order the page uses.

The **design CV** is the one deliberate exception. It is for a document a person will read
— a portfolio copy, a PDF attached to an email, a printed handout — and it is never the
file to send through an applicant tracking system.

It is not a template. It is not a setting. It is a separate export action with a permanent
warning, and it lives outside every registry the standard picker and gallery read.

## How it is presented

`src/components/export/export-buttons.tsx` adds a **Design CV** section at the bottom of the
export menu, visually separated from PDF/DOCX/JSON/plain text. The section prints this
warning permanently, before the action is reachable:

> This layout is not parser-safe. Use the standard export for anything that goes through an
> applicant tracking system.

Choosing **Design CV (PDF)** opens a confirmation dialog that repeats the warning and names
the action `Export design CV`. The user cannot reach the export without seeing the warning
twice: once in the menu, once at the point of committing. The warning is not a tooltip and
is not dismissible.

The same section offers **Design text layer (TXT)**, labelled "Sidebar first, then main —
labelled". The standard **Plain text** item remains in the parser-safe export group and is
unchanged.

The design files are named `Name-Role-design.pdf` / `.txt`, so they cannot overwrite the
standard `Name-Role.pdf` in a downloads folder.

## The template

`src/features/resume-editor/design-export/design-column.typ` is a real two-column CV:

```
masthead (full width)      name, role, one accent rule
┌────────────┬─────────────────────────────┐
│  sidebar   │  main column                │
│  contact   │  summary                    │
│  skills    │  experience                 │
│  languages │  education / projects /     │
│  certs     │  publications / volunteer / │
│  awards    │  references / custom        │
└────────────┴─────────────────────────────┘
```

- **Type and spacing come from the existing scales.** `typo.*`, `gaps.*` and the
  `space-*` values are the same ones the six standard templates use, so
  `fontScale`, `lineHeight`, `sectionSpacing`, margins and the paper size all still move.
  There are no raw spacing literals and no second typographic vocabulary.
- **The sidebar split is data, not duplicated layout.** `resumeToDesignTypstJson` writes
  `design.sidebar` and `design.main` into the payload. The template draws those arrays and
  `buildDesignPlainText` walks the same two arrays, so the picture and the text cannot
  disagree about which column a section is in. The sidebar types are `skills`, `languages`,
  `certifications` and `awards`; everything else is main.
- **It uses `columns(2)` with a `colbreak`, not a grid.** A grid row does not reflow on a
  continuation page, so a long experience section would leave the left half of page 2
  blank. Columns fill the left column, then the right, on every page. The sidebar block is
  88% of the left column, so the visual split reads as a narrow sidebar plus a wider main
  column.
- **The design is ink, not a skin.** One accent colour for the masthead rule, section rules
  and sidebar labels; no tinted fills, no badges, no icons. It prints cleanly and the text
  below the rules stays legible.
- If there are no contact facts and no sidebar sections, the template falls back to a
  single main column rather than shipping an empty half-page.

## The text layer, and why it is labelled

The design PDF's text layer is **not** parser-safe. Typst's tagged output keeps logical
order for assistive technology, but plain extraction of a two-column flow may interleave
or reorder depending on the extractor. Rather than pretend otherwise, the design target
offers a text companion in the **visual reading order of the layout**:

1. the masthead,
2. the sidebar — contact, then sidebar sections, top to bottom,
3. the main column, top to bottom.

The file begins with:

```
DESIGN CV - VISUAL READING ORDER (NOT PARSER-SAFE)
The columns are written the way the page reads: the sidebar top to bottom, then the main column.
This layout is not parser-safe. Use the standard export for anything that goes through an applicant tracking system.
```

The words inside each section still come from `sectionLines` in `src/lib/export/text.ts`, the
same builder the standard plain-text export and the Plain Text Test use. Only the order of
sections changes. `buildPlainText` is untouched and remains the document-order, parser-safe
layer.

There is **no design DOCX**. A two-column WordprocessingML document would need a second
layout engine (Word paginates independently), and the only alternatives would be to build
that renderer or to emit the standard single-column DOCX under a design name. The target
refuses the format instead; the reason is exported as `DESIGN_DOCX_REFUSAL` so the UI, the
docs and a future change start from the same sentence.

## The guarantee is not weakened

- `templateTypeSchema` still has exactly six archetypes. `TEMPLATE_CONFIGS`,
  `TEMPLATE_SOURCES` and `getTemplateSource` do not know the design document exists.
- `design-column.typ` lives outside `src/features/resume-editor/typst_templates/`, so the
  standard-template scanner and the marketing gallery cannot see it.
- `test/design-export.test.ts` asserts the exclusion, the single-column standard templates,
  the text order and the labelled notice.
- `test/design-column-compile.test.ts` compiles both documents with the real Typst compiler
  and asserts the reversal: the standard PDF reads `SUMMARY` before `SKILLS`, and the design
  PDF reads `SKILLS` before `SUMMARY`.
- `test/preview-matches-exporter.test.ts`, `test/typst-compile.test.ts` and the existing
  text-layer tests are unchanged and still protect the standard path.

## Files

| File | Role |
|---|---|
| `src/features/resume-editor/design-export/design-column.typ` | the two-column document |
| `src/features/resume-editor/design-export/source.ts` | assembles `sections.typ` + the design template; loaded only on the design action |
| `src/features/resume-editor/design-export/index.ts` | column split, warning, design payload, visual-order text layer, DOCX refusal |
| `src/components/export/export-buttons.tsx` | menu section, warning, confirmation dialog, PDF/TXT actions |
| `src/lib/export/filename.ts` | `-design` filename qualifier |
| `test/design-export.test.ts` | exclusion + text-order + warning tests |
| `test/design-column-compile.test.ts` | real-compiler proof of both column orders |
