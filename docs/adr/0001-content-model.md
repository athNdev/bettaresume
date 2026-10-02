# ADR 0001 — Section content model: rich document, structured records, or both

- **Status:** proposed — needs an owner decision (see "What I need from you")
- **Date:** 2026-10-02
- **Affects:** `[DATA]` content library, variants, versioning · `[EDIT]` editor nodes · `[IO]` import, ATS text
- **Supersedes:** nothing. **Blocks:** 4 tickets (listed at the end)

## Context

The product direction, in the owner's words:

> "It doesn't make the resume for you, such as with straight AI generators, but
> does everything just short of that. Giving all management tools, versioning,
> variants, etc. Rich editor."

Today `Section.content` has **two owners**:

```
packages/types/src/schemas.ts  →  typed Zod schemas (experienceSchema, …) with stable per-item ids
src/components/rich-text-editor  →  a full TipTap editor writing content.html
```

Both write to the same field, and `content` carries both `data: [...]` and
`html`. Every downstream consumer has to guess which is truth. The consequences
are already visible rather than hypothetical:

- `src/lib/typst/serialize.ts` goes through HTML, so it is lossy.
- `personal-info` and `custom` were never given serialisers and exported
  **empty** — the seeded demo resume had no header at all (fixed in #125).
- `stripHtml` was declared `: string` and returned `undefined` on every call,
  hidden for months behind a `baseUrl` typecheck error.
- **There is no TipTap JSON anywhere.** `rich-text-editor.tsx:403` calls
  `editor.getHTML()`. Every ProseMirror guarantee is discarded at the boundary.

The honest question is not "rich or structured". It is **what is the single
source of truth, and what is derived from it**.

## What the value actually depends on

Checked against the capability list the direction implies:

| Capability | Needs rich text? |
|---|---|
| Content library (type facts once) | No — references |
| Versioning + diff | No — stable item ids already exist |
| Variants (linked/detached) | No — boolean join table |
| Job tracking | No — strongly wants columns |
| Import PDF/DOCX | Helps a lot — needs structure to map onto |
| Export fidelity | No — needs one source |
| ATS plain text | No — needs clean text extraction |
| **"Rich editor"** | **Yes — this is the only one** |

Only the last row needs free-form rich text. Everything else is better served by
structured records. That asymmetry is the crux.

## Options

### A — Rich document canonical

Replace `sectionContentSchema` with a TipTap-JSON schema. Store that. Define
custom nodes for the shapes resumes actually need (date range, bullet group,
skill meter). Build a mark-preserving JSON→Typst walker. Derive ATS text from the
same document.

- Makes the stated direction literally true.
- Single source, so PDF and ATS text cannot drift.
- Import maps onto a document, not onto 13 bespoke shapes.
- **Cost:** a migration of every section type; the typed schemas lose their
  status as source; ATS text extraction becomes a real problem needing its own
  work; job tracking queries still have nothing indexed.

### B — Structured records canonical

Drop TipTap. Typed fields plus textareas. Stop claiming "rich editor".

- Best for ATS, queryability, import, and reporting.
- Cheapest path to every workbench feature; nothing blocks.
- **Contradicts an explicit product statement.** The owner's call, not mine.

### C — Rich document canonical, typed records as a *derived index* (recommended)

Option A as the source of truth, plus a projection layer that extracts typed rows
(experience, education, skills, …) into queryable tables.

- Satisfies the stated direction **and** keeps job tracking fast.
- Kills the two-sources-of-truth bug **mechanically**: the index is derived, so
  it cannot drift. If it is wrong, rebuild it. That is the property that makes
  this safe where the current arrangement is not.
- **Cost:** both of A, plus the projection. Most work of the three.

## Decision

**Recommend C**, with **B as the honest fallback** if the owner decides that
"rich editor" was aspirational rather than load-bearing.

I am not going to pretend this is purely technical. Option B is materially
cheaper and unblocks the entire workbench sooner. The research supports this:
of six incumbents surveyed, only Teal implements true variant inheritance, and
the differentiator they actually sell is a content library — not rich text.

But the direction names "rich editor" explicitly, and quietly deleting an
explicit product statement is not a call an engineer should make unilaterally.

### The gate that would flip C → B

Reconsider B if, once A/C are live, fewer than a meaningful share of candidates
actually use formatting beyond bold/italic/bullets. Instrument it: if rich-text
marks beyond plain bullets are used in under ~5% of sections, the rich document
is carrying a migration cost for no observed benefit.

## What I need from you

One decision:

1. **Is "rich editor" load-bearing, or aspirational?**
   - Load-bearing → Option C. We build the document model and the index.
   - Aspirational → Option B. We drop TipTap and go straight to the workbench.

This blocks `[EDIT]` custom nodes, `[IO]` import, `[DATA]` content library, and
`[DATA]` versioning. Those are the largest remaining pieces of the roadmap, so
the cost of leaving it open keeps compounding.

## Consequences of C

- `Section.content` stops being authored by two systems. Existing rows migrate
  HTML → document once; `data[]` becomes the derivation source for the index.
- The typed Zod schemas move from *validation of stored state* to *validation of
  the projection input*. They survive, but not as source of truth.
- Custom TipTap nodes need `renderText` — TipTap auto-collects it into
  `editor.getText()`, so ATS text for a custom node is free. Worth knowing
  before designing the nodes.
- **TipTap is a lockstep monorepo.** Every `@tiptap/*` package must be the same
  exact version. Nine direct deps across six caret ranges once produced six
  versions in the tree and stalled every Dependabot PR (#118). Any new extension
  gets pinned exactly.
- TipTap's "Content Migrations" facility is **announced but not shipped** — we
  would be building it. Every attribute on a custom node needs a `default`, or
  old documents *throw* on load rather than degrading.

## Consequences of B

- Delete `src/components/rich-text-editor/`, the `html` field, and the TipTap
  dependency. That is a large deletion and a large simplification.
- Import becomes considerably easier.
- The marketing copy must stop implying free-form editing.
- `[EDIT]` custom nodes is cancelled rather than done.

## Migration, whichever way

1. Stop two systems writing the same field. Pick the winner; make the other read-only.
2. Migrate existing rows. `data[]` is already structured and id-keyed, so it is
   the lowest-risk source for a first projection.
3. Shadow-write the index from the document, compare against the live rows, and
   only then read from it.
4. Flip reads. Keep the shadow comparison for one release before deleting the old path.
5. Add a test asserting the projection is rebuildable and matches.

## References

- Plane: `[DATA] Decide and write the ADR`, `[DATA] Build the content library`,
  `[EDIT] Build resume-specific TipTap nodes`, `[IO] Ship a real import path`
- `docs/AGENT-CONTEXT.md` §1, §2.1, §5
- Research: br-arch (architecture, 2,443 lines), br-market (competitive, 1,453 lines)