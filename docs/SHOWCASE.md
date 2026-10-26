# The showcase resume

One seeded resume that is supposed to look like a finished document, and to use every
feature the app ships. It exists so a new feature can be looked at in a realistic
document instead of a fixture, and so "what does a complete resume look like here?" has
an answer in the product.

**Priya Raman is a fictional persona.** The employers, dates, metrics, publications and
referees are invented. Nothing in the showcase describes a real person. The seed says so
at the top of the block, and `api/test/showcase.test.ts` asserts that it does.

## Where it lives

The data is in **`api/src/db/showcase.json`** — one fixture, two consumers:

| Consumer | How it uses the fixture |
|---|---|
| `api/src/db/seed.sql` (local dev) | the showcase section of the file is **generated** from the JSON by `npm run showcase:render` |
| `user.upsert` (first sign-in) | inserts the same rows, ids prefixed with the user id (`api/src/db/showcase.ts`) |

`api/test/showcase-seed.test.ts` fails when the generated SQL block is stale, and also
compiles both paths and asserts they materialise the same rows. That is what stops the
two copies drifting; two hand-written copies would keep passing the fixture tests while
new users received an older document.

In the seeded dev database the rows are owned by `user-1`:

| Record | Key | What it is |
|---|---|---|
| One-pager | `showcase-base` | `compact` template, page target 1, seven visible sections, one page |
| Full CV | `showcase-variant` | `academic` template, page target 2, eleven visible sections, two pages, a variation of the one-pager |

(The dev seed uses the global prefix `showcase-`; a real user's copy is
`<userId>-showcase-base`, so two accounts in one database cannot collide.)

Both carry the tag **`showcase`**. That tag is the UI contract: `src/lib/showcase.ts`
exports `SHOWCASE_TAG`, `isShowcase()` and `findShowcase()`, and the dashboard badge,
the dashboard banner and the empty-state button all key off it rather than off an id.
Re-seeding with different ids cannot break the entry point.

The names also start with `Showcase —` so the record is obvious in a list even without
the badge.

## What it exercises

| Feature | Where |
|---|---|
| All 13 section types | Both documents carry all thirteen in their JSON; the one-pager hides six, the full CV hides two (volunteer and references, supplied on request) |
| Rich-text marks | Summary (bold, italic, link) and the custom section's bullet list (bold, italic, link) store a ProseMirror `content.json`, so the marks reach the PDF |
| Content library | `showcase-item-projects` is placed in both resumes. The base placement is identical to the master; the full CV's placement has been tailored, which is what `content.divergence` reports. `showcase-item-skills` is deliberately unplaced, so the additions panel has something to offer |
| Variants | The full CV is a variation with seven linked sections and six taken over (summary, experience, education, skills, projects, custom) |
| Revision history | Six snapshots on the one-pager: three automatic (`label` null) and three named, and two on the full CV. The newest one-pager snapshot is byte-identical to the live document, so History reads "No differences" rather than inventing a diff |
| Job target | A staff platform role with nine keywords on the one-pager; a principal payments role on the full CV. The match panel scores against these live |
| Layout flags | `keepTogether: "always"` and a per-entry `entries` override on experience; `keepSectionTogether` on languages; `pageBreakBefore` on the full CV's publications; per-section `spacing` overrides on awards (and on education in the full CV) |
| Page target | 1 on the one-pager, 2 on the full CV |
| Two templates | `compact` (dense one-pager) and `academic` (two-page CV) |
| Export history | One PDF export recorded in each document's metadata |

The one-pager hides certifications, awards, publications, volunteer, references and the
custom "Writing & Speaking" section. That is a layout decision, not a coverage gap:
all thirteen sections plus two roles cannot fit one page at a readable density. The full CV
shows certifications, awards, publications and the custom section, so each of those has a
visible example somewhere. Volunteer and references are hidden in both documents — they
are supplied on request — but they still exist in the JSON, still validate, and the hidden
referee exercises `isHidden`. The hidden sections are also the seeded example of the
visibility toggle.

### What it deliberately does not exercise

- **`layout.columns`, `layout.alignment`, `layout.showDivider`.** These fields are still
  in `sectionLayoutSchema`, but no serializer or template reads them. Adding them to the
  seed would look like coverage and prove nothing, so the showcase test excludes exactly
  these three and fails on any *new* layout key.
- **`metadata.atsScore`.** A stored ATS result would be a stale verdict in a document
  meant to demonstrate live behaviour, and a single headline score is the one thing the
  product refuses to show. The job target is seeded instead and the panel computes.
- **Marketing copy.** `test/marketing-claims.test.ts` is pinned and owned by a later
  wave. The showcase changes no marketing strings.

## Every user gets a copy on first sign-in

The landing page says "view the example", so an account that has never had one would
make that a sentence about the dev seed. `user.upsert` therefore inserts the fixture in
the branch that **creates** the user — in one D1 `batch`, together with the user row, so a
first sign-in cannot leave a half-seeded account.

The decisions, because they are the ones a future change would get wrong:

| Question | Answer | Why |
|---|---|---|
| Created once? | **Yes**, on the first sign-in only | `user.upsert` runs on every sign-in. Seeding outside the create branch would resurrect a deleted example on the next visit — a delete button that undoes itself. |
| Can the user delete it? | **Yes**, it is an ordinary resume | A `protected` flag would have to be honoured by every mutation, and its revision history already makes it restore-able. Protection is surface area for a fixture. |
| Does it come back? | **No** | See above. If the seed fails it is logged and the account is created anyway — an unavailable example is a missing feature, an unavailable account is a broken product. |

The dashboard badge, the banner and the empty-state button key off the `showcase` **tag**,
not an id, so a per-user copy works without changing the UI contract.

## Editable, not protected

The showcase is **editable**, and that is deliberate (the full CV is a variation, so it is
editable the same way):

- The point is to review new features by *using* them, which means editing the document.
  A read-only record would need a second, differently-shaped fixture for anything that
  writes.
- Its revision history is the restore path. The newest snapshot is the current document,
  so one click in Review → History puts it back after an experiment.
- It is re-seedable. `npm run db:reset-seed` recreates the whole local database,
  showcase included, from `api/src/db/seed.sql`.

Protecting it would mean adding a `protected` flag to the schema and teaching every
mutation to honour it — real surface area for a fixture that already has two recovery
paths. If someone deletes it, re-seeding (for the dev user) or the builder in
`api/src/db/showcase.ts` (for a real user) brings it back.

## Re-seeding

```bash
npm run db:reset-seed
```

That applies every migration and re-runs the seed. Note that `npm test -w api` wipes the
local D1 database (`migration-portability.test.ts` does it by design), so re-seed after
the API suite or the dashboard will look empty.

Seeding alone, without resetting, also works: the seed deletes the existing rows first.

## The rule for updating it when a feature ships

When a feature lands, **the showcase is part of the definition of done**, in this order:

1. Add the content, setting, flag or record to **`api/src/db/showcase.json`**. Keep it
   realistic: invented metrics, action verbs, no duty phrasing, one date format
   throughout. Ids are the part after the prefix (`base`, `base-personal`, …); ids
   *inside* `content` and `metadata` are opaque and are not rewritten.
2. Regenerate the SQL the dev seed uses:

   ```bash
   npm run showcase:render
   ```

   Do not hand-edit the block in `seed.sql`; `api/test/showcase-seed.test.ts` fails when
   it disagrees with the JSON.
3. If it is a new section type, setting or layout flag, the showcase test fails with a
   message naming it. That failure is the reminder.
4. Update the table in this file.
5. Re-seed (`npm run db:reset-seed`) and look at the document. The showcase is a review
   fixture; a screenshot nobody opened is not a review.

`api/test/showcase.test.ts` derives its expectations from the schemas rather than a
hand-written list:

- every option in `sectionTypeSchema` must appear in both resumes
- every key in `resumeSettingsSchema` must be present in both settings objects
- every flag in `sectionLayoutSchema` (minus the three legacy fields above) must be used
- one content-library placement must match its master and one must diverge
- one library item must be unplaced
- the variation must have both linked and detached sections
- the history must have at least two automatic snapshots and at least two named versions
- the newest snapshot must match the live document
- the summary must carry bold, italic and link marks, and the custom section must carry
  them in a bullet list
- the base must be `compact` with page target 1, the variation `academic` with page
  target 2

That is what makes this a fixture rather than a snapshot that rots.

## Entry points

- **Populated dashboard**: a banner above the resume grid, "View the example", which
  opens the one-pager. The two showcase cards are also the first two in the grid and
  carry a `Showcase` badge.
- **Empty state**: the same action, rendered when the example is in the library. An empty
  library has no example to open, so the button is absent rather than inert.
- **Editor**: the subtitle reads `Showcase · <domain> · <template>` so the document is
  identifiable while you are editing it.
- **Card badge**: a `Showcase` badge on the resume card, driven by the tag.
