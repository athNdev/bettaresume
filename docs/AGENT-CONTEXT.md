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
| `npm run build` | required |
| `npm run check` (biome) | 84 errors / 250 warnings — **not** gated |
| tests | **none exist** — no runner, no `test` script |

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
| `Resume.variationType` / `baseResumeId` | columns exist, **no FK**, no procedures to traverse or sync |
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

Do not build `[EDIT]`, `[IO] import`, or `[DATA]` content library before the ADR
lands.
