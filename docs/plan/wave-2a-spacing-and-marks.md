# Wave 2A — Document spacing scale + mark-preserving serialiser

You are a senior engineer. Real production change: branch, PR, green CI, merge.

## Read first
- `CLAUDE.md`, `docs/AGENT-CONTEXT.md`, `docs/plan/00-conventions.md`
- `docs/research/template-research.md` — Part 4 (spacing system) is your spec
- `docs/research/editor-renderer.md` — §5 "If Typst stays: the features to adopt", and the mark-preservation finding
- `docs/plan/wave-1a-document-typography.md` — what Wave 1 already did to the type scale

## Your surface (do not touch anything else)

```
src/features/resume-editor/typst_templates/*.typ
src/lib/typst/serialize.ts
src/lib/export/text.ts
src/lib/export/docx.ts
src/lib/rich-text.ts
packages/types/src/*
test/typst-*.test.ts
test/export-*.test.ts
test/rich-text*.test.ts
```

**Do not touch** `src/features/resume-editor/**` (except `typst_templates/`), `src/features/dashboard/**`, `src/components/**`, `src/styles/`, `src/app/` — three other agents are working there concurrently.

## Task 1 — The document spacing scale

Research Part 4 gives `2/3/4/6/8/12/16pt`. Apply it:

| use | value |
|---|---|
| between bullets | 3pt |
| heading → content | 4pt |
| between entries | 6pt |
| above a section heading | 8–12pt, chosen by `sectionSpacing` (compact 8, normal 10, relaxed 12) |
| header → body | 16pt |

Delete the `spacing-val` switch and every scattered `v(...)` literal in `sections.typ`, `minimal.typ`, `postgrad.typ`, `undergrad.typ`. Every vertical space must be one of the named scale values.

**Also**: the research found per-template leading factors (0.45/0.5/0.55em) diverging between templates and the HTML preview. Unify: one mapping `leading = lineHeight * 0.5em` (or whatever the correct single mapping is — read `preview.tsx` and `sections.typ` and make them agree). This is a real bug: the preview and the PDF disagree on line spacing.

## Task 2 — Mark-preserving serialiser

The research found this: TipTap offers **bold, italic, underline, strikethrough, highlight, colour, links, alignment**, and `src/lib/typst/serialize.ts` flattens every one to a plain string. **No export carries a single mark today.** The user can format text in the editor and it silently vanishes from the PDF.

Fix it end to end:

1. **Read the marks from the stored ProseMirror JSON** (`content.json`, written by the editor — see `src/components/rich-text-editor/stored-content.ts` and `packages/types` `SectionContent.json`). Falls back to `content.html` for legacy/imported content.
2. **Emit Typst markup** for the marks you can: `#strong[]`, `#emph[]`, `#underline[]`, `#strike[]`, `#link(url)[text]`. Everything else (colour, highlight, alignment) must be **dropped deliberately and documented** — or mapped to something defensible. Do not invent typography.
3. **Escaping matters.** Typst markup characters (`#`, `[`, `]`, `@`, `$`, `_`, `*`, `` ` ``, `<`, `>`, `\`, `~`) in user text must be escaped. There is a known escape-sequence item that was fixed once before — see `docs/AGENT-CONTEXT.md` and `src/lib/typst/serialize.ts` for how. Do not regress it. Add a test that a bullet containing `#strong[]` literally appears as text.
4. **DOCX and plain-text export** must preserve the same marks. `docx.ts` writes WordprocessingML directly — add `<w:b/>`, `<w:i/>`, `<w:u/>`, `<w:strike/>`, `<w:hyperlink>`. `text.ts` mirrors the template's own layout — decide how marks appear in plain text and document it (e.g. `**bold**`, `_italic_`, or nothing). Be consistent and say why.
5. **The rich-text editor already stores JSON** — you do not need to change it. But read `src/components/rich-text-editor/rich-text-editor.tsx` to see exactly what it emits.

## Task 3 — Tests

- A round-trip test: content with every supported mark → Typst source → compiled PDF → extracted text, asserting the text survives (and, where testable, that the mark is present in the Typst source).
- A DOCX test asserting the mark XML appears.
- An escaping test with adversarial text.
- `test/typst-compile.test.ts` and `test/template-gallery.test.ts` must still pass.

## Hard constraints
- **Single-column reading order is a guarantee.** Do not change document flow.
- Every template must still compile and pass the text-layer test.
- `test/marketing-claims.test.ts` pins "Three templates". Do not change the template count.
- Biome baseline 0. `npx biome check .` must report 0 findings.
- After touching any `.typ`, run `npm run templates:render` — `test/template-gallery.test.ts` fails if the committed SVGs are stale.
- `npm test -w api` wipes local D1. Re-seed with `npm run db:reset-seed` after.

## Verify
```
npm run build:types && npm run typecheck && npm run typecheck -w api
npx vitest run && npx biome check . && npm run build
npm run templates:render
node scripts/probe-start.cjs api web && npm run db:reset-seed
node scripts/probe/full-pass.cjs && node scripts/probe/export.cjs
```

## Deliverable in your reply
1. The spacing scale as implemented (the actual `v(...)` values and where they are used).
2. The leading fix: what diverged and what the single mapping is now.
3. Which marks survive export and which are dropped, per format (PDF / DOCX / plain text).
4. The escaping approach and the adversarial test.
5. Test results, and anything out of scope.
