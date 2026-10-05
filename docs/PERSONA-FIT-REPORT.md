# Persona Fit Report

Status: **in progress** — API and data layers verified, visual rendering verification
blocked on a production build. This report records what is proven, what is not, and the
one real bug the exercise found.

The four personas themselves are in [`USER-STORIES.md`](./USER-STORIES.md). This document
covers whether the product can actually carry them.

## Method

Rather than hand-writing fixtures, the personas were pushed through the **real tRPC API**
against the local Worker, then read back and compared against what was sent. A résumé that
the database accepts is not the same as a résumé a user can work with, so the round trip is
the first gate, not the last.

Builder: `agent_setup/verify/build-persona-resumes.mjs` (outside the repo, deliberately —
it is a dogfooding tool, not shipped code).

| Persona | Résumés | Template | Sections | Distinctive load |
| --- | --- | --- | --- | --- |
| Amara Okafor — Senior Platform Engineer | 1 base | `minimal` | 8 | Employment gap, contract work, references |
| Dr. Priya Raghunathan — Computational Biology | 1 base | `postgrad` | 8 | 5 publications, grants, `custom` section |
| Tomas Beck — Student | 1 base + 2 variations | `undergrad` | 6 each | Variations for three target roles |
| Nadia Haddad — Career Changer | 1 base | `minimal` | 9 | Transferable skills, 2 experiences, no publications |

**Section-type coverage: 13 of 13.** Every type in `sectionTypeSchema` is exercised by at
least one persona — `personal-info`, `summary`, `experience`, `education`, `skills`,
`projects`, `certifications`, `awards`, `languages`, `publications`, `volunteer`,
`references`, `custom`. All three templates are in use.

## Verified

**The API accepts every persona, and returns them intact.**

- 6 résumés created (`resume.create`), each with sections written via `section.bulkUpsert`.
- All 6 read back through `resume.getById` with correct content.
- Content-level spot checks, not just row counts: Priya's 5 publications survive the round
  trip; Amara's 3 experience entries and 2 references survive; Nadia's 2 experience entries
  survive; Tomas correctly carries **0** experience entries, because a student should.
- Variation semantics are correct: `variationType` is `base` for the four base résumés and
  `variation` for both of Tomas's, with `baseResumeId` set.
- Template assignment is preserved per résumé.

**Duplicate handling behaves.** Re-running the builder produced exact duplicates rather
than mutating existing rows, which is the right failure mode for a generator and made
de-duplication a separate, explicit step (`dedupe-personas.mjs`: kept 1 per
name+variationType, deleted 6).

## Bug found: the dev bypass was read-only

**Fixed in PR #195.**

`POST /trpc/resume.create` returned 500:

```
D1_ERROR: FOREIGN KEY constraint failed: SQLITE_CONSTRAINT_FOREIGNKEY
```

The `x-dev-mode` bypass returned `userId: "user-1"` but never created the matching `User`
row. `Resume.userId` references `User.id`, so against any local D1 that had not just been
seeded, **every write failed while every read succeeded**.

This is the failure `CLAUDE.md` already documents — *"`user.upsert` must be called first
(happens on login)"* — and it is precisely the step the bypass omitted. The practical
consequence is worse than a broken dev tool: a bypass that silently cannot write looks
exactly like a working bypass, until you try to create anything.

Two reasons it was worth fixing rather than working around:

1. It blocks all local dogfooding, which is the only way to get realistic evidence about
   whether the product fits these personas.
2. The 500 body is `"Something went wrong"`, which points at the server rather than at the
   missing row. Cost real time to diagnose from the response alone.

## Not yet verified

**Visual rendering of the editor for these personas.** Stated plainly because it is the
part of "does the product fit" that matters most, and it is not done.

What is known:

- The editor route loads and renders correctly for some résumés — a 6-section student
  résumé renders in ~5s.
- Other résumés hang indefinitely at the `next/dynamic` chunk-loading fallback
  (`"Loading editor..."`, `src/app/router.tsx:19`), **before any tRPC request for the résumé
  is issued**. A probe recorded exactly one API call, `auth.verifySession`, and no
  `resume.getById`.

That last point is what makes this an environment problem rather than a data problem. The
hang happens before any section-specific code executes, so no section shape or content
value can cause it. The server itself is responsive — a direct chunk request returned in
18ms.

The most likely cause is resource exhaustion on this node: **4.9 GB total with ~226 MB free**
while running `next dev`, `wrangler dev`/`workerd`, and headless Chromium concurrently.
Repeated Chromium contexts plus webpack's on-demand compilation produce exactly this
signature — a stall before the app's own data layer runs, varying run to run, with no
console or page errors.

Honest status: **unresolved.** A production build is the only trustworthy way to separate
"the product cannot render these personas" from "this box cannot render them", and the local
build is still compiling. Until that passes, the editor's fit for dense and academic
résumés is an open question, not a finding.

## Product observations worth acting on

These came out of building the personas, independent of the environment problem.

**The section model fits the academic case well.** Priya's 8 sections — grants,
publications, awards, languages — map cleanly onto the existing types. `publications` and
`custom` were enough to express a computational biology CV without a new section type.
That is a positive signal for ADR-0001's scope: the current model is further along than the
ADR assumes.

**Variations need a better product story.** Tomas's three résumés are the most realistic
part of the set — a student applying to three different roles from one body of work — and
the data model supports it exactly. But the personas surfaced that nothing in the product
explains *why* you would fork a résumé rather than edit it. Creating a variation duplicates
every section, and there is no signal about which sections the new copy should differ in.
This is a UX gap, not a schema gap.

**`custom` has no defined contract.** Nadia's "Additional context" section and Priya's grant
section both used it, and in both cases the builder had to guess a shape. The schema accepts
any JSON, which is flexible and also means the editor has no idea what to render. Worth a
documented shape before it is used by anyone but a generator.

**Nothing enforces section ordering or completeness per persona.** A 6-section student CV
and an 8-section academic CV are both valid, and the product does not distinguish "student
with no experience yet" (correct) from "student whose experience section silently failed to
save". That gap is exactly what the round-trip check in this report had to do by hand.

## Reproduction

```sh
# API + frontend
cd api && npx wrangler dev --config wrangler.dev.jsonc   # port 4000
npx next dev --webpack                                    # port 3000

# Build the personas, then read them back
node agent_setup/verify/build-persona-resumes.mjs
node agent_setup/verify/verify-personas.mjs
```

Both requests need the dev-mode headers; mutations are POST with a JSON body, queries are
GET. A POST that puts its input only in `?input=` returns
`400 "Unexpected end of JSON input"`, which reads like a server fault and is not one.
