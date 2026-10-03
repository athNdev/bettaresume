# Agent Context — BettaResume

Written 2026-10-02 after a full audit of the frontend, backend, data model and
infra. This file captures what the code *cannot* tell you, and specifically the
things that will bite you if you don't know them. It complements `CLAUDE.md`
(which describes structure) — this describes traps, decisions and direction.

Work tracking lives on Plane: workspace `homelab`, project `BettaResume` (`BETA`),
30 issues across 8 workstreams, with build-order dependencies written into each
issue body.

---

## 1. Product direction

> "It doesn't make the resume for you, such as with straight AI generators, but
> does everything just short of that. Giving all management tools, versioning,
> variants, etc. Rich editor."

This is a **workbench**, not a generator. The differentiation is control,
provenance and a single source of truth — not better AI. Marketing copy must not
imply the product writes for you.

The capability list the direction implies: content library (type facts once),
versioning, variants with per-section linked/detached semantics, rich editor,
job tracking, import, export.

### The decision that gates the roadmap

`Section.content` currently holds **both** `data: [...]` (typed Zod schemas) and
`html` (rendered TipTap). Two owners of one field. Everything downstream guesses,
which is why `src/lib/typst/serialize.ts` is lossy.

Resolve this before building variants, custom editor nodes, or import. See
`[DATA] Decide and write the ADR` on Plane.

**Status: the ADR is written and merged** — `docs/adr/0001-content-model.md`
(#126) — but it deliberately does **not** pick. The analysis found that only the
"rich editor" capability needs free-form rich text; content library, versioning,
variants, job tracking, import, ATS text and export fidelity are all better served
by structured records. So Option B (drop TipTap) is materially cheaper and unblocks
the workbench sooner, but it contradicts an explicit product statement, so the
choice belongs to the owner. Recommendation is Option C (rich document canonical,
typed records as a derived index). **Ask before building on this.**

---

## 2. Traps

### 2.1 Caret ranges break this repo's dependencies

**Nine `@tiptap/*` deps carried six caret ranges**, resolving to six versions
(3.15.3 / 3.20.1 / 3.20.4 / 3.21.0 / 3.22.3 / 3.22.4). TipTap is a lockstep
monorepo whose peer deps pin *exact* versions, so every Dependabot PR failed with
`ERESOLVE` and the whole queue stalled.

Same disease hit Clerk: `@clerk/themes` 2.x is on `@clerk/shared` 3.x while
react/nextjs/backend are on 4.x — two copies, structurally different
`Theme`/`Appearance` types.

**Rule**

| Package class | Pinning | Why |
|---|---|---|
| Lockstep monorepos (`@tiptap/*`, `@clerk/*`) | **exact** | peer deps pin exact versions |
| Native/bundler-coupled (`next`) | **exact** | a minor can change bundler behaviour |
| Prereleases (`@myriaddreamin/typst-*`) | **exact** | `^0.7.0-rc2` silently resolves to the `0.7.0` final |
| Surface-stable but icon-volatile (`lucide-react`) | **exact** | minors have removed icons before |
| Genuine leaf deps (`zod`, `postcss`, `@types/node`) | caret | patch bumps are the point |

All of these are now pinned. **Keep them pinned.** If you need to move one, move
all of them together and verify the tree.

Verify with:

```sh
node -e 'const l=require("./package-lock.json");const v={};
for(const[k,p]of Object.entries(l.packages))if(/(^|\/)@tiptap\//.test(k)&&p.version)v[p.version]=1;
console.log(Object.keys(v))'   # must be a single version
```

### 2.2 `overrides` drift into the vulnerable range

`overrides.undici` pinned `7.24.3` — a 2024 hotfix that is now *inside* the
current advisory range (`7.0.0-7.29.0`). miniflare already declared the safe
`7.29.1`, so the override was actively forcing a vulnerable version over a good
one. Removed.

**Rule:** every override needs a reason recorded next to it, and needs reviewing
whenever an advisory lands. Overrides are code.

### 2.3 A provider in the root layout silently breaks static rendering

`ClerkAuthProvider` suspends during SSR. It lived in `src/app/layout.tsx`, which
wraps **every** route — so it gated the public marketing page too. The page
prerendered as an empty shell plus a client-side flight payload: the markup
existed, but only inside the RSC payload, invisible to any crawler that does not
run JavaScript.

**Rule:** the root layout is a provider-free document shell. The provider tree
lives in `src/app/app/layout.tsx` and only wraps the app. **If you add a provider
to the root layout, you will re-break static rendering of `/`.**

### 2.4 `output: "export"` constraints

- Metadata routes (`robots.ts`, `sitemap.ts`) need
  `export const dynamic = "force-static"` or the build fails.
- Hash routing (`#/…`) is invisible to crawlers and link previews. The public
  site lives at `/`; the SPA lives at `/app`.
- No response headers are possible on GitHub Pages, so CSP must come from a
  `<meta http-equiv>` tag or the deployment must move.

### 2.5 The dev bypass is a live production vulnerability

`api/src/trpc/context.ts:45-60` fabricates a full authenticated context when a
request carries `x-dev-mode: true`. There is **no environment gate** — no
`NODE_ENV`, no env var, no secret. `api/src/server.ts` even allow-lists the
header in CORS, and `Access-Control-Allow-Origin: *` means any website can issue
and read the request.

`auth.healthCheck` is **public** and returns `isDevMode`.

Note the frontend dev bypass (`src/app/router.tsx:25`, gated on `NODE_ENV`) is an
unrelated mechanism. `CLAUDE.md` conflates them.

Tracked as `[SEC] Gate the x-dev-mode auth bypass behind an environment check`.

### 2.6 Local builds need a heap cap on 4 GB nodes

On a node with ~4 GB RAM, `next build` dies with `Bus error (core dumped)` — the
native allocator over-commits. It is **not** a Next bug (CI runners have 16 GB
and pass).

```sh
NODE_OPTIONS="--max-old-space-size=1400" npm run build
```

### 2.7 `npm run typecheck` used to lie

It never ran. `tsconfig.json` had a `baseUrl` deprecation error that made `tsc`
bail after one diagnostic, and `next.config.js` sets
`typescript.ignoreBuildErrors: true`. Everything was hiding behind that.

Fixed in #118; CI now gates on typecheck for both workspaces. **If typecheck fails,
fix it — it is a gate, not a suggestion.**

### 2.8 Seed data violates its own Zod contract

`api/src/db/seed.sql` writes `template` values (`harvard`, `tech`, `modern`,
`professional`) that are not in `templateTypeSchema`. **Every seeded resume is
corrupt.** No DB `CHECK` catches it, and `$type<TemplateType>()` is compile-time
only — raw SQL bypasses TypeScript entirely.

### 2.9 A D1 migration that adds a foreign key will delete every section row

SQLite cannot `ALTER TABLE ... ADD CONSTRAINT`, so adding a FK to an existing column
requires rebuilding the table. `drizzle-kit` emits that as `DROP TABLE <table>` —
and `Section.resumeId` is `ON DELETE CASCADE`, so **dropping `Resume` deletes every
section row**.

`drizzle-kit` guards this with `PRAGMA foreign_keys=OFF`, but **that pragma is a
no-op inside a transaction**, and D1 may wrap migrations in one. Measured against
this schema with `better-sqlite3`:

| migration applied… | `Section` rows |
|---|---|
| outside a transaction | 2 → 2 |
| **inside a transaction** | **2 → 0** |

`PRAGMA defer_foreign_keys=ON` does **not** rescue it: `DROP TABLE` fires cascade
deletes immediately rather than deferring them.

Two more traps in the same migration:

- The rebuild's `INSERT ... SELECT` **aborts on any row violating the new
  constraint**, failing the whole deploy. `ON DELETE SET NULL` only governs
  *future* deletes; it does not repair historical rows. Repair first.
- The generated SQL also carried an **unrelated** change — `Resume.template`'s
  default flipping `'modern'` → `'minimal'`, pre-existing drift between
  `schema.ts` and the committed `0000` snapshot. Read generated migrations; do not
  trust them.

The shipped fix (`api/drizzle/0001_resume_base_resume_fk.sql`) snapshots `Section`
into the **TEMP schema** — unreachable from the main-db cascade — rebuilds, then
restores. `api/test/resume-base-fk.test.ts` fails if that is reverted to
`drizzle-kit`'s form.

**Dry-run `wrangler d1 migrations apply` against a D1 copy before production.**
In-memory SQLite tests cannot catch the transaction-wrapping question.

### 2.10 The API test harness can apply fewer migrations than production

`api/test/helpers/harness.ts` hardcoded `0000_init-schema.sql`. When `0001` added
the `baseResumeId` FK, **the constraint did not exist in the test database at
all** — so the FK tests passed vacuously. It now applies every `drizzle/*.sql` in
order.

Worse, it set `PRAGMA foreign_keys = ON` *before* migrating, and `0001` ends with
`PRAGMA foreign_keys=ON`. Enforcement was therefore coming from the migration
file, not from test control, and a test asserting "the pragma is ON" would have
passed while proving nothing. Assert the pragma, and assert it **after** migrating.

**When you add a migration, check whether the harness applies it.** A green test
that never loaded your constraint is worse than no test, because it reads as
coverage.

### 2.11 `envsubst` expands unset variables to `""`, and CORS is default-deny

`api/wrangler.jsonc` interpolates `$ALLOWED_ORIGINS`; CD fills it with `envsubst`.
The substitution step did not pass it, so `envsubst` expanded it to `""` — and
`api/src/cors.ts` denies **every** origin when the list is empty. The shipped
configuration blocked the deployed site with its own browser.

This is the worst failure shape in the repo: **no build error, no test failure,
`GET /health` still returns 200**, and the worker deploys successfully. CORS is
enforced by the browser, never by the server.

`api/test/deploy-config.test.ts` now asserts CD passes the variable. The required
GitHub Actions **repository variable** is `ALLOWED_ORIGINS` (public URL, so
`vars`, not `secrets`) — see `CLAUDE.md`.

### 2.12 The Typst escape "bug" is not a bug — stop re-fixing it

`buildMainContent` (`src/lib/typst/compiler.ts`) has been flagged repeatedly as
broken on the theory that `JSON.stringify` emits `\uXXXX` for non-ASCII while
Typst wants `\u{XXXX}`.

**That is not what `JSON.stringify` does.** It emits literal UTF-8 and escapes
only `"`, `\` and control characters — which are escaped identically in both
languages. Verified:

```
JSON.stringify({n:"José", d:"—", c:"简历"})
-> {"n":"José","d":"—","c":"简历"}          no \uXXXX anywhere
```

Accented names, em dashes, CJK, Cyrillic and Arabic pass through untouched. The
inline comment was right for the wrong reason ("both use the same escape
conventions"), which is exactly how a non-bug keeps getting re-reported.

**What is still genuinely unverified:** no document containing non-ASCII has ever
been compiled in this environment. Static analysis says it is correct; runtime
proof is missing because the Typst WASM is CDN-loaded and CI has no browser.

### 2.13 Font substitution reflows the document, so it must preserve *kind*

`src/lib/typst/fonts.ts` is the single source of truth for which families the PDF
pipeline can embed. It exists because resolution had drifted across three sites
(`compiler.ts`, `use-typst-preview.ts`, `preview.tsx`) that disagreed — the HTML
preview used the locally installed font while the preview and PDF substituted, so
**the preview was not a preview of the export**.

The rule: **a substitution must preserve the generic family.** The old table
substituted by name and mapped `Arial`, `Helvetica` and `Calibri` — all
sans-serif — to `New Computer Modern`, a serif. Changing glyph advance widths
changes line wrapping, which changes the **page count**, silently.

Metric-compatible substitutes (Tinos↔Times, Arimo↔Arial/Helvetica,
Carlito↔Calibri) would preserve page count far better than the current
substitutions. They are not wired because their `fonts.gstatic.com` paths are
content-hashed and a guessed URL silently degrades back to substitution. **Do not
add one without verifying the URL resolves.**

**Rendering is unverified in CI.** No browser, and the WASM is fetched from a CDN
at runtime, so no test here can prove a PDF's page count. Anything claiming to
have verified PDF output from a headless node has not.

### 2.14 Raw SQL seed data bypasses every schema — validate it in a test

`api/src/db/seed.sql` is raw SQL, so it bypasses `packages/types` entirely.
Nothing catches violations: `Resume.template` has **no DB `CHECK`**, and
`$type<TemplateType>()` is compile-time only.

At the time of writing **all four** seeded resumes carried a `template` outside
the union (`harvard`, `tech`, `modern`, `professional` against
`minimal | postgrad | undergrad`), and the metadata blobs predated six now-required
settings. `resume-1` had no `personalInfo` at all.

It stayed invisible because `getTemplateSource()` **falls back to `minimal`** for an
unrecognised template name — so a resume titled "Harvard Application" rendered as
Minimal with no error. A silent fallback turns data corruption into a plausible
looking demo.

`api/test/seed-integrity.test.ts` applies the real migrations plus the real seed
and asserts every row against the schemas the app enforces. **When you change a
schema, re-run it** — that is the only thing standing between a schema change and a
corrupt demo.

Also note the vocabulary trap: three places list the template union, and all three
had drifted (`CLAUDE.md`, a comment in `typst_templates/index.ts`, and the seed).
`templateTypeSchema` is the only authority.

### 2.15 A silent fallback hides corruption

Generalisation of 2.14, because it has now bitten twice in this repo:

- `getTemplateSource()` falls back to `minimal` for an unknown template.
- Font substitution silently replaced sans-serif requests with a serif (#130).

Both convert "this input is invalid" into "this output looks plausible". A
fallback is only safe when it is **loud**. If you add one, pair it with a
warning or a test that asserts the fallback is reachable only from a known-bad
state.

### 2.16 Biome caps its diagnostics — a count-based gate can be silently blind

`npx biome check .` **caps how many diagnostics it prints.** So the number it
appears to report is not the number of problems.

```
biome check .                              -> 16 locations listed
biome check --max-diagnostics=2000 .       -> 376 locations listed
biome check api/src/trpc/procedures/resume.ts -> 20 on its own
```

Those cannot all be true at once. The capped count is what a naive CI gate reads,
so a baseline pinned at the cap **cannot rise** and the gate cannot fail while
looking like protection. The lint ratchet in `ci.yml` raises the cap explicitly and
its baseline (376) sits below it; `api/test/deploy-config.test.ts` asserts both, so
it cannot silently re-saturate.

**When you assert that a gate works, make it fail.** Every gate that turned out
weaker than claimed in this repo was verified by reading it rather than by trying to
break it:

| gate | what it claimed | what it did |
|---|---|---|
| lint ratchet | fails when lint grows | saturated at the diagnostic cap, so it never could |
| audit ratchet | tolerates the dev backlog | aborted before its own comparison under `bash -e` |
| CORS allow-list | deploys the configured origin | a step-level `env:` shadowed the value and deployed `""` |

### 2.17 `resume.update` merges metadata; it does not replace it

`Resume.metadata` stores `personalInfo`, `settings`, `jobTarget`, `atsScore` and
`exportHistory` in **one TEXT column**. `updateResumeInputSchema.metadata` is
`partialResumeMetadataSchema`, so a patch is only supposed to carry the branches it
changes.

`resume.update` used to write `JSON.stringify(input.data.metadata)`, so a patch
carrying only `settings` — which is what a font or margin change sends — destroyed
the rest, including the ATS score and the export history. It now deep-merges (#139).

**The merge is recursive** because the schema nests `.partial()` three levels deep:
`settings.margins`, `settings.typography` and `settings.colors`. A shallow merge
replaces `margins` wholesale when the caller meant to change `margins.top`.

Rules: plain objects merge recursively; **arrays replace** (concatenating would
duplicate `exportHistory` on every save and make a shrink impossible); `undefined`
is ignored; explicit `null` still wipes.

If you add a branch to `resumeMetadataSchema`, it inherits this merge for free —
which is the point. Do not add a second writer.

### 2.18 Half the editor saves; the other half reported success and did not

`SyncManager.executeSyncOperation` was a stub that logged the operation and
returned. Every layer above read that as success, so **25 `queueSave` call sites in
`resume.store.ts` were silently discarded** while the sync state said `synced`. The
edit lived only in `localStorage`.

What actually persists today:

| path | persists? |
|---|---|
| `resume.update` — template, personalInfo, settings | **yes**, via `useResumeMutations` |
| `section.upsert` / `delete` / `reorder` | **yes**, via `useSectionMutations` |
| everything else routed through `syncManager.queueSave` | **no** — localStorage only |

That asymmetry is why it survived: roughly half the editor worked, so the editor
looked functional. Page management, variations, archive/restore and the store's own
section mutations do not reach the backend.

#142 made the failure visible — the stub now throws, queued operations are never
dropped, and `synced` requires an empty queue. **Sync is still not wired.** If you
are asked why a change did not persist, check this first.

### 2.19 A resolved promise is not a successful write

The general lesson, and it has now appeared four times in this repo: a stub that
returns normally is indistinguishable from a real implementation to every caller
above it.

| stub | what it looked like | what it did |
|---|---|---|
| `executeSyncOperation` | logged, returned | discarded the write, reported `synced` |
| `getTemplateSource` | fell back to `minimal` | rendered "Harvard Application" as Minimal |
| font substitution | fell back to a serif | changed the page count silently |
| `biome` ratchet | read a capped count | could not fail while appearing to gate |

**If a function cannot do its job yet, it must throw.** A `TODO` that returns
success converts a known gap into silent corruption, and the layers above are the
ones that pay for it. This is also why every fix here was verified by trying to make
it *fail*, not by reading it.

---

## 3. Architecture as it actually is

```
GitHub Pages  ──  /            static marketing page (no client JS beyond 3 scripts)
             └─  /app/#/…     the SPA; Clerk + tRPC + Zustand + TipTap

Cloudflare Worker (api.bettaresume.com)
  server.ts      CORS, /health, tRPC handler
  trpc/          context.ts (Clerk auth + D1), index.ts (procedures, errorFormatter)
  procedures/    user, resume, section, auth
  db/            Drizzle schema + seed

D1 (SQLite)     User → Resume → Section   (Section.content = JSON blob)
```

Two write paths exist, and one of them lies:

- **Real**: React tRPC hooks (`use-resume-mutations`, `use-section-mutations`)
  consumed by `resume-editor.tsx`.
- **Fictional**: `SyncManager` in `src/lib/api.ts:403-420`. Its entire tRPC
  integration is commented out, `trpcClient` is `unknown = null`, and it reports
  `status: "synced"` while only logging. The Zustand store's ~20 mutation methods
  go through it.

Several shipped controls are wired to this stub. See
`[CLEAN] Wire or remove the controls that silently do nothing`.

---

## 4. Quality gates

| Gate | Status |
|---|---|
| `npm run typecheck` (frontend) | **required in CI** (added #118) |
| `npm run typecheck -w api` | **required in CI** (added #118) |
| `npm test` (root + api) | **required in CI** (added #125/#127) — 93 tests: 24 root, 69 api |
| `npm run build` | required |
| `npm run check` (biome) | **376 diagnostics**, ratcheted in CI (baseline 376) — **not** gated |
| `dev-server` | required in CI |

`tsconfig.json` now includes `test/**`, so tests are typechecked rather than only
transpiled (#126). Before that they were never checked at all.

Coverage is **not** broad. The 93 tests cluster on the areas most recently fixed —
CORS, auth, IDOR, the FK, Typst serialisation. `computeCompleteness`, date/period
formatting, section ordering and `isSectionEmpty` still have none.

Node 22 is required (`wrangler@4` needs `>= 22`); CI and `engines` both say so.

---

## 5. Known-fictional types

These exist as TypeScript types with **no database column**. Treating them as
implemented is a common mistake.

| Type | Reality |
|---|---|
| `Section.linkedToBase` | set client-side at `resume.store.ts:663`, not serialised, lost on reload |
| `ResumePage` | entirely client-side page CRUD |
| `ActivityLog` / `ActivityAction` | 14 actions + a 15-icon component wired to `const currentActivityLog: ActivityLog[] = []` (`resume-editor.tsx:348`) |
| `Resume.variationType` | column exists, writable via `resume.create`/`update`, but **no procedure lists or traverses variants** |
| `Resume.baseResumeId` | column exists and now has a **real FK** to `Resume(id)` `ON DELETE SET NULL` (#127). Still no variant procedures, and the FK does **not** prevent a cross-tenant or self-referential pointer — SQLite lets a row satisfy its own immediate FK. |
| `Resume.tags` | JSON array in a TEXT column — unindexable |
| `Resume.metadata` | personalInfo + settings + jobTarget + atsScore + exportHistory in **one blob**, replaced wholesale on partial update |

---

## 6. Conventions worth keeping

- **Tabs** for indentation (Biome default).
- **`import type`** for type-only imports (`verbatimModuleSyntax`).
- Sorted imports; `useSortedClasses` for Tailwind class ordering.
- Every change ships as a PR. Do not push to `main`.
- Git identity: pass per-commit rather than mutating config —
  `git -c user.name="Atharv N" -c user.email="55657682+athNdev@users.noreply.github.com" commit`.
- Never commit secrets. `.gitleaks.toml` + a husky pre-commit hook enforce this.

### Adding a section type

Per `CLAUDE.md`: schema in `packages/types`, `SECTION_CONFIGS` entry, form
component, editor registration, PDF preview.

**New:** if the ADR goes to Option A, section content becomes a TipTap document,
so a section type is now also a node schema plus a JSON→Typst walker. Read
`[EDIT] Build resume-specific TipTap nodes` first.

---

## 7. Where to look next

Plane `BETA`, by workstream prefix:

| Prefix | Workstream | Start with |
|---|---|---|
| `[SEC]` | Security & data integrity | the dev bypass — 5 urgent |
| `[GATE]` | Quality gates | biome backlog, then first tests |
| `[DATA]` | Workbench data model | **the ADR** — gates most of the roadmap |
| `[EDIT]` | Rich editor & content model | blocked on the ADR |
| `[IO]` | Import & export | inactive controls, WASM pinning |
| `[CLEAN]` | Cleanup & dead surface | dead NextAuth tables, lying controls |
| `[OPS]` | Observability & ops | request IDs, D1 backups |
| `[WEB]` | Marketing site | template gallery (needs #119) |

The ADR is written and merged (#126) but **deliberately undecided** — it needs the
owner to say whether "rich editor" is load-bearing or aspirational. Only the rich
editor itself needs free-form rich text; content library, versioning, variants,
job tracking, import, ATS text and export fidelity are all better served by
structured records, and Option B (drop TipTap) is materially cheaper.

**Ask before building `[EDIT]`, `[IO] import`, or the `[DATA]` content library.**
