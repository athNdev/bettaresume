# UI audit — BettaResume

Design audit of the live app, driven in a real browser (Playwright, Chrome channel) at
**1440×900, 1024×768, 768×1024 and 390×844**, dark theme (the app default —
`theme-provider.tsx:21` sets `defaultTheme="dark"`) with light-theme spot checks.
76 screenshots in `.probe-shots/` (all prefixed `ui-`). Spacing, typography and colour
findings combine live DOM measurements (computed styles sampled per surface) with the
Tailwind classes in source.

Method notes / caveats:

- Local stack: `node scripts/probe-start.cjs api web`, D1 re-seeded (`npm run db:reset-seed`).
- The **true empty dashboard** was captured by intercepting `resume.list` on the wire and
  returning `[]` (`.probe-shots/ui-dash-empty-true-*`). The components are the real empty
  state; only the data was mocked to avoid destroying the seed.
- Document-preview colours (template palettes inside resume thumbnails/previews) are
  excluded from the chrome colour counts; that exclusion is called out where relevant.
- The amber "DEV" pill and the Next.js "Compiling…" pill in some shots are dev-mode
  artefacts, not product UI. They do overlap content at `bottom-2 left-2`
  (`dev-badge.tsx:19`), which is worth remembering if that badge ever ships.

---

## 1. Top 10 problems

**1. The editor has no mobile layout — three panels squeeze into 390px. Severity: critical.**
The `PanelGroup` keeps 16% / 42% / 42% at every width (`resume-editor.tsx:1302, 1409,
1495`), so at 390px the sections rail collapses to ~70px of clipped icons and truncated
labels, the form gets ~155px with fields cut mid-word ("MPhil Candidate", "jame…",
"Cambridge, U…"), and the preview renders an unreadable ~110px page. Every column is
below its usable minimum; none of the three tasks (navigate, edit, read preview) can be
completed. `.probe-shots/ui-editor-390.png` (also `ui-editor-form-390.png`,
`ui-editor-typo-390.png`).

**2. The dark theme has no surface separation and near-invisible borders. Severity: critical.**
In `.dark` (`globals.css:129-169`) `--background`, `--card` and `--popover` are the same
`oklch(0.145 0 0)` — cards, dialogs and the page are 1.00:1 apart; and `--secondary`,
`--muted`, `--accent`, `--border`, `--input` all share `oklch(0.269 0 0)`, giving
borders 1.31:1 against the page (WCAG 1.4.11 wants 3:1 for control boundaries) and hover
feedback (accent vs background) also 1.31:1. Depth is left entirely to `shadow-sm`
(`card.tsx:12`) while the elevation tokens built for this — `--elev-1..3` / `--shadow-elev-*`
(`globals.css:57-65, 112-119`) — are referenced by **zero** components. This is what
"washed out, everything floats in the same grey" looks like. `.probe-shots/ui-dash-1440.png`,
`.probe-shots/ui-editor-1440.png`.

**3. Review sheet tabs overflow; at 390px two tabs are unreachable. Severity: critical.**
The strip is 579px wide inside a 342px column (`TabsList className="mx-6 mt-4"`,
`review-panel.tsx:193`) with `TabsTrigger`s at measured x-positions Checklist 29–115,
Plain text 115–201, Parser fit 201–323, Job target 323–416, **History 416–488, Bullets
488–600** — the last two sit past the 390px viewport, do not scroll and cannot be
clicked (Playwright click on "History" timed out — feature literally unreachable).
Even at 1440px the sheet clips the "Bullets 10" badge at its edge.
`.probe-shots/ui-review-tabstrip-390.png`, `ui-review-checklist-390.png`,
`ui-review-checklist-1440.png`.

**4. Editor hierarchy is inverted and the section title is repeated up to four times. Severity: high.**
The document name — the thing being edited — is `text-sm` (14px)
(`resume-editor.tsx:1173`), smaller than the form's own `text-sm`/`text-base` group
headings and equal to field labels; its subtitle prints the raw template key
("postgrad") instead of the display name (`resume-editor.tsx:1177`). The form header
shows "Contact Information / Personal Info" (`resume-editor.tsx:1427-1433`), then
`renderSectionForm()` opens with the same title again, then group labels "Basic
Information", "Contact Information" — the string "Contact Information" appears 4× in the
top 400px. Eye-test result: nothing in the chrome leads; the white Export button and the
white preview page win. `.probe-shots/ui-editor-1440.png`,
`.probe-shots/ui-editor-form-1440.png`.

**5. Dashboard: half the page is dead space, titles truncate into their menu button. Severity: high.**
With 4 seeded resumes the grid (`xl:grid-cols-4`, `dashboard.tsx:861`) fills one row and
the lower ~40% of a 900px viewport is empty (`ui-dash-1440.png`). Card titles truncate
after ~12 characters into an ellipsis that collides with the overflow "…" button
("Harvard Appli… …", `resume-card.tsx:86-93` with `truncate text-lg` + `justify-between`
menu). The result line "4 resumes" (`dashboard.tsx:850-860`) duplicates the "Your library
→ Resumes 4" stat in the rail. At 390px the filters + stats cards stack above all
content and 3 of 4 card thumbnails render as empty boxes (problem 8).
`.probe-shots/ui-dash-1440.png`, `.probe-shots/ui-dash-390.png`.

**6. Typography: two opposite failures — a 22-size soup on marketing, a 2-size monotone in the app. Severity: high.**
Measured computed font sizes: marketing home = **22 distinct sizes** (9.28px → 84px),
including four body sizes inside 0.8px of each other (0.9 / 0.92 / 0.925 / 0.95rem =
14.4 / 14.72 / 14.8 / 15.2px — `site-chrome.tsx:57,78,106`, `hero.tsx:145`,
`sections.tsx:101,160,205,233,326,447`) and a 0.32px ladder of caption sizes
(0.6→0.8rem in 8 steps — `hero.tsx`, `sections.tsx`). The app chrome is the reverse:
class usage is `text-sm` ×155 and `text-xs` ×85 vs `text-base` ×4 and larger ×11 total;
the editor measures exactly 4 sizes (16/14/12/10px) with 14px+500-weight everywhere, so
headings, labels and values differ by position only. `.probe-shots/ui-home-top-1440.png`,
`.probe-shots/ui-editor-1440.png`.

**7. Typography & layout: two identical "%" steppers mean different things; icon controls are unlabelled. Severity: medium-high.**
The panel row (`formatting-toolbar.tsx:151-205`) shows a Font Scale stepper
("− 100% +", range 80–120) directly above/beside the preview zoom stepper ("− 67% +",
`formatting-toolbar.tsx:645-663`) — same pill design, same ±, two different "%" values.
The `Aa` popover, the colour dot, the margins toggle and reset are icon-only with no
visible labels or tooltips (margin sub-labels drop to `text-[10px]`,
`formatting-toolbar.tsx:465,499,533,567`). The font-family select is truncated to
"Times Ne…". `.probe-shots/ui-editor-typo-1440.png`.

**8. Placeholder-looking states where content should be. Severity: medium-high.**
Card thumbnails lazy-load behind an IntersectionObserver (`resume-thumbnail.tsx:58-86`)
and until then show a lone `FileText` icon in an empty `aspect-[8.5/11]` box
(`resume-thumbnail.tsx:179`) — no skeleton, no shimmer, so 3 of 4 mobile cards read as
broken (persisted after 15s wait: `ui-dash-390-slow.png`). On marketing, the three
template specimen cards fill only their top ~45%; each carries ~175px of dead white
space (`sections.tsx:282-357`). `.probe-shots/ui-dash-390.png`,
`.probe-shots/ui-home-sec-templates-1440.png`.

**9. Spacing has no rhythm: ~90 distinct spacing steps, ~27 single-use values, and unused elevation. Severity: medium.**
The 4px core (1/2/3/4/6/8) covers ~80% of usage, but the tail is long: one-off steps
`p-5`, `p-7`, `px-5`, `px-8`, `pl-7`, `pl-10`, `pr-8`, `pt-5`, `pt-6`, `pb-6`, `my-0`,
`mt-10`, `mt-16`, `gap-5`, `gap-7`, `py-5`, `py-16`, `py-20`, plus literals
`pl-6.5` (`sections.tsx:233`), `gap-[3px]`, `rounded-[3px]`, `top-[0.5em]`,
`translate-y-[-3px]` and a marketing-only `py-18` used 7× (`sections.tsx:84,137,…`).
Full histogram in §3.

**10. Status colours bypass the theme entirely. Severity: medium.**
Six components hard-code their own status palette: `save-state.tsx:63,86`
(amber-500/700, emerald-500/600), `review-panel.tsx:122,298` (emerald-500/600),
`job-match-panel.tsx:83,88`, `import-review-view.tsx:339,396` (amber-400/700),
`import-review-panel.tsx:204` (amber-500), `change-log.tsx:50` (blue-100/300/700/900),
`rubric-panel.tsx:66-69`. Result: three greens, four ambers and two blues that cannot be
tuned with the theme, some of which change between light/dark and some don't.
`.probe-shots/ui-import-review-1440.png`, `ui-review-checklist-1440.png`.

---

## 2. Surface-by-surface findings

### 2.1 Marketing home `/` (`ui-home-top-*`, `ui-home-full-*`, `ui-home-sec-*`, `ui-home-bottom-*`)

The marketing page is the healthiest surface — it has a real token set with documented
contrast ratios (`globals.css:293-322`), a fluid type scale (`globals.css:333-343`) and
reduced-motion gating. Defects:

- **12px stagger between the hero artefact panels.** The dark "Exported text" figure is
  `mt-3` (`hero.tsx:241`) inside a `grid items-start` row, so on desktop it sits 12px
  lower than the resume panel beside it. On mobile the same class doubles as stack
  spacing. `ui-home-top-1440.png` — the two panel headers visibly misalign.
- **CTA + stats fight in one row.** "Open the editor", "What it does" and the three
  stats (Section types / Export formats / Templates) share one `flex-wrap` row with
  `gap-x-8` (`hero.tsx:86-123`); the stat labels are 0.7rem uppercase micro-text
  (`hero.tsx:143`) floating at button mid-height. The second-largest element cluster on
  the screen is a row of numbers that carry no decision value.
- **Template specimen cards are half empty** (see top-10 #8): fixed-height cards, content
  ends at "Skills", ~175px blank below. `sections.tsx:282-357`.
- **Body-size soup** (top-10 #6): 0.9/0.92/0.925/0.95rem paragraphs are visually
  indistinguishable but different values; caption ladder 0.58–0.8rem in 8 steps.
- `pl-6.5` (`sections.tsx:233`) and `py-18` are off any shared scale.
- Sections alternate `rule-soft` hairlines and `bg-paper` fills with `py-18 lg:py-24`
  — even, but at 1440 the fixed `--marketing-max: 76rem` leaves the Features grid
  (`sections.tsx:84-131`) with thin 2-column text blocks and wide outer gutters; the
  "Everything between the blank page and the file" grid reads as eight dense paragraphs
  with no visual anchor per item. `ui-home-sec-features-1440.png`.
- Nav (`.site-chrome.tsx:57-84`): centre links at 0.9rem with `gap-6 lg:gap-7` — two
  near-identical gaps; right side "Sign in" (text) vs "Check your resume" (ink button)
  is fine. The logo mark next to the wordmark is a bare circle — reads unfinished at
  16px (`ui-home-top-1440.png`, top-left).
- Footer (`ui-home-bottom-1440.png`): 3 link columns + wordmark; link text at 0.9rem on
  ink with `--brand-text-on-ink-faint` (8.3:1) — fine, but the footer repeats the
  whole sitemap beside a CTA-less dead zone.

### 2.2 Dashboard `/app` (`ui-dash-*`, `ui-dash-empty-*`, `ui-dash-light-1440`)

- **Dead space** (top-10 #5). One row of cards + rail ends at ~560px; the rest of the
  viewport is empty background. The grid only reaches 4 columns at `xl` and the seed
  gives 4 resumes, so the "efficient" case is the empty one.
- **Title truncation collision** (`resume-card.tsx:86-93`): `CardTitle truncate text-lg`
  wraps an inner `button.truncate`; the overflow menu sits on the same row via
  `justify-between`, so long names degrade to "Harvard Appli… …".
- **Duplicated counts**: "4 resumes" (`dashboard.tsx:855`) vs rail "Your library —
  Resumes 4" (`dashboard.tsx:723-740`).
- **Filters rail** (`dashboard.tsx:658-717`): `CardHeader pb-3` + `CardContent space-y-4`;
  search input is `h-10` (`input.tsx:10`) but the "Show archived" button is `size="sm"`
  (h-9) in the same stack — 1px-ish height mismatch between adjacent controls
  (`ui-dash-1440.png` rail).
- **Card anatomy**: `CardHeader pb-2` → thumbnail `aspect-[8.5/11]` → footer "Updated
  10/25/2026". The footer row is `mt-4 flex justify-between` (`resume-card.tsx`) but the
  right half ("Updated…") is the only content — a single date floats with a phantom
  second column. Card internal padding is `p-4` while the header/footer use their own
  paddings — the thumbnail is inset 16px while the title starts 16px from the card edge:
  consistent enough, but the visual weight sits on the white thumbnail block, which is
  the loudest thing on the page (white on near-black).
- **Empty states** (all three reachable — `ui-dash-empty-search-*`,
  `ui-dash-empty-archived-*`, `ui-dash-empty-true-*`): `EmptyState`
  (`dashboard.tsx:1040-1070`) centres a 64px `FileText` at `text-muted-foreground/50`,
  an `h3`, one muted line and (only in the no-resumes case) a button — `py-16` of dead
  vertical space above and below, and the whole block lives *below* where the grid would
  be, after the result summary. The true-empty case adds the Welcome guide card
  (`dashboard.tsx:777-826`) — a `border-primary/20 bg-primary/5` card whose three
  "1. Create / 2. Customize / 3. Export" tiles each repeat the CTA below.
- **Skeleton** (`DashboardSkeleton`, `dashboard.tsx:73-129`) is well-built (wraps at
  390px, fixed grid), but the *card* skeleton uses `aspect-[8.5/11]` boxes while the
  real thumbnails show a document — the loading→loaded transition changes shape.
- Light theme (`ui-dash-light-1440.png`): same layout; borders at 1.26:1 on white read as
  almost borderless; cards separate from the page only by `shadow-sm`.
- 768×1024 (`ui-dash-768.png`): grid drops to 2 columns (`sm`) but the rail goes full
  width above the list — filters/stats occupy the first ~2 screens of a tablet before
  any document appears.

### 2.3 Resume editor (`ui-editor-*`, `ui-editor-form-*`, `ui-editor-typo-*`)

- **Mobile collapse failure** (top-10 #1).
- **Header** (`resume-editor.tsx:1146-1265`): `min-h-14` + wrap. Left: back icon, then
  `h1 truncate font-semibold text-sm` + template-key subtitle. Centre: variation
  dropdown (`max-w-32 truncate`, `variation-manager.tsx:115`) which duplicates the
  document name and truncates it worse ("Harvard Applicat…"); plus a "Base"/"Variation"
  badge. Right: SaveState, Import, Review+badge, Export (white solid). Problems: name
  too small (10-4), name shown twice, four different button styles in one row (ghost
  icon, outline sm, outline sm + badge, default), and Export — the least frequent
  action — is the brightest object in the chrome.
- **Sections rail** (`resume-editor.tsx:1302-1404`): collapsible header `text-xs
  uppercase font-semibold` + count chip `text-[10px]`
  (`resume-editor.tsx:1323`, `sections-manager.tsx:255`). Rows wrap to two lines when
  titles are long ("Professional Experience"), breaking the row rhythm
  (`ui-editor-1440.png`). "Add Section" is a full-width outline button between the list
  and the TEMPLATES/Library collapsibles — visually a fourth "section".
- **Form column** (`resume-editor.tsx:1409-1492`): `p-4` with `mb-4` header
  ("title + type label" then the form's own heading). Field grid uses one-off fractional
  templates (`grid-cols-[0.8fr_1.2fr]`, `grid-cols-[0.85fr_1.15fr]`) in marketing and
  near-even 2-col in forms; labels are `text-sm font-medium`, inputs `h-10`
  (`input.tsx:10`) — full-width inputs stretch to ~560px on desktop, far past a
  comfortable fill measure, and every field is the same height/weight, so the eye has
  nothing to land on between "Full Name" and "Portfolio". Date inputs show a dashed
  placeholder ("---------- ---", `ui-editor-typo-1440.png`) that reads broken.
- **Forms** (e.g. `experience-form.tsx:153-220`): sticky save strip (`-mx-4 -mt-4 mb-4`,
  `min-h-10`, `py-2`) + accordion entries + `SaveStatusIndicator`. The accordion trigger
  rows (`px-4 py-3`) are denser than the outer form's `space-y-4` — two spacing systems
  stacked. Entry forms add a third: `space-y-3` inside entries.
- **Typography & layout** (top-10 #7). Collapsed bar ("Postgrad · 67% · 2 pages") is
  good; the open panel is a wrapped soup of pills with twin steppers and 10px labels.
- **Preview column** (`resume-editor.tsx:1495-1583`): `bg-muted/30` field with `p-6`
  around the page. At 1440 the page (547px at 67%) leaves ~20px gutters — fine; the
  problem is elsewhere: the preview page is the only high-contrast object in a dark UI
  and therefore wins attention over everything (it should — but the chrome competes via
  white buttons instead of hierarchy).
- Resize handles `w-1.5 bg-border` (`resume-editor.tsx:1406, 1492`) — with `--border` at
  1.31:1 in dark, the draggable affordance is nearly invisible (hover turns
  `bg-primary/50`).
- "Resume not found" (`resume-editor.tsx:1130-1143`): centered `space-y-4` block on a
  full-height flex — a small island in a big void; no icon, no illustration.

### 2.4 Template picker (`ui-templates-1440.png`, `ui-templates-390.png`)

- Lives inside the rail's TEMPLATES collapsible (collapsed by default — discovery cost:
  the only way to change template is a collapsed rail section).
- `TemplateSpecimen` miniatures (`template-selector.tsx:27-110`) are good art direction
  but rely on one-off literal sizes (`text-[6.5px]`, `text-[11px]`, `gap-[3px]`,
  `rounded-[3px]`).
- **Descriptions are clipped by the rail edge**: "Clean and simple de…" /
  "Academic style for postgrad and res|earch roles" — the text column is wider than the
  rail's leftover space and gets cut mid-word (`ui-templates-1440.png`).
- Row layout = specimen (~62px) + name/description; selected state is a background
  change only (no border/check), which with the flat dark theme (top-10 #2) is subtle.

### 2.5 Dialogs (`ui-dialog-*`, `ui-card-menu-*`)

- **Create resume** (`dashboard.tsx:925-977`, `ui-dialog-create-1440.png`): `max-w-lg`,
  `p-6`, `gap-4` body; label + `h-10` input + select + template description. Footer
  Cancel (outline) → Create (primary, disabled until name). The disabled primary renders
  as a solid grey slab (white at 50% opacity) that reads like an enabled secondary
  button; there is no hint of *why* it is disabled. Otherwise the best-proportioned
  surface in the app. Dead band ~35px between the template description and the footer.
- **Delete confirm** (`dashboard.tsx:979-1000`, `ui-dialog-delete-1440.png`): title +
  description + Cancel/Delete(destructive). Body is two lines in a `p-6` `max-w-lg`
  frame — half the dialog is empty; no resume name is shown in the confirmation
  ("Delete Resume / Are you sure… this resume"), so the user must trust which card the
  menu came from. The generic `useConfirm` dialog (`use-confirm.tsx`) has the same shape.
- **Create variation** (`variation-manager.tsx:196-235`, `ui-dialog-variation-1440.png`):
  good explanatory description (it does the "fork, don't retype" pitch again — copy
  duplicate of the marketing page inside a dialog). Name + Domain inputs + Cancel/Create.
  Unreachable below 768px (the whole VariationManager is `hidden md:flex`,
  `resume-editor.tsx:1183`) — `ui-variation-menu-1440.png` exists but at 390 the click
  target is not rendered to the user at all.
- **Card menu** (`ui-card-menu-1440.png`): Edit / Duplicate / Export / Archive / Delete
  with icons; Delete in `text-destructive`. Fine. Menu width varies with label length.
- All dialogs centre on the viewport with `translate(-50%,-50%)` and animate
  zoom-out-95 — consistent.

### 2.6 Export menu (`ui-export-menu-1440.png`, `ui-export-menu-390.png`)

- Dropdown anchored under Export: "Export as PDF / Export as DOCX (parse-optimised) /
  Export as JSON / Export as Text". **All four items share one generic file icon**
  (`export-buttons.tsx:184-199`) — no format differentiation, no description of what
  each is for (the DOCX one *says* "parse-optimised" but only via label text).
- The menu overlaps the preview panel; no scrim (fine for a dropdown).
- The non-dropdown variant (`export-buttons.tsx:207-218`) puts "Export" (default) next
  to "JSON" (outline) — two buttons where one is 5× more common, same weight.

### 2.7 Review sheet (`ui-review-*`)

- Sheet `sm:max-w-xl`, header "Review + count badge", description, then the tab strip
  (top-10 #3).
- Summary line ("3 to fix · 3 worth considering · 10 holding…") is `text-xs` muted —
  the single most useful sentence on the panel is the least visible
  (`review-panel.tsx:240-247`).
- Finding cards: status icon + `font-medium text-sm` title + two chips ("Fix"/"Holding"
  + category "Parse fit") + `text-xs` description (`review-panel.tsx:249-333`). The
  category chip repeats on every card inside its own category group — chip noise.
- `ClearState` (`review-panel.tsx:117-128`) is a dashed box with an emerald check —
  one-off styling (border-dashed + hardcoded emerald) that no other state uses.
- Tabs wrap badges inline ("Parser fit 3", "Bullets 10") — the badge widens the tab and
  directly causes the overflow.

### 2.8 Import review (`ui-import-sheet-*`, `ui-import-review-*`)

- Dense and largely good: per-field cards with "Needs checking"/"Extracted"/"Heading
  read" chips, guessed-value warnings in amber, Remove per field
  (`import-review-view.tsx:330-400`).
- Action row has two near-synonym buttons side by side: "Choose a PDF or .docx file" and
  "Choose a different file" (`import-review-panel.tsx:130-160`) — after a file is chosen
  both remain visible; wording differs by two words.
- Warning paragraphs stack two amber text blocks plus a third amber line ("MIT looked
  like a heading…") — three differently-coloured prose blocks before the first field;
  colour is doing hierarchy work that position/size should do.
- The `role="alert"` refusal block (`import-review-panel.tsx:200-210`) is good.

### 2.9 Empty states everywhere (`ui-dash-empty-*`, `ui-editor-*` w/ PanelEmpty, `ui-library-*`)

- Dashboard: 3 variants, see 2.2.
- Editor form area: `PanelEmpty` "Nothing selected / This resume has no sections yet"
  (`resume-editor.tsx:1456-1480`) — dashed frame inside a 605px column at 1440px
  (`ui-editor-1440.png` shows the variant with a selection; the empty frame renders the
  same `STATE_FRAME` used by library/history).
- Library panel (`ui-library-1440.png`): "Your library is empty. Save an existing
  section above to reuse it" (`content-library-panel.tsx:447`) — good copy.
- History (`review-panel` History tab, `ui-review-history-1440.png`): empty state copy
  per `history-panel.tsx:265`.
- Loading state for thumbnails is an icon, not a skeleton (top-10 #8).

---

## 3. Spacing audit

Counts of `p-`/`m-`/`gap-`/`space-*` utilities across `src/` (Tailwind classes, ≈1,140
instances). Dominant steps are the 4px core; the problem is the tail.

### Histogram (value → count)

| family | values (count) |
|---|---|
| `gap-*` | 2 (100), 4 (47), 3 (39), 1 (19), 1.5 (19), 6 (7), 2.5 (4), 8 (3), 10 (3), 0.5 (3), 0 (2), 12 (2), 16 (2), 20 (2), 5 (1), 7 (1), `[3px]` (1) — **17 distinct** |
| `mt-*` | 1 (75), 2 (26), 4 (18), 5 (10), 0.5 (9), 1.5 (7), 8 (2), 6 (2), 2.5 (2), 3.5 (2), 3 (2), 12 (4), 0 (1), 10 (1), 16 (1) — **15 distinct** |
| `mb-*` | 4 (45), 2 (33), 1 (4), 8 (3), 6 (3) — 5 distinct |
| `px-*` | 4 (52), 2 (24), 3 (17), 6 (7), 2.5 (4), 1.5 (3), 1 (3), 3.5 (1), 5 (1), 8 (1) — **10 distinct** |
| `py-*` | 2 (28), 1.5 (19), 8 (14), 3 (11), 1 (5), 3.5 (4), 2.5 (4), 24 (7), 18 (7), 4 (7), 0.5 (7), 14 (2), 5 (1), 6 (1), 16 (1), 20 (1) — **16 distinct** |
| `p-*` | 4 (15), 6 (10), 3 (9), 2 (8), 1 (6), 8 (3), 0 (3), 1.5 (1), 5 (1), 7 (1) — **10 distinct** |
| `space-y/x-*` | 4 (35), 2 (23), 1 (15), 3 (13), 1.5 (4), 6 (2), 0.5 (1), 2.5 (1), x-2 (2) — 9 distinct |
| `pl/pr/ml/mr/mx/my` | pl-9 (13), pl-8 (7), pl-3 (3), pl-5 (3), pl-6.5 (1), pl-7 (1), pl-10 (1), pr-3 (7), pr-2 (4), pr-8 (1), mr-2 (66), mr-1 (10), mr-1.5 (2), ml-2 (8), ml-1 (3), mx-4 (13), mx-1 (9), mx-6 (1), my-2 (4), my-1 (2), my-0 (1) — **21 distinct** |

### Verdict

- **≈90 distinct spacing steps** for a system whose useful range is ~10.
- **~27 values are singletons** (`p-1.5`, `p-5`, `p-7`, `px-3.5`, `px-5`, `px-8`,
  `pt-5`, `pt-6`, `pb-6`, `pl-6.5`, `pl-7`, `pl-10`, `pr-8`, `mx-6`, `my-0`, `mt-0`,
  `mt-10`, `mt-16`, `gap-5`, `gap-7`, `py-5`, `py-6`, `py-16`, `py-20`, `space-y-2.5`,
  `space-y-0.5`, `gap-[3px]`) — each is a bespoke decision that will drift again.
- Off-scale literals: `pl-6.5` (26px, `sections.tsx:233`), `gap-[3px]`
  (`template-selector.tsx:90`), `rounded-[3px]` (`template-selector.tsx:38`),
  `top-[0.5em]` (`hero.tsx:193`), `translate-y-[-3px]` (`alert.tsx:7` optical hack),
  `h-[2px]`, `w-[68px]`, `min-w-[80px]`, `h-[38rem]`, `h-[30rem]`.
- Marketing-only vertical step `py-18` (72px) used 7× (`sections.tsx:84,137,195,282,363,426,470`)
  while the app uses `py-8`/`py-24` — two different section rhythms.
- Forms stack three rhythm systems: outer `space-y-4` (`experience-form.tsx:153`),
  entry `space-y-3` (`:188`), and shadcn component internals (`p-6`, `gap-1.5`,
  `space-y-1.5` in `card.tsx`, `dialog.tsx:40`).
- The elevation tokens that would give spacing meaning in depth are unused (top-10 #2).

---

## 4. Typography audit

### Class-level usage (all of `src/`)

| class | count |
|---|---|
| `text-sm` | 155 |
| `text-xs` | 85 |
| `text-lg` | 4 |
| `text-base` | 4 |
| `text-xl` | 3 |
| `text-2xl` | 2 |
| `text-3xl` / `text-4xl` | 1 / 1 |

Weights: `font-medium` 78, `font-semibold` 46, `font-bold` 7, `font-normal` 3.
~20 arbitrary `text-[…rem]` values plus `text-[6.5px]`, `text-[10px]` (9×),
`text-[11px]` (2×).

### Measured computed sizes per surface

| surface | distinct sizes | notes |
|---|---|---|
| editor (1440) | 4 — 16px ×288, 14px ×254, 12px ×49, 10px ×1 | everything is 14/16; weights 400/500 only → flat |
| dashboard (1440) | 6 chrome — 12/14/16/18/20/24 (+ 5 sub-5px sizes inside scaled thumbnails) | 24px used once (greeting) |
| marketing home (1440) | **22** — 84, 52, 20.74, 20.8, 17.6, 16.8, 16.32, 16, 15.2, 14.8, 14.72, 14.4, 12.8, 12.48, 12.16, 11.84, 11.52, 11.2, 10.88, 10.56, 10.24, 9.92, 9.6, 9.28px | four body sizes within 0.8px; caption ladder in 0.32px steps |

### Verdict

- The marketing page defines a real scale (`--text-display/title/subtitle/lede`,
  `globals.css:333-343`) and then bypasses it for body copy with per-element rem values
  — 14.4 / 14.72 / 14.8 / 15.2px cannot be told apart by eye yet are four values to
  maintain. Same for 9.28→12.8px in 0.32px steps.
- The app chrome is a **two-size system** (xs + sm = 87% of all text). With
  `text-base`+ used 11 times total and 16px tops out the scale, hierarchy cannot be
  expressed by size; the editor compensates with weight-500 everywhere (237 elements in
  the measured pass), which flattens labels against values. Field labels
  (`text-sm font-medium`), section titles (`text-sm/16px font-semibold`) and the
  document name (`text-sm`) are within one step of each other (top-10 #4).
- Micro-type below 11px is used for functional labels: `text-[10px]` margins labels
  (`formatting-toolbar.tsx:465+`), section-count chip (`sections-manager.tsx:255`),
  badges (`rubric-panel.tsx:66-69`) — these carry real information at the smallest size
  on screen.
- Line heights: mostly default; `leading-[1.7]`, `leading-[1.55]`, `leading-[1.3]`,
  `leading-[1.15]` are one-off literals (marketing + specimens).

---

## 5. Colour audit

### Dark theme tokens (`globals.css:129-169`) — 12 roles on 5 greys

| oklch L | roles collapsed onto it | measured contrast |
|---|---|---|
| 0.145 | `--background`, `--card`, `--popover` | card vs background **1.00:1** (identical) |
| 0.205 | `--sidebar`, `--primary-foreground` | — |
| 0.269 | `--secondary`, `--muted`, `--accent`, `--border`, `--input` | vs background **1.31:1** (needs 3:1 for borders; hover = 1.31:1) |
| 0.708 | `--muted-foreground` | 7.63:1 on background — fine |
| 0.985 | `--foreground`, `--primary`, `--primary-foreground`… | 18.96:1 on background — fine |

(Contrast computed from the achromatic oklch values, Y = L³.)

### Light theme (`globals.css:77-127`)

- `--border`/`--input` = 0.922 → **1.26:1 on white** — card edges and inputs are barely
  drawn; `--secondary`/`--muted`/`--accent` again one value (0.965).
- `--muted-foreground` 0.556 → 4.73:1 (passes, barely, for body-size text).

### Findings

- **The tone is not "too many greys" — it is too few distinctions doing too many jobs.**
  In dark, a hover, an input border, a divider, a badge fill and a secondary button are
  all `oklch(0.269 0 0)`. In light the same collapse exists at 0.965/0.922.
- Marketing tokens (`globals.css:293-322`) document their contrast ratios and separate
  text/muted/faint + control-border from decorative rule — the app tokens never got that
  treatment.
- Status colours are off-token (top-10 #10): emerald-500/600, amber-400/500/600/700,
  blue-100/300/700/900 across 7 files; some pairs carry `dark:` variants and some don't.
- Chrome text measured on the dashboard: 3 token colours; the other 5 measured colours
  (`rgb(15,23,42)` etc.) are document-palette colours inside thumbnails — correct to be
  there, but they are the only saturated things on screen and they pull the eye into the
  thumbnails.
- Focus ring is a real blue (`globals.css:107-111`, oklch(0.532 0.232 255)) with a
  documented WCAG reason — good, and one of the few chromatic elements in the chrome.

---

## 6. Hierarchy audit — what the eye hits first vs what it should

| screen | what the eye hits first | what it should be | cause |
|---|---|---|---|
| Dashboard | white "New Resume" button, then white thumbnails | the resumes (titles), then the create action | primary is pure white on near-black; titles are 18px truncated to ~12 chars (`resume-card.tsx:86`) |
| Editor | white Export button + white preview page | the document name, then the form | name is `text-sm` (`resume-editor.tsx:1173`); Export is `bg-primary` white |
| Editor form | the form's own re-stated title block | one title, then field groups | title printed 2-4× (1427 + form heading + group labels) |
| Typography panel | the two "%" steppers | font family, then scale | identical pill steppers (`formatting-toolbar.tsx:176-197, 645-663`) |
| Review sheet | tab pills + badge chips | the summary sentence ("3 to fix…") | summary is `text-xs` muted; chips are bright outline pills (`review-panel.tsx:240-247`) |
| Import review | amber warning paragraphs | the file + the field cards | 3 amber prose blocks before content (`import-review-view.tsx:339,396`) |
| Create dialog | "Create Resume" slab | the name input (it does have focus) | disabled primary renders solid |
| Marketing home | headline (correct) | headline | display clamp works; the stats row is the weak second tier (0.7rem labels) |
| Marketing templates | three white cards' empty bottoms | the specimen content | fixed card height > content (`sections.tsx:282-357`) |

---

## 7. Missing states inventory

| state | where it exists | where it's missing / weak |
|---|---|---|
| Hover | buttons, rail rows, cards (`hover:shadow-lg`), tabs | template-picker rows (background only, 1.31:1 in dark), resize handles (visible only on hover — no persistent affordance) |
| Focus | `:focus-visible` ring globally + marketing variant; card title button | icon-only rail buttons rely on ring against 1.31:1 borders; export menu items |
| Disabled | create button, pagination, stepper bounds (`scale <= 0.3`), export while running | disabled primary looks like a live grey button; no reason affordance |
| Loading | `DashboardSkeleton`, `ResumeCardSkeleton`, `PanelLoading`, inline `Loader2`, `SaveState`, import busy | **card thumbnails** (icon-in-box, top-10 #8), Typst preview while WASM compiles (page area shows nothing), template picker (no per-tile state) |
| Error | `PanelError` + retry, editor `role="alert"` banner (`resume-editor.tsx:1268-1292`), import refusal/alerts, form `aria-invalid` + `text-destructive` (all 10 forms) | preview render failure (no visible failure state on the page area), export menu failure affordance (handled by toast only), dashboard error→empty ambiguity in the *thumbnail* area |
| Empty | `EmptyState` ×3 variants, `PanelEmpty`, `ClearState`, library/history copy | review History at 390 is unreachable (not a state problem — an overflow problem); "no variations" has no dedicated state (menu simply lacks entries) |
| Skeleton→content match | dashboard skeleton matches card grid | thumbnail skeleton box ≠ rendered document (shape change on load) |

---

## 8. Recommended fix list (ordered by impact)

1. **Responsive editor layout.** Below ~1024px collapse to one column with a
   section/form/preview switcher (or tabs): `resume-editor.tsx:1296-1583`. Nothing else
   on this list matters more — the current mobile editor cannot be used.
2. **Rebuild the dark (and light) surface ramp.** Give `--card`/`--popover` a lift above
   `--background`, split `--border` from `--input` from `--accent`, and raise control
   boundaries to ≥3:1 (`globals.css:129-169`, `:77-127`). Then wire the existing
   `--elev-1..3` tokens into `card.tsx`, `dialog.tsx`, `sheet.tsx` and delete the stock
   `shadow-sm`/`shadow-lg` usages.
3. **Fix the Review tab strip** (`review-panel.tsx:193-238`): wrap or scroll the strip,
   drop the count badges out of the tab labels (put counts in the panel), so History and
   Bullets are reachable at 390px and un-clipped at 1440px.
4. **Editor header + form hierarchy**: document name to ~20px semibold, print the
   template display name (not the key), show the name once (drop the duplicated
   variation dropdown label or the h1), and delete the form's repeated title block
   (`resume-editor.tsx:1173-1177, 1415-1450`).
5. **Dashboard density**: tighten the grid to fill the viewport (larger cards at `xl`
   or 5 columns), let the title own its row with the overflow menu pinned top-right so
   truncation can't collide (`resume-card.tsx:80-110`), and merge "N resumes" with the
   "Your library" stats (`dashboard.tsx:850-860, 723-740`).
6. **One type scale for the app, one for marketing, enforced**: app = 12/14/16/20/24/32;
   marketing body = a single 15px step (kill 0.9/0.92/0.925/0.95 and the 0.6–0.8rem
   ladder in `hero.tsx`/`sections.tsx`/`site-chrome.tsx`).
7. **Typography & layout panel**: label the steppers ("Font size", "Zoom"), differentiate
   them visually, give the icon popovers `aria-label` + tooltips, replace the `text-[10px]`
   margin labels (`formatting-toolbar.tsx`).
8. **Placeholder states**: thumbnail skeleton matching the rendered page (replace
   `resume-thumbnail.tsx:179` icon-in-box), and size the marketing template cards to
   their content (`sections.tsx:282-357`).
9. **Spacing snap**: adopt the 4px core (2/4/8/12/16/24/32), replace the ~27 singletons
   and literals (`pl-6.5`, `gap-[3px]`, `py-18` → `py-16`/`py-20`), and put forms on one
   rhythm system.
10. **Semantic status tokens**: add `--success` / `--warning` / `--info` to
    `globals.css`, replace the emerald/amber/blue literals in `save-state.tsx`,
    `review-panel.tsx`, `job-match-panel.tsx`, `import-review-view.tsx`,
    `change-log.tsx`, `rubric-panel.tsx`.

Honourable mentions (cheap, visible): hero artefact 12px stagger (`hero.tsx:241`), the
template descriptions clipped by the rail (`template-selector.tsx`), variation controls
hidden below 768px (`resume-editor.tsx:1183`), "Choose a PDF or .docx file" vs "Choose a
different file" wording (`import-review-panel.tsx`), identical generic icons in the
export menu, the raw template key in the editor subtitle, and naming the delete dialog's
target ("Delete "Senior Software Engineer…"?").

---

## Appendix — screenshot index (`.probe-shots/`)

- **Marketing**: `ui-home-top-{1440,1024,768,390}`, `ui-home-full-{…}`,
  `ui-home-sec-{features,workflow,inspect,templates,principles,faq}-{1440,390}`,
  `ui-home-bottom-{1440,390}`.
- **Dashboard**: `ui-dash-{1440,1024,768,390}`, `ui-dash-390-slow` (lazy-load proof),
  `ui-dash-light-1440`, `ui-dash-empty-search-{1440,390}`, `ui-dash-empty-archived-{1440,390}`,
  `ui-dash-empty-true-{1440,390}` (mocked `resume.list`).
- **Editor**: `ui-editor-{1440,1024,768,390}`, `ui-editor-form-{…}`, `ui-editor-typo-{…}`,
  `ui-editor-light-1440`, `ui-templates-{1440,390}`, `ui-library-{1440,390}`.
- **Review**: `ui-review-{checklist,plain-text,parser-fit,job-target,history,bullets}-1440`,
  `ui-review-{checklist,plain-text,parser-fit,job-target}-390`, `ui-review-tabstrip-390`
  (History/Bullets unreachable at 390).
- **Dialogs/menus**: `ui-dialog-create-{1440,390}`, `ui-dialog-delete-{1440,390}`,
  `ui-dialog-variation-1440`, `ui-card-menu-{1440,390}`, `ui-export-menu-{1440,390}`,
  `ui-variation-menu-1440`.
- **Import**: `ui-import-sheet-{1440,390}`, `ui-import-review-{1440,390}` (fixture:
  `.probe-downloads/Harvard-Application-MPhil-Candidate-Applied-Mathematics.pdf`).
