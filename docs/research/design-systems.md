# Design systems research — BettaResume

**Status**: research deliverable, no code changed. Produced from `docs/research/briefs/01-design-systems.md`.
**Sources**: primary docs for Carbon (spacing table verified against carbondesignsystem.com), Pajamas
(design.gitlab.com token taxonomy), Primer (primer/primitives token architecture), Atlassian
(elevation model), plus cross-checks on Polaris / SLDS / Ant Design / Material 3.
**Open input**: the *Refactoring UI* book (Wathan & Schoger) has **not arrived**. Part B is
reconstructed from the authors' public material (their blog posts, talks, and the book's published
table of contents). Treat every Part B rule as "reconstructed, pending book confirmation" and
re-audit when the book lands.

Two design surfaces exist in this product and they must not share a scale. This document designs
**Surface A — the app UI** (marketing shell, dashboard, resume editor chrome). **Surface B — the
resume document** (Typst templates, PDF export, HTML preview) is described only where the two
must explicitly diverge (§2.8, §4.7). Surface B is governed by ATS constraints: single column,
semantic reading order, and the font-preservation rule in `docs/AGENT-CONTEXT.md` §2.13.

---

## Part A — Findings by system

### A1. GitLab Pajamas

**Token architecture** — three categories, increasing specificity, all published at
design.gitlab.com:

1. **Constant** — raw key/value pairs: `color.purple.100 → #e1d8f9`. Never used directly.
2. **Semantic** — global intent, references constants: `status.brand.background.color`,
   `text.color.subtle`, `action.confirm.background.color.hover`.
3. **Contextual** — component/experiment-specific: `alert.warning.title.color`,
   `avatar.fallback.background.purple`.

Naming is a path: `domain.property.variant.state` (e.g.
`action.danger.foreground.color.active`). Every interactive family is **state-complete**:
default / hover / active / focus / disabled / selected, each with background + border + foreground
triplets. Feedback is modeled as a *family* per meaning (`feedback.danger.*` = background + border
+ icon + text) so a callout never mixes a hand-picked red with a hand-picked border.

**Distinctive & worth borrowing**
- The constant → semantic → contextual layering, with the rule that only semantic/contextual
  tokens may appear in components. This is the cleanest published expression of token tiers.
- State-complete action tokens. It makes "what does hover look like?" a data question, not a
  design question, per component.
- Token descriptions that record *intent and use* ("Used for…"), i.e. documentation-as-decision.
  Pajamas explicitly frames tokens as "codifying design decisions openly and objectively".
- Component lifecycle labels (experimental / beta / stable / deprecated) in the docs.

**Avoid**
- The sheer token count: hundreds of contextual tokens for one product. BettaResume is one app;
  contextual tokens should number in the dozens, not hundreds.
- GitLab's visual density (heavy enterprise tables, saturated feedback strips) — it reads
  "DevOps admin", the exact opposite of a calm document tool.
- Dot-path naming in CSS. In Tailwind/shadcn, `--br-*` hyphenated names map better to utilities.

### A2. GitHub Primer

**Token architecture** — three layers in `primer/primitives`:

1. **Base** — per-hue 0–9 scales (`base-color-blue-5`…`-9`). Convention: **steps 0–2 are for
   backgrounds, steps 6–9 are for foregrounds**.
2. **Functional** — role-named, theme-mappable: `fgColor-default / muted / subtle`,
   `bgColor-default / inset / stressed / emphasis`, `borderColor-default / muted / accent`,
   `control.*`.
3. **Component** — per-state mapping files (`button.json5`), rest/hover/active/disabled per slot.

**Color system** — the functional model is the heart: names describe *role*, never hue, so light /
dark / dimmed / high-contrast themes are pure token remaps. On-emphasis pairing is enforced
(`bgColor.accent.emphasis` must pair with `fgColor.onEmphasis`) and a `colorContrast` script
validates every declared pair against WCAG (4.5:1, 7:1 for high contrast) in CI.

**Spacing & size** — 4px base. Space scale steps 0–7 (0, 4, 8, 16, 24, 32, 40, 48 px). Controls
have a small set of **scale variants**: small / medium / large ≈ **28 / 32 / 40 px** heights,
applied consistently across Button, Input, Select.

**Distinctive & worth borrowing**
- Functional color naming (fg / bg / border × default / muted / subtle / emphasis). This is the
  model §4 adopts wholesale.
- The emphasis ladder: default → muted → subtle, applied uniformly to fg, bg and border.
- Contrast validation of token pairs as a CI script — not a one-off audit.
- Control scale variants at 28 / 32 / 40 px. Three sizes, chosen once, used everywhere.

**Avoid**
- 10-step scales × ~12 hues. BettaResume keeps one neutral ramp and one accent ramp (plus three
  status colors as single values). Fewer, better-chosen tokens.
- Primer's product-specific pattern colors (issue labels, PR states, ANSI terminal colors).

### A3. IBM Carbon

**Token architecture** — the **2x Grid**: spacing in multiples of 2, 4 and 8. Verified spacing
scale (from carbondesignsystem.com):

| Token | px | Token | px |
|---|---|---|---|
| `$spacing-01` | 2 | `$spacing-08` | 40 |
| `$spacing-02` | 4 | `$spacing-09` | 48 |
| `$spacing-03` | 8 | `$spacing-10` | 64 |
| `$spacing-04` | 12 | `$spacing-11` | 80 |
| `$spacing-05` | 16 | `$spacing-12` | 96 |
| `$spacing-06` | 24 | `$spacing-13` | 160 |
| `$spacing-07` | 32 | | |

**Type scale** — the Watson scale: label/helper 12px, body 14px (compact) / 16px, headings
16 / 20 / 28 / 32 / 42 / 60 / 76. Large end is display/marketing only.

**Distinctive & worth borrowing**
- The explicit split: **small increments for detail-level design** (2/4/8), **large increments to
  control density** (48/64/96). Two regimes in one scale, and the docs say so.
- Tokens used "inside components for building and between components for layout" — one scale, two
  sanctioned uses.
- The responsive rule: tokens don't change at breakpoints, but **jumping steps at a breakpoint is
  sanctioned** (16px padding at 1440 → 8px at 768). We adopt this verbatim.

**Avoid**
- 13 steps including 160px is more than a single-app system needs; we cap at 96px.
- Carbon's visual language (very dense forms, 1px everything, enterprise utility) — studying its
  *grid* is the point; copying its *look* produces exactly the admin panel we must not build.

### A4. Atlassian Design System

**Token architecture** — modern primitives (`@atl-primitives` / tokens) name space by **value** on
a base number scale: `space/0 → 0px`, `space/2 → 2px`, `space/4 → 4px`, `space/6 → 6px`, …
Separate "spacing" (gaps/padding) from "size" (element dimensions). The **legacy** system is an
8px-base multiplier scale (`spacing: 0…8` × 8px) — legacy and new tokens coexist, with the new
ones recommended.

**Surface elevation model** — elevation is a pairing of a **surface token** and a **shadow token**
(`elevation.surface.overlay` + `elevation.shadow.raised`), used at very few, consistently applied
levels. The semantic meaning ("this floats above") is separated from the implementation (which
shadow). 4–6 levels max; typical mapping: 0 base layout, 1 cards, 2 dropdowns, 3 modals.

**Distinctive & worth borrowing**
- **Elevation as surface+shadow pairs, not raw box-shadows.** A surface token can also swap
  background tone, which matters in dark mode where shadows weaken (this repo already learned
  that: dark `--elev-*` need more alpha, `globals.css`).
- Value-named space tokens (`space/16` = 16px): zero ambiguity, grep-friendly.
- The legacy→new token lesson: define an **alias layer** so components never bind to primitive
  names. BettaResume already has such a layer — the shadcn `--color-*` names — and §4 keeps it.

**Avoid**
- The churn of running two token generations at once. BettaResume should migrate in one pass.
- Atlassian's playful brand color and display font energy — wrong register for a resume tool.

### A5. Cross-checks: Polaris, SLDS, Ant Design

- **Shopify Polaris** — numeric-magnitude token naming (`space-100` = 4px base, `space-200` = 8,
  `space-400` = 16, `space-800` = 32, with `-025`/`-050` half-steps below the base). Confirms two
  things: (1) a 4px base with sanctioned half-steps covers fine detail; (2) numeric names that
  encode magnitude scale well. Its corner-case token sprawl (commerce-specific) is the caution.
- **Salesforce SLDS** — 4px-based spacing scale (xx-small → xx-large ≈ 4 → 48px) with a large
  legacy surface and heavy enterprise density. Cross-check only: it confirms 4px converges, and
  warns that legacy token debt compounds for years.
- **Ant Design** — the strict **4/8 dual grid** ("8-point grid"), 24-column layout, control
  heights **24 / 32 / 40**, base font **14px**, radius ladder 2/4/6/8. Algorithmic color
  generation in v5. Cross-check confirms the control-height trio (24/32/40 ≈ Primer's 28/32/40).
  Avoid the "antd look": its blue + component styling is instantly recognizable as a template.

### A6. Material Design 3

**Token architecture** — tonal palettes (primary / secondary / tertiary / neutral /
neutral-variant / error, 13 tones each) and **role-based color**: `on-*` pairings,
`surface-container-lowest / low / default / high / highest`, `outline / outline-variant`. Type
scale of 15 roles (display 57/45/36, headline 32/28/24, title 22/16/14, body 16/14/12,
label 14/12/11). Shape: 0 / 4 / 8 / 12 / 16 / 28 / full. Elevation: 0 / 1 / 2 / 3 / 5 dp.
Spacing on a 4dp grid. **State layers**: hover 8% / pressed 12% alpha overlays instead of new
solid colors per state.

**Distinctive & worth borrowing**
- **Generate ramps from one hue.** One accent hue → its full tonal ramp. §4 does exactly this.
- The **surface container ladder** for dark mode: instead of shadows (invisible on dark), steps of
  surface tone carry elevation. We map elevation 1/2/3 to increasingly light surfaces in `.dark`.
- **State layers** for hover/press: `color-mix(in oklab, var(--br-accent) 8%, transparent)` beats
  inventing a new solid per state — and `globals.css` already does this for `::selection`.
- Strict `on-*` pairing discipline (same idea as Primer's `fgColor.onEmphasis`).

**Avoid**
- The full 6-palette × 13-tone matrix — an order of magnitude more color tokens than this app
  needs.
- M3's large radii (28px) and soft, rounded, consumer feel. A resume tool should read closer to
  paper and ink than to a phone OS.

---

## Part B — The Refactoring UI method (reconstructed; book pending)

**Record as open input**: the book has not been provided. The rules below are reconstructed from
Wathan & Schoger's public posts/talks and the book's published contents. Each is written as an
operative, checkable rule (see §3 for the enforcement version).

1. **Greyscale first, color last.** Build the entire layout in greyscale. Color is reserved for
   conveying state and drawing the eye to actions. A screen must survive the squint test with
   accents removed.
2. **At most two type sizes per design.** Hierarchy comes from weight, color and spacing before a
   new size is introduced. If two elements compete, change weight or tone first.
3. **8-point spacing system, with 4px half-steps.** Arbitrary values (`padding: 13px`) destroy
   polish by breaking rhythm. Every spacing value comes from the scale.
4. **Closed type and spacing scales.** A limited set of sizes/space values; use only those.
   Adding a value is a system change, not a local decision.
5. **Hierarchy by contrast, not decoration.** Not every element deserves equal weight. One
   dominant element per view; de-emphasize by tone (muted fg) rather than by decoration.
6. **Density proportional to importance.** Padding scales with prominence. Headings get tight
   line-height (1.15–1.25); body text gets wide (1.5–1.6). Labels sit close to their inputs
   (4–8px); groups are separated generously (24–32px).
7. **Shadows and borders separate layers; whitespace separates sections.** Don't stack whitespace
   to fake depth (this repo's `globals.css` already codifies: shadows = depth, borders =
   structure).
8. **Dark grey text over pure black; `color-mix` for subtle tints.** Softer text reduces glare;
   tints derived from the brand hue (`color-mix`) keep the palette tight instead of adding hexes.
9. **Small components before pages; real content early.** Build and polish buttons/inputs in
   isolation; use realistic copy (real resume bullet points, names, dates) — lorem hides layout
   problems.
10. **Component-specific canon**:
    - *Forms*: one column, labels above, aligned single-line inputs (an "input spine"), helper and
      error text directly under its field, generous group separation.
    - *Tables*: dense rows (~40px), numbers right-aligned, dividers *or* zebra — never both,
      headers visually quiet.
    - *Cards*: elevation or border for the layer, 16–24px internal padding, don't nest cards.
    - *Empty states*: icon + one-line headline + one primary action; no illustrations required.
    - *Buttons*: primary (solid, one per view), secondary (neutral outline), destructive (red),
      ghost (tertiary). Padding proportional to importance of the action.
    - *Focus states*: visible 2px ring + offset on every interactive element (already in
      `globals.css` `:focus-visible`).
    - *Loading states*: skeletons preserve layout; spinners for inline/action feedback; never a
      flash of empty content.
11. **Sequencing: "make it work, make it right, make it beautiful."** Behavior first, then
    layout/spacing correctness, then visual polish (color, shadow, motion) last. Don't polish a
    layout that isn't right.

---

## Part C — Deliverable

### C1. Synthesis: what BettaResume takes from each

Opinionated, one line per source, then the through-line.

| Source | Take | Specifically |
|---|---|---|
| Pajamas | 3-tier token layering + state-complete actions | `--br-*` primitives → semantic tokens → components; every interactive family defines default/hover/active/focus/disabled/(loading)/(error) slots |
| Primer | Functional color model + contrast CI + control scales | `fg/bg/border × default/muted/subtle/emphasis` naming; CI contrast test on declared pairs; 3 control sizes (28/32/40px) |
| Carbon | 2-regime spacing scale + responsive step-jumps | 2/4/8 for detail, 24/32/48/64/96 for density; tokens are fixed but *stepping* the scale at breakpoints is allowed |
| Atlassian | Elevation = surface + shadow pairs; value-named space | 4 elevation levels, each = surface tone + shadow; space tokens named by px value |
| Polaris | 4px base + sanctioned half-steps | `2px` step exists for optical fine-tuning only (icon↔label) |
| Ant | Control heights 24/32/40; 14px UI base text | workbench density: 14px body for chrome, 16px for content areas |
| M3 | One hue → tonal ramp; state layers; dark surface ladder | accent ramp generated from one hue; hover/press = alpha state layers; dark elevation = surface tone steps |

**Through-line for the product**: this is a *professional document workbench*. The UI must recede
so the resume content dominates — think Linear/Notion-class restraint, not DevOps dashboards.
Concretely: neutral-dominant surfaces, one accent used sparingly (primary actions, selection,
focus), ink-toned text (`neutral-950`, not pure black), tight-but-comfortable density (14px UI
text, 32px controls), elevation used only where something genuinely floats. The marketing shell
may be airier (larger type, more whitespace) but consumes the same tokens.

### C2. Refactoring UI as operative, checkable rules

Each rule is phrased MUST + how it is verified. The "→ §6.x" column points at the enforcement
section.

| # | Rule | Verification | → |
|---|---|---|---|
| R1 | Every spacing value MUST come from the `--br-space-*` scale (4px base + 2px half-step). No `[13px]`-style arbitrary spacing. | grep/glob test for `[...]` arbitrary values in `p-*, m-*, gap-*, space-*` classes | §6.1 |
| R2 | Every font-size MUST come from the `--br-text-*` scale. Hierarchy within a view is built from weight/tone/spacing first; adding a size is a system change. | grep test for `text-[...]` arbitrary sizes; scale diff requires doc update | §6.1 |
| R3 | Body text MUST be `neutral-800`–`neutral-950` (light) — never `#000`; secondary text uses `--br-text-muted`, never a smaller size alone. | token review + visual pass | §6.5 |
| R4 | Interactive components MUST implement default/hover/active/focus-visible/disabled; form controls also loading and error. | component test matrix (§5) | §6.3 |
| R5 | Focus MUST be `2px solid var(--br-ring)` at `2px` offset on every interactive element (WCAG 2.4.7). | axe / tab-order test | §6.3 |
| R6 | Text contrast MUST be ≥ 4.5:1; non-text (ring, borders that carry meaning) ≥ 3:1, both themes. | CI script over declared token pairs (Primer pattern) | §6.2 |
| R7 | z-index MUST come from `--br-z-*`. No raw `z-[9999]`. | grep test | §6.1 |
| R8 | Radius MUST come from `--br-radius-*`; cards and dialogs use `md`/`lg`, controls `sm`, chips `full`. | grep + design review | §6.4 |
| R9 | Hover/press feedback MUST use state-layer alpha (`color-mix`), not new solid colors. | code review convention | §6.5 |
| R10 | Depth: floating layers use `--br-elev-1..3`; structural separation uses borders. Borders never fake depth; shadows never fake dividers. | review + §5 specs | §6.4 |
| R11 | One primary (solid) button per view region. Destructive actions are `destructive` variant and confirm via AlertDialog when irreversible. | review; §5 Button spec | §6.5 |
| R12 | Density: form label → input 4–8px; field → field 16px; group → group 24–32px; heading line-height 1.15–1.25; body 1.5–1.6. | §5 per-component specs | §6.4 |
| R13 | Components use real content in development/review early (real names, bullets, dates) — lorem is banned from review screenshots. | convention | — |
| R14 | Sequencing gate: behavior → layout right → polish. No visual polish PRs on components with open layout bugs. | process | — |
| R15 | Surface B (resume doc) MUST NOT consume `--br-*` tokens. Its scales live in the Typst templates only. | §6.6 test | §6.6 |

### C3. — (folded into C2; see rules R1–R15 above)

### C4. Proposed BettaResume token architecture

Naming: `--br-*`, hyphenated, value- or role-named. Two layers only (Primer's discipline without
Pajamas' sprawl): **primitives** (ramps, scales) and **semantic** (roles). The shadcn
`--color-*`/`--radius-*`/`--shadow-*` names remain as the **alias layer** components consume
(Atlassian legacy→new lesson applied up front). In Tailwind v4 these live in `@theme` /
`@theme inline` exactly as today; `:root` binds semantic → primitive.

#### C4.1 Neutral ramp (light values; `.dark` swaps the *roles*, not the ramp)

Slightly cool grey (hue 250, low chroma) — reads like ink on paper, not tech-blue.

| Token | oklch (light) | ≈ hex | Role examples |
|---|---|---|---|
| `--br-neutral-0` | `oklch(1 0 0)` | `#ffffff` | cards, popovers (light) |
| `--br-neutral-50` | `oklch(0.988 0.001 250)` | `#fcfcfd` | page background (light) |
| `--br-neutral-100` | `oklch(0.965 0.002 250)` | `#f5f6f8` | sunken, muted fills, hover state layer base |
| `--br-neutral-200` | `oklch(0.922 0.003 250)` | `#e8eaee` | borders, dividers |
| `--br-neutral-300` | `oklch(0.872 0.004 250)` | `#dadee6` | strong borders, disabled fills |
| `--br-neutral-400` | `oklch(0.708 0.006 250)` | `#a3aab8` | placeholder, disabled text |
| `--br-neutral-500` | `oklch(0.556 0.008 250)` | `#727c8f` | subtle text, icons |
| `--br-neutral-600` | `oklch(0.446 0.01 250)` | `#4d5768` | muted text (secondary) |
| `--br-neutral-700` | `oklch(0.373 0.01 250)` | `#384152` | strong secondary text |
| `--br-neutral-800` | `oklch(0.278 0.008 250)` | `#20262f` | dark borders, body text on light |
| `--br-neutral-900` | `oklch(0.205 0.006 250)` | `#131720` | headings (light), dark surfaces |
| `--br-neutral-950` | `oklch(0.145 0.005 250)` | `#0b0e14` | strongest text, dark page bg |

(The repo's current shadcn defaults are achromatic `oklch(x 0 0)`; these values keep every
existing L step and add a hair of chroma. Migration cost is visual-only.)

#### C4.2 Accent ramp (one hue; replace hue to rebrand — open question Q1)

Default hue = the blue already vetted for `--ring` (255, the value `globals.css` documents as
clearing 3:1 on paper and card). 8 steps: 50–900 subset (no need for 13 tones).

| Token | oklch | Use |
|---|---|---|
| `--br-accent-50` | `oklch(0.97 0.01 255)` | selected-row tint (light) |
| `--br-accent-100` | `oklch(0.93 0.03 255)` | accent surface fills |
| `--br-accent-200` | `oklch(0.87 0.06 255)` | accent borders (light) |
| `--br-accent-300` | `oklch(0.77 0.1 255)` | accent text on dark |
| `--br-accent-400` | `oklch(0.68 0.15 255)` | ring (dark), links (dark) |
| `--br-accent-500` | `oklch(0.58 0.19 255)` | links (light), state layer base |
| `--br-accent-600` | `oklch(0.532 0.232 255)` | **primary button (light)**, ring (light) |
| `--br-accent-700` | `oklch(0.46 0.21 255)` | primary hover (light) |
| `--br-accent-800` | `oklch(0.38 0.16 255)` | primary active (light) |
| `--br-accent-900` | `oklch(0.31 0.11 255)` | accent text on light accent-50 |

#### C4.3 Status colors — single values + `color-mix` tints (no per-status ramps)

| Token | oklch | Pair with |
|---|---|---|
| `--br-success` | `oklch(0.55 0.14 152)` | `--br-success-soft: color-mix(in oklab, var(--br-success) 12%, transparent)` |
| `--br-warning` | `oklch(0.66 0.14 75)` | soft = 14% mix |
| `--br-danger` | `oklch(0.577 0.245 27.3)` (current `--destructive`) | soft = 12% mix |
| `--br-info` | alias `--br-accent-500` | soft = 12% mix |

#### C4.4 Semantic color roles (light / dark) + shadcn alias map

| `--br-*` | Light | Dark | shadcn alias |
|---|---|---|---|
| `--br-bg` | `neutral-50` | `neutral-950` | `--background` |
| `--br-text` | `neutral-950` | `neutral-50` | `--foreground` |
| `--br-surface` | `neutral-0` | `neutral-900` | `--card` |
| `--br-surface-text` | `neutral-950` | `neutral-50` | `--card-foreground` |
| `--br-overlay` | `neutral-0` | `neutral-900` | `--popover` |
| `--br-overlay-text` | `neutral-950` | `neutral-50` | `--popover-foreground` |
| `--br-text-muted` | `neutral-600` | `neutral-400` | `--muted-foreground` |
| `--br-text-subtle` | `neutral-500` | `neutral-500` | (new; icons/meta) |
| `--br-sunken` | `neutral-100` | `neutral-800` | `--muted` / `--secondary` |
| `--br-primary` | `accent-600` | `accent-400` | `--primary` |
| `--br-primary-text` | `neutral-0` | `neutral-950` | `--primary-foreground` |
| `--br-border` | `neutral-200` | `neutral-800` | `--border`, `--input` |
| `--br-border-strong` | `neutral-300` | `neutral-700` | (new) |
| `--br-ring` | `accent-600` | `accent-400` | `--ring` |
| `--br-danger` (+-text) | as C4.3 | `accent-light` variant in dark | `--destructive` |
| `--br-link` | `accent-500` | `accent-300` | (new) |
| `--br-selection` | `color-mix(in oklab, var(--br-accent-500) 20%, transparent)` | 30% mix | (used by `::selection`) |

Rules baked in: text never `#000`; emphasis ladder default → muted → subtle; every solid accent
pairs with `--br-primary-text` (M3/Primer `on-*` discipline); status tints are derived, not new
hues.

#### C4.5 Spacing scale — `--br-space-*` (name = value ÷ 4)

| Token | px | Regime | Typical use |
|---|---|---|---|
| `--br-space-05` | 2 | fine | icon↔label optical nudge only |
| `--br-space-1` | 4 | detail | label→input, icon padding |
| `--br-space-2` | 8 | detail | inline gaps, badge padding-x |
| `--br-space-3` | 12 | detail | control padding-y, chip gaps |
| `--br-space-4` | 16 | layout | field gaps, card padding (dense) |
| `--br-space-6` | 24 | layout | group gaps, card padding (default) |
| `--br-space-8` | 32 | layout | section gaps, dialog padding |
| `--br-space-12` | 48 | structure | panel padding, empty-state spacing |
| `--br-space-16` | 64 | structure | page padding (large screens) |
| `--br-space-24` | 96 | structure | marketing rhythm only |

Carbon's two regimes made explicit: 2–12 for detail, 24–96 for density/structure. In Tailwind v4
this is the standard 0.25rem `--spacing` multiplier — the numeric utilities already match
(`p-4` = 16px); the lint rule (§6.1) restricts *which* numbers may appear in app chrome:
**05(2),1,2,3,4,6,8,12,16,24**.

#### C4.6 Type scale — `--br-text-*`

UI font: **Inter** (already `--font-inter`, primary in `src/lib/fonts.ts`). One family for chrome;
Surface B has its own families and this must stay true.

| Token | px / line-height | tracking | weight | Use |
|---|---|---|---|---|
| `--br-text-xs` | 12 / 16 | 0 | 400–600 | meta, helper, badges |
| `--br-text-sm` | 14 / 20 | 0 | 400–600 | **UI body default** (labels, tables, forms) |
| `--br-text-base` | 16 / 24 | 0 | 400–600 | content areas (editor text), marketing body |
| `--br-text-lg` | 20 / 28 | −0.01em | 600 | card/section titles |
| `--br-text-xl` | 24 / 32 | −0.015em | 600–700 | page titles |
| `--br-text-2xl` | 32 / 40 | −0.02em | 700 | marketing h1/h2, empty-state headlines |
| `--br-text-3xl` | 40 / 48 | −0.02em | 700 | marketing hero only |

Weights: 400 / 500 / 600 / 700 only. Uppercase micro-labels: 12px / 600 / `+0.04em` tracking.
R2 allows at most two `--br-text-*` sizes per view; the third must earn it (§6.5 review).

#### C4.7 Elevation — surface + shadow pairs (Atlassian)

| Level | Surface (light) | Surface (dark) | Shadow |
|---|---|---|---|
| `--br-elev-0` | `--br-bg` | `--br-bg` | none; 1px `--br-border` if the layer needs an edge |
| `--br-elev-1` | `--br-surface` | `neutral-800` (lighter step instead of shadow) | `0 1px 2px oklch(0 0 0 / .06), 0 1px 1px oklch(0 0 0 / .04)` |
| `--br-elev-2` | `--br-surface` | `neutral-800` + border | `0 2px 4px oklch(0 0 0 / .06), 0 4px 8px oklch(0 0 0 / .06)` |
| `--br-elev-3` | `--br-overlay` | `neutral-800` + scrim | `0 2px 4px oklch(0 0 0 / .05), 0 8px 16px oklch(0 0 0 / .08), 0 16px 32px oklch(0 0 0 / .1)` |

Dark shadows use the alpha-boosted set already in `globals.css` (they must; see the comment
there). Assignments: elev-0 = page/panels; elev-1 = cards, hover-lift; elev-2 = popovers,
dropdowns, tooltips, sheets; elev-3 = dialogs, command palette.

#### C4.8 Radius

| Token | px | Use |
|---|---|---|
| `--br-radius-xs` | 4 | badges, chips, state layers |
| `--br-radius-sm` | 6 | buttons, inputs, selects |
| `--br-radius-md` | 8 | cards, popovers, dialogs |
| `--br-radius-lg` | 12 | sheets, large modals, marketing cards |
| `--br-radius-full` | 9999 | avatars, dots, pill toggles |

(Migrates the current base `0.625rem`/10px to an 8px `md`; the shadcn `--radius-*` calc chain
re-points to these.)

#### C4.9 Motion

| Token | Value | Use |
|---|---|---|
| `--br-duration-fast` | 120ms | hover/press state layers, color changes |
| `--br-duration-base` | 180ms | dropdowns, tooltips, accordions |
| `--br-duration-slow` | 240ms | dialogs, sheets, page transitions |
| `--br-ease-standard` | `cubic-bezier(.2, 0, 0, 1)` | entrances + exits (current `--ease-enter/exit`) |
| `--br-ease-decelerate` | `cubic-bezier(0, 0, 0, 1)` | elements entering from off-screen |
| `--br-ease-accelerate` | `cubic-bezier(.3, 0, 1, 1)` | exits |

All motion MUST be wrapped in `@media (prefers-reduced-motion: no-preference)` or have a
`reduce` fallback (pattern already started for `scroll-behavior`).

#### C4.10 z-index

| Token | Value | Use |
|---|---|---|
| `--br-z-base` | 0 | normal flow |
| `--br-z-raised` | 10 | hover-lifted cards, sticky row actions |
| `--br-z-sticky` | 100 | sticky headers, panel toolbars |
| `--br-z-dropdown` | 1000 | menus, combobox lists |
| `--br-z-overlay` | 1100 | modal scrim |
| `--br-z-dialog` | 1200 | dialogs, sheets |
| `--br-z-popover` | 1300 | popovers above dialogs |
| `--br-z-toast` | 1400 | toasts |
| `--br-z-tooltip` | 1500 | tooltips (always top) |

#### C4.11 Breakpoints

Tailwind defaults kept: `sm 640, md 768, lg 1024, xl 1280, 2xl 1536`. The workbench (editor +
dashboard) is **desktop-first, min 1024px**; below `lg` the editor shows a read-only/stacked
fallback rather than a compressed layout. Carbon's responsive step-jump rule applies: components
may step down the spacing scale at `md` (e.g. card padding 24→16) but tokens never change value.

#### C4.12 Tailwind v4 `@theme` mapping (shape, not final code)

```css
@theme {
	/* primitives */
	--br-neutral-*: …;      /* C4.1 */
	--br-accent-*: …;       /* C4.2 */
	--br-space-05: 0.125rem;
	--br-space-1: 0.25rem;  /* …through 24 */
	--br-text-xs--line-height: 1rem;  /* Tailwind text-* slots */
	--br-radius-sm: 0.375rem;
	--br-elev-1: …;
	--br-duration-fast: 120ms;
	--br-ease-standard: cubic-bezier(0.2, 0, 0, 1);
	/* semantic, aliased for shadcn components (existing names unchanged) */
	--color-background: var(--br-bg);
	--color-foreground: var(--br-text);
	--radius-md: var(--br-radius-md);
	--shadow-elev-1: var(--br-elev-1);
}
```

Components keep consuming `bg-background`, `text-muted-foreground`, `shadow-elev-2` etc. — zero
class churn; only `:root`/`.dark` bindings change.

#### C4.13 Surface B — the resume document (explicit non-sharing)

| Concern | Surface A (app UI) | Surface B (resume doc) | Why they must not share |
|---|---|---|---|
| Type scale | `--br-text-*` (12–40px, Inter) | Typst-side pt scale in `*.typ` (e.g. 10.5–11pt body, 14–16pt name) | Screen vs print metrics; px sizes would reflow pages |
| Spacing | `--br-space-*` (px/rem) | pt/mm margins & leading in Typst | Page geometry, ATS line parsing |
| Color | full semantic + dark mode | black/white first; accent only on headings, never for meaning | Print + ATS text extraction + photocopy legibility |
| Radius / shadow / motion | yes | **none** | Paper is flat and static |
| Fonts | Inter etc. via `next/font` (app chrome) | vendored static fonts (`public/fonts/`, `src/lib/fonts.ts` / Typst pipeline) | Substitution must preserve generic *kind* (AGENT-CONTEXT §2.13) or page counts silently change |
| Layout | fluid, panels | **single column, fixed page width** | ATS parsers fail on two-column flows |
| Theme | light + dark | light (paper) preview even in dark app mode | The preview must be a preview of the export |

Also: the HTML preview must use the *same* fonts and metrics as the export (the
"preview is not a preview" failure from AGENT-CONTEXT §2.13). Any `--br-*` usage inside
`typst_templates/` or the preview document root is a violation (testable, §6.6).

### C5. Proposed component inventory (~25 primitives)

State legend: D default, H hover, A active/pressed, F focus-visible, X disabled, L loading,
E error. Density: control sizes `sm 28px / md 32px / lg 40px` heights (Primer/Ant), padding-x
from the space scale.

| # | Component | States | Density / spacing rules |
|---|---|---|---|
| 1 | Button (primary/secondary/destructive/ghost/link) | D H A F X L | h-sm 28/px-3, md 32/px-4, lg 40/px-6; gap-1 icon↔label; one primary per view region |
| 2 | IconButton | D H A F X L | square 28/32/40; tooltip required; 2px radius-xs hover plate |
| 3 | SegmentedControl (incl. Toggle) | D H A F X (selected = A) | 32px h; 2px inner padding; selected = sunken + border-strong |
| 4 | Input | D H F X L E | 32px h (lg 40); px-3; border 1px, ring on F; error = danger border + icon |
| 5 | Textarea | D H F X L E | min-h 80; py-2 px-3; resize-y only |
| 6 | Select | D H F X L E | mirrors Input metrics exactly (input spine) |
| 7 | Combobox | D H F X L E + open | Input + Popover list; list item 32px, py-1 px-2 |
| 8 | Checkbox / Radio | D H F X E (checked, indeterminate) | 16px box, 4px radius-xs; label gap-2; row hit-area ≥ 32px |
| 9 | Switch | D H F X | 32×18 track; thumb 14; 2px state-layer on hover |
| 10 | Slider | D H F X | track 4px, thumb 16; value chip on drag |
| 11 | Field (wrapper) | D F E (helper, error) | label→control 1px→4px? no: label→control `--br-space-1`; control→helper/error 4px; field→field 16px |
| 12 | Label | D X | 14/500; required marker in danger, never color-only |
| 13 | Badge (status) | D H (linkable) | h-20 (8px py?) → py-1 px-2, 12/500, radius-xs; soft tint bg + strong text |
| 14 | Tag / Chip (removable) | D H X (remove) | h-24, radius-full; remove button 16px hit ≥ 24 |
| 15 | Tooltip | D only (hover/focus trigger) | 12/400 text, py-1 px-2, elev-2, delay 300ms in / 0 out |
| 16 | Popover | D H F on trigger | p-4, radius-md, elev-2, max-w 320 |
| 17 | DropdownMenu / ContextMenu | D H A F X | item h-32 px-2 gap-2; separator 1px; submenu elev-2 |
| 18 | Dialog | D (open states: entering/exiting) | p-8 (32), radius-md, elev-3 + scrim `color-mix(neutral-950 40%)`; title 20/600 |
| 19 | AlertDialog (destructive confirm) | D X (confirm L) | same as Dialog; confirm = destructive Button |
| 20 | Sheet (side panel) | D | p-6; width 320/400; elev-3 |
| 21 | Toast | D H (pause) L | p-4, radius-md, elev-3, max-w 360, bottom-right, 5s |
| 22 | Tabs | D H A F X | 40px tab h, px-3; active = accent underline 2px + text |
| 23 | Accordion | D H A (open) F | trigger h-40 px-0? → py-4; content pb-4; no nested buttons (CLAUDE.md) |
| 24 | Card | D H (interactive only) | p-6 default / p-4 dense; elev-1 or border, never both |
| 25 | Table | D H (row) X (row) | header 12/600 muted; row h-40; dividers OR zebra; numbers right-aligned |
| 26 | Toolbar | D H A F X | h-40, gap-2, sticky = `--br-z-sticky`; grouping with 1px dividers |
| 27 | EmptyState | D | icon 32 + 20/600 headline + muted 14 body + one primary action; py-12 px-6 |
| 28 | Callout / Alert (info/success/warning/danger) | D H (links) | soft tint bg + 1px matching border + icon; p-4 gap-3 |
| 29 | Skeleton / Spinner / Progress | L | skeleton matches final layout metrics exactly; spinner 16/24; progress 4px track |
| 30 | SaveStatusIndicator | D L E | 12px text + 8px dot; states saved/saving/dirty/error (existing component) |

Supporting atoms: Avatar (24/32/40), Breadcrumb (14, muted separators), Pagination (32px
controls), Kbd, Divider (1px border). These extend the ~25 core rather than replacing them.

Per-component defaults (global rules R10–R12 apply on top):
- **Buttons**: solid primary = accent-600 bg / white text; secondary = surface + border-strong;
  destructive = danger; ghost = transparent, hover state layer. Focus ring always visible.
- **Forms**: single column, labels above, one input spine (identical heights/px across Input,
  Select, Combobox), helper 12 muted under control, error 12 danger under control with icon.
- **Tables**: 40px rows; quiet 12px header; row hover = 8% state layer; selection = accent-50
  fill + accent-600 left indicator.
- **Empty states**: never dead ends — always offer the one action that fixes the emptiness
  (relevant: AGENT-CONTEXT §2.24 "an empty template is invisible until a user picks it").

### C6. Rules the system must enforce

| # | Rule | Enforcement | Kind |
|---|---|---|---|
| 6.1 | Scale closure (R1, R2, R7): no arbitrary `p-*`/`m-*`/`gap-*`/`text-*`/`z-*` values in `src/` | test: glob `.tsx` for `\[(\d+\.?\d*)(px\|rem)\]` in spacing/type/z utilities; whitelist `--br-space-05` exceptions explicitly | **testable** |
| 6.2 | Contrast (R6): every declared semantic pair ≥ 4.5:1 (text) / 3:1 (non-text), both themes | CI script parsing the token table (Primer's `colorContrast` pattern); pairs enumerated in a fixture | **testable** |
| 6.3 | State completeness (R4, R5): every interactive primitive renders all required states | component test per §5 matrix (React Testing Library); axe `focus-visible` check | **testable** |
| 6.4 | Elevation/radius grammar (R8, R10): no raw `box-shadow`/`z-[…]`/border-as-depth outside tokens | grep test for `shadow-\[` and `z-\[`; review checklist for border usage | **testable** |
| 6.5 | Design-review conventions (R3, R9, R11, R12): text tones, state layers, one primary button, density rhythm | PR checklist + squint-test screenshot per view; not automatable today | **review** |
| 6.6 | Surface isolation (R15): `--br-*` and app font variables must not appear in `typst_templates/`, the Typst preview root, or PDF export code | test: grep `typst_templates/`, `src/lib/typst/` for `--br-` and `--font-inter` | **testable** |
| 6.7 | Token change = system change: edits to `@theme`/`:root` token block require updating this doc's §C4 tables | PR checklist (mirrors the AGENT-CONTEXT discipline of docs-as-decisions) | **review** |
| 6.8 | Biome ratchet stays honest: lint gates count-based, and Biome **caps** diagnostics (AGENT-CONTEXT §2.16) — a falling count is not proof of a clean file | keep the 307-baseline ratchet; never raise it; spot-check full output on token PRs | **testable + process** |
| 6.9 | Reduced motion honored on every animated component | media-query audit test (grep `transition-`/`animate-` without a reduce path) | **testable** |

### C7. Open questions for the maintainer

1. **Brand hue (Q1).** The plan defaults to the blue already vetted for `--ring`
   (`oklch(0.532 0.232 255)`) and generates the whole accent ramp from it. Keep it, or pick a
   different hue before implementation? Re-hueing later is one constant — but only if decided
   before the marketing site hardcodes it.
2. **Dark-mode default (Q2).** Follow system (`prefers-color-scheme`), default light, or default
   dark? Also confirm: the **resume preview stays paper-white in dark app mode** (recommended,
   see §C4.13) — or should the preview ever simulate dark paper?
3. **Density call (Q3).** Workbench UI body at **14px** (Ant/Primer-product convention,
   recommended) with controls 32px, or the more generous 16px / 40px? This single choice drives
   most of the "feels empty vs. feels cramped" perception and everything else adapts to it.
4. **Refactoring UI book (Q4).** Part B is reconstructed from public sources because the book
   hasn't arrived. Confirm the operative rule list (R1–R15) now, or hold implementation of §C2
   rules until the book lands and the list is re-audited?
5. **Marketing vs. app split (Q5).** Marketing shell gets the airier end of the shared scale
   (`--br-text-2xl/3xl`, `--br-space-24`) while the app uses `sm/base` — confirm marketing is in
   scope for this system's first application pass, or app-first?
6. **Font subsets (Q6).** `next/font/google` loads **latin subsets only** (documented in
   `globals.css`); non-Latin names fall back to system fonts in the *screen* preview. For a
   resume tool used with CJK/Cyrillic names, should subsets widen (cost: font weight/page load)?
   Note Surface B's vendored fonts are a separate pipeline with their own coverage.
7. **Empty templates (Q7).** AGENT-CONTEXT §2.24: empty templates are invisible until picked.
   Should the design system include a **template gallery / picker** pattern (marketing +
   dashboard) as a first-class component, with its own density rules?
8. **Accent meaning (Q8).** Confirm the accent is *interaction only* (primary buttons, selection,
   focus, links) and status colors carry meaning — versus allowing brand-color callouts. The
   greyscale-first rule (R3/B1) assumes the former.

---

*End of deliverable. Implementation should start at §C4 token block + §6.1/6.2 tests, then the
form spine (Input/Select/Field/Label) and Button family per §C5, on real content early (R13).*
