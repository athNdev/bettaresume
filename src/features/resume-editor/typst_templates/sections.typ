#let data = json("sample.json")
// ──────────────────────────────────────────────
// Variables (must be defined before helpers)
// ──────────────────────────────────────────────

#let default-settings = (
  colors: (accent: "#2563eb", heading: "#111827", secondary: "#6b7280", background: "#ffffff", text: "#1e293b", primary: "#2563eb", divider: "#e2e8f0"),
  typography: (name: 18, title: 11, small: 9.5, body: 10.5, itemTitle: 10.5, sectionHeading: 11),
  // Balanced — the shipped default (docs/research/space-efficiency.md §5): 0.5in margins,
  // 1.25 leading. The 43/50pt comfort margins are the Relaxed preset now, not the default.
  margins: (top: 36, right: 36, bottom: 36, left: 36),
  lineHeight: 1.25,
  sectionSpacing: "normal",
  // No heading rule by default. The rule costs 2.6mm per section plus its 2pt gap, and
  // uppercase + semibold already scans; it stays available as `accentStyle`.
  accentStyle: "none",
)

// ──────────────────────────────────────────────
// Archetype profile — what a template may change about a section
// ──────────────────────────────────────────────
//
// An archetype is a document, not a skin. The things that genuinely differ between the
// six documents (docs/research/template-research.md §7) are collected here so each
// template declares its structure in one line instead of copying twelve renderers:
//
//   heading      auto | rule | hairline | plain
//                How a section heading is emphasised. `auto` follows `accentStyle` (the
//                user's own control) and otherwise leaves the heading as weight and case;
//                `rule` is the accent rule, `hairline` a 0.5pt text-ink rule, `plain` is
//                weight alone. The default is `auto` with no rule drawn: the rule costs
//                2.6mm per section and the scanned document does not need it.
//   education    standard | full
//                `full` adds the coursework, honours and achievements the payload has
//                always carried and the standard renderer dropped.
//   skills       auto | lines | chips | inline
//                `auto` is `Category: item, item` lines, and chips only at Relaxed
//                density; `lines` is always lines; `chips` is the label-over-cluster
//                treatment (kept as an option, not a default); `inline` is one
//                comma-separated line with no category labels (core expertise).
//   projects     standard | detail
//                `detail` adds the project's highlights and a labelled stack line.
//   publications plain | numbered
//                `numbered` prefixes each entry — the academic CV convention.
//   experience   standard | stack
//                `stack` adds a labelled technologies line to each role.
//
// Everything here is structure or typography. No field selects a colour, a fill or an
// icon: the research deletes all three outright (§6).
#let default-profile = (
  heading: "auto",
  education: "standard",
  skills: "auto",
  projects: "standard",
  publications: "plain",
  experience: "standard",
)

// A template names only the parts it changes; everything else keeps the standard
// behaviour. Typst dictionaries do not fall back to a default, so the merge happens here
// rather than requiring every template to repeat all six keys (and silently break when a
// seventh is added).
#let archetype-profile(overrides) = default-profile + overrides

// `data` is always injected by the compiler preamble as:
//   #let data = json(bytes("..."))
// The sys.inputs path was for standalone CLI use but is NOT used in the WASM
// browser renderer — redefining `data` here would shadow and discard the real
// resume payload.  Read directly from the already-defined `data` binding.

#let settings  = data.at("settings", default: default-settings)
#let personal  = data.at("personalInfo", default: (:))
#let sections  = data.at("sections", default: ())
#let colors    = settings.at("colors", default: default-settings.colors)
#let margins   = settings.at("margins", default: default-settings.margins)

// Global type scale, applied to the typography values the helpers read.
//
// `fontScale` is a control in the formatting toolbar (80%–120%). For a long time it was
// serialised into the document and read by nothing, so moving the slider changed the
// setting and not the page — the exact "control that does nothing" defect this file has
// already been bitten by twice. Scaling the scale object here means every size that goes
// through `typo.*` follows the control, including the header, which templates read
// directly rather than through the render helpers.
//
// The values are **true points**. `ResumeSettings.typography` used to carry CSS px and
// this file multiplied them by 0.75 (`px-to-pt`) before laying out body text, while the
// templates' headers read the same numbers as raw points — so "11pt" body text exported
// at 8.25pt and the same document's contact line sat at 11pt. The serialiser now emits
// points (clamped to the researched floors: body 10pt, small 9pt), so `typo.*` are
// lengths directly. One unit, and it is the unit the UI shows.
//
// Spacing and margins are deliberately NOT scaled: those are layout, and a user asking for
// larger type does not automatically want a wider margin.
#let font-scale = float(settings.at("fontScale", default: 1))
#let typo = {
  let base = settings.at("typography", default: default-settings.typography)
  let scale(v) = float(v) * font-scale * 1pt
  (
    name: scale(base.name),
    title: scale(base.title),
    sectionHeading: scale(base.sectionHeading),
    itemTitle: scale(base.itemTitle),
    body: scale(base.body),
    small: scale(base.small),
  )
}

// ──────────────────────────────────────────────
// Spacing scale (docs/research/template-research.md §4)
// ──────────────────────────────────────────────
//
// One modular scale in points: 2/3/4/6/8/12/16. Every vertical gap in the document is
// one of these named values; the density profile below maps each gap onto one of them, so
// a preset moves the whole document rather than half of it.
#let space-xs  = 2pt   // typographic fine-tuning: name → title, heading → its rule
#let space-s   = 3pt   // below a heading, above a heading at the tight setting
#let space-m   = 4pt   // heading → first entry; meta line → first bullet
#let space-l   = 6pt   // between entries; gap above a heading at the tight setting
#let space-xl  = 8pt   // gap above a section heading — balanced
#let space-2xl = 12pt  // gap above a section heading — relaxed
#let space-3xl = 16pt  // header → body at the relaxed setting

#let section-spacing = settings.at("sectionSpacing", default: "normal")

// ──────────────────────────────────────────────
// The density profile — every vertical gap in the document
// ──────────────────────────────────────────────
//
// `sectionSpacing` used to reach three gaps (section, header, contact) while the two
// highest-frequency ones — between entries and between bullets — were compile-time
// constants. That is why moving the density preset changed the header and the section
// boundaries and could not reclaim the ~23pt the entry and bullet gaps occupy: no preset
// could reach them (docs/research/space-efficiency.md §3.4).
//
// Every gap below is now chosen by the setting, so one preset moves the whole document:
//
//   compact  → Tight     normal → Balanced     spacious → Relaxed
//
// The values are the density envelope in docs/research/space-efficiency.md §2. They are
// mirrored in `src/lib/layout/density.ts` (`SPACING_GAPS`) and pinned by
// `test/density-gaps.test.ts`, so this table and the one the HTML preview reads cannot
// drift apart.
#let gaps-for(spacing) = if spacing == "compact" {
  (
    section: space-l,      // 6pt above a heading
    heading: space-s,      // 3pt heading → its first entry
    entry: space-m,        // 4pt between entries
    bullet: space-xs,      // 2pt between bullets in one entry
    meta: space-xs,        // 2pt meta line → first bullet
    header: space-l,       // 6pt header block → body
    contact: space-s,      // 3pt name/title → contact line
    header-rule: false,
  )
} else if spacing == "spacious" {
  (
    section: space-2xl,    // 12pt
    heading: space-m,      // 4pt
    entry: space-l,        // 6pt
    bullet: space-s,       // 3pt
    meta: space-m,         // 4pt
    header: space-3xl,     // 16pt
    contact: space-l,      // 6pt
    header-rule: true,
  )
} else {
  (
    section: space-xl,     // 8pt
    heading: space-m,      // 4pt
    entry: space-m,        // 4pt
    bullet: space-xs,      // 2pt
    meta: space-s,         // 3pt
    header: space-xl,      // 8pt
    contact: space-m,      // 4pt
    header-rule: true,
  )
}

// The document's profile: what every helper reads unless a section overrides it.
#let gaps = gaps-for(section-spacing)

// A section may carry `layout.spacing: compact | normal | spacious` and move its own gaps
// without touching the rest of the document. Absent means "follow the document" — which is
// why the fallback is the document's own setting and not a literal.
#let gaps-of(section) = gaps-for(
  section.at("layout", default: (:)).at("spacing", default: section-spacing),
)

// Paper width in points, used only by the fit probe to measure the line length. It is
// the same constant `src/lib/layout/page-fit.ts` uses; the probe is the only reader, so
// there is no second layout source of truth here.
#let page-width = if settings.at("pageSize", default: "Letter") == "A4" {
  595.28pt
} else {
  612pt
}
#let page-height = if settings.at("pageSize", default: "Letter") == "A4" {
  841.89pt
} else {
  792pt
}

// Usable text height of one page. The serialiser uses the same arithmetic to refuse
// "keep together" for an entry taller than a page: a non-breakable block that cannot fit
// on a page is clipped by Typst rather than moved, and a split entry is a layout flaw
// while a truncated one is lost content.
#let usable-height = page-height - margins.top * 1pt - margins.bottom * 1pt

// Header spacing follows density.
//
// `gaps.header` is the WHOLE header → body distance and `gaps.contact` is the
// name/title → contact-line gap. Both live in the density profile above, so Compact and
// Relaxed move the header with the rest of the document instead of needing a second set of
// controls. The header itself is assembled once, in `render-header` below, so all six
// archetypes cannot disagree about it.

// ──────────────────────────────────────────────
// Leading (line spacing) — one mapping for every template
// ──────────────────────────────────────────────
//
// `settings.lineHeight` is the CSS-style line height the HTML preview applies
// directly (`line-height: lineHeight`, i.e. baseline-to-baseline = lineHeight·em).
// Typst's `par.leading` is the gap ON TOP of the text line box, and the line box is
// font-dependent (measured with the bundled families at 10.5pt: 0.642em Carlito,
// 0.655 Tinos, 0.658 New Computer Modern, 0.688 Arimo, 0.700 Montserrat, 0.716
// Lato, 0.728 Inter). So the mapping that makes the PDF and the preview agree is
// `leading = (lineHeight − 0.7)em`: 0.7 is the middle of that measured range, and
// the residual is ±0.03em of line height — under 3% — for every shipped family.
//
// Each template used to hard-code its own factor (0.45em undergrad / 0.5em minimal
// / 0.55em postgrad), so the same `lineHeight` setting produced three different
// line rhythms and none of them matched the preview. One mapping, defined once.
#let par-leading = calc.max(float(settings.at("lineHeight", default: 1.25)) - 0.7, 0) * 1em

// Gap above a section heading is `gaps.section` (6/8/12pt), and the gap from a heading to
// its first entry is `gaps.heading` (3/4/4pt). The two are deliberately asymmetric:
// more above than below, so a heading belongs to the content under it rather than
// floating between two sections (docs/research/template-research.md §4, "avoid ambiguous
// spacing"). The old single 10pt gap above and 4pt below could not say that.

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

// A skill/technology/language label. Research allows exactly one accent used sparingly
// — the rule under a heading and small labels — so the label keeps the accent ink but
// the tinted chip fill (`colors.accent + "20"`) is gone: fills render as graphics in
// extraction and are a named parse failure.
#let badge(content) = text(size: typo.small, fill: rgb(colors.accent))[#content]

// A tight bullet cluster: one style throughout, hanging indent ≈ the body size, and
// exactly `space-s` between bullets. A `list` cannot express the 3pt item gap on the
// bundled compiler, so the marker is set here where the spacing is owned too.
#let bullets(items) = {
  for i in range(items.len()) {
    if i > 0 { v(gaps.bullet) }
    par(hanging-indent: 10pt)[•#h(space-m)#text(size: typo.body)[#items.at(i)]]
  }
}

#let date-range(start, end-val, is-current) = {
  if start != "" {
    start
    " - "
    if is-current { "Present" } else if end-val != "" { end-val } else { "" }
  }
}

// ──────────────────────────────────────────────
// Semantic page breaks (docs/research/page-fit-readability.md §6.1)
// ──────────────────────────────────────────────
//
// Word's vocabulary, Typst's primitives:
//   keep an entry together   → block(breakable: false)   ("Keep lines together")
//   keep a section together  → block(breakable: false) around the whole section
//   start on a new page      → pagebreak(weak: true)     ("Page break before")
//
// `auto` never reaches Typst: the serialiser resolves it from the entry's shape (an
// entry short enough to move as one unit becomes "always"; a long one becomes "head"),
// because a measured guard would need `layout(measure(...))`, which forces a block
// container and can itself change pagination.
//
// `head` is the answer to the "hole" problem. Today's all-or-nothing keep moves a whole
// long entry to page 2 and leaves a 25–35mm hole at the bottom of page 1 — the page looks
// half empty at the same time as content overflows (space-efficiency §3.3, waste #9).
// A `head` entry protects only its heading and meta line from being orphaned, so the
// worst hole it can leave is one heading block (~10mm), and the bullets flow on.
#let entry-block(mode, head, rest) = {
  if mode == "always" {
    block(breakable: false)[#head #rest]
  } else if mode == "head" {
    block(breakable: false, head)
    rest
  } else {
    head
    rest
  }
}

#let keep-mode(item) = item.at("keepTogether", default: "")

// An invisible marker the fit probe reads back with `query(metadata)`. Metadata is
// layout-neutral: it cannot change the document, so the PDF and the SVG preview are
// byte-identical with or without it (the probe only adds the reader).
#let mark-entry(section, item, label) = metadata((
  kind: "entry",
  id: item.at("id", default: ""),
  section: section.at("id", default: ""),
  label: label,
))

#let mark-section(section, label) = metadata((
  kind: "section",
  id: section.at("id", default: ""),
  section: section.at("id", default: ""),
  label: label,
))

// End-of-content marker: the fit meter measures the spill from here, because "the last
// page ends" is the only position that says how much content actually ran over.
#let fit-end() = metadata((kind: "end"))

// ──────────────────────────────────────────────
// Header — one block for all six archetypes
// ──────────────────────────────────────────────
//
// The header used to be copied into every template, and the five copies had drifted:
// four different name→title gaps, two different separators, one template with no rule
// and one with a short centred one. Copying is also why compressing the header (the
// research's waste #4) would have been five edits and a fifth thing to forget.
//
// The treatment: name, the professional title, one contact line. Contacts are a single
// wrapped line of ` | `-separated facts — not two columns and not a badge row, so the
// reading order is unchanged and the ATS sees plain text. Archetypes choose structure
// only:
//
//   title-style  line | inline | italic    how the professional title sits
//   header-rule  hairline | short | none   the rule under the block
//
// Spacing is `gaps.header` in total: everything above the rule, the rule, then
// `gaps.heading` below it. So the header moves with the density preset like every other
// gap and no template can reintroduce a 16pt one.
#let render-header(
  content-align: left,
  title-style: "line",
  header-rule: "hairline",
) = {
  let title = personal.at("professionalTitle", default: "")
  let contacts = ()
  if personal.at("email", default: "") != "" { contacts.push(personal.email) }
  if personal.at("phone", default: "") != "" { contacts.push(personal.phone) }
  if personal.at("location", default: "") != "" { contacts.push(personal.location) }
  if personal.at("linkedin", default: "") != "" { contacts.push("LinkedIn: " + personal.linkedin) }
  if personal.at("github", default: "") != "" { contacts.push("GitHub: " + personal.github) }
  if personal.at("website", default: "") != "" { contacts.push(personal.website) }

  // The rule is opt-in by density: Tight draws none, Balanced and Relaxed draw it
  // unless the archetype asks for a different one.
  	let rule = if not gaps.header-rule { "none" } else { header-rule }
  	let below-block = if rule == "none" { gaps.header } else { gaps.header - gaps.heading }
  	let ink = if title-style == "italic" { "italic" } else { "normal" }

  	block(width: 100%, below: below-block)[
      #align(content-align)[
        #text(
          size: typo.name,
          weight: "bold",
          fill: rgb(colors.at("heading", default: "#111827")),
        )[#personal.fullName]
        #if title != "" {
          let sep = if title-style == "inline" { h(space-l) } else { linebreak() }
          [#sep#text(
            size: typo.title,
            fill: rgb(colors.at("secondary", default: "#6b7280")),
            style: ink,
          )[#title]]
        }
        #v(gaps.contact)
        #text(size: typo.small, fill: rgb(colors.at("secondary", default: "#6b7280")))[
          #contacts.join("  |  ")
        ]
      ]
    ]

    if rule == "hairline" {
      // A 0.5pt filled block, not `line()`: a line inside a block's content sits in a
      // *paragraph*, and an inline `line()` draws across what is left of the current line —
      // which put this rule through the contact line instead of under it.
      v(space-xs)
      block(width: 100%, height: 0.5pt, fill: rgb(colors.at("divider", default: "#e2e8f0")))
      v(gaps.heading)
    } else if rule == "short" {
      v(space-xs)
      align(
        center,
        block(width: 60%, height: 0.6pt, fill: rgb(colors.at("divider", default: "#e2e8f0"))),
      )
      v(gaps.heading)
    }
  }

// ──────────────────────────────────────────────
// Section title
// ──────────────────────────────────────────────

#let section-title(content, section, profile: default-profile) = {
  // `gaps.section` is the gap ABOVE a heading between sections. The first section must
  // not add it: the header block already separates the header from the body by
  // `gaps.header`, and stacking the two would spend 24pt before the first word.
  if section != sections.at(0, default: (:)) {
    v(gaps-of(section).section)
  }
  mark-section(section, section.at("title", default: ""))
  // UPPERCASE is the researched heading treatment: emphasis is weight and case, never
  // colour or a fill (template-research §1.5, §6), and it is not *tracked* capitals — the
  // letter-spaced variant is the parser risk (§2.5). Only a plain string is uppercased;
  // a computed content value is drawn as given.
  let label = if type(content) == str { upper(content) } else { content }
  // Headings are the text colour in every style: emphasis is weight and case, not
  // colour (docs/research/template-research.md §6). The accent appears only as the rule
  // (and the label ink in `badge`), never as heading text or a fill.
  let head = text(
    size: typo.sectionHeading,
    weight: "semibold",
    fill: rgb(colors.text),
  )[#label]
  // `auto` means "follow the user's accentStyle", minus the rule unless they asked for
  // one: the shipped default is `accentStyle: "none"`, so a default document spends no
  // vertical space on chrome. The rule is opt-in and costs 2.6mm per section.
  let style = settings.at("accentStyle", default: "none")
  let mode = if profile.heading == "auto" {
    if style == "underline" { "rule" } else if style == "border" { "border" } else { "plain" }
  } else {
    profile.heading
  }
  if mode == "hairline" {
    // The researched "optional hairline rule": 0.5pt, text ink, one style per
    // document. Used by the executive and academic archetypes, which are deliberately
    // quieter than the accent rule.
    stack(
      dir: ttb,
      head,
      v(space-xs),
      line(length: 100%, stroke: 0.5pt + rgb(colors.text)),
    )
  } else if mode == "plain" {
    // Weight and case alone. `gaps.heading` below still separates the heading from its
    // first entry — a heading must not cost more vertical space than its first line of
    // content, and this one does not.
    head
  } else if mode == "border" {
    stack(
      dir: ltr,
      rect(width: 3pt, height: typo.sectionHeading + 4pt, fill: rgb(colors.accent)),
      h(space-l),
      head,
    )
  } else {
    // "rule" — the accent rule, which `accentStyle: "underline"` opts into. "background"
    // used to paint the heading on an accent-filled bar; section background fills are a
    // named parse failure, so that setting draws this same text-only heading.
    stack(
      dir: ttb,
      head,
      v(space-xs),
      line(length: 100%, stroke: 1.5pt + rgb(colors.accent)),
    )
  }
  v(gaps-of(section).heading)
}

// ──────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────

#let render-summary(section, profile: default-profile) = {
  if section.summaryText == "" { return }
  section-title(if section.title != "" { section.title } else { "Professional Summary" }, section, profile: profile)
  // `summaryText` is escaped Typst markup (`richContentToTypst` in
  // `src/lib/rich-text.ts`): the editor's marks reach the PDF as `#strong[]`,
  // `#emph[]`, `#underline[]`, `#strike[]` and `#link(...)[]`, and every markup
  // character in the user's text is escaped so it renders literally.
  text(size: typo.body)[#eval(section.summaryText, mode: "markup")]
}

// ──────────────────────────────────────────────
// Experience
// ──────────────────────────────────────────────

#let render-experience(section, profile: default-profile) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Work Experience" }, section, profile: profile)
  let g = gaps-of(section)

  for i in range(items.len()) {
    let exp = items.at(i)
    if i > 0 { v(g.entry) }
    mark-entry(section, exp, exp.position + " at " + exp.company)
    entry-block(keep-mode(exp), {
      grid(
        columns: (1fr, auto),
        gutter: space-m,
        {
          text(
            size: typo.itemTitle,
            weight: "semibold",
            fill: rgb(colors.text),
          )[#exp.position]
          linebreak()
          text(size: typo.body, fill: rgb(colors.secondary))[
            #exp.company#if exp.location != "" { " • " + exp.location }
          ]
        },
        align(right)[
          #text(size: typo.small, fill: rgb(colors.secondary))[
            #date-range(exp.startDate, exp.endDate, exp.current)
          ]
        ],
      )

      if exp.description != "" {
        v(space-xs)
        text(size: typo.body)[#exp.description]
      }
    }, {
      let hl = exp.at("highlights", default: ())
      if hl.len() > 0 {
        v(g.meta)
        bullets(hl)
      }

      // "Say what language you used" (research §7.3). Only the technical archetype
      // turns this on; the standard document keeps the stack as project metadata.
      if profile.experience == "stack" {
        let techs = exp.at("technologies", default: ())
        if techs.len() > 0 {
          v(g.bullet)
          text(size: typo.small, fill: rgb(colors.secondary))[
            Technologies: #techs.join(", ")
          ]
        }
      }
    })
  }
}

// ──────────────────────────────────────────────
// Education
// ──────────────────────────────────────────────

#let render-education(section, profile: default-profile) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Education" }, section, profile: profile)
  let g = gaps-of(section)

  for i in range(items.len()) {
    let edu = items.at(i)
    if i > 0 { v(g.entry) }
    mark-entry(section, edu, edu.degree + " — " + edu.institution)
    entry-block(keep-mode(edu), {
      grid(
        columns: (1fr, auto),
        gutter: space-m,
        {
          text(
            size: typo.itemTitle,
            weight: "semibold",
            fill: rgb(colors.text),
          )[
            #edu.degree#if edu.field != "" { " in " + edu.field }
          ]
          linebreak()
          text(size: typo.body, fill: rgb(colors.secondary))[
            #edu.institution#if edu.gpa != "" { " • GPA: " + edu.gpa }
          ]
        },
        align(right)[
          #text(size: typo.small, fill: rgb(colors.secondary))[
            #edu.graduationDate
          ]
        ],
      )
    }, {
      // The payload has carried coursework, honors and achievements since the
      // serialiser was written; the standard renderer dropped all three, which is
      // exactly why a student CV looked thinner than its own data. The graduate and
      // academic archetypes turn this on.
      if profile.education == "full" {
        let coursework = edu.at("coursework", default: ())
        if coursework.len() > 0 {
          v(g.bullet)
          text(size: typo.small, fill: rgb(colors.secondary))[
            Coursework: #coursework.join(", ")
          ]
        }
        let honors = edu.at("honors", default: ())
        if honors.len() > 0 {
          v(g.bullet)
          text(size: typo.small, fill: rgb(colors.secondary))[
            Honors: #honors.join(", ")
          ]
        }
        let achievements = edu.at("achievements", default: ())
        if achievements.len() > 0 {
          v(g.meta)
          bullets(achievements)
        }
      }
    })
  }
}

// ──────────────────────────────────────────────
// Skills
// ──────────────────────────────────────────────

#let render-skills(section, profile: default-profile) = {
  let cats = section.at("categories", default: ())
  if cats.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Skills" }, section, profile: profile)
  let g = gaps-of(section)
  // `auto` is the researched default (space-efficiency §3, waste #5): `Category: item,
  // item` lines render the same information in half the rows a label-over-chips cluster
  // needs. Chips stay available — Relaxed density turns them on, and an archetype may ask
  // for them — but they are an option, not the shipped look.
  let mode = if profile.skills == "auto" {
    if section-spacing == "spacious" { "chips" } else { "lines" }
  } else {
    profile.skills
  }

  if mode == "inline" {
    // Core expertise: one comma-separated line, no category labels (research §7.6).
    // Not a table and not a grid — both change extraction order.
    let names = ()
    for cat in cats {
      names = names + cat.skills.map(s => s.name)
    }
    if names.len() > 0 {
      text(size: typo.body)[#names.join(", ")]
    }
  } else if mode == "chips" {
    for i in range(cats.len()) {
      let cat = cats.at(i)
      if i > 0 { v(g.entry) }
      mark-entry(section, cat, cat.name)
      entry-block(keep-mode(cat), {
        text(
          size: typo.itemTitle,
          weight: "semibold",
          fill: rgb(colors.text),
        )[#cat.name]
        v(space-xs)
        cat.skills.map(s => badge(s.name)).join(h(space-m))
      }, {})
    }
  } else {
    // `Category: item, item` (research §7.3). One line per category rather than a
    // label line plus a chip cluster, which is the density the default document wants.
    for i in range(cats.len()) {
      let cat = cats.at(i)
      if cat.skills.len() == 0 { continue }
      if i > 0 { v(g.entry) }
      mark-entry(section, cat, cat.name)
      entry-block(keep-mode(cat), {
        text(size: typo.body, weight: "semibold", fill: rgb(colors.text))[#cat.name]
        text(size: typo.body)[: ]
        text(size: typo.body)[#cat.skills.map(s => s.name).join(", ")]
      }, {})
    }
  }
}

// ──────────────────────────────────────────────
// Projects
// ──────────────────────────────────────────────

#let render-projects(section, profile: default-profile) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Projects" }, section, profile: profile)
  let g = gaps-of(section)

  for i in range(items.len()) {
    let proj = items.at(i)
    if i > 0 { v(g.entry) }
    mark-entry(section, proj, proj.name)
    entry-block(keep-mode(proj), {
      grid(
        columns: (1fr, auto),
        gutter: space-m,
        text(
          size: typo.itemTitle,
          weight: "semibold",
          fill: rgb(colors.text),
        )[#proj.name#if proj.role != "" and profile.projects == "detail" { " — " + proj.role }],
        align(right)[
          #text(size: typo.small, fill: rgb(colors.secondary))[
            #if proj.startDate != "" {
              date-range(proj.startDate, proj.endDate, proj.current)
            }
          ]
        ],
      )
      if proj.description != "" {
        v(space-xs)
        text(size: typo.body)[#proj.description]
      }
    }, {
      let techs = proj.at("technologies", default: ())
      if profile.projects == "detail" {
        // A project is evidence, so the technical and graduate archetypes draw the
        // highlights the standard renderer dropped, then the stack as a labelled line
        // rather than a chip cluster.
        let hl = proj.at("highlights", default: ())
        if hl.len() > 0 {
          v(g.meta)
          bullets(hl)
        }
        if techs.len() > 0 {
          v(g.bullet)
          text(size: typo.small, fill: rgb(colors.secondary))[
            Technologies: #techs.join(", ")
          ]
        }
      } else if techs.len() > 0 {
        v(g.bullet)
        text(size: typo.small, fill: rgb(colors.secondary))[#techs.join(", ")]
      }
    })
  }
}

// ──────────────────────────────────────────────
// Certifications
// ──────────────────────────────────────────────

#let render-certifications(section, profile: default-profile) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Certifications" }, section, profile: profile)
  let g = gaps-of(section)

  for i in range(items.len()) {
    let cert = items.at(i)
    if i > 0 { v(g.entry) }
    mark-entry(section, cert, cert.name)
    entry-block(keep-mode(cert), {
      grid(
        columns: (1fr, auto),
        gutter: space-m,
        {
          text(
            size: typo.itemTitle,
            weight: "semibold",
            fill: rgb(colors.text),
          )[#cert.name]
          linebreak()
          text(size: typo.body, fill: rgb(colors.secondary))[#cert.issuer]
        },
        align(right)[
          #text(size: typo.small, fill: rgb(colors.secondary))[#cert.date]
        ],
      )
    }, {})
  }
}

// ──────────────────────────────────────────────
// Awards
// ──────────────────────────────────────────────

#let render-awards(section, profile: default-profile) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Awards & Honors" }, section, profile: profile)
  let g = gaps-of(section)

  for i in range(items.len()) {
    let award = items.at(i)
    if i > 0 { v(g.entry) }
    mark-entry(section, award, award.title)
    entry-block(keep-mode(award), {
      grid(
        columns: (1fr, auto),
        gutter: space-m,
        {
          text(
            size: typo.itemTitle,
            weight: "semibold",
            fill: rgb(colors.text),
          )[#award.title]
          linebreak()
          text(size: typo.body, fill: rgb(colors.secondary))[#award.issuer]
        },
        align(right)[
          #text(size: typo.small, fill: rgb(colors.secondary))[#award.date]
        ],
      )
    }, {
      if award.description != "" {
        v(space-xs)
        text(size: typo.body)[#award.description]
      }
    })
  }
}

// ──────────────────────────────────────────────
// Languages
// ──────────────────────────────────────────────

#let render-languages(section, profile: default-profile) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Languages" }, section, profile: profile)
  // One line, not a row of badges: emphasis is weight and case, and a coloured label is
  // body text in the accent (template-research §6). A language list is short enough that
  // the row it would save costs more vertical space than it buys.
  items.map(l => l.name + " (" + l.proficiency + ")").join(", ")
}

// ──────────────────────────────────────────────
// Volunteer
// ──────────────────────────────────────────────

#let render-volunteer(section, profile: default-profile) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Volunteer Experience" }, section, profile: profile)
  let g = gaps-of(section)

  for i in range(items.len()) {
    let vol = items.at(i)
    if i > 0 { v(g.entry) }
    mark-entry(section, vol, vol.role + " at " + vol.organization)
    entry-block(keep-mode(vol), {
      grid(
        columns: (1fr, auto),
        gutter: space-m,
        {
          text(
            size: typo.itemTitle,
            weight: "semibold",
            fill: rgb(colors.text),
          )[#vol.role]
          linebreak()
          text(size: typo.body, fill: rgb(colors.secondary))[
            #vol.organization#if vol.location != "" { " • " + vol.location }
          ]
        },
        align(right)[
          #text(size: typo.small, fill: rgb(colors.secondary))[
            #date-range(vol.startDate, vol.endDate, vol.current)
          ]
        ],
      )
      if vol.description != "" {
        v(space-xs)
        text(size: typo.body)[#vol.description]
      }
    }, {
      let hl = vol.at("highlights", default: ())
      if hl.len() > 0 {
        v(g.meta)
        bullets(hl)
      }
    })
  }
}

// ──────────────────────────────────────────────
// Publications
// ──────────────────────────────────────────────

#let render-publications(section, profile: default-profile) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Publications" }, section, profile: profile)
  let g = gaps-of(section)

  for i in range(items.len()) {
    let pub = items.at(i)
    if i > 0 { v(g.entry) }
    mark-entry(section, pub, pub.title)
    entry-block(keep-mode(pub), {
      // The academic CV convention: a numbered list, so a reviewer can cite "[7]".
      // It is a prefix in the body flow, not a second column.
      if profile.publications == "numbered" {
        text(size: typo.small, fill: rgb(colors.secondary))[#(i + 1).#h(space-s)]
      }
      text(
        size: typo.itemTitle,
        weight: "semibold",
        fill: rgb(colors.text),
      )[#pub.title]
      linebreak()
      text(size: typo.body, fill: rgb(colors.secondary))[
        #pub.publisher • #pub.date
      ]
      let authors = pub.at("authors", default: ())
      if authors.len() > 0 {
        linebreak()
        text(size: typo.small, fill: rgb(colors.secondary))[
          Authors: #authors.join(", ")
        ]
      }
    }, {
      if pub.summary != "" {
        v(space-xs)
        text(size: typo.body)[#pub.summary]
      }
    })
  }
}

// ──────────────────────────────────────────────
// References
// ──────────────────────────────────────────────

#let render-references(section, profile: default-profile) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "References" }, section, profile: profile)
  let g = gaps-of(section)

  for i in range(items.len()) {
    let ref = items.at(i)
    if i > 0 { v(g.entry) }
    mark-entry(section, ref, ref.name)
    entry-block(keep-mode(ref), {
      text(
        size: typo.itemTitle,
        weight: "semibold",
        fill: rgb(colors.text),
      )[#ref.name]
      linebreak()
      text(size: typo.body, fill: rgb(colors.secondary))[
        #ref.position#if ref.company != "" { " at " + ref.company }
      ]
      if ref.email != "" {
        linebreak()
        text(size: typo.small)[#ref.email]
      }
    }, {})
  }
}

// ──────────────────────────────────────────────
// Custom — a title plus free-form body
// ──────────────────────────────────────────────
//
// `serialize.ts` has produced `{body, items}` for this type since #125, but this
// dispatcher never called it, so a custom section that the editor accepted, the preview
// drew and the API stored exported as nothing at all. A section type the UI offers has to
// survive the round trip.
#let render-custom(section, profile: default-profile) = {
  let body = section.at("body", default: "")
  let items = section.at("items", default: ())
  if body == "" and items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Additional Information" }, section, profile: profile)
  let g = gaps-of(section)

  if body != "" {
    // Markup for the same reason as `summaryText` in `render-summary`.
    text(size: typo.body)[#eval(body, mode: "markup")]
    if items.len() > 0 { v(g.meta) }
  }

  for i in range(items.len()) {
    let item = items.at(i)
    if i > 0 { v(g.entry) }
    mark-entry(section, item, item.at("title", default: ""))
    entry-block(keep-mode(item), {
      if item.title != "" {
        text(
          size: typo.itemTitle,
          weight: "semibold",
          fill: rgb(colors.text),
        )[#item.title]
        linebreak()
      }
      if item.body != "" {
        text(size: typo.body)[#eval(item.body, mode: "markup")]
      }
    }, {})
  }
}

// ──────────────────────────────────────────────
// Dispatcher
// ──────────────────────────────────────────────

#let section-body(section, profile: default-profile) = {
  let t = section.type
  if t == "summary"        { render-summary(section, profile: profile) }
  else if t == "experience"    { render-experience(section, profile: profile) }
  else if t == "education"     { render-education(section, profile: profile) }
  else if t == "skills"        { render-skills(section, profile: profile) }
  else if t == "projects"      { render-projects(section, profile: profile) }
  else if t == "certifications"{ render-certifications(section, profile: profile) }
  else if t == "awards"        { render-awards(section, profile: profile) }
  else if t == "languages"     { render-languages(section, profile: profile) }
  else if t == "volunteer"     { render-volunteer(section, profile: profile) }
  else if t == "publications"  { render-publications(section, profile: profile) }
  else if t == "references"    { render-references(section, profile: profile) }
  else if t == "custom"        { render-custom(section, profile: profile) }
}

// Section-level break semantics. `pagebreak(weak: true)` is Word's "page break before"
// with the edge case fixed: when the section is already at the top of a page it does
// nothing, so asking for it cannot leave a blank page behind.
#let render-section(section, profile: default-profile) = {
  let layout = section.at("layout", default: (:))
  if layout.at("pageBreakBefore", default: false) {
    pagebreak(weak: true)
  }
  let body = section-body(section, profile: profile)
  if layout.at("keepSectionTogether", default: false) {
    block(breakable: false, body)
  } else {
    body
  }
}

