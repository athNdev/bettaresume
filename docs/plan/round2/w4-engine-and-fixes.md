# W4 — Engine upgrade, CI typography, and the unblocked decisions

You are a senior engineer. Real production change: branch, PR, green CI, merge.

## Work in your own git worktree (MANDATORY — see `docs/plan/00-conventions.md`)
```
git fetch origin
git worktree add .worktrees/w4-eng -b feat/engine-and-fixes origin/main
cd .worktrees/w4-eng
```
**Remove only your own worktree. Never `rm -rf .worktrees`.**

## Read first
- `CLAUDE.md`, `docs/AGENT-CONTEXT.md`, `docs/plan/00-conventions.md`
- `docs/research/editor-renderer.md` §7 — the typst.ts version debt

## Four items, in this order

### 1. (B3) Install the `typst` CLI for CI

`test/typst-compile.test.ts` and `test/page-breaks.test.ts` compile with the real `typst` binary and **skip silently when it is absent** — which is exactly what happens in CI. The text-layer reading-order guarantee is therefore unverified on every merge.

Add the CLI to the CI image (`.github/workflows/ci.yml`) and to the responsive/matrix job. Make the tests **fail** if the CLI is missing rather than skip — a gate that cannot fail is not a gate. Update `docs/AGENT-CONTEXT.md` with how it is installed.

### 2. (B2) Upgrade `typst.ts`

Currently pinned at `@myriaddreamin/typst.ts` `0.7.0-rc2`, which wraps Typst 0.14. The research (`docs/research/editor-renderer.md` §7) found:
- **Typst 0.14+ emits tagged PDFs by default (PDF/UA-1)** — a direct upgrade to the ATS claim we make and are not taking.
- 0.15 has variable fonts, which removes a font-instancing workaround.

Move to the newest stable `@myriaddreamin/typst.ts` / `typst-ts-web-compiler` / `typst-ts-renderer` set. The three `@myriaddreamin/*` packages must stay **exactly version-locked together** (see `docs/AGENT-CONTEXT.md` — caret ranges broke this repo once).

If the newest set is not available or breaks the in-browser preview, stay on `0.7.0-rc2`, document precisely why, and file the follow-up. **Do not break the preview.**

Then verify the PDF is actually tagged and say so: check for `/MarkInfo`, `/StructTreeRoot` or `/Lang` in the produced PDF.

### 3. (D5) Drop `personalInfo.photoUrl`

The maintainer's answer was "okay" to either. The decision, taken on evidence: `docs/research/template-research.md` §6 lists **photos among what to delete**, with the reason (advised against by every credible source; an ATS and discrimination risk; no template draws it).

Remove `photoUrl` from `PersonalInfo`, the Zod schema, the Typst serialiser, the form, the preview and the seed. Stored rows that carry it keep loading — the schema is non-strict, so the key is dropped on parse. Say so in the code.

### 4. (D7) Seed the showcase for every user

The maintainer: "yes" to seeding the showcase on first sign-in, so the landing page's "view the example" is a real promise rather than a sentence about the dev seed.

On `user.upsert` (first sign-in), create the showcase documents from the same fixture the seed uses. Make the fixture shared between `api/src/db/seed.sql` and the runtime path — one source of truth, or they will diverge.

Decide and justify: is it created **once** per user, can the user delete it, and does it come back?

## Hard constraints
- **Single-column reading order is a guarantee.** Do not break it.
- Biome baseline 0. `test/baselines/token-offenders.json` stays empty.
- `test/marketing-claims.test.ts` must still pass. Marketing copy is not yours.
- The Typst templates are another agent's surface this wave — do not change their layout or typography. An upgrade must not change rendered output; if it does, say so precisely.
- `npm test -w api` wipes local D1. Re-seed after.

## Verify
```
npm run build:types && npm run typecheck && npm run typecheck -w api
npx vitest run && npm test -w api && npx biome check . && npm run build
npm run templates:render
node scripts/probe-start.cjs api web && npm run db:reset-seed
node scripts/probe/full-pass.cjs && node scripts/probe/export.cjs
```
For item 2, compile the showcase before and after and diff the page count, the fill ratio and the extracted text. **They must not change.**

## Deliverable in your reply
1. The CI change and the proof the typst tests now run there.
2. The typst.ts version you landed on, and whether the PDF is tagged (with evidence).
3. What you removed for `photoUrl` and how stored rows behave.
4. The showcase-on-sign-in design: once, deletable, restorable?
5. Test results and anything out of scope.
