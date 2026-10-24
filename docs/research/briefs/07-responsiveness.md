# Brief: Responsiveness research

You are a responsive-design researcher. Do NOT modify any code. Your only output is ONE markdown file: `docs/research/responsiveness.md`.

## Why

A deep responsiveness pass is needed on all UI surfaces, with concrete areas of improvement.

## Repo context

`C:\research_learning_new\bettaresume` — Next.js 16 static export, Tailwind CSS v4, shadcn/ui + Radix. Read `CLAUDE.md`, `docs/AGENT-CONTEXT.md`, `docs/UI-FEATURE-PASS.md` first.

App surfaces: marketing home `/`, dashboard `/app`, resume editor (three-zone: section rail, form, preview), review sheet, template picker, dialogs, export menu.

Note: the resume *document* preview is a fixed-aspect page that must scale, not reflow. The app chrome around it must reflow.

## Research directions

- **Breakpoint strategy**: what is the right set for a desktop-first tool that also works on a phone? Tailwind's defaults vs a considered set. Mobile-first vs desktop-first for this product.
- **The three-zone editor on small screens**: how do Figma, Canva, Notion, Google Docs, Linear handle a "document + panels" workspace on a phone? Tabbed panes? Bottom sheets? A single-column "focus mode"? What is actually usable for someone reviewing a resume on a phone?
- **Navigation patterns** at each size: does the section rail become a dropdown, a drawer, a bottom sheet?
- **Responsive type and spacing** in the app chrome: fluid type (`clamp()`) vs stepped, and when each is right.
- **Touch targets** — minimum sizes, and how to keep a dense desktop UI comfortable on touch.
- **Tables, toolbars and dense controls** on narrow screens: overflow menus, wrapping, horizontal scroll traps.
- **The preview panel on mobile** — pinch-zoom? fit-width? page snapping?
- **Landscape phones and tablets** — the awkward middle.
- **Reduced motion, forced colors, prefers-contrast** — responsive design includes these.
- **Testing methodology**: how to make a responsiveness pass durable (visual regression, viewport matrix, container queries), and what container queries would buy us here.
- **Container queries vs media queries** for the app's panels (the preview panel is sized by the user, not the viewport).

## Deliverable structure

1. **Breakpoint strategy** — the exact set, with rationale, and which surfaces use which.
2. **Per-surface responsive behaviour spec** — for each surface: what happens at each breakpoint, what reflows, what becomes a drawer/tab/sheet, what is hidden. Precise.
3. **The editor on small screens** — the recommended model, with a wireframe-level description.
4. **Spacing and type rules** that change with size.
5. **Touch and input modality rules.**
6. **Known traps in this codebase** — search for hardcoded widths (`w-[...]`, fixed pixel layouts), `overflow-hidden` clipping, horizontal-scrolling panels, and list them with file paths.
7. **A durable test plan** — what to automate so this does not regress (a viewport matrix, what to assert, e.g. no horizontal overflow, all tap targets ≥44px, no clipped text).
8. **Open questions for the maintainer.**

Be concrete. This feeds implementation directly.
