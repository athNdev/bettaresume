# Persona Fit Report

Status: **API and data layers verified end to end; all six personas render in Chromium with
no layout regression.** One real bug was found and fixed. Two measurement mistakes produced
convincing false findings and are recorded, because both would otherwise have shipped as
"fixes" to code that was never broken. The one remaining gap is that all browser evidence is
webpack dev mode — nobody has rendered these personas against a production bundle.

The four personas themselves are in [`USER-STORIES.md`](./USER-STORIES.md). This document
covers whether the product can actually carry them.

## Method

Rather than hand-writing fixtures, the personas were pushed through the **real tRPC API**
against the local Worker, then read back and compared against what was sent. A résumé that
the database accepts is not the same as a résumé a user can work with, so the round trip is
the first gate, not the last.

Builder: `/home/prox/agent_setup/verify/build-persona-resumes.mjs` — outside the repo,
deliberately, since it is dogfooding tooling rather than shipped code.

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

## Verified in the browser

**All six personas render in Chromium at 1280×900 with no horizontal overflow.**

| Résumé | Sections | Template | Load | Overflow |
| --- | --- | --- | --- | --- |
| Tomas Beck — Backend Internship | 6 | `undergrad` | 7.8s | none (1280/1280) |
| Tomas Beck — Data Internship | 6 | `undergrad` | 32.1s | none (1280/1280) |
| Nadia Haddad — Junior Data Analyst | 9 | `minimal` | 91.0s | none (1280/1280) |
| Amara Okafor — Senior Platform Engineer | 8 | `minimal` | 104.0s | none (1280/1280) |
| Priya Raghunathan — Computational Biology | 8 | `postgrad` | 8.1s | none (1280/1280) |
| Tomas Beck — Software Engineering Intern | 6 | `undergrad` | 57.5s | none (1280/1280) |

Each rendered its full editor chrome — résumé name, template, `Base`/`variation` badge, and
"All changes saved". Section counts in the table were read back from the API, not inferred
from the render, so the render and the data are independently confirmed to agree.

Load times are **not** a signal about section count. The two heaviest résumés (9 and 8
sections) were not the slowest, and the fastest 8-section load came *after* the two slowest
runs — the spread tracks how warm the webpack route cache was, not how much data was in the
résumé.

### What the earlier failures actually were

Three of these six first appeared to hang. All three passed once the box had nothing else
competing for memory — before verification the node was down to **267 MB free** with
`next dev`, `workerd`, and headless Chromium all resident, and one measured page operation
took 231s. Killing the competing processes and re-running was sufficient; no code changed.

Two measurement mistakes produced convincing false findings, and both are worth keeping:

**A hang that was not a hang.** An early probe reported `certifications` and `awards` as
hanging the editor indefinitely. They are not broken. The app redirects `/` → `/app/` before
the editor mounts, which destroys the Playwright execution context mid-poll; the poll read
nothing, exhausted its budget, and reported a hang. Both render correctly. **No fix was
made, because there was nothing to fix.** The lesson is that a poll which cannot survive a
navigation will manufacture a hang out of ordinary routing — and navigating straight to
`/app/#/resume-editor/<id>` removes it entirely.

**A `pkill` that killed its own shell.** `pkill -f "next build"` matches any process whose
command line contains that string, including the shell running the `pkill` itself. That
silently killed the invoking shell, which is why the dev stack repeatedly appeared to die
between turns for no reason. `pkill -f "[n]ext build"` is the fix. This cost several
detours because the symptom pointed at the app.

### Not verifiable on this node

A **local production build wedges rather than fails**: it sat at "Creating an optimized
production build ..." for 35 minutes with 0% CPU and no compiler process. `CLAUDE.md` already
warns that `next build` needs `NODE_OPTIONS="--max-old-space-size=1400"` on ~4 GB nodes; on
this node it is not viable. GitHub's `build` job passes in ~1m14s, so the build is
reproducible elsewhere.

That leaves one genuine gap: **all browser evidence above is webpack dev mode.** Nobody has
rendered these personas against a production bundle. Closing it needs either a less loaded
node or a visual CI job for authenticated pages, which does not exist yet.

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

The harness lives **outside this repo**, at `/home/prox/agent_setup/verify/` — deliberately,
since it is dogfooding tooling rather than shipped code. Paths are absolute because a
repo-relative `agent_setup/...` does not resolve.

```sh
# Bring up the stack and wait for both to answer health checks
/home/prox/agent_setup/verify/orchestrate.sh          # wrangler :4000 + next dev :3000

# Build the six resumes, then read them back through the API
node /home/prox/agent_setup/verify/build-persona-resumes.mjs
node /home/prox/agent_setup/verify/verify-personas.mjs

# Verify rendering; ONLY filters by resume-name substring
ONLY="Amara,Priya" node /home/prox/agent_setup/verify/verify-all.mjs

# Re-running the builder duplicates rows rather than mutating them
node /home/prox/agent_setup/verify/dedupe-personas.mjs
```

If the box has other work resident, free it first: on a 4.9 GB node these renders degrade
from seconds to failure purely on memory pressure. See `CLAUDE.md` for the `next build` heap
cap, and note that on this node a production build wedges rather than failing.

Both requests need the dev-mode headers; mutations are POST with a JSON body, queries are
GET. A POST that puts its input only in `?input=` returns
`400 "Unexpected end of JSON input"`, which reads like a server fault and is not one.

Navigate to `/app/#/resume-editor/<id>`, not `/#/resume-editor/<id>`: the redirect from `/`
destroys a Playwright execution context mid-poll and will be misread as a hang.

Progress and the open gaps are tracked in
[`PERSONA-DOGFOODING-STATUS.md`](./PERSONA-DOGFOODING-STATUS.md).
