# Brief: UI audit of the current app (with screenshots)

You are a design auditor. You may run the browser harness in this repo. Your only output is ONE markdown file: `docs/research/ui-audit.md`.

## Why

The maintainer is not happy with the current look and theme of the UI: it sometimes feels too empty, space is not used efficiently, UI hierarchy is not established well, buttons are not spaced and positioned well. We need a precise, evidence-based list of what is wrong, with screenshots as proof.

## Repo context

`C:\research_learning_new\bettaresume` — Next.js 16 static export, React 19, Tailwind CSS v4, shadcn/ui + Radix.

### How to run the app and take screenshots

There is a Playwright harness. **Playwright is installed but you MUST launch with `channel: "chrome"`** — this host has Chrome but no Playwright Chromium. `scripts/probe/lib.cjs` exports `launch`, `newPage`, `goto`, `shoot`, `bodyText`, `openResume`, `waitForEditor`. Screenshots go to `.probe-shots/`.

```
node scripts/probe-start.cjs api web   # detached; writes .probe-*.log/.pid
node scripts/probe/full-pass.cjs       # 8 checks
node scripts/probe/production.cjs      # checks https://app.bettaresume.com
```

Local dev: web on http://localhost:3000, API on http://localhost:4100. `.env.local` and `api/.dev.vars` are already configured. **If the dashboard looks empty, run `npm run db:reset-seed`** (local D1 gets wiped by the API test suite — this is a known quirk).

Do NOT commit anything. Do NOT open PRs. Screenshots in `.probe-shots/` are fine to leave.

## What to audit

Take screenshots at **1440×900, 1024×768, 768×1024 and 390×844** for each surface:
1. Marketing home `/` — every section, scrolled to bottom.
2. Dashboard `/app` — empty state and populated state.
3. Resume editor — sections rail, form area, preview, the "Typography & layout" panel, the Review sheet (all tabs).
4. Template picker.
5. Dialogs: Create resume, Create variation, Delete confirm, Import review.
6. Export menu.
7. Empty states everywhere.

## What to look for

- **Empty/under-filled regions**: where is there dead space that should carry content or be tightened?
- **Hierarchy failures**: what is the first thing the eye goes to? Is it the right thing? Where do headings, labels and values all look the same weight?
- **Spacing consistency**: measure the actual spacing values used (inspect the Tailwind classes). Are there arbitrary values (`p-[13px]`, `gap-[7px]`)? Is there a consistent rhythm?
- **Button placement and spacing**: are primary/secondary actions placed consistently? Are they too close together? Is the primary action always in the same place? Are there competing primaries?
- **Alignment**: what lines up with what? Where does something sit 2px off?
- **Density**: are controls bigger than they need to be? Are forms wasting vertical space?
- **Contrast and tone**: does the dark theme look washed out? Are there too many grey levels?
- **Typography in the chrome**: how many different font sizes are actually used? Too many? Too few?
- **States**: hover, focus, disabled, loading, error, empty — which are missing?
- **Anything that looks like a placeholder or unfinished**.

## Deliverable structure

1. **The top 10 problems**, each with: what it is, a screenshot reference (`.probe-shots/...`), the offending code location, and how severe.
2. **Surface-by-surface findings** — for each surface, a list of specific defects.
3. **Spacing audit** — the actual values in use, a histogram of `p-`, `m-`, `gap-` values, and how many are off-scale.
4. **Typography audit** — the font sizes/weights in use, and whether the scale is coherent.
5. **Colour audit** — how many distinct greys, whether the dark theme has enough contrast between surfaces.
6. **Hierarchy audit** — for each screen, what the visual hierarchy actually is vs what it should be.
7. **Missing states** inventory.
8. **Recommended fix list**, ordered by impact.

Be brutally specific. Reference file paths and line numbers. Use screenshots liberally.
