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

## 6. Wave 5 — Platform

| # | Change | Proof |
|---|---|---|
| 6.1 | OG image + metadata for the marketing page | crawler-visible |
| 6.2 | CSP `<meta>` on the marketing page | no inline script violations |
| 6.3 | Request IDs on the API | every response carries `x-request-id` |
| 6.4 | D1 backup export scheduled | restore rehearsed |

---

## Deliberately not in this pass

- **A composite 0–100 score.** See §1. Roadmap rejects it; the research confirms why.
- **TipTap custom nodes.** ADR-0001 settled on structured records canonical; rich text only
  where the shape is free-form. Custom nodes would re-open that decision.
- **Auto-apply / application tracker.** `docs/ROADMAP.md` "Explicitly rejected".
- **LLM rewrites.** Would put invented claims in a signed document.
