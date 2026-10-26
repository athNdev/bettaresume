# Tool visual design — BettaResume (R3)

**Status**: research deliverable, no code changed. Produced from `docs/plan/round2/r3-tool-visual-design.md`.
**Reads first**: `docs/research/ui-audit.md` (measured defects, per-file refs) and `docs/research/design-systems.md`
(token architecture §C4 — the "alphabet"). Tokens are the alphabet; this document is the writing: how
surfaces, type, colour and ornament are *composed* into a look that answers the maintainer's
"it looks exactly the same, I expected much more".

**Honesty note**: §1 records the named products' visual *idioms* (how they look) as design knowledge,
not measurements copied from their code — competitor values are described qualitatively. Every px value
in §2–3 is BettaResume's own and is checked against the hard constraints: 3:1 control boundaries,
4.5:1 body text, both themes. Contrast numbers are computed from the oklch values with Y ≈ L³, the same
method the UI audit uses. Where composition needs something the token alphabet lacks, §2.2 collects the
delta (D1–D5) instead of silently diverging from `design-systems.md` §C4.

---

## 1. What makes these tools feel premium

### 1.1 The nameable techniques

| # | Technique | What it actually is | Who does it | Where BettaResume spends it |
|---|---|---|---|---|
| T1 | **Tonal surface ladder with a 1-step lift** | 3–4 surface tones a few oklch L-steps apart; "higher" = *lighter* in both themes | Linear, Stripe, Notion Calendar | §2.2 ladder |
| T2 | **Two-layer shadow: tight contact + wide ambient** | a 1–2px-offset tight shadow plus a large, very low-alpha ambient one — never a single stock `shadow-sm` | Linear, Vercel, Stripe | §2.2 shadow recipes |
| T3 | **1px top highlight on elevated dark surfaces** | `inset 0 1px 0 oklch(1 0 0 / 5–8%)` simulates light catching the top edge; what actually sells "layered" in dark | Linear, Raycast | every dark floating layer |
| T4 | **Hairlines drawn, not implied** | 1px edges at low-but-real contrast; the border is *edge drawing*, not depth | Vercel, Figma, Resend | §2.2 border hierarchy |
| T5 | **Monochrome discipline with one accent moment** | ≥90% greyscale; accent appears at three sites only: primary action, selection, focus/links | Vercel, Resend, Linear | §2.3 |
| T6 | **State layers instead of new solids** | hover/press = 6–12% alpha mix of text or accent over the surface | Material 3, Linear | all interactive components |
| T7 | **Tinted soft fills for status** | 10–14% hue tint background + hue-darkened text + icon; never raw palette colours | Stripe, Linear, GitHub | chips, callouts |
| T8 | **Micro-typographic labels** | 11–12px uppercase, +0.04–0.06em tracking, muted tone, 600 weight — the "tool chrome" signal | Figma, Raycast, Stripe | rail group headers, panel headers |
| T9 | **Tight tracking on titles** | −0.01 to −0.02em on 16px+ semibold; titles read as machined | Linear, Vercel, Superhuman | page/panel titles |
| T10 | **Kbd chips as affordance** | tiny bordered key caps in menus and tooltips — the pro-tool tell | Linear, Raycast, Superhuman | menus, keyboard hints |
| T11 | **Icon + label rhythm** | 16px icon, 8px gap, icon one tone quieter than the label; icon-only ⇒ tooltip mandatory | Figma, Linear | everywhere |
| T12 | **Icon tiles in empty states** | 40px rounded tinted square + 20px glyph, then headline / body / one CTA | Tailwind UI, Stripe, Clerk | §2.9 |
| T13 | **One hero surface gets the art direction** | exactly one surface is allowed shadow stacks, vignettes or gradients (Stripe's charts, Figma's canvas, Raycast's root window); the rest stays quiet | Stripe, Figma, Raycast | the preview stage (§2.10) |
| T14 | **Real objects are the texture** | the product's actual content (rows, documents, charts) is the visual interest; no decorative filler | Stripe, Linear, Notion Calendar | resume cards, preview page |
| T15 | **Skeletons that keep the shape** | loading placeholders match final metrics exactly — same box, same lines | Vercel, Linear, Notion | §2.9 |
| T16 | **Segmented controls for view switching** | 32px pill group with a sunken selected segment instead of loose toggle buttons | Notion Calendar, Figma | pane switchers, stepper groups |
| T17 | **Left-edge selection indicator** | 2px accent bar + soft tint marks selection; survives the squint test | Linear, Stripe, GitHub | section rail, lists |
| T18 | **Quiet motion in three durations** | ~120ms state changes, ~180ms popovers, ~240ms modals; nothing floats in slowly | Superhuman, Linear, Vercel | §3 recipe 11 |
| T19 | **Warm-neutral paper tones** | off-white pages rather than pure white; ink text neutral-950, never #000 | Notion, Stripe | light theme base |
| T20 | **One ornamental gesture** | a single gradient hairline / glow / colour field used *once*, so it reads as brand, not noise | Arc (sidebar tint), Raycast (gradient icon), Linear (gradient text) | §2.10 |

### 1.2 Product notes — how they look

- **Linear** — the reference for composed depth in dark: surfaces step up in tone (L .16 → .20 → .24-ish
  equivalents), edges are 1px hairlines at low alpha, floating layers add a contact+ambient shadow pair
  and the dark-mode top highlight. Indigo appears on primary buttons, selection and focus only. Rows are
  ~32px, text 13–14px, titles semibold with tight tracking. Kbd chips trail menu items. Personality is
  in the *precision*, not in colour.
- **Vercel** — monochrome discipline: black/white primaries, borders do most elevation work, 6px radii,
  status communicated by small dots and tiny uppercase labels. Marketing gets huge display/body size
  contrast; the product gets almost none — hierarchy is tone + weight.
- **Raycast** — density with one personality moment: deep neutral window, hairline + strong ambient
  shadow on the floating root, purple gradient reserved for the icon/tiles. Command rows are dense with
  trailing shortcut hints; section headers are 11px uppercase.
- **Superhuman** — speed as a visual value: flat white surfaces, 1px borders, zero decoration, motion at
  ~100–150ms. Colour exists only for status. The restraint *is* the brand.
- **Arc** — personality over density: a user-chosen tinted sidebar colour field, large radii, overlapping
  planes. It is the one surveyed product that spends its ornament budget in the chrome — wrong register
  for a document tool; borrow nothing but the idea of *one* controlled colour field (§2.10).
- **Notion** — warmth from off-white paper tone and tone-based hierarchy (grey text de-emphasis rather
  than size changes), hover-revealed row affordances, popovers with 8px radius and one big soft shadow.
  Three weights, two sizes, endless hierarchy.
- **Notion Calendar (Cron)** — hairline grids, tiny uppercase day/label type, colour reserved for event
  categories, a minimal top bar with centered segmented controls. Proof that a calendar-like tool can be
  95% grey and still feel designed.
- **Figma** — panel chrome: uppercase 10–11px panel headers, 28–32px property rows, hover plates on
  32px tool squares, one selection blue. The canvas is the hero surface; the chrome never competes.
- **Stripe Dashboard** — tonal surfaces (tinted page, white cards, soft two-layer shadows), 15px body,
  status pills as 10% tints with strong text, data as the visual anchor. Warmth lives in the chart
  colours, never in the buttons.
- **Resend** — extreme monochrome: hairlines, 6px radii, black/white primaries, generous vertical
  rhythm. The quietest product on this list and the most "premium" per pixel.
- **Clerk** — modern SaaS chrome: tinted blue-50 info panels, coloured focus rings, 8px radii,
  gradient-backdrop component showcases. The tinted-panel idiom is right for marketing, wrong for the
  workbench.
- **Tailwind UI** — the composed patterns to steal structurally: icon tiles in empty states, list rows
  with avatar + meta line, description lists, and layered shadow pairs (`shadow-sm` cards vs
  `shadow-lg` modals) instead of one shadow everywhere.

**The through-line**: premium is not decoration — it is *consistent layer logic* (tone + hairline +
layered shadow doing separate jobs), *disciplined colour* (accent as event), *micro-typographic
precision* (labels, tracking, kbd chips), and *one* art-directed hero surface.

---

## 2. A visual language spec for BettaResume

### 2.1 Mood / personality

**"Ink, paper, and instrument."** A workbench that treats the resume as a document being machined toward
an interview — calm, exact, editorial. Not playful (Arc), not enterprise-dense (Carbon), not
consumer-soft (M3). Precision and trust over personality: this is a tool people use while anxious about
their career.

Binding visual consequences:

1. Neutrals carry ≥92% of every screen; the accent is an *event*, not a theme.
2. The highest-contrast object on any screen is resume content (preview page, thumbnails, real names) —
   never a button. (Fixes the audit's §6 hierarchy inversion.)
3. Everything is drawn with a straightedge: 4px rhythm, 6/8px radii, hairlines, no blobs.
4. Warmth comes from tone (warm-neutral greys, paper white) and content (real names, real bullets), not
   from rounded shapes or colour.
5. Dark mode is a workbench at night: surfaces step up in tone; nothing glows.

### 2.2 Surface & depth model

**Four levels. Three jobs. Tone lifts in dark, shadow lifts in light.**

| Level | Token | Light | Dark (D1) | Job |
|---|---|---|---|---|
| L0 page | `--br-bg` | `neutral-50` | `neutral-950` (L .145) | regions, columns; no shadow |
| L1 surface | `--br-surface` | `neutral-0` | `neutral-800` (L .278) | cards, floating panels |
| L2 overlay | `--br-overlay` | `neutral-0` | `neutral-700` (L .373) | popovers, dropdowns, sheets, dialogs |
| sunken | `--br-sunken` | `neutral-100` | `neutral-900` (L .205) | input wells, toolbar strips, kbd fills — *below* the surface, never floating |

Measured separations (Y ≈ L³): dark L1 vs L0 = **1.31:1** (was 1.00:1 — the audit's core complaint);
dark L2 vs L0 = 1.92:1; dark sunken vs L1 = 1.31:1 recessed. Light separates by fill 1.04:1 plus the
shadow and hairline. The asymmetry is a rule: **in light, shadows lift; in dark, tone lifts** (M3's
surface-container lesson). The hairline exists in both; the top highlight exists in dark only.

**Shadow recipes — two layers, always (T2).** Contact shadow (1–2px offset, tight) + ambient shadow
(4–48px, very low alpha). Dark multiplies alphas ×2.5 because dark shadows must do more (the
`globals.css` comment already says this):

```css
:root {
	--br-elev-1: 0 1px 1px oklch(0 0 0 / 0.04), 0 1px 2px oklch(0 0 0 / 0.06);          /* cards */
	--br-elev-2: 0 1px 2px oklch(0 0 0 / 0.06), 0 4px 12px oklch(0 0 0 / 0.08);         /* popovers, sheets */
	--br-elev-3: 0 2px 4px oklch(0 0 0 / 0.05), 0 8px 24px oklch(0 0 0 / 0.10),
	             0 24px 48px oklch(0 0 0 / 0.08);                                      /* dialogs */
	--br-elev-hover: 0 1px 2px oklch(0 0 0 / 0.06), 0 8px 20px oklch(0 0 0 / 0.10);     /* hover lift */
}
.dark {
	--br-elev-1: 0 1px 1px oklch(0 0 0 / 0.20), 0 1px 2px oklch(0 0 0 / 0.16);
	--br-elev-2: 0 1px 2px oklch(0 0 0 / 0.25), 0 4px 12px oklch(0 0 0 / 0.20);
	--br-elev-3: 0 2px 4px oklch(0 0 0 / 0.25), 0 8px 24px oklch(0 0 0 / 0.25),
	             0 24px 48px oklch(0 0 0 / 0.20);
	--br-elev-hover: 0 1px 2px oklch(0 0 0 / 0.25), 0 8px 20px oklch(0 0 0 / 0.25);
}
```

**Top highlight (T3)** — every dark floating layer adds `inset 0 1px 0 oklch(1 0 0 / 0.06)`
(0.08 on dialogs). It is the single cheapest trick for making dark UI read as layered.

**Border hierarchy (D2)** — three roles with different jobs, replacing C4.4's single
`--br-border` + `--br-border-strong` pair:

| Role | Light | Dark | Job | Contrast vs page |
|---|---|---|---|---|
| `--br-border` (hairline) | `neutral-200` | `neutral-700` | structure: card edges, dividers, panel seams (decorative — exempt from 3:1) | 1.2:1 / 1.9:1 |
| `--br-border-control` | `oklch(0.63 0.008 250)` | `neutral-500` | **interactive boundaries** — inputs, outline buttons, selects | **3.4:1 / 4.2:1** ✓ |
| `--br-border-selected` | `accent-600` | `accent-400` | selection, checked state | ≥3:1 ✓ |

Hairlines draw edges; only `--br-border-control` draws controls. This is how the 3:1 constraint is met
without turning every divider into an admin-panel rule.

**Deltas to `design-systems.md` §C4** (collected; everything else consumes `--br-*` as written):

- **D1 — dark ladder revision.** C4.4/C4.7 set dark surface = `neutral-900` (1.10:1 on bg) with
  elevated layers at `neutral-800`. 1.10:1 still reads flat — the audit measured the failure mode of
  exactly this kind of undershoot. Settle one ladder: bg `950` / sunken `900` / surface `800` /
  overlay `700`.
- **D2 — border roles split** (table above): hairline / control / selected. `--br-border-strong` is
  retired (its jobs are covered).
- **D3 — `--br-text-subtle` is icon-tone only in dark.** `neutral-500` on dark bg is 4.18:1 — fine for
  icons (3:1) but below 4.5:1 for text. Micro-label text uses `--br-text-muted` (7.6:1 both themes).
- **D4 — card rule refined.** C5 #24 says "elev-1 or border, never both"; in practice a floating card
  needs the hairline as *edge drawing* and the shadow as *lift*. What stays banned: shadows as
  dividers, borders as fake lift.
- **D5 — Label role = 12/600, +0.02em, muted** (C5 said 14/500). Builds label-vs-value hierarchy
  without adding sizes (§2.4).

### 2.3 Colour model

**Accent budget: three sites per view, maximum.**

1. The one solid primary button in that region (§2.6).
2. Selection: tint fill + 2px left rule (§2.7).
3. Focus ring + links.

Everything else is neutral. Status hues (`--br-success` / `--br-warning` / `--br-danger` / `--br-info`,
C4.3) appear **only where they carry meaning** — save state, review findings, import warnings, delete —
and always as the chip/callout formula: 10–14% `color-mix` tint background + 1px same-hue border +
hue-darkened text (light) / hue-lightened text (dark) + a 14px icon. Never colour alone (icon or word
redundant with it).

| Accent site | Light | Dark | Measured |
|---|---|---|---|
| primary button | `accent-600` bg + `neutral-0` text | `accent-400` bg + `neutral-950` text | 5.3:1 / 7.6:1 ✓ |
| selection tint | `color-mix(accent-500 10%, transparent)` | `color-mix(accent-300 14%, transparent)` | + `--br-border-selected` rule carries 3:1 |
| focus ring | `accent-600` | `accent-400` | ≥3:1 vs both neighbours ✓ |
| links | `accent-500` | `accent-300` | 4.6:1 / 5.5:1 ✓ |

**Tinted surfaces** exist in exactly two forms: selection tints (above) and status-soft callout fills.
No full-bleed tinted panels in the app chrome (the Clerk-style tinted panel is a marketing idiom).

**Squint test (mandatory per R1/B1)**: with the accent desaturated, every screen must still read in the
right order. If it doesn't, the problem is hierarchy, not colour.

Colour also lives in *content*: template palettes inside thumbnails and the preview page are allowed
saturated colour — they are the document (audit §5 confirms these are the only saturated things on
screen today; that is correct behaviour once chrome hierarchy is fixed so they don't have to compete).

### 2.4 Typography hierarchy

One family (Inter). Roles, not ad-hoc sizes:

| Role | Size / lh | Weight | Tracking | Tone | Use |
|---|---|---|---|---|---|
| page-title | 24 / 32 | 600 | −0.015em | text | dashboard page title, welcome |
| doc-title | 20 / 28 | 600 | −0.01em | text | editor document name; dialog titles |
| panel-title | 16 / 24 | 600 | −0.01em | text | card titles, sheet titles |
| body | 14 / 20 | 400 | 0 | text | UI body default |
| body-strong | 14 / 20 | 500–600 | 0 | text | row titles, input values |
| label (D5) | 12 / 16 | 600 | +0.02em | muted | field labels |
| micro (T8) | 12 / 16 | 600 | +0.04em, uppercase | muted | rail/panel group headers |
| meta | 12 / 16 | 400 | 0 | muted | dates, counts, helper text |
| kbd | 11 / 16 | 600 | +0.02em | muted | key caps only |

**Contrast without size** — hierarchy is built from, in order: (a) tone ladder
`text → muted → subtle`, (b) weight 400/500/600/700, (c) spacing role (label 4px above its input,
groups 24px apart), (d) case + tracking for micro labels. A new size is a system change (R2).

**Per-view budget: at most two sizes.** Editor view = 20 (doc title) + 14 (everything else) with 12px
meta/labels as the tonal layer. Dashboard = 24 (page title) + 14. Marketing keeps its display scale but
collapses body copy to **one** 16px step and captions to **one** 12px step — killing the audit's
four-body-sizes-within-0.8px and the 0.32px caption ladder.

### 2.5 Density model

Control scales (C5): **28 / 32 / 40px** (sm / md / lg), default 32. Toolbar rows 40. Rail rows 36.
List/table rows 40. Inputs 32 (textarea min 80). Radii: 4 chips / 6 controls / 8 panels / 12 modals
(C4.8).

Rhythm (the whole app, one system — fixes the audit's three stacked form rhythms):

- label → control: 4px
- control → helper/error: 4px
- field → field: 16px
- group → group: 24px (form-section level: 32px)
- panel header → content: 16px
- everything snaps to the 4px core (2px half-step for optical nudges only)

Widths: form measure capped at **640px** (audit: inputs stretch to ~560px+ and lose the input spine);
two-column field rows only for short pairs (first/last name, city/country); long text always full width.

Marketing steps the spacing scale down at `md` (96 → 64 section padding) per C4.11 — tokens don't
change value, only which step is used.

### 2.6 Button system

| Variant | Light | Dark | Use |
|---|---|---|---|
| primary | `accent-600` bg, white text; hover `accent-700`; active `accent-800` | `accent-400` bg, `neutral-950` text; hover +8% white state layer; active −8% black | **one per view region** |
| secondary | surface bg + `--br-border-control` + text | same | alternatives in a footer/row |
| ghost | transparent; hover 6% text state layer | same | toolbars, icon buttons, row actions |
| destructive | `--br-danger` bg, white text | same | confirm dialogs only; inline delete is `text-danger` ghost |
| link | `accent-500`/`accent-300` text, underline-offset 2 | — | inline navigation |

Sizes: sm 28 (`px-3`, 12/600 label) · md 32 (`px-4`, 14/500) · lg 40 (`px-6`, 14/600). Icon ↔ label
gap 8px, icons 16px stroke 1.75, icon one tone quieter than label (T11). Icon-only buttons are square
(28/32) and **require** a tooltip + `aria-label`.

**Primary contrast (audit §6)**: the primary button is the strongest *action*, never the strongest
*object*. After §2.4 the editor's document name (20/600, near-white) outranks the 32px accent Export
button. One primary per region (R11): editor top bar = Export · dashboard top bar = New resume ·
dialog footer = the confirming action · form column = **none** (auto-save has no button).

Disabled: 50% text, no fill swap (the audit's "solid grey slab reads enabled" is banned), `cursor:
not-allowed`, and a tooltip that says *why* (e.g. "Name your resume first"). Loading: spinner replaces
leading icon at fixed button width.

### 2.7 Panel / card system

**Regions vs floating cards.** Rails, columns and toolbars are *regions*: separated by 1px hairline
seams, no radius, no shadow (D4). Cards and overlays *float*: hairline + elev-1 (cards) or elev-2/3
(overlays). Never a card inside a card.

**Panel anatomy**:
- Header: 44px row — micro label (12/600 uppercase +0.04em muted) or panel-title left, action cluster
  (28px ghost icon buttons) right, 1px hairline under.
- Body: `p-4` dense / `p-6` default; single rhythm from §2.5.
- Footer (optional): 44px, hairline top, actions right; secondary left-most, primary right-most.

**Card anatomy (dashboard resume card)**:
- Thumbnail: page-shaped frame (8.5:11), hairline + inner 1px ring so white paper reads as *paper on a
  surface*; skeleton while loading (§2.9).
- Title row: title (16/600, one line, ellipsis) **owns the row**; overflow menu pinned top-right as a
  28px ghost button (no collision — fixes "Harvard Appli… …").
- Meta row: one 12px muted line, left-aligned ("Updated 10/25/2026 · Standard · 2 pages") — kills the
  phantom right column.
- Interactive cards only: hover = `translate-y(-2px)` + `--br-elev-hover`, 180ms.

**Accordion entries** (form items): 36px trigger row, hairline between entries, chevron left of title,
row actions right; expanded body indented 12px with the accent left rule (§2.10) on the *active* entry.

### 2.8 Navigation model

**Editor — three zones** (desktop ≥1024):

| Zone | Width | Content |
|---|---|---|
| Section rail | 240 fixed, collapsible | micro header "Sections · 8", 36px rows (drag handle, title, visibility, count chip), "Add section" = dashed secondary button at list end, then TEMPLATES / Library collapsibles |
| Form column | fluid, 640 measure cap | 44px panel header (section name 16/600 + type label), one auto-save status chip in the header, groups at 24px rhythm |
| Preview stage | fluid, min 420 | sticky 44px formatting toolbar (sunken strip) + the paper stage (§2.10) |

Top bar (56px, hairline bottom): back icon-button → title block (doc-title name + one 12px meta line
`Standard · 2 pages · Saved 2m ago`) → spacer → SaveState chip · Review (secondary + count badge) ·
Import (ghost) · **Export (primary)**. The name appears **once** — the variation dropdown shows only
"Base"/"Variation" state + switcher icon (audit: name printed twice, truncated worse in the dropdown).

Resize handles: 6px hit area with a persistent 1px grip line (2px `--br-border-control`), hover turns
`--br-border-selected` — currently invisible until hover (audit §7).

**Adaptive shell (<1024)** — the audit's #1 defect (three panels squeeze into 390px) becomes a designed
mode: one pane at a time with a 32px segmented switcher (**Sections | Edit | Preview**) under the top
bar; the section rail becomes a slide-over sheet; the preview stage goes full-bleed. The top bar keeps
the name (truncating the meta line first). Variation controls move into the switcher row so they exist
below 768px (audit: currently `hidden md:flex`).

**Dashboard** — top bar 56 (page-title "Library" + search + New resume primary) · left rail 240
(stats as quiet rows — merged with the "N resumes" line that duplicates them — then filters) ·
content grid `repeat(auto-fill, minmax(240px, 1fr))` filling the viewport height (fixes the ~40% dead
band). Below `lg`: rail collapses to a chip filter row above the grid; 390px = single-column cards.

z-order per C4.10; dropdowns and popovers always elev-2+, dialogs elev-3 + scrim
(`color-mix(in oklab, var(--br-bg) 60%, black)`).

### 2.9 Empty / loading / error states

**A designed empty state contains four things (T12)**: icon tile · headline · one muted line · the one
action that fixes the emptiness. Max-width 360px, centered **inside the content region** (never below
where content would be — audit's empty state sits after a phantom result summary). Optional secondary
text link; never two CTAs.

Icon tile recipe: 40px square, `--br-radius-md`, `color-mix(in oklab, var(--br-accent-500) 12%,
transparent)` bg, 20px `accent-600`/`accent-300` glyph.

| Surface | Headline | Body | Action |
|---|---|---|---|
| Dashboard (true empty) | Start your first resume | Build it section by section, or import an existing PDF and we'll read it in. | **Create resume** + text link "Import a PDF" |
| No search results | No resumes match "…" | Try a different term or clear the filters. | Clear filters |
| No archived | Nothing archived | Archived resumes stay out of the way until you restore them. | — (quiet) |
| Editor, no sections | This resume has no sections yet | Add the first one — Experience is usually where readers look first. | **Add section** |
| Library empty | Your library is empty | Save a section above to reuse it across resumes. *(keep the existing copy — it's good)* | — |
| Review clear | Nothing to fix | No blocking issues in this resume right now. *(success-soft icon tile, not a dashed one-off box)* | — |

**Loading (T15)**: skeletons keep the shape of what replaces them.
- Thumbnail skeleton = the same page frame with 3–4 grey text-line bars (replaces the icon-in-box that
  3 of 4 mobile cards show today — `resume-thumbnail.tsx:179`).
- Typst compiling = the page frame + a 4px determinate bar + 12px muted "Typesetting…" (the page area
  currently shows *nothing*).
- Card skeleton metrics = the real card metrics (audit: shape change on load).
- Shimmer is a dark-mode nicety, gated by `prefers-reduced-motion`; light mode uses static fills.

**Error**: always a Callout (`danger-soft` tint + icon + 14px message + action) pinned at the top of
the region it affects. Preview render failure gets its own state inside the page frame (callout +
"Retry render") — not a toast. Export failure: toast + the menu item returns to rest with its label
restored.

### 2.10 Ornament budget

**Spend here (in order):**
1. **The preview stage** (the one hero surface, T13): a subtly vignetted field
   (`radial-gradient(120% 100% at 50% 0%, text-4%, bg)`) with the paper floating on a 3-layer page
   shadow (§3 recipe 7). In dark the page gets a top-edge highlight so it reads as a sheet, not a hole.
2. **Selection language**: accent tint + 2px left rule + check icon (rail rows, template rows, list
   rows). It is the app's most-repeated accent moment and it carries meaning.
3. **Empty-state icon tiles** (§2.9).
4. **Kbd chips** in menus and tooltips (`⌘E` export, `⏎` open, `esc` dismiss).
5. **One gradient hairline** (T20): a 1px `linear-gradient(90deg, transparent, accent-400, transparent)`
   at the top edge of the editor's active form group — used exactly once in the app chrome.

**Stay quiet**: rails, forms, tables, dialog interiors, marketing body sections. No gradients on
buttons, no glows, no decorative backgrounds behind work surfaces. The ornament is in *finish*
(highlights, rhythms, optical alignment), not in added shapes.

**Surface B is out of scope by construction**: the resume document stays print-honest, single-column,
paper-white in both app themes, with no app shadows, radii or motion (R15; C4.13). Its template
palettes are its own.

---

## 3. Concrete CSS / Tailwind recipes

All recipes consume the `--br-*` tokens (design-systems §C4 + the D1–D5 deltas). In Tailwind v4 these
compile to `shadow-elev-*`, `bg-surface`, `border-control` etc. via `@theme` aliases.

**1. Floating panel (card) — tone + hairline + two-layer shadow + dark highlight**

```css
.br-panel {
	background: var(--br-surface);
	border: 1px solid var(--br-border);
	border-radius: var(--br-radius-md);
	box-shadow: var(--br-elev-1);
}
.dark .br-panel {
	box-shadow: var(--br-elev-1), inset 0 1px 0 oklch(1 0 0 / 0.06);
}
```

**2. Region seam (rails, columns) — no shadow, hairline only**

```css
.br-region { background: var(--br-bg); border-right: 1px solid var(--br-border); }
/* Tailwind: bg-background border-r border-border */
```

**3. Tonal sunken well (inputs, toolbar strips, kbd fills)**

```css
.br-sunken {
	background: var(--br-sunken);
	border: 1px solid var(--br-border-control);   /* interactive: 3:1 (D2) */
	border-radius: var(--br-radius-sm);
}
.br-sunken-static { background: var(--br-sunken); border-radius: var(--br-radius-sm); } /* strips: no border */
```

**4. State layers (hover/press) — alpha, never new solids (R9)**

```css
.br-state { position: relative; }
.br-state::after {
	content: ""; position: absolute; inset: 0; border-radius: inherit;
	background: color-mix(in oklab, var(--br-text) 6%, transparent);
	opacity: 0; transition: opacity var(--br-duration-fast) var(--br-ease-standard);
}
.br-state:hover::after { opacity: 1; }
.br-state:active::after { background: color-mix(in oklab, var(--br-text) 10%, transparent); }
```

**5. Selection row (T17) — tint + 2px left rule + check**

```tsx
<li className="relative h-9 rounded-[6px] pl-3 pr-2
	hover:bg-[color-mix(in_oklab,var(--br-text)_6%,transparent)]
	data-[selected=true]:bg-[color-mix(in_oklab,var(--br-accent-500)_10%,transparent)]">
	<span aria-hidden className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full
		bg-[var(--br-border-selected)] opacity-0 data-[selected=true]:opacity-100" />
	{/* title row + check icon when selected */}
</li>
```

**6. Status chip / callout (T7) — tint + hue text + icon, both themes**

```css
.br-chip {
	display: inline-flex; align-items: center; gap: 4px;
	padding: 2px 8px; border-radius: var(--br-radius-xs);
	font: 600 12px/16px var(--font-inter);
	background: color-mix(in oklab, var(--hue) 12%, transparent);
	border: 1px solid color-mix(in oklab, var(--hue) 28%, transparent);
	color: color-mix(in oklab, var(--hue) 82%, black);      /* light: darkened → ≥4.5:1 */
}
.dark .br-chip {
	color: color-mix(in oklab, var(--hue) 60%, white);      /* dark: lightened → ≥4.5:1 */
}
/* --hue is --br-success | --br-warning | --br-danger | --br-info */
```

**7. The paper stage (T13) — the one art-directed surface**

```css
.br-stage {
	background: radial-gradient(120% 100% at 50% 0%,
		color-mix(in oklab, var(--br-text) 4%, var(--br-bg)), var(--br-bg));
}
.br-page {
	background: #ffffff;                                   /* Surface B: paper stays paper */
	border-radius: 2px;                                    /* a sheet, not a card */
	box-shadow: 0 1px 2px oklch(0 0 0 / 0.08),
	            0 8px 24px oklch(0 0 0 / 0.10),
	            0 24px 56px oklch(0 0 0 / 0.12);
}
.dark .br-page {
	box-shadow: 0 1px 2px oklch(0 0 0 / 0.35),
	            0 8px 24px oklch(0 0 0 / 0.40),
	            0 24px 56px oklch(0 0 0 / 0.45),
	            inset 0 1px 0 oklch(1 0 0 / 0.10);           /* sheet top edge in dark */
}
```

**8. Skeleton that keeps the shape (T15)**

```css
.br-skeleton {
	background: var(--br-sunken);
	border-radius: var(--br-radius-xs);
}
@media (prefers-reduced-motion: no-preference) {
	.dark .br-skeleton {
		background: linear-gradient(90deg, var(--br-sunken) 25%,
			color-mix(in oklab, var(--br-text) 6%, var(--br-sunken)) 50%, var(--br-sunken) 75%);
		background-size: 200% 100%; animation: br-shimmer 1.4s linear infinite;
	}
}
```

**9. Kbd chip (T10)**

```css
.br-kbd {
	font: 600 11px/16px var(--font-inter); padding: 1px 5px;
	border-radius: var(--br-radius-xs); background: var(--br-sunken);
	border: 1px solid var(--br-border); color: var(--br-text-muted);
	box-shadow: 0 1px 0 var(--br-border);
}
```

**10. Focus ring + primary button (state-complete family)**

```css
.br-focus:focus-visible { outline: 2px solid var(--br-ring); outline-offset: 2px; }
.br-btn-primary {
	background: var(--br-primary); color: var(--br-primary-text);
	border-radius: var(--br-radius-sm); font: 600 14px/20px var(--font-inter);
	box-shadow: var(--br-elev-1), inset 0 1px 0 oklch(1 0 0 / 0.08);  /* dark-safe */
	transition: background var(--br-duration-fast) var(--br-ease-standard);
}
```

**11. Motion (T18)** — `--br-duration-fast 120ms` state changes · `--br-duration-base 180ms`
popovers/accordions/hover-lift · `--br-duration-slow 240ms` dialogs/sheets; easings per C4.9; every
transition wrapped in `prefers-reduced-motion: no-preference` or given a reduce fallback.

**12. The one gradient hairline (T20)**

```css
.br-accent-edge { position: relative; }
.br-accent-edge::before {
	content: ""; position: absolute; inset: 0 0 auto 0; height: 1px;
	background: linear-gradient(90deg, transparent, var(--br-accent-400), transparent);
	opacity: 0.6;
}
```

---

## 4. The 20 highest-impact visual changes (priority order)

Each: what changes, before → after, where (audit refs). Ordered by how much they change the
"flat, grey, uniform" verdict per unit of work.

1. **Rebuild the surface & depth model (both themes)** — `globals.css:129-169`, `card.tsx`,
   `dialog.tsx`, `sheet.tsx`. Before: card = page = popover (1.00:1), borders 1.31:1, unused `--elev-*`,
   everything `shadow-sm`. After: 4-level tonal ladder, hairline vs control-border split (≥3:1),
   two-layer shadows wired into every floating layer, dark top-highlight. Effect: the app stops reading
   as one grey field; panels visibly *sit on* the page in dark.
2. **Accent + button system** — `button.tsx`, editor header, dashboard header. Before: white `bg-primary`
   slab is the brightest object in dark chrome; disabled primary reads enabled. After: accent-600/400
   primaries, 28/32/40 sizes, one primary per region, disabled = 50% + tooltip reason. Effect: colour
   becomes an event; Export stops out-shouting the document.
3. **Type & tone hierarchy** — `resume-editor.tsx:1173`, all labels, marketing body. Before: 2-size
   monotone (xs/sm = 87%), weight-500 everywhere; marketing has 22 sizes. After: role scale (20/24
   titles, 12/600 labels + micro, 12 muted meta), tone ladder for hierarchy, marketing body = one 16px
   step. Effect: labels read as labels, titles as titles, without new sizes.
4. **Editor top bar re-composition** — `resume-editor.tsx:1146-1265`, `variation-manager.tsx:115`.
   Before: name 14px + raw template key, name shown twice, four button styles in one row. After: name
   20/600 once with one meta line (template display name · pages · saved), ghost/secondary/primary
   buttons from one system. Effect: the thing being edited leads the screen.
5. **Panel & region framing** — rails, form column, toolbars. Before: bare columns, free-floating
   cards, `shadow-sm` doing everything. After: hairline-seamed regions + 44px panel headers (micro
   label + action cluster) + optional footer. Effect: the three-zone editor reads as one instrument.
6. **Form spine** — all section forms, `input.tsx`. Before: 560px stretched inputs, three stacked
   spacing systems, dashed date placeholder. After: 640 measure cap, 12/600 labels at 4px, one rhythm
   (4/16/24), 2-col only for short pairs, styled date control. Effect: forms stop looking like a survey.
7. **Dashboard cards + grid re-density** — `resume-card.tsx:80-110`, `dashboard.tsx:850-861`.
   Before: titles collide with the overflow menu, meta row has a phantom column, lower 40% of the page
   is empty. After: title owns its row (menu pinned), one-line meta, thumbnails framed as paper,
   auto-fill grid fills the viewport, duplicate "N resumes" merged into the rail. Effect: the library
   looks like a document shelf, not a demo.
8. **Selection language** — `sections-manager.tsx`, `template-selector.tsx`. Before: background change
   only (1.31:1 in dark), no check, template descriptions clipped. After: accent tint + 2px left rule +
   check; template rows get selected border + check and full-width descriptions. Effect: "where am I"
   is answered at a glance.
9. **Adaptive three-zone shell** — `resume-editor.tsx:1296-1583`. Before: 16/42/42% panels squeezed
   into 390px; nothing usable on mobile. After: <1024px single-pane with Sections | Edit | Preview
   segmented switcher, rail as sheet, full-bleed preview; persistent resize grips on desktop. Effect:
   the editor is usable everywhere (the audit's #1 defect), and the switcher is a designed object.
10. **Status tokens + chip/callout system** — `save-state.tsx`, `review-panel.tsx`, `job-match-panel.tsx`,
    `import-review-view.tsx`, `change-log.tsx`, `rubric-panel.tsx`. Before: 3 greens, 4 ambers, 2 blues
    hard-coded off-theme. After: `--br-success/warning/danger/info` + the chip formula (tint + hue text
    + icon). Effect: status is tunable, consistent and never colour-only.
11. **Designed empty states** — `dashboard.tsx:1040-1070`, `PanelEmpty`, library. Before: 64px ghost
    icon + `py-16` void, centered below where content would be. After: icon tile + 20/600 headline +
    one muted line + one action, centered in the region (copy per §2.9). Effect: emptiness becomes
    guidance.
12. **Skeletons that keep the shape** — `resume-thumbnail.tsx:179`, Typst preview. Before: icon-in-box
    thumbnails read as broken; preview area shows nothing while compiling. After: page-shaped thumbnail
    skeletons with text bars; compiling state with determinate bar + "Typesetting…". Effect: loading
    never looks like an error.
13. **Review sheet re-hierarchy** — `review-panel.tsx:193-247`. Before: bright tab pills + chips lead;
    the summary sentence ("3 to fix · 3 worth considering…") is 12px muted; badges overflow the strip.
    After: quiet underline tabs with counts moved into the panel, summary promoted to 14/600 with status
    dots, chips demoted to a meta row. Effect: the verdict is what you read first.
14. **Import review re-hierarchy** — `import-review-panel.tsx:130-210`, `import-review-view.tsx:339,396`.
    Before: three amber prose blocks before the first field; two near-synonym file buttons. After: one
    warning callout (chip formula), field cards lead, one file action that changes label after choosing.
    Effect: the data you must check leads; warnings are context, not the headline.
15. **Formatting toolbar** — `formatting-toolbar.tsx:151-205, 465-663`. Before: two identical "%" pill
    steppers (font scale vs zoom), icon-only controls without tooltips, 10px margin labels. After:
    labelled stepper groups ("Font size" / "Zoom") as segmented controls, tooltips + kbd hints on icon
    buttons, 12px margin labels. Effect: the panel reads as an instrument, not a pill soup.
16. **Export menu & buttons** — `export-buttons.tsx:184-218`. Before: one generic file icon ×4,
    no descriptions; Export vs JSON at equal weight. After: per-format icon tiles + one-line
    descriptions ("PDF — typeset, for sending", "DOCX — parse-optimised"), Export primary / JSON
    secondary. Effect: the payoff moment feels deliberate.
17. **The preview stage** — `resume-editor.tsx:1495-1583`. Before: flat `bg-muted/30` field. After:
    vignetted stage + 3-layer page shadow + dark sheet-edge highlight (§3 recipe 7). Effect: the resume
    becomes the hero object — the single biggest "designed" impression in the editor.
18. **Dialog pass** — `dashboard.tsx:925-1000`, `use-confirm.tsx`. Before: disabled primary is a grey
    slab, delete dialog doesn't name its target, dead band above the footer. After: disabled state with
    reason tooltip, delete title names the resume ("Delete "Harvard Application…"?), body rhythm 4/16/24.
    Effect: confirmation feels trustworthy.
19. **Spacing snap** — audit §3. Before: ~90 spacing values, ~27 singletons (`pl-6.5`, `gap-[3px]`,
    `py-18`…). After: 4px core only (2px optical half-step), `py-18` → `py-16`/`py-20`, one form
    rhythm. Effect: rows and cards finally align; polish that survives the next feature.
20. **Motion & micro-polish** — global. Before: stock `transition-*`, hover-only resize handles, menu
    items without hints. After: 120/180/240ms durations per C4.9, 2px hover lift on interactive cards,
    reduced-motion gating everywhere, kbd chips in menus. Effect: the app feels *fast and finished*
    rather than merely styled.

---

## 5. What NOT to do

- **Gradient soup.** No gradient buttons, gradient headers, gradient cards. The only gradients allowed
  are the single accent hairline (§2.10) and the stage vignette. Purple-to-pink anything is out.
- **Glassmorphism / blur overload.** No frosted panels, no `backdrop-blur` on work surfaces. (Raycast
  gets one glass window because it is literally a floating window; nothing here is.)
- **The generic Bootstrap admin panel.** No saturated colour headers, no every-widget-in-a-box, no
  zebra striping *and* dividers on the same table, no icon-in-a-blue-circle decoration. The failure
  mode of "add more UI" is exactly this.
- **Shadows as dividers / borders as depth.** A divider is a hairline in `--br-border`; lift is shadow +
  tone. Never `shadow-sm` to separate list rows.
- **Glow.** No outer glows, no neon accents, no light-mode drop-shadow halos. Dark mode gets tone steps
  and a top highlight, not glow.
- **Big radii in chrome.** 6/8px is the language; 12px is reserved for modals/sheets; 16px+ rounded
  "app cards" read consumer-soft (M3/Arc register), wrong for a document tool.
- **Emoji or multicolour icons in chrome.** One icon set (lucide), one stroke weight, monochrome
  (status hues only where they mean something).
- **Styling the resume document with the app's language.** No dark "paper", no app shadows/radii inside
  the document, no accent colour as meaning in templates (R15). The paper is print-honest in both
  themes; that contrast is the point.
- **Colour as the only signal.** Every status must survive greyscale (icon or word redundant with the
  hue) — the squint test is mandatory.
- **Decorative filler for the dashboard's dead space.** Fill it with *content density* (grid fills the
  viewport), not illustrations, gradients or stats cards nobody reads.
- **Micro-type carrying real information.** Nothing functional below 12px (audit: 10px margin labels,
  count chips carry real data).
- **Letting marketing chrome leak into the app (or vice versa).** Marketing may be airier (display
  sizes, `--br-space-24`, the specimen gradients); the workbench stays instrument-dense. One token
  system, two registers.
- **A "personality" colour field in the sidebar.** Arc's tinted rail is charming and would instantly
  cheapen a resume tool's trust signal. Personality here comes from precision and from the documents
  themselves.

*End of deliverable. Implementation order: §2.2 depth model (changes 1–2) → §2.4 type/tone (3) →
composition passes (4–8) → adaptive shell (9) → component passes (10–20).*
