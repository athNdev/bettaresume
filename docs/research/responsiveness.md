# Responsiveness research

Research brief: `docs/research/briefs/07-responsiveness.md`. Scope: every UI surface —
marketing home, dashboard, three-zone editor, review sheet, template picker, dialogs,
export menu. Constraint from the brief that governs everything below: **the resume
document preview is a fixed-aspect page that must scale, not reflow; the app chrome
around it must reflow.**

Evidence in §6 is grepped from `src/` with line numbers as of 2026-01-24 (branch state
this was researched against). Where the codebase already solved a problem, that is
said plainly so it is not re-solved.

---

## 1. Breakpoint strategy

### The recommended set

Keep Tailwind v4's defaults and use them consistently. Do **not** fork the scale; the
problem in this repo is not the breakpoints that exist, it is that the editor and every
section form use none of them.

| Name | Value | Role in this product |
|---|---|---|
| base (no prefix) | 0–639px | Phone portrait. The default styles must be the phone styles. |
| `sm` | 640px | Large phone landscape, phablet. Label collapse stops here. |
| `md` | 768px | Tablet portrait. **The editor's three-zone layout starts here.** |
| `lg` | 1024px | Small laptop. Dashboard gets its filter rail; save-state appears. |
| `xl` | 1280px | Desktop. Dashboard goes 4-up; panels get comfortable minimums. |

Plus two non-width axes, which for this product matter as much as width:

| Axis | Query | Role |
|---|---|---|
| Pointer | `@media (pointer: coarse)` | Touch target floors, drag-handle affordances. Already in `src/styles/globals.css:533`. |
| Height | `@media (max-height: 520px)` (new) | Landscape phones and split-screen. The editor is a `h-screen` app; short-and-wide is its own layout. |

### Why these, and why desktop-first content with mobile-first CSS

- **This is a desktop-authoring tool with a phone-review use case.** The persona docs and
  the brief agree: the phone user is mostly *reviewing* ("read my resume on the way to
  the interview"), sometimes making small edits. That argues for keeping the three-zone
  editor as the primary design and defining a deliberate small-screen mode, not for
  designing the phone layout first and stretching it.
- **But the CSS inside each surface should still be written mobile-first** (`base` = phone,
  then `sm:`/`md:` upgrades). The repo is already mostly like this — the two headers were
  fixed *down* from `h-16`/`h-14` to `min-h-*` + wrap precisely because the phone case
  broke (`test/responsive-overflow.test.ts` records this). Base styles that work at 320px
  and additive upgrades at `sm`/`md`/`lg` is the pattern that prevented that class of bug.
- **Tailwind defaults over a custom set** because `sm`/`md`/`lg` are already used
  correctly on marketing and dashboard (28 and 19 responsive classes respectively).
  Introducing a custom scale would strand those surfaces on two vocabularies. The one
  candidate for a custom addition is a *height* media query, which Tailwind does not
  provide by default and which this product genuinely needs (editor chrome vs. short
  viewports).
- **Container queries, not media queries, for the editor panes.** The editor's three panes
  are sized by the user dragging `PanelResizeHandle` (`react-resizable-panels`), so a pane
  can be 300px wide on a 1920px screen. Any panel-internal decision (does the formatting
  toolbar wrap? does the history diff stack?) must key off the *pane* container, not the
  viewport. See §7 for what to assert. The dashboard's filter rail and the review sheet's
  internals are the other two container-query candidates.

### Which surface uses which axis

| Surface | Width breakpoints | Container queries | Pointer | Height |
|---|---|---|---|---|
| Marketing (`/`) | sm, md, lg (already) | — | — | — |
| Dashboard (`/app`) | sm, lg, xl (already) | optional (rail card) | touch floor | — |
| Editor chrome (header) | sm, md, lg (extend) | — | touch floor | short-height variant |
| Editor panes | md (mode switch) | **yes — required** | drag handles | short-height variant |
| Review sheet | base (tab strategy) | **yes — tab strip** | touch floor | — |
| Dialogs / menus | base (they're `w-full` capped) | popover positioning | touch floor | — |
| Document preview | none (scales, never reflows) | **yes — fit-scale** | pinch-zoom on coarse | — |

---

## 2. Per-surface responsive behaviour spec

### 2.1 Marketing home `/`

Current state is close: fluid `clamp()` type (`globals.css:334–337`), fluid gutter
(`:340`), `marketing-shell` max-width (`:348`), nav hidden below `md` with the reasoning
documented (`site-chrome.tsx:53–57`), "Sign in" hidden below `sm` (`:78`), footer grid
2→3 cols at `sm` (`:112`). Remaining spec:

- **Hero**: the stats `dl` (`hero.tsx:119`) is `grid-cols-3` at every width. Spec: stays
  3-up but `gap-5` → `gap-3` below `sm`, and `value` type must not wrap; at 320px the
  three stats fit (3 × ~90px) only if the labels stay ≤2 words. If a label must grow,
  switch to 1-col stacked list below `sm`. Artefact mock (`hero.tsx:167`) already goes
  2-col at `md`; below `md` the document card should shrink via `max-w-full` — verify the
  `h-[38rem]`/`h-[30rem]` gradient bleeds (`:52–53`) don't cause the body
  `overflow-x: hidden` mask to clip the radial gradients at 320px (cosmetic).
- **Header** at 320px: wordmark + "Check your resume" CTA. Spec: CTA label drops to
  "Check" below `sm`? No — keep the label (it is the conversion action); the row already
  fits because "Sign in" is hidden below `sm`. Assert fit at 320px in the matrix (§7).
- **Templates grid** (`sections.tsx:297`) already `md:grid-cols-3`. Spec: at base it is
  1-col; template specimen type must scale with `clamp()`, not fixed px.

### 2.2 Dashboard `/app`

Current state is good: header wraps (`min-h-16` + `flex-wrap`, `dashboard.tsx:601`),
labels collapse to icons at `<sm` (`:620`, `:634`), grid is `grid-cols-1 sm:grid-cols-2
lg:grid-cols-3 xl:grid-cols-4` (`:126`, `:861`) with `min-w-0` cards (`resume-card.tsx:78`),
rail is `lg:grid-cols-[minmax(0,1fr)_17rem]` with DOM-order-first filters (`:658`).

Spec by size:

- **base**: single column. Filters card (search, template select, archived toggle) stacked
  **above** the grid — current DOM order already does this (`lg:order-2`). No change.
- **sm**: 2-col card grid. No change.
- **lg**: 2 columns + 17rem sticky rail. The rail is a fixed `17rem` — spec: change to
  `minmax(14rem, 17rem)` or a container query so a 1024px laptop at 80% browser zoom does
  not squeeze the card grid below one card.
- **xl**: 3→4 cards. No change.
- **Create dialog**: `dialog.tsx:40` is `w-full max-w-lg` — fine on phones (full-bleed with
  `p-6`; consider `p-4` below `sm`). Spec: dialog buttons stack vertically below `sm` if
  the footer has ≥2 actions with long labels.

### 2.3 Resume editor (see §3 for the small-screen model)

At `md`+ the current three-zone `PanelGroup` is the design and stays. Specs per zone:

- **Header** (`resume-editor.tsx:1161` row): already wraps; acknowledged gap at
  `:1150–1159` — Import/Review/Export keep text labels at all widths. Spec: collapse to
  icon + `aria-label` below `sm` (the comment itself proposes this); Export keeps its
  label at `sm`+ because it is the terminal action.
- **`VariationManager` is `hidden md:flex` (`:1184`)** — variants are unreachable below
  768px. Spec: it moves into the small-screen top bar overflow menu (§3), not away.
- **`SaveState` is `hidden lg:block` (`:1207`)** — below 1024px "have I lost work?" has
  no answer. Spec: a compact dot-only variant in the small-screen top bar at base–`md`,
  full text at `lg`+.
- **Panels** (`:1302`, `:1409`, `:1495`): `minSize` 12%/26%/22% of the window. At
  `md`–`lg` the user can drag a pane to ~100px and make it useless. Spec: at `md`–`lg`
  raise panel `minSize` to usable pixel floors (rail ≥ 200px, form ≥ 280px, preview ≥
  300px — `react-resizable-panels` accepts pixel `minSize`), or gate the drag handles'
  hit area (currently `w-1.5`, `:1406`) — 6px is a mouse target; on a coarse pointer the
  handle needs ≥24px hit area with a 6px visual.
- **Preview pane** (`:1573–1574`): the `overflow-auto` + `min-w-max` combination is
  correct and stays (documented at `:1566`). Fit-to-pane zoom already exists
  (`:332–380`, ResizeObserver, "fit until the user says otherwise"). Spec: unchanged at
  `md`+; the mobile behaviour is in §3.
- **Formatting toolbar** (`formatting-toolbar.tsx:151`): `flex-wrap` already. Inside a
  narrow pane it wraps to many rows. Spec: wrap the toolbar in a container query —
  below ~420px pane width, show "Aa" popover triggers only and collapse the font
  select + scale stepper into the Typography popover (they are already popovers:
  `:204`, `:286`, `:323`, `:441`).

### 2.4 Review sheet

`SheetContent className="w-full gap-0 p-0 sm:max-w-xl"` (`review-panel.tsx:174`). The six
tabs (`:195–238`) live in `TabsList` which is `inline-flex h-10` with
`whitespace-nowrap` triggers (`tabs.tsx:17`, `:31`) and **no overflow strategy** — at
390px the strip is ~600px wide inside a 390px sheet. This is the single worst unhandled
narrow-screen surface. Spec, by preference (open question #1):

- **Recommended**: below `sm`, the tab strip becomes a horizontally scrollable row
  (`overflow-x-auto` + `scroll-into-view` on the active tab) — tabs are a familiar mobile
  pattern and all six stay one tap away. Alternatively a single "view" dropdown beside
  the title. Do **not** silently drop tabs.
- `TAB_PANEL` (`:115`) keeps `data-[state=inactive]:hidden` — the `forceMount` stacking
  bug is already fixed; any new tab must keep it (there is a test: `test/review-panel.test.ts`).
- **History tab** internals: `w-56 shrink-0` version list (`history-panel.tsx:258`) beside
  the diff. Spec: below `sm`/narrow container, stack list-above-diff (the list becomes a
  select or collapsible); the `w-56` column becomes `w-full max-w-56` in a column layout.
- Sheet is `sm:max-w-xl` — on a tablet in portrait the sheet covers ~55% of the screen;
  acceptable. In landscape phone (short height) the sheet header + tabs eat half the
  height; spec: tab strip scrolls horizontally, content area gets `min-h-0` + `overflow-y-auto`
  (already `min-h-0 flex-1`, `:115`).

### 2.5 Import review sheet

`sm:max-w-2xl` (`import-review-panel.tsx:124`), body scrolls (`:136`). Spec: same tab/stack
rules as review sheet; the accept/reject action bar must be sticky-bottom on phones so
the decision buttons are reachable after scrolling the diff (currently the actions are in
the flow — verify and pin).

### 2.6 Template picker

Lives in the editor rail (`template-selector.tsx`), a list of `w-[68px]` specimen +
text rows (`:132`). Spec: unchanged at `md`+; in the phone "Sections" sheet (§3) it is a
full-width list. `w-[68px]` is fine (fixed specimen width is intentional), but the row
must be ≥44px tall on coarse pointers (currently `py-2` ≈ 44px with the specimen — assert
in the matrix).

### 2.7 Dialogs, popovers, dropdowns, export menu

- Dialog: `w-full max-w-lg` (`dialog.tsx:40`) — full-bleed on phones is correct. Spec:
  `p-4` below `sm`, and dialog content with wide tables (none exist today) scrolls in a
  `max-h-[80dvh] overflow-y-auto` container. `alert-dialog.tsx` same.
- Sheet: `w-full sm:max-w-md` (`sheet.tsx:50`, `:52`); top/bottom sides are `inset-x-0`
  full width (`:47`, `:49`) — correct. The `sm:max-w-xl`/`2xl` overrides live at the call
  sites (§2.4/2.5) — keep them there.
- Popovers: fixed `w-72`/`w-64`/`w-56`/`w-80` (`popover.tsx:20`,
  `formatting-toolbar.tsx:204/286/323/441`, `rich-text-editor.tsx:355`). At 320px a
  `w-72` (288px) popover nearly fills the screen — acceptable, but spec: Radix
  collision handling must be left on and popovers get `max-w-[calc(100vw-2rem)]`.
- **Export menu** (`export-buttons.tsx:160–198`): dropdown of 4 items + optional unsaved
  warning (`max-w-56`, `:179`). Spec: no change needed; on coarse pointers the items are
  ≥40px via the `pointer: coarse` floor. The inline `variant` (`:207–227`) two-button row
  wraps naturally.

### 2.8 Dense controls and tables

There are no real `<table>` elements in the product UI; density lives in toolbars and
list rows. Rules:

- Toolbar rows (`formatting-toolbar.tsx:151`, `rich-text-editor.tsx` toolbar) wrap; they
  must never horizontally scroll (and today nothing does — see §6).
- List rows (section outline `sections-manager.tsx:209–291`, library, history) are
  `min-w-0` + `truncate` — correct; keep the action cluster `shrink-0` (`:268`).
- Multi-field form rows are fixed `grid-cols-2`/`grid-cols-3` with no collapse (§6).
  Spec: `grid-cols-1 sm:grid-cols-2` for date-range pairs and 2-col groups;
  `grid-cols-2 sm:grid-cols-3` for the languages row.

---

## 3. The editor on small screens

### What the comparators do

- **Google Docs / Word mobile**: review-first. Editing is possible but the app is
  optimised for read + comment; the document is fit-width and pinch-zoomable.
- **Figma**: single canvas focus + bottom toolbar; layers/properties are sheets. Never
  three panes.
- **Canva**: single-object focus mode; panels become bottom sheets and a persistent
  bottom tab bar switches contexts.
- **Notion**: single column always; the sidebar is a drawer.
- **Linear**: list→detail stack; master-detail never side-by-side on a phone.

Consensus: **one context fills the screen; secondary contexts are sheets or a tab bar;
the document stays the star.**

### Recommended model: three-mode focus view with a bottom bar

Below `md`, the `PanelGroup` is not rendered. One full-height region + a fixed bottom
tab bar with three destinations, preserving the user's place in each:

```
┌─────────────────────────────────────┐
│ ←  Resume name…            ●  ⋯     │  top bar: back, name (truncate), save dot,
│                                     │  overflow (Variations, Import, Review)
├─────────────────────────────────────┤
│                                     │
│         the active mode             │  each mode keeps its own scroll position
│                                     │
│   [Form]      [Preview]  [Sections] │  bottom bar: 3 × ≥56px targets,
└─────────────────────────────────────┘  labels visible, active state indicated
```

- **Form mode** (default when a section was last selected): the section form full-width,
  same auto-save behaviour, sticky section header (already `sticky top-0`, e.g.
  `experience-form.tsx:154`) now sticky under the top bar.
- **Preview mode**: `TypstPreview` at fit-width scale with pinch-zoom (the `<img>` page
  at `typst-preview.tsx:153` gets `touch-action: pan-x pan-y pinch-zoom`); double-tap
  toggles fit-width ↔ 100%. Vertical page list scroll with CSS scroll-snap
  (`scroll-snap-align: start` per page) — page snapping is cheap here because pages are
  already discrete fixed-size boxes. Fit-width, not fit-page: on a phone the page at
  fit-page is unreadable (a Letter page in 390px = ~4pt type).
- **Sections mode**: the rail's contents (Sections manager, Templates, Library) as a
  full-screen list, or as a draggable bottom sheet over whichever mode is active.
  Recommendation: full-screen list — the sections manager has drag-reorder, and drag in
  a sheet on a phone is misery. Drag handles get `touch-none` (already,
  `sections-manager.tsx:195`) and long-press-to-drag with up/down move buttons in the
  overflow menu (the up/down buttons already exist for entries inside forms).
- **Typography & layout** (the 692-line `FormattingToolbar`): not a mode. It becomes a
  sheet opened from Preview mode's "Aa" button (it is already a collapsed disclosure at
  `md`+, `resume-editor.tsx:1503–1545` — the phone just makes the same disclosure a
  bottom sheet).
- **Review sheet, import sheet, export menu** behave as their §2 specs from any mode.
- **Landscape phone / short height** (`max-height: 520px`): the bottom bar moves to a
  left edge rail (icons only, ≥48px wide), content gains the full height; top bar drops
  the resume subtitle line.

### What is deliberately not done on a phone

- Pane dragging (no panes).
- Side-by-side form + preview. The brief's "someone reviewing a resume on a phone" is
  served by Preview mode + Review sheet; editing is served by Form mode. A cramped
  split view serves neither.
- Multi-column anything.

### Transitional widths, `md`–`lg` (768–1023)

Three zones return at `md`, but the default sizes change: rail 20% / form 40% / preview
40% with pixel floors (§2.3), and the resize handles get coarse-pointer hit areas. The
`PanelGroup` is only *mounted* at `md`+ (client-side gate on a `matchMedia("(min-width:
768px)")` listener, or CSS-hide + `inert` if mounting cost is acceptable) — mounting it
at 390px and hiding it would break the fit-to-pane measurement (ResizeObserver on a
`display: none` pane reports 0).

---

## 4. Spacing and type rules that change with size

### Type

| Element | base | sm+ | Notes |
|---|---|---|---|
| Marketing display/title/lede | fluid `clamp()` — **already correct** (`globals.css:334–337`) | same | No change. |
| App body text (forms, panels) | `text-base` (16px) | `md:text-sm` | **Partly done**: `input.tsx:10` and `textarea.tsx:12` already do `text-base md:text-sm` (prevents iOS focus zoom). Extend to `Select` trigger text and the TipTap editor body so focus never zooms the viewport out from under the three-pane layout. |
| Headings in chrome (h1/h2 in panels) | `text-sm`/`text-base` | fixed steps | App chrome uses **stepped** type, not fluid: it is dense UI where consistency beats smoothness; fluid type in a toolbar makes button rows reflow continuously and breaks the 2×/3× grid alignment. |
| Section-form field labels | `text-xs` | same | Fixed. |
| Marketing body | `text-lede` fluid | same | Already. |

Rule of thumb for this repo: **fluid (`clamp`) for marketing display type only; stepped
scales for app chrome.** The one place fluid scaling is correct inside the app is the
document preview — and that must come from the *user's* zoom control (`previewScale`),
not from the viewport.

### Spacing

| Token | base | sm+ | Notes |
|---|---|---|---|
| Page gutters (marketing) | `--marketing-gutter` fluid (`globals.css:340`) | same | Already. |
| Page gutters (app) | `px-4` | `lg:px-8` for `container` sections | Dashboard `main` is `px-4 py-8` (`dashboard.tsx:639`) — `py-8` → `py-5` below `sm`. |
| Form row gaps | `gap-4` → `gap-3` | `gap-4` | When 2-col grids collapse to 1-col the larger gap reads as noise. |
| Panel padding (editor) | `p-4` | same | Form panel `p-4` (`resume-editor.tsx:1414`) is fine; preview `p-6` (`:1574`) → `p-3` below `md` so fit-width gains ~24px of page. |
| Sticky header offsets | top bar height (56px) | header height | Forms' `sticky top-0` bars must offset by the small-screen top bar height or they tuck under it. |

### Radius / elevation

No change with size. (Wave 1 of `docs/UI-FEATURE-PASS.md` owns radius/elevation.)

---

## 5. Touch and input modality rules

Current state: `@media (pointer: coarse)` floors every `button`/`[role=button]` at 40×40px
with a `data-touch-minimal` opt-out (`globals.css:525–541`). This is a good mechanism;
the rules below extend it.

1. **Target sizes**: ≥44px for primary actions and anything in the bottom tab bar (they
   carry labels, so they can afford it); 40px accepted floor for dense secondary
   controls (icon buttons in forms, toolbar toggles) via the existing opt-out. Every
   `data-touch-minimal` use should be grep-auditable — add it to the static test (§7).
2. **Drag handles**: `PanelResizeHandle` is `w-1.5` (6px, `resume-editor.tsx:1406/1492`) —
   spec: `w-1.5` visual with a `::before` hit area ≥24px wide on coarse pointers. Section
   outline grips (`sections-manager.tsx:195`, `p-1` + `touch-none`) get a ≥40px hit area
   on coarse pointers via padding, without changing the icon size.
3. **Hover-only affordances must degrade**: section-row actions are
   `opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`
   (`sections-manager.tsx:268`) — on touch there is no hover; `focus-within` covers tap
   (the row is focusable) but spec: on coarse pointers, `opacity-100` always (or ≥0.6),
   because "actions appear on tap of a *different* element" is undiscoverable. Same audit
   for the resume-card hover actions (`resume-card.tsx` `group`).
4. **`cursor-grab`/`touch-none` on draggables** (already done in the outline) — keep; add
   `touch-action: none` to `PanelResizeHandle` so pane drag does not scroll the page.
5. **Pinch-zoom on the preview** must not be fought: do not set
   `touch-action: manipulation` or `user-scalable=no` anywhere. The document page `<img>`
   (`typst-preview.tsx:153`) gets `touch-action: pan-x pan-y pinch-zoom`; double-tap
   fit/100% is the only gesture the app implements itself.
6. **Popovers vs. sheets**: on coarse pointers, the formatting-toolbar popovers
   (`w-72 p-4`, etc.) are thumb-hostile when they open over the keyboard-adjacent edge.
   Spec: at `pointer: coarse`, formatting popovers render as bottom sheets (the `Sheet`
   primitive already has `side="bottom"` support, `sheet.tsx:49`).
7. **Dense desktop UI comfort**: the toggle cluster (font scale stepper
   `formatting-toolbar.tsx:172–190`) is `h-8` (32px) — under the 40px floor; it will be
   floored by the coarse rule but then the stepper's visual grouping (`rounded-r-none`
   pairs) breaks at 40px with a 32px label between. Spec: stepper goes to a single
   popover row on coarse pointers.

---

## 6. Known traps in this codebase

Grepped from `src/` (and `test/`) with `grep -rn`. This is the inventory implementation
should work from. Severity: **[high]** = breaks or silently degrades a real flow on a
phone; **[med]** = wrong or fragile at some width; **[low]** = cosmetic/accepted.

### 6.1 Fixed pixel widths and fixed-pixel layout

| Where | What | Severity |
|---|---|---|
| `src/features/resume-editor/resume-editor.tsx:1302,1409,1495` | `react-resizable-panels` sizes as percentages with percentage `minSize` (12%/26%/22%). At 768px a 12% rail is 92px; at 390px the whole three-zone concept is unrenderable (no small-screen mode exists). | **[high]** |
| `src/features/resume-editor/components/history-panel.tsx:258` | `w-56 shrink-0` (224px) version-list column inside the review sheet; at 390px it leaves ~150px for the diff. No collapse. | **[high]** |
| `src/features/resume-editor/components/preview.tsx:176–185` | Page is fixed px (`A4 ? 794 : 816` wide) in inline `style` — correct by design (fixed-aspect document), but everything that hosts it must scale it; nothing below `md` hosts it yet. | by design |
| `src/features/resume-editor/components/typst-preview.tsx:46–47,117–119,153–156,194–195` | Same fixed-pixel page box (`pt × 96/72 × scale`, fallback 612×792). By design; the trap is only that `scale` today comes from pane width, which is 0/unreliable if the pane is hidden — fit-to-pane must be re-run when the preview mode becomes visible. | **[med]** |
| `src/features/resume-editor/components/formatting-toolbar.tsx:157,185,204,286,323,441,655` | Fixed widths in a dense toolbar: `w-30` select, `w-12` readouts, popovers `w-72`/`w-56`/`w-72`/`w-64`. Popovers at 320px screens ≈ full width. | **[med]** |
| `src/components/rich-text-editor/rich-text-editor.tsx:177,355` | `w-28` font select, `w-80` link popover (320px). | **[med]** |
| `src/features/resume-editor/components/sections-manager.tsx:506`, `variation-manager.tsx:121`, `dashboard/components/user-menu.tsx:48`, `ui/popover.tsx:20`, `ui/dropdown-menu.tsx:49,66` (`min-w-32`), `ui/select.tsx:77` (`min-w-32`, `max-h-96`) | Fixed menu/popover widths (`w-48`/`w-64`/`w-56`/`w-72`, `min-w-32`). Radix collision handling keeps them on screen, but they are fixed at all sizes. | **[low]** |
| `src/features/dashboard/dashboard.tsx:658` | `lg:grid-cols-[minmax(0,1fr)_17rem]` — fixed 17rem rail at lg+; at 1024px with browser zoom the card grid drops below 2 columns. | **[med]** |
| `src/features/resume-editor/components/template-selector.tsx:132` | `w-[68px]` specimen column — intentional; keep. | by design |
| `src/components/ui/save-status-indicator.tsx:108,162` | `min-w-[80px]`; `max-w-40 truncate … sm:max-w-72` — has a responsive cap; fine. | **[low]** |
| `src/components/marketing/hero.tsx:52–53` | Decorative `h-[38rem]`/`h-[30rem]` gradient bleeds — cosmetic. | **[low]** |
| `src/app/og.png/route.tsx` (throughout) | Fixed 1200×630 `ImageResponse` layout — build-time artefact, not responsive UI. | N/A |

### 6.2 Grids that never collapse

`grid grid-cols-2 gap-4` with **zero** responsive prefixes in every section form
(`grep -rn "grid-cols-2" src/components/sections-forms` — none carry `sm:`/`md:`):

- `personal-info-form.tsx:70,102,152`
- `experience-form.tsx:257,282,319`
- `education-form.tsx:234,271,313`
- `projects-form.tsx:245,282,323`
- `certifications-form.tsx:192,219`
- `publications-form.tsx:229`
- `references-form.tsx:191,228`
- `volunteer-form.tsx:223,250,275`
- `awards-form.tsx:190`
- `languages-form.tsx:146` (`grid-cols-3`, worse)
- `rich-text-editor.tsx:236,258` (`grid-cols-4` colour swatches — small items, acceptable)
- `formatting-toolbar.tsx:463` (`grid-cols-2` inside a popover)

Severity **[high]** for the forms as a group: in the phone Form mode (§3) a start/end
date pair in `grid-cols-2` at 320px gives each input ~140px — date inputs clip their own
values. Same markup pattern copy-pasted across 11 files means the fix should be one
shared `FormRow`/`fields-grid` class, not 11 edits.

### 6.3 `overflow-hidden` clipping

| Where | What | Severity |
|---|---|---|
| `src/styles/globals.css:181–183` | `body { min-height: 100vh; max-width: 100vw; overflow-x: hidden; }`. This is a scroll *mask*: any element wider than the viewport is silently cut off instead of being fixed, and `100vw` overflows itself when a classic scrollbar exists. It is why the two header overflows (see `test/responsive-overflow.test.ts`) looked "fine" until measured in a browser. Keep as a backstop, but the test plan (§7) must catch overflow explicitly because this hides it. | **[high]** |
| `src/features/resume-editor/resume-editor.tsx:1295,1496` | `overflow-hidden` panes — correct (they contain scrolling regions), but together with the body mask they mean a too-narrow pane silently chops the form's `grid-cols-2` content rather than scrolling. | **[med]** |
| `src/features/resume-editor/components/review-panel.tsx:336` | `TAB_PANEL + overflow-hidden` on the job-target panel; other panels are `min-h-0 flex-1` scroll areas. Verify nothing in the job tab can exceed the sheet width (its inputs are `w-full`, so OK). | **[low]** |
| `src/components/rich-text-editor/rich-text-editor.tsx:471` | `overflow-hidden` around the TipTap surface: clips the toolbar's focus rings and any popover rendered *inside* that box (link popover is portalled, so fine). Keep; assert focus ring visibility in tests. | **[low]** |
| Section forms `AccordionItem className="overflow-hidden rounded-lg border"` — `awards-form.tsx:133`, `certifications-form.tsx:135`, `education-form.tsx:174`, `experience-form.tsx:195`, `projects-form.tsx:187`, `publications-form.tsx:160`, `references-form.tsx:134`, `skills-form.tsx:237`, `volunteer-form.tsx:161`, and `ui/accordion.tsx:48` | Required for the accordion height animation; clips nothing today because children scroll inside `ScrollArea` ancestors. Risk: any future non-portalled overlay inside an accordion gets clipped. | **[low]** |
| `ui/dropdown-menu.tsx:49,66`, `ui/select.tsx:77`, `ui/tooltip.tsx:20`, `ui/scroll-area.tsx:13`, `ui/progress.tsx:14`, `ui/slider.tsx:20`, `ui/avatar.tsx:14` | Primitive-level (portalled or intentionally clipping). | N/A |
| `src/features/dashboard/components/resume-thumbnail.tsx:121,141` | `aspect-[8.5/11]` thumbnails clip their scaled content — intentional miniature. | by design |
| `src/components/marketing/hero.tsx:47,170,241`, `sections.tsx:300,465` | Decorative bleed clipping. | **[low]** |

### 6.4 Horizontal-scrolling panels

**There are none.** `grep -rnE "overflow-x-" src` returns **zero matches**. The only
horizontal scroll in the product is implicit:

- The preview pane `flex-1 overflow-auto` + `min-w-max` child
  (`resume-editor.tsx:1573–1574`) — intentional, documented (`:1566`), and correct.
- `rubric-panel.tsx:198` `max-h-72 overflow-auto whitespace-pre-wrap` — wraps, so no
  h-scroll in practice.

Everything else that can exceed its container is relying on the body mask (§6.3). Two
consequences for the test plan: (1) "no horizontal overflow" assertions must measure
`scrollWidth` rather than trust the absence of scrollbars; (2) the review sheet's six-tab
strip (§2.4) currently has *no* overflow strategy — it is the clearest instance of a
panel that should horizontally scroll and cannot.

### 6.5 Viewport-height traps

| Where | What | Severity |
|---|---|---|
| `src/features/resume-editor/resume-editor.tsx:1098,1110,1130,1146` | `h-screen` (100vh) on loading/error/not-found states and the editor root. On mobile browsers 100vh includes the retractable chrome, so the editor's bottom edge sits under the browser UI. The editor root must be `h-dvh` (or `min-h-dvh h-dvh`) with a `h-screen` fallback. | **[high]** |
| `src/features/dashboard/dashboard.tsx:85,304,588`, `src/app/app/page.tsx:33`, `src/app/router.tsx:90`, `src/app/splash-screen.tsx:16` | `min-h-screen` — acceptable (scrollable), `min-h-dvh` is nicer. | **[low]** |
| `src/styles/globals.css:181` | `min-height: 100vh` on body. | **[low]** |

### 6.6 Content that disappears at small sizes with no replacement

| Where | What | Severity |
|---|---|---|
| `src/features/resume-editor/resume-editor.tsx:1184` | `VariationManager` in `hidden md:flex` — variants (a load-bearing feature per CLAUDE.md) are **completely unreachable** below 768px. | **[high]** |
| `src/features/resume-editor/resume-editor.tsx:1207` | `SaveState` in `hidden lg:block` — save status ("in flight / unsaved / saved", the honesty mechanism per its own comment) is **invisible** below 1024px. | **[high]** |
| `src/components/marketing/site-chrome.tsx:57,78` | Nav hidden below `md`, "Sign in" below `sm` — deliberate, documented, footer carries both. | accepted |

### 6.7 Dense toolbars and tab strips

| Where | What | Severity |
|---|---|---|
| `src/components/ui/tabs.tsx:17,31` + `src/features/resume-editor/components/review-panel.tsx:195–238` | `TabsList` is `inline-flex h-10` with `whitespace-nowrap` triggers; the review sheet packs 6 triggers (with badges) into `w-full` at phones. No wrap, no `overflow-x-auto` → clipped/unreachable tabs. | **[high]** |
| `src/features/resume-editor/components/formatting-toolbar.tsx:151` | Toolbar does wrap (`flex-wrap`) — good; but the font-scale stepper `:172–190` is `h-8` with `rounded-r-none` pairs that visually break when the 40px coarse-pointer floor applies. | **[med]** |
| `src/features/resume-editor/components/sections-manager.tsx:268–291` | Row actions `opacity-0 … group-hover` — hover-only affordance (touch gap, §5.3). | **[med]** |
| `src/features/resume-editor/resume-editor.tsx:1406,1492` | Pane drag handles `w-1.5` (6px). | **[med]** |

### 6.8 Traps that were already closed (do not re-open)

- The two headers' fixed `h-16`/`h-14` → `min-h-*` + `flex-wrap`; pinned by
  `test/responsive-overflow.test.ts`.
- Dashboard `grid-cols-1` being load-bearing below `sm` (`dashboard.tsx:113–115`) — do not
  remove the explicit `grid-cols-1`.
- Preview centre-overflow (`min-w-max`, `resume-editor.tsx:1566–1574`) and fit-to-pane zoom
  (`:332–380`) — leave the "fit until the user zooms" rule intact.
- Review tabs' `forceMount` stacking → `TAB_PANEL` + `data-[state=inactive]:hidden`
  (`review-panel.tsx:115`); `test/review-panel.test.ts` guards it.
- `resume-card.tsx:78` `min-w-0` grid-item flooring.
- iOS zoom: `input.tsx:10` / `textarea.tsx:12` `text-base … md:text-sm`.

---

## 7. A durable test plan

The repo already has the right two-layer shape: static source assertions
(`test/responsive-overflow.test.ts` asserts *mechanisms*, and its header comment
explicitly disclaims proving fit) and a real-browser harness (`scripts/probe/` —
`full-pass.cjs`, `topbar.cjs`, etc., per `docs/AGENT-CONTEXT.md` §2.22 the visual pass is
offloadable to a browser node). Extend both; do not invent a third.

### 7.1 Viewport matrix (browser harness, `scripts/probe/responsive.cjs`)

| Viewport | Why |
|---|---|
| 320×568 | Minimum supported phone (the body mask hides failures here — measure, don't look). |
| 390×844 | The phone both header bugs were found at. |
| 844×390 | Landscape phone — the short-height axis. |
| 768×1024 | Tablet portrait — editor mode switch boundary. |
| 1024×768 | Small laptop — dashboard rail + panel minimums. |
| 1440×900 | Reference desktop. |
| 390×844 with `pointer: coarse` emulation | Touch floors + hover-only affordances. |

### 7.2 Assertions per surface per viewport

1. **No horizontal document overflow**: `document.documentElement.scrollWidth <=
   clientWidth` **and** no element with `getBoundingClientRect().right > innerWidth + 1`
   (the body mask makes scrollbar-based checks lie — measure geometry).
2. **No clipped text**: for every leaf element with text, `scrollWidth <= clientWidth`
   unless it carries `truncate`/`text-ellipsis` (allowlist), and no `scrollHeight >
   clientHeight` on non-scrollable boxes.
3. **Tap targets ≥44px** on coarse pointers for primary flows (bottom bar, dialog
   buttons, tab triggers); ≥40px for the dense controls listed in §5.1; every
   `data-touch-minimal` element in the allowlist is grep-listed in the test.
4. **Reachability**: every header action (Import, Review, Export, ⋯ overflow) is clickable
   without scrolling the *document*; all six review tabs are selectable at 320px;
   `VariationManager` and `SaveState` (or their compact substitutes) are present at
   390px (pins the §6.6 fixes).
5. **Editor mode switch**: below 768px no `PanelGroup` participates in layout; the three
   modes each render, keep scroll position across switches; at 768px the three panes
   appear and the preview has non-zero measured width before the first fit runs (pins the
   `display:none` ResizeObserver trap in §3).
6. **Document preview invariants** (every viewport): the page box keeps the 8.5:11 /
   A4 aspect ratio; at fit-width its scale is ≤1 and its width ≤ pane width − padding;
   pages never reflow (assert page count and box dimensions against
   `typst-preview`'s parsed SVG dims, not against the DOM alone).
7. **Reduced motion / forced colors**: run the matrix once with `prefers-reduced-motion:
   reduce` and once with `forced-colors: active`; assert no animation duration exceeds
   0.01ms (existing rule `globals.css:542`) and that focus rings/active-tab states survive
   forced colors (border-based state, not colour-only).
8. **Container queries**: once adopted (§1), add a static test in the style of
   `responsive-overflow.test.ts` asserting panels use `@container` classes rather than
   viewport prefixes for pane-internal decisions.

### 7.3 Static source assertions (vitest, extend `test/responsive-overflow.test.ts`)

- No `h-screen`/`min-h-screen` in `src/features/**` without `dvh` fallback (pins §6.5).
- Every `grid-cols-2`/`grid-cols-3` in `src/components/sections-forms/**` carries a
  collapse prefix or is on the allowlist (pins §6.2 after it is fixed).
- `grep`-level: no new `w-[…px]` in layout containers; `overflow-hidden` additions must
  name a reason (allowlist per §6.3).
- The review `TabsList` has an overflow strategy (class assertion).

### 7.4 Visual regression

The probe harness already screenshots. Snapshot the marketing page, dashboard and editor
at 390/768/1440 in both themes per release. Compare layout-structure metrics (bounding
boxes of named regions) rather than pixels where fonts may substitute (the AGENT-CONTEXT
font-substitution trap applies to browsers too).

---

## 8. Open questions for the maintainer

1. **Review-sheet tabs on a phone** (§2.4): horizontally scrollable tab strip (my
   recommendation), a "view" dropdown, or a bottom segmented control? This decides
   whether all six review surfaces stay one tap away at 320px.
2. **Is phone editing in scope, or is phone review-only?** §3 assumes light editing is
   allowed (Form mode). If review-only, the Form mode can be deferred and the phone
   ships as Preview + Review + Sections, which is materially cheaper.
3. **`VariationManager` below `md`** (§6.6): move into an overflow menu as specced, or is
   variant management deliberately desktop-only? It is a load-bearing feature per
   `CLAUDE.md`, which is why the spec keeps it, but the answer changes the top bar.
4. **Touch floor: keep 40px or raise primary actions to 44px** (§5.1)? Wave 2 of
   `docs/UI-FEATURE-PASS.md` shipped ≥40px as a verified gate; raising the floor is a
   one-line change in `globals.css:533` but will resize dense toolbars.
5. **Preview on mobile: fit-width + pinch + page snapping** (§3) — confirm fit-width is
   preferred over fit-page, and that double-tap-to-100% is wanted (vs. system pinch only).
6. **Breakpoint scale**: adopt Tailwind defaults unchanged (recommended) or add a custom
   short-height query only (also recommended) — confirm no custom width breakpoint is
   wanted (e.g. a `xs` at 375px for marketing tweaks).
7. **Save state below `lg`**: compact dot in the top bar (specced) or is a toast-on-failure
   considered sufficient on phones?
8. **Language/locales**: any plan for longer labels (German etc.)? The two headers now
   wrap, which absorbs most of it, but the icon-only `sm` collapse assumes short English
   labels.
