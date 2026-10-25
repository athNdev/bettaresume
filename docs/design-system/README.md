# BettaResume design system — app chrome

The token layer, the visual method, and the primitive components. This is the
system the **app chrome** is built from: dashboard, editor, dialogs, forms, the
marketing shell, and the brand.

It is **not** the resume document. Surface B (the PDF/preview) is a separate
design surface measured in points on paper, with its own scales inside the
Typst templates — see [Surface isolation](#8-surface-isolation).

- **Rendered reference:** [`/design-system`](../../src/app/design-system/page.tsx)
  — brand, colour, type, scales, every component state, the ornament budget and
  the numbered rules, in both themes.
- **Brand:** [`brand.md`](./brand.md).
- **Research behind the system:** `docs/research/design-systems.md` (the token
  alphabet), `docs/research/tool-visual-design.md` (the visual language), and
  `docs/research/refactoring-ui-rules.md` (the method).
- **Evidence that motivated it:** `docs/research/ui-audit.md`.

Where this document and the research disagree, this document wins — it describes
what is built.

---

## 1. The model: two tiers, an alias layer, and a method

| Tier | Names | Who touches it | Example |
|---|---|---|---|
| **Primitives** | `--br-*` | nobody directly — they are the paint | `--br-neutral-950`, `--br-accent-600`, `--br-space-4` |
| **Roles** | semantic vars in `:root` / `.dark` | the token file only | `--surface`, `--border-control`, `--success` |
| **Aliases** | `--color-*`, `--radius-*`, `--shadow-*` in `@theme inline` | components, via utilities | `bg-surface`, `shadow-elev-1`, `rounded-md` |
| **Composed layers** | `.br-*` classes in `globals.css` | components, for multi-property recipes | `.br-panel`, `.br-chip`, `.br-stage`, `.br-label` |

Light and dark **swap the roles, not the ramp**. A component never knows which
theme it is in; it reads `bg-surface`, and the token file decides that a surface
is white on light and `neutral-800` on dark.

The fourth tier is new in v2 and is the point of it: a token scale is a
precondition for design, not design. `.br-panel`, `.br-chip`, `.br-stage` and
friends are where the **method** lives (depth, status, selection, empty states,
the ornament budget) so a component composes a rule instead of re-deriving it.

Adding a colour decision means adding a *role*, not picking a hex. That is rule
**R3**.

---

## 2. Colour

### 2.1 Neutral ramp (12 steps, ink-toned)

Slightly cool grey (hue 250). Never pure black — `neutral-950` is the darkest
ink, `neutral-0` is paper. Both themes share this one ramp.

```
 token            oklch                   ≈ hex     use
 ──────────────────────────────────────────────────────────────────
 --br-neutral-0    oklch(1 0 0)            #ffffff  paper: cards in light
 --br-neutral-50   oklch(0.988 0.001 250)  #fafbfc  page background (light)
 --br-neutral-100  oklch(0.965 0.002 250)  #f2f3f5  wells: inputs, strips
 --br-neutral-200  oklch(0.922 0.003 250)  #e4e5e7  hairlines (dense UI)
 --br-neutral-300  oklch(0.872 0.004 250)  #d3d5d7  hairlines (default light)
 --br-neutral-400  oklch(0.708 0.006 250)  #9ea1a4  icon tone (dark), control edge (dark)
 --br-neutral-500  oklch(0.556 0.008 250)  #707478  control edge (light), icon tone (light)
 --br-neutral-600  oklch(0.446 0.01 250)   #50555a  secondary text (light), hairline (dark)
 --br-neutral-700  oklch(0.373 0.01 250)   #3d4146  overlay surface (dark)
 --br-neutral-800  oklch(0.278 0.008 250)  #25292c  card surface (dark)
 --br-neutral-900  oklch(0.205 0.006 250)  #15171a  wells (dark)
 --br-neutral-950  oklch(0.145 0.005 250)  #090a0c  page background (dark)
```

### 2.2 Accent ramp (one hue: 255)

One hue, ten steps. **255** is the blue already vetted for the focus ring in
this repo. One hue means a rebrand is one constant: change the `255` in
`@theme` and the whole ramp follows.

```
 token              oklch                   ≈ hex     use
 ────────────────────────────────────────────────────────────────────
 --br-accent-50     oklch(0.97 0.01 255)    #f1f6fc  selected-row tint (light)
 --br-accent-100    oklch(0.93 0.03 255)    #dbe9fc  accent surface fills
 --br-accent-200    oklch(0.87 0.06 255)    #bad7fc  accent borders (light)
 --br-accent-300    oklch(0.77 0.1 255)     #89b7f3  accent text on dark, selected tint
 --br-accent-400    oklch(0.68 0.15 255)    #539af2  primary fill + ring + selected edge (dark)
 --br-accent-500    oklch(0.56 0.19 255)    #0071e0  links (light), info hue
 --br-accent-600    oklch(0.532 0.232 255)  #0063ed  primary fill + ring + selected edge (light)
 --br-accent-700    oklch(0.46 0.21 255)    #004fc8  primary hover (light)
 --br-accent-800    oklch(0.38 0.16 255)    #003d94  primary active (light)
 --br-accent-900    oklch(0.31 0.11 255)    #002e66  accent text on accent-50
```

The accent is an **event**, at three sites per view maximum: the one solid
primary action in a region, selection, and focus/links. Status colours carry
meaning; the accent never does (R3/R11, DS-7).

### 2.3 Status — one token each

No per-status ramps. Every status owns exactly one value; soft tints and
dark-theme variants are `color-mix` of that one value, never new hues.

```
 token          oklch                  ≈ hex     pairs with
 ──────────────────────────────────────────────────────────────
 --br-success   oklch(0.5 0.13 152)    #05773b   --br-success-soft (12% mix)
 --br-warning   oklch(0.515 0.105 75)  #8a5d0b   --br-warning-soft (14% mix)
 --br-danger    oklch(0.54 0.22 27.3)  #d00114   --br-danger-soft (6% mix)
 --br-info      oklch(0.5 0.16 255)    #0961bb   --br-info-soft (12% mix)
```

Each value clears **4.5:1 as text on white, on the page and on its own soft
tint**, and works as a solid fill under its `-foreground`. The mix percentages
differ because the binding pair is text-on-own-tint and each hue lands there
differently.

In dark the roles lighten toward white (a 50% mix, tuned so text also clears
4.5:1 on the **overlay** rung — a callout inside a dialog is the case a
page-only check misses) and pair with ink text.

### 2.4 Semantic roles (light / dark)

| role | light | dark | shadcn alias | when to use |
|---|---|---|---|---|
| `--background` | `neutral-50` | `neutral-950` | `--background` | the page; never a card |
| `--foreground` | `neutral-950` | `neutral-50` | `--foreground` | body text |
| `--surface` | `neutral-0` | `neutral-800` | `--card` | cards, panels |
| `--surface-raised` | `neutral-0` | `neutral-700` | `--popover` | anything floating: popovers, dialogs, sheets |
| `--sunken` | `neutral-100` | `neutral-900` | (new; `--muted`, `--secondary`) | wells: inputs, strips, kbd fills |
| `--muted-foreground` | `neutral-600` | `neutral-300` | `--muted-foreground` | secondary text (always ≥4.5:1) |
| `--subtle` | `neutral-500` | `neutral-400` | (new; `text-fg-subtle`) | **icons and decorative meta only** — text uses muted |
| `--accent` | 10% `neutral-500` mix | 10% `neutral-0` mix | `--accent` | hover/press state layers |
| `--selected` | 10% `accent-500` mix | 14% `accent-300` mix | (new; `bg-selected`) | selection tint |
| `--primary` | `accent-600` | `accent-400` | `--primary` | the one solid action fill per region |
| `--primary-foreground` | `neutral-0` | `neutral-950` | `--primary-foreground` | text on primary |
| `--link` | `accent-500` | `accent-300` | (new) | links |
| `--border` | `neutral-300` | `neutral-600` | `--border` | **decorative** structure: dividers, card edges, seams |
| `--border-control` | `neutral-500` | `neutral-400` | (new; `--input`) | **interactive** boundaries — inputs, outline buttons, selects |
| `--border-selected` | `accent-600` | `accent-400` | (new) | selection, checked state |
| `--ring` | `accent-600` | `accent-400` | `--ring` | focus indicator |
| `--success` / `--warning` / `--danger` / `--info` | §2.3 | lightened, ink text | `--destructive` = `--danger` | status text, fills, borders |
| `--selection` | 20% `accent-500` | 30% `accent-500` | — | `::selection` |
| `--preview-paper` | `neutral-0` | `neutral-0` (constant) | `bg-preview-paper` | the document preview's paper, for **chrome that imitates the page**. Paper never dark-modes: a preview is a preview of the export. The document surface itself keeps its palette as data (R15) |

`--border-strong` is **retired** (D2). Its two jobs are now stated explicitly:
`--border` draws, `--border-control` bounds a control, `--border-selected`
marks selection. One property no longer does two jobs.

### 2.5 Surface ladder and depth

Four rungs, three jobs. **In light, shadows lift; in dark, tone lifts.** The
hairline exists in both; the top highlight exists in dark only.

| Level | Token | Light | Dark | Job |
|---|---|---|---|---|
| L0 page | `--background` | `neutral-50` | `neutral-950` | regions, columns; no shadow |
| L1 surface | `--surface` | `neutral-0` | `neutral-800` | cards, floating panels |
| L2 overlay | `--surface-raised` | `neutral-0` | `neutral-700` | popovers, menus, dialogs, sheets |
| sunken | `--sunken` | `neutral-100` | `neutral-900` | input wells, toolbar strips — *below* the surface |

Measured (dark): page → card **1.35:1**, card → overlay **1.43:1**, well below
card **1.22:1**; hairline on card **1.94:1**. Before v2 the card rung was
1.11:1, which still read flat.

Shadows are **two layers, always** (tight contact + wide ambient), never a stock
`shadow-sm`. Dark multiplies the alphas (≈×2.5) and adds
`inset 0 1px 0 oklch(1 0 0 / 6%)` to every floating layer — the cheapest trick
that makes dark chrome read as layered. Dialogs use 8%.

### 2.6 The contrast contract

Three tiers, all enforced in `test/app-token-contrast.test.ts` against the token
file as a browser would paint it (var chains resolved, `color-mix` evaluated,
alpha composited):

1. **Text ≥ 4.5:1** on every surface it can land on, including soft tints
   (WCAG 2.1 §1.4.3).
2. **Meaningful non-text ≥ 3:1** — focus rings, control boundaries and selected
   edges (WCAG 2.1 §1.4.11). This is what "adjacent surfaces ≥ 3:1" means.
3. **Surface ladder**: every rung distinct with a documented minimum step, so
   the 1.00:1 collapse cannot return.

The *decorative* ladder is separated by tone **plus** border and shadow, not by
3:1 of tone. Holding tone to 3:1 would force dark cards to L≈0.47 (mid-grey
slabs) and grey the light page. That is the answer to the old open question Q1.

---

## 3. The closed scales

**Anything off-scale is a bug.** `test/token-scale-closure.test.ts` fails on a
new offender anywhere in `src/`, and the ratchet baseline is empty.

### 3.1 Spacing — 11 values (4px base, 2px optical half-step)

```
 token            px   Tailwind   regime   typical use
 ────────────────────────────────────────────────────────────────
 --br-space-05     2   0.5        fine     icon↔label optical nudge ONLY
 --br-space-1      4   1          detail   label→input gap
 --br-space-2      8   2          detail   inline gaps, chip padding
 --br-space-3     12   3          detail   control padding
 --br-space-4     16   4          layout   field→field, dense card padding
 --br-space-6     24   6          layout   group→group, card padding
 --br-space-8     32   8          layout   section→section, dialog padding
 --br-space-12    48   12         structure panel padding
 --br-space-16    64   16         structure page padding
 --br-space-24    96   24         structure marketing rhythm only
 (0 is the eleventh value.)
```

### 3.2 Type — 7 sizes, 9 roles

Size is the *least* important hierarchy tool. The order is: tone → weight →
spacing → case/tracking. A new size is a system change.

```
 token          px/lh   tracking   weight    use
 ────────────────────────────────────────────────────────────────
 --br-text-xs    12/16   0          400–600   meta, helper, badges, labels
 --br-text-sm    14/20   0          400–600   UI body default
 --br-text-base  16/24   0          400–600   content areas, panel titles
 --br-text-lg    20/28   −0.01em    600       document titles
 --br-text-xl    24/32   −0.015em   600–700   page titles
 --br-text-2xl   32/40   −0.02em    700       marketing h1/h2, empty-state headlines
 --br-text-3xl   40/48   −0.02em    700       marketing hero only
```

Roles (the page renders every one):

| Role | Spec | Where |
|---|---|---|
| Page title | 24/32 · 600 · −0.015em | dashboard title, design-system title |
| Document title | 20/28 · 600 · −0.01em | resume name, dialog titles |
| Panel title | 16/24 · 600 · −0.01em | card and sheet titles, empty-state headlines |
| Body | 14/20 · 400 | the UI default |
| Body strong | 14/20 · 500 | row titles, input values |
| Label (D5) | 12/16 · 600 · +0.02em · muted | field labels — `.br-label` |
| Micro (T8) | 12/16 · 600 · +0.04em · uppercase · muted | rail and panel headers — `.br-micro` |
| Meta | 12/16 · 400 · muted | dates, counts, helper text |
| Kbd | 12/16 · 600 · +0.02em | key caps only — `.br-kbd` |

**Per-view budget: at most two sizes.** Editor = 20 (doc title) + 14, with the
12px label/meta layer. Dashboard = 24 + 14. Marketing keeps its display scale
but collapses body copy to one 16px step and captions to one 12px step.
Nothing functional goes below 12px (the kbd recipe's 11px is rounded up).

**Tone ladder (D3):** `--foreground` (body) → `--muted-foreground` (secondary,
≥4.5:1) → `--subtle` (icons only; 4.18:1 on the dark page, so never text).
Utilities: `text-foreground`, `text-fg-muted`, `text-fg-subtle`.

### 3.3 Radius — 4 / 6 / 8 / 12 / full

```
 --br-radius-xs   4px   chips, badges, state layers
 --br-radius-sm   6px   buttons, inputs, menu rows
 --br-radius-md   8px   panels, cards, popovers
 --br-radius-lg  12px   dialogs, sheets
 (full)         ∞      avatars, dots, pill toggles
```

Paper objects are the one exception: the resume sheet is square (2px) in both
themes. Chrome is rounded; paper is not.

### 3.4 Elevation — 4 levels, surface + shadow pairs

| level | surface | shadow | used by |
|---|---|---|---|
| `elev-0` | page or card + 1px `--border` | none | page, regions, in-flow panels |
| `elev-1` | `--surface` | `shadow-elev-1` | floating cards, hover lifts |
| `elev-2` | `--surface-raised` | `shadow-elev-2` | popovers, menus, selects, tooltips |
| `elev-3` | `--surface-raised` + scrim | `shadow-elev-3` | dialogs, sheets, toasts |
| `elev-hover` | — | `shadow-elev-hover` | the 2px interactive-card lift |
| `elev-page` | paper | `shadow-elev-page` | the preview stage, once |

Dark shadows use the alpha-boosted set. Scrims: `bg-scrim` (dialogs) and
`bg-scrim-soft` (sheets) — ink at 80% / 50%, never pure black.

**Regions vs cards.** Rails and columns are *regions*: a 1px hairline seam, no
radius, no shadow. Cards *float*: hairline + elev-1 (the hairline draws the edge,
the shadow lifts — D4). Overlays float on elev-2/3. A card is never nested in a
card.

### 3.5 Motion — 120 / 180 / 240ms, one easing family

```
 --br-duration-fast   120ms   hover/press state layers, colour changes
 --br-duration-base   180ms   dropdowns, tooltips, accordions, card lift
 --br-duration-slow   240ms   dialogs, sheets, page transitions
 --br-ease-standard   cubic-bezier(0.2, 0, 0, 1)
 --br-ease-decelerate cubic-bezier(0, 0, 0, 1)
 --br-ease-accelerate cubic-bezier(0.3, 0, 1, 1)
```

Every animation is either wrapped in `prefers-reduced-motion: no-preference` or
covered by the global reduce override.

### 3.6 z-index — one ladder

```
 --br-z-base 0 · raised 10 · sticky 100 · dropdown 1000 · overlay 1100
 --br-z-dialog 1200 · popover 1300 · toast 1400 · tooltip 1500
```

Use `z-(--br-z-dialog)`. A raw `z-50` is an off-scale value.

---

## 4. The composed layers (the method)

Defined once in `globals.css` under `@layer components`.

| Class | What it is | Rule |
|---|---|---|
| `.br-panel` | surface + hairline + `md` + elev-1 | a floating card |
| `.br-region` | page background + hairline seam | a rail or column |
| `.br-sunken` / `.br-sunken-static` | well fill; interactive wells add the control boundary | inputs, strips |
| `.br-state` | 6% / 10% alpha state layers | hover/press never a new solid |
| `.br-selection-rule` | 2px selected-edge rule | selection language |
| `.br-chip` | tint + same-hue border + hue text | status, with an icon |
| `.br-stage` / `.br-page` | vignetted field + three-layer page shadow | the one hero surface |
| `.br-skeleton` | sunken fill; dark-only shimmer | loading keeps the shape |
| `.br-kbd` | 12/600 key cap | shortcut affordance |
| `.br-label` / `.br-micro` | 12/600 roles | labels, group headers |
| `.br-tile` | 40px tinted icon square | empty-state tiles |
| `.br-accent-edge` | 1px gradient hairline | used exactly once |
| `.br-lift` | 2px hover lift at 180ms | interactive cards |

---

## 5. Component inventory

States: **D** default, **H** hover, **A** active/pressed, **F** focus-visible,
**X** disabled, **L** loading, **E** error. `test/token-state-matrix.test.ts`
asserts the declarations exist in each primitive's source.

| # | Component | States | Density |
|---|---|---|---|
| 1 | Button | D H A F X L | h 28/32/40 (`sm`/default/`lg`), px-3/4/6; `disabledReason` renders a tooltip + description; loading keeps width |
| 2 | IconButton = Button `size="icon"` | D H A F X L | 32×32 (`icon`), 28×28 (`icon-sm`); tooltip + `aria-label` required |
| 3 | Toggle / SegmentedControl | D H A F X | selected = accent layer (segmented: sunken track + raised thumb) |
| 4 | Input | D H F X L E | h-8, px-3, 1px `--border-control`; hover → foreground; `aria-invalid` → danger |
| 5 | Textarea | D H F X L E | min-h-20 (80px), px-3 |
| 6 | Select | D H F X L E | mirrors Input exactly |
| 7 | Checkbox / Radio | D H F X E | 16px box, `rounded-sm`; checked fill = primary |
| 8 | Switch | D H F X | track h-6 w-11, thumb 20px |
| 9 | Slider | D H F X | track h-2, thumb 20px, primary boundary |
| 10 | Label | D X | `.br-label` (12/600/+0.02em/muted) |
| 11 | Badge | D H | px-2 py-0.5, text-xs/600, full radius |
| 12 | StatusChip | D | `.br-chip`; icon is a required prop |
| 13 | Kbd | D | `.br-kbd` |
| 14 | Tooltip | D | elev-2, text-sm |
| 15 | Popover | D | p-4, `md`, elev-2 |
| 16 | DropdownMenu items | D H A F X | row min-h-8, px-2 |
| 17 | Dialog | D (+ enter/exit) | p-6, `lg` (12), elev-3 + scrim |
| 18 | AlertDialog | D X | as Dialog; confirm = destructive Button |
| 19 | Sheet | D | p-6, gap-4, elev-3 + scrim-soft |
| 20 | Tabs | D H A F X | list h-10; trigger h-8; active = surface + elev-1 |
| 21 | Accordion | D H A F | trigger py-4; no nested buttons |
| 22 | Card | D (H when interactive) | `md`; `inline` (hairline) / `floating` (hairline + elev-1) / `overlay` |
| 23 | Alert / Callout | D | soft tint + 1px status border + status text |
| 24 | PanelEmpty / PanelError / PanelLoading / PanelClear | L E D | 40px tile + headline + one muted line + one action; error is `danger-soft` + retry |
| 25 | SaveStatusIndicator | D L E | h-5; 12px text + icon |
| 26 | StateIcon | D | cross-fades two icons |
| 27 | SelectionRule | D | 2px rule; parent `relative` |
| 28 | BrandMark / BrandWordmark / BrandLockup | D | §brand.md |

Density (Q3, resolved): controls 28/32/40 with default 32, rows 40, panel
headers 44, form measure capped at 640px. The rhythm is label→control 4,
field→field 16, group→group 24, form-section 32.

---

## 6. Rules

Two lists, both citable. R1–R15 are the token rules; DS-1–DS-15 are the visual
method. The page lists DS-n with the test that enforces each.

### 6.1 Token rules

| # | Rule | Verified by |
|---|---|---|
| **R1** | Every spacing value comes from §3.1. No `[13px]`, no `p-5`, no `gap-1.5`. | `token-scale-closure.test.ts` |
| **R2** | Every font size comes from §3.2. Hierarchy from weight/tone/spacing first. | `token-scale-closure.test.ts` |
| **R3** | Body text is `--foreground` (ink-toned, never `#000`); secondary is `--muted-foreground`, never a smaller size alone. Colour decisions become roles, not hex. | `token-raw-colour.test.ts` |
| **R4** | Interactive primitives implement D/H/A/F/X; form controls also L/E. | `token-state-matrix.test.ts` |
| **R5** | Focus is `2px solid var(--ring)` at 2px offset on every interactive element. | `token-state-matrix.test.ts` |
| **R6** | Text ≥ 4.5:1; rings/control boundaries/selected edges ≥ 3:1; ladder keeps its steps. Both themes. | `app-token-contrast.test.ts` |
| **R7** | z-index comes from §3.6. No raw `z-50`. | `token-scale-closure.test.ts` |
| **R8** | Radius comes from §3.3: panels `md`, controls `sm`, modals `lg`, chips `full`. | `token-scale-closure.test.ts` |
| **R9** | Hover/press feedback is state-layer alpha, not new solid colours. | review + `--accent` is a mix |
| **R10** | Floating layers use elev-1..3; structure uses borders. | `token-state-matrix` + review |
| **R11** | One primary (solid) button per view region. | review + design-system page |
| **R12** | Density rhythm: label→input 4, field→field 16, group→group 24. | review + §5 |
| **R13** | Real content in review screenshots. Lorem is banned. | process |
| **R14** | Behaviour → layout → polish, in that order. | process |
| **R15** | Surface B never consumes `--br-*` tokens or app font variables. | `token-surface-isolation.test.ts` |

### 6.2 Visual-method rules

| # | Rule | Verified by |
|---|---|---|
| **DS-1** | Four surfaces, two ways of lifting: shadow lifts in light, tone lifts in dark. | `app-token-contrast` + `design-system-page` |
| **DS-2** | Shadows come in pairs; dark adds the top highlight. | `ui-polish` + `design-system-page` |
| **DS-3** | Borders state their job: hairline / control / selected. | `app-token-contrast` + `design-system-page` |
| **DS-4** | Hierarchy is tone → weight → space → case. Seven sizes, nine roles, two per view. | `token-scale-closure` |
| **DS-5** | A label is a role: 12/600 +0.02em muted; micro is uppercase +0.04em. | `design-system-page` |
| **DS-6** | One density, one rhythm. | `token-scale-closure` + `responsive-matrix` |
| **DS-7** | One primary action per region; icon-only needs a tooltip; disabled needs a reason. | `token-state-matrix` + `design-system-page` |
| **DS-8** | Regions are seams; cards float; cards never nest. | review + `design-system-page` |
| **DS-9** | Selection = tint + 2px rule + check, everywhere. | review + `design-system-page` |
| **DS-10** | Status = tint + hue text + icon; never colour alone. | `token-raw-colour` + `design-system-page` |
| **DS-11** | Empty/loading/error are designed, not defaulted. | `editor-panel-states` |
| **DS-12** | The ornament budget has five sites, and the rest is quiet. | `design-system-page` |
| **DS-13** | Motion is three durations, gated by reduced-motion. | `token-state-matrix` + `ui-polish` |
| **DS-14** | The brand is mono first; accent is an event; clear space is x. | `design-system-page` + `brand.md` |
| **DS-15** | The document is not the chrome. | `token-surface-isolation` |

---

## 7. Enforcement and the ratchet

| Test | Rules |
|---|---|
| `token-scale-closure.test.ts` | R1 R2 R7 R8 |
| `token-raw-colour.test.ts` | R3 |
| `app-token-contrast.test.ts` | R6, DS-1, DS-3 |
| `token-state-matrix.test.ts` | R4 R5, DS-13 |
| `token-surface-isolation.test.ts` | R15, DS-15 |
| `ui-polish.test.ts` | DS-2, DS-13 |
| `editor-panel-states.test.ts` | DS-11 |
| `design-system-page.test.ts` | DS-1..DS-3, DS-5, DS-14; the page's published ratios; the empty ratchet |
| `responsive-matrix.test.ts` / `responsive-overflow.test.ts` | DS-6 |

The ratchet baseline is `test/baselines/token-offenders.json`, and it is
**empty**. A new offender fails; a paid-off baseline entry also fails (so debt
can only shrink). To record after a deliberate scope change:
`TOKEN_OFFENDERS_WRITE=1 npx vitest run test/token-scale-closure.test.ts`.
Never grow it by hand. Biome is gated at **0**.

---

## 8. Surface isolation

The resume document (Surface B) has its own design system, in the Typst
templates, measured in points: its type scale, its margins, its black-first
palette, and **no radius, shadow or motion** — paper is flat and static. It
never reads `--br-*` tokens or the app's font variables, because screen metrics
reflow pages (`token-surface-isolation.test.ts`).

The one place the two meet is the **stage**: `.br-stage` + `.br-page` give the
sheet a vignette and a three-layer shadow, which is chrome around the document,
not styling *of* it. Inside the page, paper stays `--preview-paper` in both
themes and the template's palette is data.

---

## 9. The design-system page

`/design-system` is a **static route**, not a hash route, for three reasons:

1. Every hash route is behind Clerk; a reference page cannot be behind a login.
2. It is documentation: static HTML is crawlable, linkable and inspectable.
3. It lives outside `/app`, so it inherits the provider-free root layout and
   ships no Clerk/tRPC bundle.

It is deliberately absent from the marketing nav — that copy is pinned by
`test/marketing-claims.test.ts`, and this is a tool for the people building the
product, not a marketing claim.

What a reviewer can do there: toggle light/dark; read measured contrast ratios
for both themes; copy any token as `var(--…)`; inspect every component state;
read the ornament budget as live specimens; and cite a rule as `DS-n`.

The ratios are **computed at build time** from `globals.css` by the same
resolver (`src/lib/design-system/token-theme.ts`) the tests use, so a token
change moves the page and fails the build together. There are no hand-typed
numbers to drift.

---

## 10. Open questions

1. **Q2 — dark-mode default.** Still dark-first (`theme-provider.tsx`), and the
   preview stays paper-white in dark. Unchanged.
2. **Q3 — density.** Resolved by this wave: 28/32/40 controls, 14px UI body.
   Changing it is now a system change (DS-6), not a per-screen choice.
3. **Q6 — font subsets.** `next/font/google` loads latin only; non-Latin names
   fall back in the screen preview. Unchanged.
4. **Q8 — accent is interaction-only.** Confirmed: the accent has no status or
   decorative role in chrome. The brand mark may use it (DS-14).
