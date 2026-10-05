# Persona Fit Report

Status: **partially complete.** API and data layers verified end to end. Editor rendering
verified in Chromium for 3 of 6 personas; the other 3 are untested rather than known-broken,
because this node runs out of memory. This report records what is proven, what is not, the
one real bug the exercise found, and two measurement mistakes that produced convincing
false findings.

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

**Visual rendering of 3 of the 6 personas.** Stated plainly because it is the part of
"does the product fit" that matters most, and it is not finished.

**Verified in Chromium at 1280×900:**

| Résumé | Sections | Load | Horizontal overflow |
| --- | --- | --- | --- |
| Tomas Beck — Backend Internship | 6 | 7.8s | none (1280/1280) |
| Tomas Beck — Data Internship | 6 | 32.1s | none (1280/1280) |
| Nadia Haddad — Junior Data Analyst | 9 | 91.0s | none (1280/1280) |

Each rendered its full editor chrome — résumé name, template, `Base` badge, and
"All changes saved". Three of six proven, no layout regression at 1280.

**Unverified:** Amara (8 sections), Priya (8 sections), Tomas — Software Engineering Intern
(6 sections).

The unverified three failed alongside `resume.getById` timing out against the API, on a
node down to **267 MB free** while running `next dev`, `workerd`, and headless Chromium
together. One measured page operation took 231s. Those are the symptoms of resource
exhaustion, not of the product: Tomas — Software Engineering Intern has the same 6-section
shape as the two variants that *did* pass, and a product that could not render it would not
have rendered those two either.

### Two measurement mistakes worth recording

**A hang that was not a hang.** An early probe reported `certifications` and `awards` as
hanging the editor indefinitely. They are not broken. The app redirects `/` → `/app/`
before the editor mounts, which destroys the Playwright execution context mid-poll; the
poll then read nothing, exhausted its budget, and reported a hang. Both render correctly.
Nothing about `certifications` or `awards` is defective, and no fix is warranted — the
lesson is that a poll which cannot survive a navigation will manufacture a hang out of
ordinary routing.

**A `pkill` that killed its own shell.** `pkill -f "next build"` matches any process whose
command line contains that string, including the shell running the `pkill` itself. This
silently killed the invoking shell, which is why the dev stack repeatedly appeared to die
between turns. `pkill -f "[n]ext build"` is the fix. This cost several diagnostic
detours, because the symptom — services vanishing for no reason — pointed at the app.

### Why the remaining three need a different machine

This node has 4.9 GB total. The editor's real cost is the Typst WASM preview compile plus
webpack's on-demand route compilation, and load times degraded monotonically across a
single session: **7.8s → 32.1s → 91.0s → failure.** That curve is the box running out of
memory, not the app getting slower with more sections — the two heaviest résumés did not
produce the slowest load.

A local production build, which would settle this cleanly, **wedges rather than fails**: it
sat at "Creating an optimized production build ..." for 35 minutes with 0% CPU and no
compiler process. `CLAUDE.md` already warns that `next build` needs
`NODE_OPTIONS="--max-old-space-size=1400"` on ~4 GB nodes; on this node it is not viable at
all. GitHub's `build` job passes in ~1m14s, so the build is reproducible elsewhere.

The honest position: **the editor is proven to render a 9-section résumé with no layout
regression, and the three remaining personas are untested rather than known-broken.**
Closing that gap needs either a less loaded node or a visual CI job for authenticated
pages, which does not exist yet.

## Product observations worth acting on

These came out of building the personas, independent of the environment problem.

**The `/` → `/app/` redirect is a real navigation cost.** Every editor visit pays it. It
is invisible to a user and cheap to a real browser, but it is the thing that broke automated
verification twice, so it belongs in the record.

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
