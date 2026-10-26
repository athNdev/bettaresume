# Refactoring UI — operative rules for the BettaResume redesign

> **Status**: design specification for the round-2 redesign. Extracted from
> `docs/research/refactoring-ui-extract.md` (the full book text). This supersedes the
> reconstructed rule list R1–R15 in `docs/research/design-systems.md` §C2 as the *visual*
> method; the token architecture in §C4 is kept as the substrate this spec consumes.
> Evidence of what is broken today is in `docs/research/ui-audit.md` (file/component
> references below point there).

## How to read this document

- **Surface A — app chrome**: dashboard, resume editor (rail, form, toolbar), dialogs,
  sheets, menus, marketing shell. **The book applies here.**
- **Surface B — resume document**: the Typst templates and the preview page content.
  A conservative, print-bound, ATS-parsed artifact. Most of the book **stops at the
  chrome**. Every place it must stop is marked **⛔ DOC**.
- Every rule is written as four fields: **Rule** (checkable), **Mechanism** (concrete
  values and techniques), **Prevents** (the mistake), **In the app** (BettaResume:
  editor, dashboard, dialogs, preview, marketing).
- The two surfaces obey one deliberate exception to the book's consistency rule
  ("Mixing square corners with rounded corners … almost always looks worse"): **if an
  object represents paper, it has square corners and no shadow of its own content;
  everything else is chrome and uses the chrome radius.** One rule, applied absolutely —
  see the brief, Part 3.

---

# Part 1 — The rules

## Chapter 1 — Starting from Scratch (p7–34)

### 1.1 Start with a feature, not a layout (p8)

- **Rule (checkable).** Every redesign iteration MUST name the feature it is designing
  (e.g. "edit a section and see the page change") and start from that feature's controls
  and content — not from the nav, shell, or page frame. If an iteration's first artifact
  is a shell, reject it.
- **Mechanism.** List the feature's concrete elements (fields, actions, feedback) on
  paper; design them first; let the shell emerge from what the features need. The book's
  example: flight booking starts with 4 fields + a button, not the navbar.
- **Prevents.** Weeks of agonizing over navigation and container widths while the actual
  product screens stay undesigned — "Before you've designed a few features, you don't
  even have the information you need to make a decision about how the navigation should
  work."
- **In the app.** The core loop is *pick a section → edit it → watch the page change →
  export*. Redesign iteration 1 = the **section form + preview pair** (`resume-editor.tsx`
  form column + preview column), iteration 2 = the **resume card + create dialog** on the
  dashboard, iteration 3 = the **review sheet**, and only then the editor header/rail
  shell, which exists to serve those features. Marketing shell last.

### 1.2 Detail comes later (p12) — *hold the color*

- **Rule (checkable).** The first pass of any new or redesigned screen MUST be built in
  greyscale with real content. No accent color, no icon set choice, no shadow tuning
  until the hierarchy survives the squint test without them. (Jason Fried's Sharpie
  trick: if you can't make the decision at low fidelity, fidelity isn't the problem.)
- **Mechanism.** Design with spacing, contrast (tone), size and weight only. Introduce
  color as the *last* layer — "you'll end up with a clearer interface with a strong
  hierarchy that's easy to enhance with color later." Sketches are disposable; don't
  over-invest in mockups ("users can't do anything with static mockups").
- **Prevents.** The failure mode of the first pass: shipping a color/token system
  (design-systems.md §C4) and calling it a redesign while every screen's hierarchy is
  unchanged. Color cannot fix hierarchy; it can only decorate one.
- **In the app.** Redo the editor form column and dashboard grid in greyscale first; when
  the layout reads correctly, re-apply the accent (Part 3) and status colors. ⛔ DOC:
  the document is *already* greyscale-first (black on paper); its template accent hues
  come last in exactly the same way, and never carry meaning.

### 1.3 Don't design too much (p16) — *work in cycles, be a pessimist*

- **Rule (checkable).** No screen in this redesign may contain UI that implies
  functionality not being built. Each feature is designed to its smallest useful version,
  built, iterated until no problems remain, then the next feature starts.
- **Mechanism.** Short cycles: design simple → build → hit real edge cases → fix in the
  running UI. Be a pessimist: if a part is a "nice-to-have", design it later. The book's
  comment-system example: the attachment section you speculatively designed is why
  nothing shipped.
- **Prevents.** Designing 2,000-contact edge cases in imagination; shipped shells full
  of disabled affordances; the audit's "missing states" surfacing late (e.g. the
  "no variations" menu that simply has no entries — decide later whether it deserves a
  state at all).
- **In the app.** Redesign the *reachable* states the audit measured (the three empty
  dashboard variants, save states, import review) and leave speculative states (offline,
  collaboration) out of the spec entirely.

### 1.4 Choose a personality (p20)

- **Rule (checkable).** Before any pixel moves, the design MUST have a written
  personality on all four of the book's axes — **font, color, border radius, language** —
  and every later decision must be consistent with it. "Every design has some sort of
  personality"; not choosing one chooses "generic bootstrap SaaS" by default.
- **Mechanism.** The axes, per the book:
  - *Font*: serif = elegant/classic; rounded sans = playful; **neutral sans = plain,
    letting other elements carry personality**.
  - *Color*: blue = "safe and familiar"; gold = "expensive and sophisticated"; pink =
    "fun, not so serious".
  - *Radius*: small = neutral; large = playful; **none = "a lot more serious or formal"**.
    Consistency is mandatory.
  - *Language*: less personal tone = official/professional; casual = friendly. "Words are
    everywhere in a user interface."
  - *Deciding*: look at sites used by the target audience ("if they are mostly pretty
    'serious business', maybe that's how your site should look too") but don't clone
    direct competitors.
- **Prevents.** Unprincipled mixing — rounded playful chips on a serious black workbench,
  exclamation-mark toasts next to ATS compliance copy — and the endless dithering
  ("decision fatigue") the previous pass deferred into open questions Q1/Q8.
- **In the app.** The decision is made in **Part 3** (brief): *serious, precise, quiet —
  neutral sans, warm ink-on-paper greys, one blue, small radius everywhere except paper
  objects, plain professional language.* Not playful, not a consumer toy — per the hard
  constraint. ⛔ DOC: the document's personality is **the template's**, not the app's;
  templates range from conservative to academic and must not inherit the chrome's accent
  or radius.

### 1.5 Limit your choices (p28) — *systems in advance, elimination, systematize everything*

- **Rule (checkable).** Every low-level value (font size, weight, line-height, color,
  margin, padding, width, height, shadow, radius, border width, opacity) MUST come from
  a system defined in advance. New values are added by editing the system, never inline.
- **Mechanism.** Define a small set of visibly distinct options (8–10 shades per color;
  a restrictive type scale). Decide by **process of elimination**: guess the middle
  value, try the neighbors on either side — "two of those options will seem like
  obviously bad choices." If an outside option wins, recenter and re-test. The payoff:
  "you only have to do the hard work of picking the initial values once instead of every
  time."
- **Prevents.** 12px-vs-13px paralysis and its artifact: the audit found ~90 distinct
  spacing steps, ~27 single-use values (`p-5`, `pl-6.5`, `gap-[3px]`, `py-18`), four
  body sizes within 0.8px on marketing (0.9/0.92/0.925/0.95rem) — exactly the
  "35 slightly different blues" pathology.
- **In the app.** This is the **one chapter the previous pass actually executed**
  (the `--br-*` scales). Keep them. But note what this rule is: a *precondition* for
  design, not design. A token scale makes zero design decisions on its own — see Part 2.
  Enforcement: the grep tests R1/R2/R7/R8 survive as-is.

---

## Chapter 2 — Hierarchy is Everything (p35–64)

### 2.1 Not all elements are equal (p36)

- **Rule (checkable).** For each screen there MUST be an explicit, written ranking of its
  top three elements (what the eye should hit first, second, third), and the rendered
  screen must match it in the squint test. Equal visual weight across a screen is a bug.
- **Mechanism.** Rank, then de-emphasize everything below the top deliberately
  (tone → weight → size → spacing, in that order of cheapness). "When you deliberately
  de-emphasize secondary and tertiary information … the result is immediately more
  pleasing, even though the color scheme, font choice, and layout haven't changed."
- **Prevents.** The audit's central finding: "nothing in the chrome leads; the white
  Export button and the white preview page win" (editor), "white New Resume button, then
  white thumbnails" (dashboard). One big wall of content where nothing matters.
- **In the app.** Rankings to enforce:
  - *Editor*: (1) document name, (2) the form of the selected section / the page,
  (3) everything else — Export, Import, Review, save-state all quiet.
  - *Dashboard*: (1) resume titles + thumbnails, (2) "New resume", (3) filters/stats.
  - *Dialog*: (1) the primary input, (2) the confirm action, (3) the cancel.
  - *Review sheet*: (1) the summary sentence ("3 to fix …"), (2) finding titles,
  (3) chips/tabs.

### 2.2 Size isn't everything (p38)

- **Rule (checkable).** Hierarchy MUST NOT be built primarily from font size. The app
  uses **two font weights** (400/500 normal, 600/700 emphasis — never below 400 in UI)
  and **three text tones** (primary, secondary grey, tertiary lighter grey) before any
  new size is introduced. Any size change requires weight/tone have been tried first.
- **Mechanism.** "Making a primary element bolder lets you use a more reasonable font
  size"; "using a softer color for supporting text instead of a tiny font size makes it
  clear that the text is secondary while sacrificing less on readability." Palette for
  text: dark for primary, grey for secondary, lighter grey for tertiary — no more.
- **Prevents.** Both audit failures at once: the marketing 22-size soup (hierarchy by
  ever-more sizes) and the app's 2-size monotone where 237 elements sit at `font-medium`
  500 and labels/values differ by position only. Also prevents micro-type: 10px labels
  carrying real information (margin labels, count chips) — de-emphasize by tone instead.
- **In the app.** Editor: document name earns the *one* size bump (14px → 20px, 600);
  field labels drop to secondary tone (not smaller than 13–14px); section titles 600 at
  14–16px; values 400 primary. Kill the blanket `font-medium` (audit: `font-medium` ×78)
  so weight means something again. Functional micro-text (`text-[10px]`, `text-[11px]`)
  moves to 12px + tertiary tone.

### 2.3 Don't use grey text on colored backgrounds (p42)

- **Rule (checkable).** No muted/grey/`text-muted-foreground` text on any tinted,
  colored, or patterned surface. De-emphasis on colored surfaces MUST come from a
  hand-picked same-hue color, never from white-at-opacity and never from grey.
- **Mechanism.** Grey-on-white works because of *reduced contrast*, not because it is
  grey. On color: pick the background's hue and hand-tune saturation/lightness (usually
  lighter and less saturated than the foreground). White at opacity "looks dull, washed
  out, and sometimes even disabled"; on patterns the background shows *through* the text.
- **Prevents.** Washed-out, disabled-looking secondary text in the audit's tinted
  surfaces: the welcome card (`border-primary/20 bg-primary/5`), the selected rail row
  tint, amber-on-amber import warnings, emerald `ClearState` copy.
- **In the app.** Every status/soft surface gets a defined text color pair from Part 3:
  e.g. `--warning-soft` background carries `--warning-text` (a hand-picked deeper amber),
  not `text-muted-foreground`. ⛔ DOC: applies to the document too — a template that
  tints a section heading must hand-pick the heading's text color; and because the
  document must photocopy legibly, tinted surfaces there stay extremely light.

### 2.4 Emphasize by de-emphasizing (p46)

- **Rule (checkable).** When the element that should dominate doesn't, the fix MUST be
  applied to its *competitors* first. Before increasing an element's emphasis, each
  competing element must lose one step (tone, fill, or weight) and the screen re-tested.
- **Mechanism.** "Instead of trying to further emphasize the element … figure out how
  you can de-emphasize the elements that are competing with it." Give inactive items a
  softer color; **"if a sidebar feels like it's competing with your main content area,
  don't give it a background color — let the content sit directly on the page background."**
- **Prevents.** The "make the title bigger / make the button glow" death spiral. The
  audit's proposed fix #4 (name to 20px) is necessary but not sufficient: as long as
  Export is a white slab and the rail has competing fills, hierarchy stays inverted.
- **In the app.** (a) Export button: solid white `bg-primary` → outline or ghost; the
  only solid button in the editor becomes none — the *document name* is the hero.
  (b) Inactive rail rows → tertiary tone; active row → primary tone + accent bar (8.2),
  not a loud fill. (c) Rail and panels: drop background fills that compete with content;
  let content sit on the page tone. (d) Duplicated chrome ("4 resumes" + rail
  "Resumes 4") removed so counts read once.

### 2.5 Labels are a last resort (p48)

- **Rule (checkable).** Data MAY only be shown as `label: value` when the value's format
  and context cannot identify it. Order of preference: (1) no label (format is enough),
  (2) label folded into the value ("12 left in stock", "3 bedrooms"), (3) label shown
  but de-emphasized (smaller, lighter, lighter weight), (4) label emphasized — only on
  information-dense spec-like pages where users scan *for the label*.
- **Mechanism.** "janedoe@example.com is an email address, (555) 765-4321 is a phone
  number and $19.99 is a price." When a label is needed, treat it as supporting content:
  the data gets the emphasis. When to emphasize a label: specs pages ("the user will be
  looking for the label") — then darken the label, lighten the value slightly, and
  don't de-emphasize the data too much.
- **Prevents.** The audit's most-repeated string: "Contact Information" printed **4×**
  in the top 400px of the editor (form header + form heading + group labels); the
  label:value wallpaper in the editor header and review chips; every piece of data
  "given equal emphasis."
- **In the app.** Header data without labels: "Harvard Application — MPhil" + "Postgrad
  template · Variation" as quiet text, not a labelled grid. Status strip: "2 pages · 67%
  · Saved" (values combined), not "Pages: 2 | Zoom: 67% | Status: Saved". Card footer:
  "Updated 2 days ago" (not "Updated: 10/25/2026" floating in a phantom second column).
  Review summary: "3 to fix · 3 worth considering · 10 holding" — promoted to primary
  text (it is the data; "Summary:" is the label — drop it). Group labels "Basic
  Information" / "Contact Information" become small quiet dividers (or sr-only) — see
  2.6. Dashboard stats: number large, label tiny ("4 / resumes"), one instance only.

### 2.6 Separate visual hierarchy from document hierarchy (p54)

- **Rule (checkable).** Semantic elements (h1–h6, fieldset/legend, aria landmarks) MUST
  be chosen for meaning; their visual styling MUST follow the screen's hierarchy, not
  browser defaults or tag size. Section titles are usually *labels*, not headings: they
  render smaller than their content's focus element.
- **Mechanism.** "Don't let the element you're using influence how you choose to style
  it." A page title like *Manage Account* doesn't need h1-bigness; "a lot of the time,
  titles should actually be pretty small." Extreme case: keep the heading in markup for
  accessibility and hide it visually (`sr-only`) "because the content speaks for itself."
- **Prevents.** The audit's inverted editor hierarchy: the document name (`text-sm`) is
  equal to field labels while the form's *own* re-stated heading steals the top of the
  column; group headings sized like content headings.
- **In the app.** Delete the form's repeated title block (`resume-editor.tsx:1415-1450`
  region): keep one visible title per column — the document name (20px/600) in the
  header; the selected section name as a small quiet label above its form; group labels
  ("Basic Information") as 12px/600 tertiary overlines or `sr-only` fieldset legends.
  Marketing h2s may be big — that *is* document-like content; app section titles stay
  small. ⛔ DOC: inverse warning — inside the resume, section headings ("EXPERIENCE")
  are **load-bearing for ATS parsers** and are *document* hierarchy; they must remain
  explicit and conventional even though this rule would minimize them.

### 2.7 Balance weight and contrast (p56)

- **Rule (checkable).** Any two adjacent elements of different visual weight MUST be
  counterbalanced: heavy elements lose contrast; low-contrast elements gain weight
  (border width, size). No unbalanced icon+text pairs; no hairline borders that must
  carry meaning.
- **Mechanism.** Icons are "heavy" (surface area) — give them a softer color next to
  text: "Reducing the contrast works like a counterbalance." Conversely, when a 1px soft
  border is too subtle, "making the border a bit heavier by increasing the width helps
  to emphasize it without losing the softer look" (1px→1.5–2px before darkening it).
- **Prevents.** Icon-loud menus (the card menu icons outranking their labels), and the
  audit's double bind: borders at 1.31:1 (dark) / 1.26:1 (light) that are simultaneously
  everywhere and invisible, plus resize handles (`w-1.5 bg-border`) with no visible
  affordance.
- **In the app.** Menu/rail/button icons → `--br-neutral-500` beside primary-tone labels.
  Control boundaries that carry meaning (inputs, resize handles, selected templates) →
  ≥3:1 (Part 3 border tokens) or 2px weight at a softer tone. Resize handles get a
  persistent, heavier grabber (weight to compensate), not hover-only visibility.

### 2.8 Semantics are secondary (p60)

- **Rule (checkable).** Button styling MUST follow the action pyramid (one primary, a
  couple of secondary, rest tertiary), not the action's semantics. Destructive actions
  that are not the screen's primary action MUST be styled secondary/tertiary, with the
  red solid treatment reserved for the confirmation step where the destructive action
  *is* the primary action.
- **Mechanism.** "Primary actions should be obvious. Solid, high contrast background
  colors"; secondary = outline or low-contrast fill; tertiary = styled like links.
  "Combine this with a confirmation step where the destructive action actually is the
  primary action, and apply the big, red, bold styling there."
- **Prevents.** Four different button styles in one header row (audit: ghost icon +
  outline sm + outline sm-with-badge + default in the editor header), loud-but-rare
  actions dominating, and disabled primaries that read as enabled (audit: the create
  dialog's disabled button "renders as a solid grey slab … reads like an enabled
  secondary button").
- **In the app.** Editor header: NO solid button; Import/Review/Export all quiet
  (ghost/outline) — the hierarchy is name → form → actions. Dashboard: exactly one
  solid button, "New resume". Dialogs: footer = one solid (the action) + one quiet
  Cancel; disabled solid = reduced-tone fill + `not-allowed` + a reason (helper text
  "Name your resume to continue"), never a grey slab. Delete confirm (`dashboard.tsx`
  delete dialog): Delete is the big red primary *there*; the card menu's Delete stays
  `text-destructive` tertiary. Export dropdown's 4 items = tertiary menu items; DOCX
  (the parse-optimised ATS path) may carry a quiet badge ("ATS") but not extra weight.

---

## Chapter 3 — Layout and Spacing (p65–100)

### 3.1 Start with too much white space (p66)

- **Rule (checkable).** Every redesigned region MUST be laid out first with "too much"
  space, then tightened. Spacing may only be added, never subtracted, as the *default*
  process; any dense region must carry a written "deliberately dense" justification.
- **Mechanism.** "White space should be removed, not added" — adding gets you only "the
  minimum amount of breathing room necessary to not look actively bad." Start with way
  too much and remove until happy; "what might seem like 'a little too much' when
  focused on an individual element ends up being closer to 'just enough' in the context
  of a complete UI." Dense UIs are legitimate ("if you're designing some sort of
  dashboard where a lot of information needs to be visible at once") — but "make this a
  deliberate decision instead of just being the default."
- **Prevents.** The cramped-by-accident look: accordion rows denser than their own form
  (`px-4 py-3` rows inside `space-y-4` forms), the review sheet's chip noise, the
  hero's CTA-and-stats collision. And the opposite: the audit's dashboard "half the page
  is dead space" — accidental emptiness is just accidental density in reverse.
- **In the app.** Density map (deliberate): **dense** = editor three-panel workbench,
  review sheet findings, import review (information must co-exist); **roomy** = dialogs,
  forms (32px between groups), dashboard (cards breathe), empty states; **airy** =
  marketing. The dashboard's dead space is fixed by *design* (cards sized to fill or the
  content column narrowed — 3.3), not by padding.

### 3.2 Establish a spacing and sizing system (p70)

- **Rule (checkable).** All spacing and sizing values come from one scale in which **no
  two values are closer than ~25%** at the same end, built as factors/multiples of a
  16px base. Checking for "multiples of 4" is insufficient — the audit's `p-5`/`p-7`
  are 4px-clean and still wrong.
- **Mechanism.** "Jumping from 12px to 16px is an increase of 33%! … increasing the
  width of a card from 500px to 520px is only a difference of 4%." So the scale packs
  tight at the small end and fans out at the large end. Practical scale (the book's
  example shape): **4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192** (px) — each step ≥25%
  apart. Decide by elimination (1.5): try the middle, compare neighbors. Design in the
  browser against the scale; don't drag pixels in a design tool.
- **Prevents.** The audit's ~90 distinct steps and ~27 single-use values; `pl-6.5`,
  `gap-[3px]`, `py-18`; the "120px or 125px?" pixel hunt.
- **In the app.** Adopt the scale above as `--br-space-*` (it refines the previous
  pass's 4px base: the 2px half-step survives *only* for optical icon↔label tuning, and
  `p-5`/`p-7`/`gap-5`/`gap-7` are banned — they are 25%-indistinguishable from their
  neighbors at these magnitudes). Widths/heights of components pick from the same
  family of steps (controls 32px, large controls 40px, rail 240px, dialog 512px etc.).

### 3.3 You don't have to fill the whole screen (p76)

- **Rule (checkable).** No element may be stretched to fill available space unless its
  content optimally uses that space. Every text block has a max measure (4.3); forms and
  panels have optimal widths and stop there. The layout may contain intentional empty
  columns/edges.
- **Mechanism.** "If you only need 600px, use 600px. Spreading things out or making
  things unnecessarily wide just makes an interface harder to interpret." **Shrink the
  canvas**: design mobile (~400px) first when stuck. **Thinking in columns**: when a
  narrow thing feels unbalanced in a wide UI, add a *separate* column of supporting
  content instead of widening it. "Don't force it" — if you need a lot of space, use it.
- **Prevents.** 560px-wide single-line inputs in the editor form (audit: "far past a
  comfortable fill measure"), full-width dialogs, and stretched-to-fill dashboards with
  phantom rows (the card footer date alone in `justify-between`).
- **In the app.** Form column: inputs cap at ~440px; form column caps at 480px and
  gains a *side* column of supporting text where needed (import review: the
  field cards + explanation rail). Dialogs `max-w-lg` already good — keep. Dashboard:
  either 5-column grid at ≥1280 or max-width the grid at ~1200 and center (deliberate
  edges). Marketing hero artefact panels: each sized to content (also fixes the 12px
  stagger — `hero.tsx:241`).

### 3.4 Grids are overrated (p84)

- **Rule (checkable).** Components with an optimal width MUST be fixed-width (or
  min/max-clamped), not percentage/grid-column sized; only genuinely fluid content
  (the document preview field) flexes. No element may shrink below its optimum while
  space remains.
- **Mechanism.** A sidebar on a 3-of-12 column grid "gets wider" on big screens and
  "can shrink below its minimum reasonable width" on small ones: "give the sidebar a
  fixed width that's optimized for its contents. The main content area can then flex."
  And: "give them a max-width so they don't get too large, and only force them to shrink
  when the screen gets smaller than that max-width" (the login-card example: a 500px
  card should never render at 430px while space exists).
- **Prevents.** The audit's #1 critical failure: `PanelGroup` at 16%/42%/42% "at every
  width" (`resume-editor.tsx:1302, 1409, 1495`) — at 390px all three columns fall below
  usable minimums and the editor is unusable. Also `xl:grid-cols-4` producing one row +
  void.
- **In the app.** Editor panels: **sections rail fixed 240px** (collapsible to 56px
  icon strip), **form column fixed 380–480px**, **preview flexes** (it is the only
  thing that legitimately scales — it represents a page). Below 1024px the fixed widths
  cannot fit: collapse to a **single column with a Sections/Form/Preview switcher** —
  fixed widths make the breakpoint *honest* instead of three squeezed columns. Dialogs
  and cards get max-widths and only shrink below them when forced.

### 3.5 Relative sizing doesn't scale (p92)

- **Rule (checkable).** No size relationship may be defined in relative units (em,
  percentages) with the expectation that it holds across contexts. Each breakpoint and
  each component size gets its own tuned values from the scales. Large things shrink
  *faster* than small things across breakpoints.
- **Mechanism.** "2.5em might be the perfect headline size on desktop but there's no
  guarantee that it'll be the right size on smaller screens" (2.5em of 14px body = 35px,
  absurd on mobile; the right mobile ratio is ~1.5–1.7×). Within components: a large
  button should have *disproportionately more* padding and a small one *tighter* — not
  the same zoom. "Let go of the idea that everything needs to scale proportionately."
- **Prevents.** Em-based marketing typography drifting (the `--marketing-max` fluid
  type shell plus per-element rem soup), and template specimen miniatures rendered by
  scaling real UI (`text-[6.5px]`, `gap-[3px]` — audit 2.4) and dashboard thumbnails
  with sub-5px text.
- **In the app.** Type and spacing at each breakpoint come from explicit scale steps
  (Part 3). Button sizes `sm/md/lg` have hand-tuned padding (not `em`). Template
  specimens and dashboard thumbnails are **redrawn simplified miniatures** — grey bars
  for text lines, real shapes for the name/heading — never live-scaled renders (see 7.3).
  ⛔ DOC: the document uses its own fixed pt scale in Typst; page count must not change
  with screen width, so nothing about the document is relative to the app's scaling.

### 3.6 Avoid ambiguous spacing (p96)

- **Rule (checkable).** For every visual group formed by spacing alone, the spacing
  *around* the group MUST be strictly greater than the spacing *within* it (rule of
  thumb: ≥2×). Applies vertically and horizontally.
- **Mechanism.** "If the margin below the label is the same as the margin below the
  input, the elements in the form group won't feel obviously 'connected' … at worst it
  means accidentally putting the wrong data in the wrong field." Fix: label→input 4–8px,
  input→next label 24–32px. Same for headings above sections (more space above than
  below), bullet lists (bullet gap > line-height spacing), and horizontal clusters.
- **Prevents.** The audit's three stacked spacing systems in forms (`space-y-4` outer,
  `px-4 py-3` accordion rows, `space-y-3` entry fields), the hero row where stats float
  at button mid-height next to CTAs (`hero.tsx:86-123`), and label/value pairs that
  read as one blob.
- **In the app.** One form rhythm everywhere: label→field **6px**, field→field **16px**,
  group→group **32px**, section→section **48px**. Accordion entries adopt the same
  rhythm inside. Hero: CTA row and stats row become two groups (stats get ≥32px
  separation and their own baseline — 4.4). Horizontal: chip clusters get more gap
  between categories than within a card row.

