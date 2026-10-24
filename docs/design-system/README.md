# BettaResume design system — app chrome

The token layer and the primitive components. This is the system the **app
chrome** is built from: dashboard, editor, dialogs, forms, the marketing shell.

It is **not** the resume document. Surface B (the PDF/preview) is a separate
design surface measured in points on paper, with its own scales inside the
Typst templates — see [Surface isolation](#7-surface-isolation).

The research behind this system (ramps, rules, component specs) is
`docs/research/design-systems.md`; the evidence that motivated it is
`docs/research/ui-audit.md`. Where this document and the research disagree,
this document wins — it describes what is built.

**Rendered reference:** open [`token-reference.html`](./token-reference.html)
in a browser for live swatches of both themes.

---

## 1. The model: two tiers and an alias layer

| Tier | Names | Who touches it | Example |
|---|---|---|---|
| **Primitives** | `--br-*` | nobody directly — they are the paint | `--br-neutral-950`, `--br-accent-600`, `--br-space-4` |
| **Roles** | semantic vars in `:root` / `.dark` | the token file only | `--background`, `--surface`, `--success` |
| **Aliases** | `--color-*`, `--radius-*`, `--shadow-*` in `@theme inline` | components, via utilities | `bg-background`, `shadow-elev-1`, `rounded-md` |

Light and dark **swap the roles, not the ramp**. A component never knows which
theme it is in; it reads `bg-surface`, and the token file decides that a
surface is `--br-neutral-0` on light and `--br-neutral-900` on dark.

Adding a colour decision means adding a *role*, not picking a hex. That is
rule **R3**.

---

## 2. Colour

### 2.1 Neutral ramp (12 steps, ink-toned)

Slightly cool grey (hue 250). Never pure black — `neutral-950` is the darkest
ink, `neutral-0` is paper. Both themes share this one ramp.

```
 token            oklch                  ≈ hex       use
 ─────────────────────────────────────────────────────────────────
 --br-neutral-0    oklch(1 0 0)           #ffffff    paper: cards in light
 --br-neutral-50   oklch(0.988 0.001 250) #fafbfc    page background (light)
 --br-neutral-100  oklch(0.965 0.002 250) #f2f3f5    wells: inputs, tab lists
 --br-neutral-200  oklch(0.922 0.003 250) #e4e5e7    hairlines
 --br-neutral-300  oklch(0.872 0.004 250) #d3d5d7    card edges (light)
 --br-neutral-400  oklch(0.708 0.006 250) #9ea1a4    disabled text, emphasised structure
 --br-neutral-500  oklch(0.556 0.008 250) #707478    control boundaries (both themes)
 --br-neutral-600  oklch(0.446 0.01 250)  #50555a    secondary text (light)
 --br-neutral-700  oklch(0.373 0.01 250)  #3d4146    card edges (dark)
 --br-neutral-800  oklch(0.278 0.008 250) #25292c    floating layers (dark)
 --br-neutral-900  oklch(0.205 0.006 250) #15171a    cards (dark)
 --br-neutral-950  oklch(0.145 0.005 250) #090a0c    page background (dark)
```

### 2.2 Accent ramp (one hue: 255)

One hue, ten steps. **255** is the blue already vetted for the focus ring in
this repo (it clears 3:1 on paper and card — see the comment on `--ring` in
`src/styles/globals.css`). One hue means a rebrand is one constant: change the
`255` in `@theme` and the whole ramp follows.

```
 token             oklch                  ≈ hex       use
 ─────────────────────────────────────────────────────────────────
 --br-accent-50     oklch(0.97 0.01 255)  #f1f6fc    selected-row tint (light)
 --br-accent-100    oklch(0.93 0.03 255)  #dbe9fc    accent surface fills
 --br-accent-200    oklch(0.87 0.06 255)  #bad7fc    accent borders (light)
 --br-accent-300    oklch(0.77 0.1 255)   #89b7f3    accent text on dark
 --br-accent-400    oklch(0.68 0.15 255)  #539af2    ring + primary fill (dark)
 --br-accent-500    oklch(0.56 0.19 255)  #0071e0    links (light), info hue
 --br-accent-600    oklch(0.532 0.232 255)#0063ed    primary fill + ring (light)
 --br-accent-700    oklch(0.46 0.21 255)  #004fc8    primary hover (light)
 --br-accent-800    oklch(0.38 0.16 255)  #003d94    primary active (light)
 --br-accent-900    oklch(0.31 0.11 255)  #002e66    accent text on accent-50
```

The accent is **interaction only** — primary buttons, selection, focus, links.
Status colours carry meaning; brand colour never does (R3/R11).

### 2.3 Status — one token each

No per-status ramps. Every status owns exactly one value; the soft tints and
the dark-theme variants are `color-mix` of that one value, never new hues.

```
 token          oklch                  ≈ hex     pairs with
 ─────────────────────────────────────────────────────────────────
 --br-success   oklch(0.5 0.13 152)    #05773b   --br-success-soft (12% mix)
 --br-warning   oklch(0.515 0.105 75)  #8a5d0b   --br-warning-soft (14% mix)
 --br-danger    oklch(0.54 0.22 27.3)  #d00114   --br-danger-soft (6% mix)
 --br-info      oklch(0.5 0.16 255)    #0961bb   --br-info-soft (12% mix)
```

Each value is tuned so the token clears **4.5:1 as text on white, on the page,
and on its own soft tint**, and works as a solid fill under its
`-foreground`. The tint mix percentages differ because the binding pair is
text-on-own-tint and each hue lands there differently.

In dark, the roles lighten toward white and pair with ink text (the `on-*`
discipline): `--success` becomes `color-mix(in oklab, var(--br-success) 70%,
white)`, and `--success-foreground` becomes `neutral-950`.

### 2.4 Semantic roles (light / dark)

What components consume. The shadcn column is the alias layer — existing
primitives keep their class vocabulary.

| role | light | dark | shadcn alias | when to use |
|---|---|---|---|---|
| `--background` | `neutral-50` | `neutral-950` | `--background` | the page; never a card |
| `--foreground` | `neutral-950` | `neutral-50` | `--foreground` | body text |
| `--surface` | `neutral-0` | `neutral-900` | `--card` | cards, panels |
| `--surface-raised` | `neutral-0` | `neutral-800` | `--popover` | anything floating: popovers, dialogs, tooltips |
| `--muted` | `neutral-100` | 50% `950`↔`900` | `--muted`, `--secondary` | wells: inputs, tab lists, skeletons |
| `--muted-foreground` | `neutral-600` | `neutral-400` | `--muted-foreground` | secondary text (always ≥4.5:1) |
| `--subtle` | `neutral-500` | `neutral-500` | (new) | **icons and decorative meta only** — text uses muted |
| `--accent` | 10% `neutral-50` mix | 10% `neutral-0` mix | `--accent` | hover/press state layers |
| `--primary` | `accent-600` | `accent-400` | `--primary` | the one solid action fill per region |
| `--primary-foreground` | `neutral-0` | `neutral-950` | `--primary-foreground` | text on primary |
| `--link` | `accent-500` | `accent-300` | (new) | links |
| `--border` | `neutral-300` | `neutral-700` | `--border` | decorative structure: dividers, card edges |
| `--border-strong` | `neutral-400` | `neutral-600` | (new) | emphasised structure: selected chips |
| `--input` | `neutral-500` | `neutral-500` | `--input` | **control boundaries** — ≥3:1 on every surface |
| `--ring` | `accent-600` | `accent-400` | `--ring` | focus indicator |
| `--success` / `--warning` / `--danger` / `--info` | §2.3 | lightened, ink text | `--destructive` = `--danger` | status text, fills, borders |
| `--selection` | 20% `accent-500` | 30% `accent-500` | — | `::selection` |

**The surface ladder.** Page → card → floating layer. In light, elevation is
carried by border + shadow (the rungs are all near-white); in dark, by tonal
steps **plus** the alpha-boosted shadows. The pre-repair collapse —
`card == background == popover` at 1.00:1 — is enforced away by
`test/app-token-contrast.test.ts`, which holds each rung to a minimum step.

Measured (dark): background→surface **1.11:1**, surface→raised **1.22:1**,
background→raised **1.35:1**, wells sink **1.13:1** below the card, control
boundaries **3.1–4.2:1** on every surface. Before the repair: every rung
1.00:1, control boundaries 1.31:1.

### 2.5 The contrast contract

Three tiers, all enforced in `test/app-token-contrast.test.ts` against the
token file as a browser would paint it (var chains resolved, `color-mix`
evaluated, alpha composited):

1. **Text ≥ 4.5:1** on every surface it can land on, including soft tints
   (WCAG 2.1 §1.4.3).
2. **Meaningful non-text ≥ 3:1** — focus rings and control boundaries
   (WCAG 2.1 §1.4.11). This is what "adjacent surfaces ≥ 3:1" means: the pairs
   the audit measured at 1.31:1 were input borders, hover feedback and the
   ring against the page — *boundaries and states*.
3. **Surface ladder**: every rung distinct, with a documented minimum step, so
   the 1.00:1 collapse cannot return.

Note the deliberate scope of tier 2: the *decorative* ladder (a white card on
a near-white page) is separated by border and shadow, not by 3:1 of tone —
holding tone to 3:1 would put dark cards at L≈0.47 (mid-grey slabs) and grey
the light page. See open question **Q1**.

---

## 3. The closed scales

**Anything off-scale is a bug.** `test/token-scale-closure.test.ts` fails on a
new offender anywhere in `src/`.

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

`p-5`, `gap-1.5`, `py-18`, `pl-6.5`, `gap-[3px]` — all off-scale. The audit
found ~90 distinct steps; the ratchet in `test/baselines/token-offenders.json`
records what remains outside the migrated roots.

### 3.2 Type — 7 sizes

App chrome and marketing use the **same 7 steps**; hierarchy is built from
weight, tone and spacing first (R2).

```
 token          px/lh   tracking   weight    use
 ────────────────────────────────────────────────────────────────
 --br-text-xs    12/16   0          400–600   meta, helper, badges
 --br-text-sm    14/20   0          400–600   UI body default (labels, tables, forms)
 --br-text-base  16/24   0          400–600   content areas, marketing body
 --br-text-lg    20/28   −0.01em    600       card/section titles
 --br-text-xl    24/32   −0.015em   600–700   page titles
 --br-text-2xl   32/40   −0.02em    700       marketing h1/h2, empty-state headlines
 --br-text-3xl   40/48   −0.02em    700       marketing hero only
```

Weights: 400 / 500 / 600 / 700 only. Uppercase micro-labels: 12px / 600 /
`tracking-micro` (+0.04em). The audit's 22-size marketing soup and the app's
two-size (`xs`/`sm` = 87% of text) monotone are both off-system: a size
outside this table cannot be expressed in `text-*` utilities without failing
the closure test.

### 3.3 Radius — 4 / 6 / 8 / 12 / full

```
 --br-radius-xs   4px   badges, state layers
 --br-radius-sm   6px   buttons, inputs, selects, menu rows
 --br-radius-md   8px   cards, popovers, dialogs
 --br-radius-lg  12px   sheets, large modals, marketing cards
 (full)         ∞      avatars, dots, pill toggles
```

`rounded-xl` renders `lg` (kept for compatibility); `rounded-2xl/3xl` are
off-scale and flagged. `rounded-[inherit]` delegates a container's corner (a
scroll viewport) rather than choosing a step.

### 3.4 Elevation — 4 levels, surface + shadow pairs

Depth is shadows. Structure is borders. A border never fakes depth and a
shadow never fakes a divider (R10).

| level | surface | shadow | used by |
|---|---|---|---|
| `elev-0` | page or card + 1px `--border` | none | page, in-flow panels, `Card elevation="inline"` |
| `elev-1` | `--surface` | `shadow-elev-1` | floating cards (`Card elevation="floating"`), hover lifts, switch thumb |
| `elev-2` | `--surface-raised` | `shadow-elev-2` | popovers, dropdowns, selects, tooltips, menus |
| `elev-3` | `--surface-raised` + scrim | `shadow-elev-3` | dialogs, sheets, toasts |

Dark shadows use the alpha-boosted set in the token file — a light alpha is
invisible on a dark surface. Scrims: `bg-scrim` (dialogs) and `bg-scrim-soft`
(sheets) — ink at 80% / 50%, never pure black.

### 3.5 Motion — 120 / 180 / 240ms, one easing family

```
 --br-duration-fast   120ms   hover/press state layers, colour changes
 --br-duration-base   180ms   dropdowns, tooltips, accordions
 --br-duration-slow   240ms   dialogs, sheets, page transitions
 --br-ease-standard   cubic-bezier(0.2, 0, 0, 1)   entrances + exits
 --br-ease-decelerate cubic-bezier(0, 0, 0, 1)     entering from off-screen
 --br-ease-accelerate cubic-bezier(0.3, 0, 1, 1)   exits
```

`ease-enter`/`ease-exit` are aliases of `--br-ease-standard`. Every animation
is either wrapped in `prefers-reduced-motion: no-preference` or covered by the
global reduce override in the token file.

### 3.6 z-index — one ladder

```
 --br-z-base       0   normal flow
 --br-z-raised    10   hover-lifted cards, sticky row actions
 --br-z-sticky   100   sticky headers, panel toolbars, the dev badge
 --br-z-dropdown 1000  menus, combobox lists
 --br-z-overlay  1100  modal scrim
 --br-z-dialog   1200  dialogs, sheets
 --br-z-popover  1300  popovers above dialogs
 --br-z-toast    1400  toasts
 --br-z-tooltip  1500  tooltips (always top)
```

Use `z-(--br-z-dialog)`. A raw `z-50` is an off-scale value.

---

## 4. Component inventory

States: **D** default, **H** hover, **A** active/pressed, **F** focus-visible,
**X** disabled, **L** loading, **E** error. The state matrix in
`test/token-state-matrix.test.ts` asserts the declarations exist in each
primitive's source.

| # | Component | States | Density (padding / gap / min-height) |
|---|---|---|---|
| 1 | Button (primary/secondary/destructive/ghost/link) | D H A F X L | h 36/40/44, px-3/px-4/px-8; gap-2 icon↔label; `loading` prop renders a spinner + `aria-busy` |
| 2 | IconButton = Button `size="icon"` + Tooltip required | D H A F X L | 40×40; tooltip required |
| 3 | Toggle / SegmentedControl | D H A F X (selected = A) | h 36/40/44, px-3/px-2/px-4; selected = `data-[state=on]` accent layer |
| 4 | Input | D H F X L E | h-10, px-3 py-2, 1px `--input` boundary; hover → `--foreground`, error → `aria-invalid:border-destructive` |
| 5 | Textarea | D H F X L E | min-h-20 (80px), px-3 py-2 |
| 6 | Select | D H F X L E | mirrors Input exactly (the input spine) |
| 7 | Checkbox / Radio | D H F X E | 16px box, `rounded-sm`; checked fill = `--primary` |
| 8 | Switch | D H F X | track h-6 w-11, thumb 20px; hover lifts the thumb |
| 9 | Slider | D H F X | track h-2, thumb 20px, `--primary` boundary |
| 10 | Label | D X | text-sm/500; `peer-disabled:opacity-70` |
| 11 | Badge | D H | px-2 py-0.5, text-xs/600, `rounded-full` (chips are full — R8) |
| 12 | Tooltip | D | px-3 py-1, text-sm, elev-2 |
| 13 | Popover | D (trigger states on trigger) | p-4, rounded-md, elev-2 |
| 14 | DropdownMenu (items) | D H A F X | row min-h-8 (32px), px-2, gap-2; submenu elev-2 |
| 15 | Dialog | D (+ entering/exiting) | p-6, rounded-md, elev-3 + `bg-scrim`; title text-lg/600 |
| 16 | AlertDialog | D X (confirm L) | as Dialog; confirm = destructive Button |
| 17 | Sheet | D | p-6, gap-4, elev-3 + `bg-scrim-soft` |
| 18 | Tabs | D H A F X | list h-10 p-1; trigger h-8 px-3; active = surface + elev-1 |
| 19 | Accordion | D H A F | trigger py-4; content pb-4; no nested buttons (CLAUDE.md) |
| 20 | Card | D (H when interactive) | p-6; `elevation="inline"` (border) or `"floating"` (elev-1) — never both |
| 21 | Alert / Callout (default/success/warning/info/destructive) | D | p-4; soft tint + 1px status border + status text |
| 22 | Skeleton / Spinner / Progress | L | skeleton matches final metrics; progress track h-4 |
| 23 | PanelLoading / PanelError / PanelEmpty / PanelClear | L E D | px-4 py-8; error is `role="alert"` |
| 24 | SaveStatusIndicator | D L E | h-5, min-w-20; 12px text + spinner/check/alert icons |
| 25 | StateIcon | D | cross-fades two icons; motion never the only channel |
| 26 | Avatar / Separator / ScrollArea / Collapsible | D | avatar 40px; separators 1px hairlines |

Density note: the research's §C5 target density (28/32/40px controls, 14px
UI body) is a **product decision** — open question **Q3** in the research — and
this wave deliberately keeps the shipped metrics (36/40/44px controls) to
avoid a facelift. What is enforced is that every padding/gap comes from
§3.1. When Q3 lands, the control heights move in one PR.

---

## 5. Rules

Cite these by number in review.

| # | Rule | Verified by |
|---|---|---|
| **R1** | Every spacing value comes from §3.1. No `[13px]`, no `p-5`, no `gap-1.5`. | `token-scale-closure.test.ts` |
| **R2** | Every font size comes from §3.2. Hierarchy from weight/tone/spacing first. | `token-scale-closure.test.ts` |
| **R3** | Body text is `--foreground` (ink-toned, never `#000`); secondary text is `--muted-foreground`, never a smaller size alone. Colour decisions become roles, not hex. | `token-raw-colour.test.ts` + review |
| **R4** | Interactive primitives implement D/H/A/F/X; form controls also L/E. | `token-state-matrix.test.ts` |
| **R5** | Focus is `2px solid var(--ring)` at 2px offset on every interactive element (WCAG 2.4.7). | `token-state-matrix.test.ts` (global rule) |
| **R6** | Text ≥ 4.5:1; rings and control boundaries ≥ 3:1; the surface ladder keeps its steps. Both themes. | `app-token-contrast.test.ts` |
| **R7** | z-index comes from the §3.6 ladder. No raw `z-50`. | `token-scale-closure.test.ts` |
| **R8** | Radius comes from §3.3: cards/dialogs `md`, controls `sm`, chips `full`. | `token-scale-closure.test.ts` |
| **R9** | Hover/press feedback is state-layer alpha (`--accent`), not new solid colours. | review + `--accent` is a mix |
| **R10** | Floating layers use elev-1..3; structure uses borders. Never both for one element (see Card). | `token-state-matrix` + review |
| **R11** | One primary (solid) button per view region. Destructive = `destructive` variant, confirmed via AlertDialog when irreversible. | review |
| **R12** | Density rhythm: label→input 4px, field→field 16px, group→group 24px, headings 1.15–1.25, body 1.5–1.6. | review + §4 table |
| **R13** | Real content in review screenshots. Lorem is banned. | process |
| **R14** | Behaviour → layout → polish, in that order. | process |
| **R15** | Surface B never consumes `--br-*` tokens or app font variables. | `token-surface-isolation.test.ts` |

Enforcement extras: raw colour has named exceptions (capped, in
`token-raw-colour.test.ts`); reduced motion is covered by
`ui-polish.test.ts`; the Biome ratchet stays at 0.

---

## 6. Enforcement and the ratchet

| Test | Rule | Strict where | Ratchet where |
|---|---|---|---|
| `token-scale-closure.test.ts` | R1 R2 R7 R8 | `src/components/ui`, `src/app`, `src/styles` | the rest of `src/` (features + marketing: the audit's ~27 singleton values) |
| `token-raw-colour.test.ts` | R3 | everywhere except the named, capped exceptions | — |
| `app-token-contrast.test.ts` | R6 | the token file itself | — |
| `token-state-matrix.test.ts` | R4 R5 + motion tokens | `src/components/ui` | — |
| `token-surface-isolation.test.ts` | R15 | Surface B paths | — |
| `ui-polish.test.ts` | reduced motion, press scale, elevation shadows | — | — |

The ratchet baseline is `test/baselines/token-offenders.json`: a count per
file per offender. **A new offender fails the build; a paid-off baseline entry
also fails** (with a message to delete it), so the debt can only shrink. To
re-record after a deliberate scope change:
`TOKEN_OFFENDERS_WRITE=1 npx vitest run test/token-scale-closure.test.ts`.
Never grow it by hand.

---

## 7. Surface isolation

The resume document (Surface B) has its own design system, in the Typst
templates, measured in points: its type scale, its margins, its black-first
palette, and **no radius, shadow or motion** — paper is flat and static. It
must never read `--br-*` tokens or the app's font variables, because screen
metrics reflow pages (`token-surface-isolation.test.ts`).

The document's colour pickers and template palettes carry hex values **as
data** — the document's colours are user content, not chrome tokens.

---

## 8. Open questions for the maintainer

1. **(Q1) Surface separation vs. 3:1.** The wave brief says "adjacent surfaces
   ≥3:1". This system reads that as the WCAG 1.4.11 pairs — control
   boundaries, state indicators, focus rings (all ≥3:1, both themes) — and
   gives the *decorative* ladder documented tonal steps + border + shadow
   instead. A literal 3:1 between surface rungs would force dark cards to
   L≈0.47 and grey the light page. Confirm, or say "3:1 literally" and the
   ladder gets rebuilt.
2. **(Q2)** Dark-mode default: follow system, default light, or default dark
   (currently dark)? And the resume preview stays paper-white in dark app
   mode?
3. **(Q3)** Density: workbench UI body 14px + 32px controls (research §C5) or
   keep the shipped 36/40/44? This gates the component heights in §4.
4. **(Q6)** Font subsets: `next/font/google` loads latin only; non-Latin names
   fall back to system fonts in the screen preview. Widen?
5. **(Q8)** Accent is interaction-only (this system assumes yes). Confirm no
   brand-colour callouts.
