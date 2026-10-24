# Brief: Design systems research

You are a senior design-systems researcher. Do NOT modify any code. Your only output is ONE markdown file: `docs/research/design-systems.md`.

## Why

The product's UI is unsatisfying: it feels too empty, space is not used efficiently, UI hierarchy is weak, buttons are poorly spaced and positioned. The maintainer wants a proper design system grounded in real, established open-source systems, then applied to the whole app.

## Repo context

`C:\research_learning_new\bettaresume` — Next.js 16 (static export), React 19, TypeScript, Tailwind CSS v4 (CSS-first config via `@theme`), shadcn/ui + Radix UI, Biome.

Current state: `src/styles/` holds global CSS; `src/components/ui/` holds shadcn primitives; `src/app/` is the marketing shell; `src/features/` holds dashboard + resume-editor; `src/components/marketing/` holds the landing page.

Read `docs/AGENT-CONTEXT.md` and `CLAUDE.md` first for project constraints.

## Part A — Study these systems deeply

For each: token architecture (color, spacing, radius, type, elevation), what is genuinely distinctive and worth borrowing, and what to avoid.

- **GitLab Pajamas** (design.gitlab.com) — token architecture, scale, documentation approach
- **GitHub Primer** (primer.style) — color system, spacing scale, size/scale variants, its "functional color" model
- **IBM Carbon** — the 2x grid, spacing tokens, type scale
- **Atlassian Design System** — surface elevation model, spacing, legacy vs new tokens
- **Shopify Polaris**, **Salesforce Lightning (SLDS)**, **Ant Design** — cross-checks on scale design
- **Material Design 3** — tonal palette / role-based color model

## Part B — The "Refactoring UI" method (Adam Wathan & Steve Schoger)

The maintainer said they would provide the book but it has not arrived. **Record this as an open input.** From public sources, reconstruct its canonical principles and be specific:

- Designing in greyscale first, color last
- Not using more than 2 type sizes per design; building hierarchy with weight and spacing instead
- The 8-point (and 4px) spacing system, and why arbitrary spacing destroys polish
- A limited type scale and a limited spacing scale, using only those values
- Hierarchy by contrast, not decoration; not every element deserves equal weight
- Density: padding proportional to element importance; tighter line-height on headings, wider on body
- Shadows and borders to separate layers rather than more whitespace
- Dark grey text over pure black; `color-mix` for subtle tints
- Small components before pages; real content early
- Specific rules for forms, tables, cards, empty states, buttons (primary/secondary/destructive/ghost), focus states, loading states
- "Make it work, make it right, make it beautiful" sequencing

## Part C — Deliverable structure

1. **Findings by system** — token architecture, what to borrow, what to avoid.
2. **Synthesis: what BettaResume should take from each** — concrete and opinionated.
3. **Refactoring UI principles as an operative list of checkable rules** (e.g. "every spacing value must come from a 4px-based scale").
4. **Proposed BettaResume token architecture** — a complete token table: color (semantic + neutral ramp + accent ramp, light AND dark), spacing scale, radius scale, type scale (sizes, line-heights, weights, tracking), elevation/shadow scale, motion (durations + easings), z-index scale, breakpoints. Show actual CSS custom property names (`--br-*`) and values.
5. **Proposed component inventory** — ~25 primitives with the states each must have (default/hover/active/focus-visible/disabled/loading/error) and per-component density/spacing rules.
6. **Rules the system must enforce**, lintable or testable where possible.
7. **Open questions for the maintainer** — brand hue, tone of voice in copy, dark-mode default, etc.

## Constraints

- Tokens must map onto Tailwind v4's `@theme` + shadcn/ui.
- The app is a resume builder whose **resume documents must stay single-column** for ATS parsing. The app UI and the resume document are two different design surfaces — call out explicitly where they must NOT share a scale.
- Do not produce a generic Bootstrap admin-panel look. This is a professional document tool.
- Prefer fewer, better-chosen tokens over a large token set.

Be specific and concrete. Include actual numbers. This document will be used directly to build the system.
