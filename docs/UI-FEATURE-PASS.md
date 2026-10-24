# UI & Feature Pass — 2026-10-24

Status: active. This is the plan and the record of what shipped from it. Each item states
the problem, the change, and the proof. Nothing here is "make it nicer".

Research: a search pass over 2026 sources on SaaS landing patterns, ATS parsing internals
(4-stage pipeline, section heuristics, keyword scoring), and the resume-review rubrics the
incumbents use (Impact / Brevity / Style / Parse-fit). Findings that changed the plan are
marked **[research]**.

---

## 1. What the research changed

**[research] The industry's grading dimensions are exactly four: Impact, Brevity, Style,
and ATS/parse compatibility.** Resume Worded, Enhancv and the newer checkers all converge
on these. We already had the raw signals (`metrics.ts`, `parse-fidelity.ts`,
`ats-match.ts`) but scattered them across three panels with no shared rubric. The plan
below puts them behind one rubric surface.

**[research] A composite score is the documented trust failure, not the feature.** The same
surveys that describe the four dimensions describe users reporting 94/100 on resumes humans
reject. The rubric stays pass/fail per named check, ranked by effort. This matches
`docs/ROADMAP.md`'s "never emit a single 0–100 number", so it is a constraint, not a taste.

**[research] The parsing rules that actually get broken are checkable, and several of ours
were not being checked:**

| Rule | Source | Was checked? |
|---|---|---|
| Standard section headings | both sources | yes (`PARSER_SAFE_HEADINGS`) |
| Single column | both | yes (templates guarantee it) |
| `Month YYYY` dates, consistent, attached to the title | both | partly (format only) |
| Bullet glyph `•` or `-` only | both | partly |
| No tables / text boxes / header-footer text | both | no — never asserted |
| Body 10–12pt, name 14–16pt, headings 11–13pt | cv4me | **no** — the toolbar lets you set 6pt |
| Plain-text test (name first, order, bullets intact) | cv4me | **no** — promised on the landing page |
| Word count 400–1600, 3–6 bullets per role | Rezi's own rule (roadmap) | no |
| File naming `Name-Role.pdf` | cv4me | no |

---

## 2. Wave 1 — Design system and motion (`better-ui`)

Principles applied: concentric radius, optical alignment, shadows for elevation and borders
for structure, interruptible animations, split/staggered entrances, subtle exits, contextual
icon cross-fades, image outlines, scale on press, theme-switch transition suppression,
exact transition properties, icon stroke matched to text weight, motion restraint.

| # | Change | Proof |
|---|---|---|
| 1.1 | Elevation tokens: layered transparent shadows instead of border-as-depth | every card/surface uses one of three documented elevations |
| 1.2 | Radius system: outer = inner + padding; fix card/input/button nesting | no `rounded-*` mismatch in a nested pair |
| 1.3 | Button: `scale(0.96)` on press with a `static` opt-out; visible focus ring (3:1) | focus ring contrast test |
| 1.4 | Icon strokes: 1.5px beside regular text, 2px beside semibold | grep-asserted per surface |
| 1.5 | Theme switch suppresses transitions, forces a reflow, restores next frame | no transition on `*` during the swap |
| 1.6 | Staggered entrances (~100ms) on infrequent staged content; exits use small `translateY` | timings read from code |
| 1.7 | State icon swaps cross-fade (opacity/scale/blur, spring 0.3 bounce 0) | both icons stay mounted |
| 1.8 | Replace `transition-all` with named properties in all 10 files | no `transition-all` remains |
| 1.9 | `prefers-reduced-motion` disables non-essential motion | media query covers every animation |
| 1.10 | Remove the unused `sonner` dependency | one toast library |

## 3. Wave 2 — Layout, surfaces, responsiveness

| # | Change | Proof |
|---|---|---|
| 2.1 | Dashboard: primary column of cards + secondary rail for filters/account; spacing rhythm | layout renders at 390/1440 with no overflow |
| 2.2 | Editor: panel proportions, form density, section outline affordances | each panel's controls reachable and named |
| 2.3 | Touch targets ≥ 40px on coarse pointers | measured in code |
| 2.4 | Dark mode audit: shadows, borders, contrast | contrast assertions for both themes |
| 2.5 | Empty/loading/error states share one primitive | single source |

## 4. Wave 3 — Grading and diagnostics

| # | Change | Proof |
|---|---|---|
| 4.1 | One rubric surface: Parse-fit, Impact, Brevity, Style — named checks, pass/fail, ranked by effort | no composite number anywhere |
| 4.2 | New checks **[research]**: typography ranges, date consistency + attachment to title, bullet glyph, word count, bullets per role, page count, repetition, contact completeness | each check has a fixture that fails it |
| 4.3 | Plain-text test panel: extracted text + the five checks + copy | matches the landing page's claim |
| 4.4 | Findings anchored to the section/item that caused them | finding → id resolution |

## 5. Wave 4 — Editor and features

| # | Change | Proof |
|---|---|---|
| 5.1 | Variants: "why fork" prompt, per-section link control in the form header, sync summary | create → tailor → sync walkthrough |
| 5.2 | Import: review gate before anything is written, on every entry point | no import bypasses review |
| 5.3 | Content library: search, type filter, one-click place into the resume | filters narrow the list |
| 5.4 | Templates: real typography samples instead of schematic bars; one new template | samples render the actual type scale |
| 5.5 | Export: `Name-Role.pdf` naming, page count in the toolbar | filename asserted |
| 5.6 | Keyboard: ⌘/Ctrl+S saves, Esc closes, focus returns to the trigger | tab-order walk |

### Wave 4 — what actually shipped, and the one deviation

5.1–5.3, 5.5 and 5.6 shipped as written. 5.6 needed no new code: Radix's dialog and
sheet primitives already supply Escape handling, focus trapping and focus return, so the
work was asserting that nothing bypasses them (`test/confirm-dialog.test.ts`). That test
found a real defect in `useConfirm`: **Escape and dismissal closed the dialog without
resolving the promise the caller was awaiting**, so `await confirm(...)` hung forever and
the action silently did nothing. Every exit now routes through one `settle()`.

**5.4 did not add a fourth template.** `test/typst-templates.test.ts` and
`test/marketing-claims.test.ts` both pin exactly three, and the marketing page says
"Three templates". A fourth is a marketing and template-authoring job — a new `.typ`
file with its own compiled-output test — not a UI-polish item, and adding a template the
marketing page does not mention would make the page wrong. The specimens are the part of
5.4 that was actually about legibility before choosing.

## 6. Wave 5 — Platform

| # | Change | Proof |
|---|---|---|
| 6.1 | OG image + metadata for the marketing page | crawler-visible |
| 6.2 | CSP `<meta>` on the marketing page | **not built** — see below |
| 6.3 | Request IDs on the API | every response carries `x-request-id` |
| 6.4 | D1 backup export scheduled | restore rehearsed |
| 6.5 | One canonical origin | canonical, sitemap, robots, OG all agree |
| 6.6 | API response hardening | every response path, asserted |

### 6.1 — what actually shipped

The card is generated at build time by `src/app/og.png/route.tsx` via `ImageResponse`, so
its words cannot drift from the page's. Two defects were found while wiring it:

1. **The canonical origin was wrong.** `https://athndev.github.io/bettaresume` was
defaulted in three files, while production is served from `app.bettaresume.com` (the
Pages hostname redirects to it). Every canonical, sitemap entry and OG URL therefore
pointed at the redirecting host — the exact duplicate-origin signal a canonical tag
exists to prevent. Now one constant in `src/lib/site.ts`.

2. **The generated file had no extension.** The file convention emits `/opengraph-image`;
GitHub Pages types extensionless files as `application/octet-stream`, and crawlers check
the extension before `og:image:type`. The card would have rendered perfectly in a browser
and never unfurled. The route directory is now named `og.png`, so the URL and the content
type agree without a post-build copy.

Also: a page that declares `openGraph` **replaces** the parent object rather than merging
into it, so the marketing page had silently lost its card when only the layout carried
one. `images` is repeated on both, from one constant.

### 6.2 — why there is no CSP

The plan called for a `<meta http-equiv="Content-Security-Policy">` on the marketing page
because GitHub Pages cannot send response headers. It is not built, deliberately:

- The page it would protect has **no user input rendered as HTML** and no inline event
  handlers. The only `dangerouslySetInnerHTML` in the product is the hash-bounce script in
  the root layout and the Typst compiler's SVG output.
- The policy would have to allow Clerk's script, a WASM compiler
  (`wasm-unsafe-eval`) and Next's inline hydration bootstrap. Getting any of those wrong
  breaks **sign-in** — a total outage in exchange for a header protecting a static page.
- There is no report-only mode to learn from: `Content-Security-Policy-Report-Only` in a
  `<meta>` tag is ignored by browsers, and this session could not drive a real browser
  against Clerk to verify the policy.

What replaced it is the hardening that *is* verifiable: the Worker sets
`X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
`Cache-Control: no-store` and `Strict-Transport-Security` on **every** response path
(`api/src/security-headers.ts`), asserted across preflight, health, 405, 404 and tRPC.
`Cache-Control: no-store` is the one with teeth: every response is scoped to one user's
Bearer token.

### 6.4 — what actually shipped

`.github/workflows/backup.yml` exports production nightly at 03:17 UTC and keeps the
artifact for 90 days. It does not merely download bytes: it **loads the export into
SQLite**, asserts the tables exist, asserts `User`/`Resume`/`Section` hold rows, and runs
`PRAGMA foreign_key_check`. A backup that cannot be restored fails the run rather than
being archived.

That rehearsal found a real trap. D1 emits `Section` before `Resume`, and `Section`'s
`INSERT`s name a parent that does not exist yet, so SQLite refuses to prepare them with
foreign-key enforcement on — `no such table: main.Resume` — even though the export opens
with `PRAGMA defer_foreign_keys=TRUE`. A restore must load with `foreign_keys=OFF` and
check integrity afterwards. `docs/BACKUP.md` records the sequence, the manual export via
the D1 API (so it does not depend on CI's config substitution), the production restore
order, and what is explicitly not covered.

### 6.3 — request ids

`cors.ts` had already listed `x-request-id` in `Access-Control-Expose-Headers`, telling
browsers they could read a header nothing sent. Every response now carries one
(`api/src/request-id.ts`), a valid inbound id is honoured so proxies and retries keep
their correlation, an unparseable one is replaced rather than reflected, and the id leads
every Worker log line for a failure so a user's quoted id finds its entry with one grep.

---

## 7. Beyond the plan — found while executing

Things that were not on the list and turned out to matter more than some of what was.

### 7.1 The export path depended on two CDNs, and one of them was already broken

`src/lib/typst/fonts.ts` pinned nine `fonts.gstatic.com` URLs. **Three returned 404 —
including both Inter files.** Inter is the default family, so every export that did not
pick another family had been silently substituting a face. That is the same defect
`[IO] Font substitution silently changing the rendered page` was meant to close: a
regression that produced a warning, not a failure.

The nine families are now vendored in `public/fonts/`. The WASM modules are copied out of
`node_modules` into `public/wasm/` before build and dev, so the 28 MB compiler no longer
comes from jsDelivr with no Subresource Integrity — and no third party learns that
somebody is exporting a resume.

**The first attempt at this was wrong and the fix is the interesting part.** Vendoring the
upstream files meant vendoring one *variable* font per family. Typst loads it and reports
the right family, so nothing looks broken — but this build does not apply the `wght` axis.
Measured, not assumed: the same word at weights 400, 700 and 900 produced byte-identical
SVG path data **and** byte-identical PDFs, while static Lato differed correctly. So the
fix would have rendered every bold heading in every export at regular weight.

Every family now ships one static file per weight, instantiated from the upstream variable
font with HarfBuzz. Montserrat comes from its own static builds because the instancer keeps
the default instance's name — "Montserrat Thin" — which Typst cannot find under
"Montserrat". `scripts/vendor-fonts.mjs` verifies each instance's `familyName` and
`usWeightClass`; `test/typst-assets.test.ts` re-checks both from disk.

### 7.2 `useConfirm` leaked a promise

Found by writing the assertion for Wave 4's "Esc closes, focus returns to the trigger".
Radix already supplies Escape handling, focus trapping and focus return, so the work was
verifying nothing bypasses it — and that verification found that `close()` set
`isOpen: false` without resolving the promise the caller was `await`ing. Escape, dismissal
and the Cancel button all took that path, so `await confirm(...)` never settled and the
action silently did nothing. Every exit now routes through one `settle()`.

### 7.3 The canonical origin named the redirecting host

Wiring the link-preview card surfaced that `https://athndev.github.io/bettaresume` was the
default in three files while production is served from `app.bettaresume.com`. Every
canonical, sitemap entry and image URL pointed at the host that redirects — precisely the
duplicate-origin signal a canonical tag exists to prevent.

### 7.4 The tab read "Betta Resume · Betta Resume"

The root layout's `title.template` appended the product name to a page that had declared
the product name as its title.

---

## 8. The cleanup pass — what a second browser sweep found

After the five waves above, a session went back over the whole app with the browser
harness (`scripts/probe/`) and with the Plane board as the checklist. Three kinds of thing
came out, and only the first was what the plan expected.

### 8.1 Real defects the plan did not anticipate

| Found | Why it mattered |
|---|---|
| `forceMount` on every Review `TabsContent` | Radix treats a force-mounted panel as always *present*, so it stops setting `hidden`. All six panels rendered stacked: the sheet was ~3,000px tall and clicking "History" appeared to do nothing because its content sat 2,400px below the tab strip. The test asserting `forceMount` **documented the opposite** — it claimed Radix still hid them. |
| The marketing hero's "exported text" panel | A hand-written `key: value` list whose comment claimed it matched the exporter. It stopped matching when the exporter was fixed, so the most prominent panel on the site advertised `startDate: 2020-09` as the product's output. It now calls `buildPlainText(SAMPLE_RESUME)` — the same function the export button uses. |
| Typst's SVG contains a `<script>` | Injected with `dangerouslySetInnerHTML`, it ran in the app's origin on every preview render. `splitSvgPages` now rebuilds each page from a DOM, and the preview renders it as an `<img>` with a blob URL — an image context, where script cannot run by specification. |
| Four divergent HTML→text converters | `&amp;` rendered as `&` in one path and `&amp;` in another; a list item was `• x` in two and `x` in the rest. `src/lib/rich-text.ts` owns it now. |
| Index keys on editable lists | The remove handler takes the index too, so deleting the first of two identical achievements made React reuse the second row's DOM. Keyed by content + occurrence. |
| `SaveStatusIndicator`'s inline `clearTimers` | A new function every render made the effect re-run and restart the 1.7s auto-hide timer, so "Saved" could stay on screen indefinitely in the editor. |
| The optimistic metadata update | A shallow spread behind an `as any`: a font change replaced the whole blob, so `personalInfo` disappeared from the cache until the refetch. It now calls the server's own `deepMergeMetadata`, moved to `@bettaresume/types`. |
| Four `<button>`s with no `type` | Inside forms. A "remove this bullet" control was submitting the form it sits in. |

### 8.2 Controls that promised something the code did not do

`settings.layout` accepted two-column and sidebar, the preview drew both, and **no Typst
template ever read it**. The earlier fix kept the field, kept the dropdown and offered one
option — the same broken promise with less code. It, `settings.showIcons`, the dropdown and
~150 lines of unreachable preview branching are gone; single-column is not a preference the
product takes.

The marketing copy had the matching overclaim: History "diff any two" while the panel diffs
a version against the current document.

### 8.3 The board itself was stale

Several items described code that earlier PRs had already fixed (`resume.createVariation`,
the three real templates, the import review gate, `SyncManager`, the hardcoded activity
log). Two were closed with reasons rather than code:

- **Application tracking** contradicts `docs/ROADMAP.md` ("Never"), the marketing page's
  "No tracker, no auto-apply" and `CLAUDE.md`. `metadata.jobTarget` already records what a
  variant was aimed at, which is the useful part.
- **The `Tag` relation** has no UI to set a tag at all, so building indexed tables first
  would produce a correct table nobody can put a value into. Deferred with the item's own
  two-release sequencing quoted back. The independent half — the composite index
  `(userId, isArchived, updatedAt)` that `resume.list` was silently sorting in a temp
  b-tree without — did ship.

### 8.4 What the sweep changed about the gates

- **Biome: 272 → 0**, baseline now `0`, so the ratchet can fail on the next finding.
  165 of the 272 were in `api/wrangler-configuration.d.ts`, which `wrangler types`
  regenerates.
- **A migration-drift step.** `drizzle-kit generate` exits 0 and prints "No schema changes"
  whether or not it wrote anything, so running it proved nothing; the step compares the
  `api/drizzle/*.sql` file count before and after.
- **The TipTap document is now stored** next to the HTML, from the same transaction. The
  HTML stays because three exporters read it; making them walk the document is the
  remaining ADR-gated work.
- **Rate limiting** at the edge, keyed on `CF-Connecting-IP`, before any parsing or token
  verification — the user id only exists after `createContext` has run.

---

## Deliberately not in this pass

- **A composite 0–100 score.** See §1. Roadmap rejects it; the research confirms why.
- **TipTap custom nodes.** ADR-0001 settled on structured records canonical; rich text only
  where the shape is free-form. Custom nodes would re-open that decision.
- **Auto-apply / application tracker.** `docs/ROADMAP.md` "Explicitly rejected".
- **LLM rewrites.** Would put invented claims in a signed document.
