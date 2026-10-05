# Persona dogfooding — progress

Last updated: 2026-10-05

## Status: complete, except two PRs waiting on your review

All six personas are built through the real API and verified rendering in Chromium.
Nothing is mid-flight. The only outstanding action is yours.

## Open PRs — both green, both blocked only on `REVIEW_REQUIRED`

| PR | Branch | What |
| --- | --- | --- |
| #195 | `fix/dev-bypass-missing-user-row` | Real bug: the dev bypass could read but not write |
| #196 | `docs/persona-fit-report` | Personas, fit report, two new context traps, 6/6 verification |

```sh
gh pr review 195 --approve
gh pr review 196 --approve
```

**Do not merge with `--admin`.** Branch protection asks for a review and GitHub rejects
self-approval, so this genuinely needs a human. Bypassing it would defeat a rule that was
deliberately configured.

## What was built

Four personas in `docs/USER-STORIES.md` → six résumés through the real tRPC API:

- Amara Okafor — senior platform engineer, employment gap, contract work — 8 sections
- Priya Raghunathan — computational biology academic — 8 sections, 5 publications
- Tomas Beck — student — 6 sections plus **two variations**
- Nadia Haddad — career changer — 9 sections

13/13 section types exercised, all three templates (`minimal`, `postgrad`, `undergrad`).

## Results

- **API:** 6/6 create and read back intact; content-level checks (publications, experience,
  references, variation semantics), not just row counts.
- **Browser:** 6/6 render at 1280×900 with no horizontal overflow. Section counts were read
  back from the API so render and data are independently confirmed to agree.
- **Bug found and fixed:** `resume.create` returned 500 `FOREIGN KEY constraint failed`
  because the `x-dev-mode` bypass returned `userId: "user-1"` without creating the matching
  `User` row. Reads worked, writes did not. PR #195.

## Three things that looked like bugs and were not

Recorded in the fit report because each would otherwise have become a "fix" to working code:

1. **`certifications` / `awards` appeared to hang the editor.** They render fine. The
   `/` → `/app/` redirect destroys Playwright's execution context mid-poll, so the poll read
   nothing and reported a hang. Navigate straight to `/app/#/resume-editor/<id>`.
2. **Three personas appeared to hang.** Resource exhaustion — 267 MB free with `next dev`,
   `workerd` and Chromium resident. Killing the competing processes fixed it; no code change.
3. **`pkill -f "next build"` killed its own shell**, because the pattern matches the invoking
   shell's command line. Use `pkill -f "[n]ext build"`. This made the stack look like it was
   crashing for no reason.

## Remaining gaps, named

1. **All browser evidence is webpack dev mode.** Nobody has rendered these personas against a
   production bundle. A local `next build` **wedges rather than fails** — 35 minutes at 0% CPU
   with no compiler process. CI passes it in ~1m14s, so closing this needs either a less loaded
   node or a visual CI job for authenticated pages, which does not exist.
2. **Owner-blocked, unchanged:** the Cloudflare API token lacks D1 scope, so production
   migrations `0001`/`0005` remain unapplied (`7403`).

## Product observations recorded, not acted on

From `docs/PERSONA-FIT-REPORT.md`, for prioritisation:

- Variations have a schema but no product story — nothing explains why you would fork a résumé
  rather than edit it, or which sections the new copy should differ in.
- `custom` has no documented shape. The schema accepts any JSON, so the editor has no idea what
  to render.
- Nothing distinguishes "student with no experience yet" from "experience silently failed to
  save" — the round-trip check in the report had to do that by hand.
- The section model is **further along than ADR-0001 assumes**: an academic CV needing grants,
  publications, awards and languages mapped onto existing types with no new section required.

## Harness

`/home/prox/agent_setup/verify/` — outside the repo on purpose, it is dogfooding tooling.

- `orchestrate.sh` — brings up wrangler + `next dev` and waits for health
- `build-persona-resumes.mjs` — creates the six résumés (idempotent only per clean DB; re-runs
  duplicate, which is why `dedupe-personas.mjs` exists)
- `verify-personas.mjs` — API round-trip check
- `verify-all.mjs` — browser verification; `ONLY="Amara,Priya"` filters by name substring
- `dedupe-personas.mjs` — keeps 1 per name+variationType