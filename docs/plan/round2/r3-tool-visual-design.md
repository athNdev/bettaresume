# R3 — Visual design for a professional tool

You are a product designer. Your only output: `docs/research/tool-visual-design.md`.

## The problem

The maintainer: *"The UI of the app did not go any real overhauls, it looks exactly the same, I expected much more."*

A previous pass applied a design-token layer (spacings, type sizes, radii, elevation, colours) and called it a design system. The app is still flat, grey, uniform and under-designed. The tokens are the alphabet; the design is the writing.

## Research these products' actual visual language

Look at how they *look*, not just their token names:
- **Linear** — the reference for a dense, premium developer tool
- **Vercel** — monochrome discipline, accent restraint
- **Raycast**, **Superhuman**, **Arc** — density + personality
- **Notion**, **Cron/Notion Calendar**, **Figma** — warmth vs precision
- **Stripe Dashboard**, **Resend**, **Clerk** — modern SaaS chrome
- **Tailwind UI** component galleries — the actual composed patterns

For each: how do they handle **depth** (layered shadows? borders? tonal surfaces?), **density**, **colour restraint** vs accent moments, **typography hierarchy** (how many weights, how much size contrast), **empty states**, **buttons** (shape, weight, iconography, primary/secondary contrast), **navigation** (sidebar? rail? header?), **cards and panels**, **focus states**, and **delight moments**.

## Deliverable structure

1. **What makes these tools feel premium** — the specific, nameable techniques. Not "use whitespace"; name the technique (e.g. "tonal surface ladder with a 1-step lift and a 1px top highlight", "two-layer shadow with a tight contact shadow and a wide ambient one").
2. **A visual language spec for BettaResume** — a professional resume-builder tool:
   - **Mood/personality** and the visual consequences
   - **Surface & depth model**: how many surface levels, how they're separated (border vs tone vs shadow), the exact shadow recipes
   - **Colour model**: how much colour, where the accent appears, when to use the status colours, the role of tinted surfaces
   - **Typography hierarchy**: the display/body/meta roles, weights, tracking, and how contrast is built without size
   - **Density model**: control heights, paddings, the rhythm
   - **Button system**: variants, sizes, icon treatment, primary contrast
   - **Panel/card system**: how a panel is framed, header treatment, footer actions
   - **Navigation model**: how the editor's three zones and the dashboard should be organised
   - **Empty/loading/error states**: what a *designed* empty state contains
   - **Ornament budget**: where to spend the "finishing touches" (accent borders, decorated backgrounds, overlaps) and where to stay quiet
3. **Concrete CSS/Tailwind recipes** for the signature elements — shadow stacks, gradient borders, tonal ladders, tinted surface fills, accent rules.
4. **The 20 highest-impact visual changes** for this specific app, in priority order, each with the expected before→after effect.
5. **What NOT to do** — the ways this could go wrong (generic Bootstrap admin panel, gradient soup, glassmorphism overload, decorative noise).

## Hard constraints
- This is a **professional document tool** used by people writing resumes. Precision and trust matter more than personality.
- The **resume document** is a separate surface and must stay print-honest and single-column. Do not style it with the app's language.
- Light and dark both have to work.
- Accessibility is not optional: 3:1 for control boundaries, 4.5:1 for body text.

Be concrete and prescriptive. Someone must be able to implement this directly.
