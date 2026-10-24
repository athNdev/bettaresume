// ──────────────────────────────────────────────
// Variables (must be defined before helpers)
// ──────────────────────────────────────────────

#let default-settings = (
  colors: (accent: "#2563eb", heading: "#111827", secondary: "#6b7280", background: "#ffffff", text: "#1e293b", primary: "#2563eb", divider: "#e2e8f0"),
  typography: (name: 18, title: 11, small: 9.5, body: 10.5, itemTitle: 10.5, sectionHeading: 11),
  margins: (top: 43, right: 50, bottom: 43, left: 50),
  sectionSpacing: "normal",
  accentStyle: "underline",
)

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
// one of these named values — the old `spacing-val` switch (8pt/12pt/20pt) and the
// scattered `v(4pt)`/`v(6pt)` literals ran three rhythms at once.
#let space-xs  = 2pt   // typographic fine-tuning: name → title, heading → its rule
#let space-s   = 3pt   // between bullets in one entry; label → its labels
#let space-m   = 4pt   // section heading → first entry; meta line → first bullet
#let space-l   = 6pt   // between entries within a section; name block → contacts
#let space-xl  = 8pt   // gap above a section heading — compact
#let space-2xl = 12pt  // header block → hairline rule (half of the 16pt header gap)
#let space-3xl = 16pt  // header → body (assembled in the templates)
#let space-4xl = 20pt  // header → body, relaxed density

#let section-spacing = settings.at("sectionSpacing", default: "normal")

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
// `header-gap` is the WHOLE header → body distance (16pt at Normal, which is what the
// templates assemble today: 12pt below the block + a rule + 4pt). `header-gap-half` is
// the part below the header block before the rule, and `contact-gap` / the inline
// variant are the name → contact-line gaps the templates used to hard-code at 6pt and
// 4pt. Normal reproduces those exact values; Compact and Relaxed move them with the
// rest of the document instead of needing a second set of controls.
#let header-gap = if section-spacing == "compact" {
  space-2xl
} else if section-spacing == "spacious" {
  space-4xl
} else {
  space-3xl
}
#let header-gap-half = header-gap - space-m
#let contact-gap = if section-spacing == "compact" {
  space-m
} else if section-spacing == "spacious" {
  space-xl
} else {
  space-l
}
// The undergrad header keeps its contacts one step tighter than the other templates.
#let contact-gap-inline = if section-spacing == "compact" {
  space-s
} else if section-spacing == "spacious" {
  space-l
} else {
  space-m
}

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
#let par-leading = calc.max(float(settings.at("lineHeight", default: 1.35)) - 0.7, 0) * 1em

// Gap above a section heading: the research's 8–12pt band, picked by `sectionSpacing`
// — compact 8pt, normal 10pt, spacious ("relaxed" in the brief) 12pt. 10pt is the one
// value outside the modular steps; it is the band midpoint the brief fixes for normal.
//
// `section-gap-for` is the per-section override: a section may carry
// `layout.spacing: compact | normal | spacious` and move its own gap without touching
// the rest of the document. Absent means "follow the global density".
#let section-gap-for(spacing) = if spacing == "compact" {
  space-xl
} else if spacing == "spacious" {
  space-2xl
} else {
  10pt
}
#let section-gap-of(section) = section-gap-for(
  section.at("layout", default: (:)).at("spacing", default: section-spacing),
)

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
    if i > 0 { v(space-s) }
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
// entry short enough to move as one unit becomes "always"; a long one becomes "never"),
// because a measured guard would need `layout(measure(...))`, which forces a block
// container and can itself change pagination.
#let entry-block(mode, body) = {
  if mode == "always" {
    block(breakable: false, body)
  } else if mode == "never" {
    block(breakable: true, body)
  } else {
    body
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
// Section title
// ──────────────────────────────────────────────

#let section-title(content, section) = {
  // `section-gap` is the gap ABOVE a heading between sections. The first section must
  // not add it: the header block already separates the header from the body by
  // `space-3xl` (16pt), and stacking the two would spend 26pt before the first word.
  if section != sections.at(0, default: (:)) {
    v(section-gap-of(section))
  }
  mark-section(section, section.at("title", default: ""))
  let style = settings.at("accentStyle", default: "underline")
  // Headings are the text colour in every style: emphasis is weight and case, not
  // colour (docs/research/template-research.md §6). The accent appears only as the rule
  // (and the label ink in `badge`), never as heading text or a fill.
  let head = text(
    size: typo.sectionHeading,
    weight: "semibold",
    fill: rgb(colors.text),
  )[#content]
  if style == "underline" {
    stack(
      dir: ttb,
      head,
      v(space-xs),
      line(length: 100%, stroke: 1.5pt + rgb(colors.accent)),
    )
  } else if style == "border" {
    stack(
      dir: ltr,
      rect(width: 3pt, height: typo.sectionHeading + 4pt, fill: rgb(colors.accent)),
      h(space-l),
      head,
    )
  } else {
    // "background" used to paint the heading on an accent-filled bar. Section
    // background fills are advised against outright — they extract as graphics — so
    // the setting stays valid and draws the same text-only heading as "none".
    head
  }
  v(space-m)
}

// ──────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────

#let render-summary(section) = {
  if section.summaryText == "" { return }
  section-title(if section.title != "" { section.title } else { "Professional Summary" }, section)
  // `summaryText` is escaped Typst markup (`richContentToTypst` in
  // `src/lib/rich-text.ts`): the editor's marks reach the PDF as `#strong[]`,
  // `#emph[]`, `#underline[]`, `#strike[]` and `#link(...)[]`, and every markup
  // character in the user's text is escaped so it renders literally.
  text(size: typo.body)[#eval(section.summaryText, mode: "markup")]
}

// ──────────────────────────────────────────────
// Experience
// ──────────────────────────────────────────────

#let render-experience(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Work Experience" }, section)

  for i in range(items.len()) {
    let exp = items.at(i)
    if i > 0 { v(space-l) }
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

      let hl = exp.at("highlights", default: ())
      if hl.len() > 0 {
        v(space-m)
        bullets(hl)
      }
    })
  }
}

// ──────────────────────────────────────────────
// Education
// ──────────────────────────────────────────────

#let render-education(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Education" }, section)

  for i in range(items.len()) {
    let edu = items.at(i)
    if i > 0 { v(space-l) }
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
    })
  }
}

// ──────────────────────────────────────────────
// Skills
// ──────────────────────────────────────────────

#let render-skills(section) = {
  let cats = section.at("categories", default: ())
  if cats.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Skills" }, section)

  for i in range(cats.len()) {
    let cat = cats.at(i)
    if i > 0 { v(space-l) }
    mark-entry(section, cat, cat.name)
    entry-block(keep-mode(cat), {
      text(
        size: typo.itemTitle,
        weight: "semibold",
        fill: rgb(colors.text),
      )[#cat.name]
      v(space-s)
      cat.skills.map(s => badge(s.name)).join(h(space-m))
    })
  }
}

// ──────────────────────────────────────────────
// Projects
// ──────────────────────────────────────────────

#let render-projects(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Projects" }, section)

  for i in range(items.len()) {
    let proj = items.at(i)
    if i > 0 { v(space-l) }
    mark-entry(section, proj, proj.name)
    entry-block(keep-mode(proj), {
      grid(
        columns: (1fr, auto),
        gutter: space-m,
        text(
          size: typo.itemTitle,
          weight: "semibold",
          fill: rgb(colors.text),
        )[#proj.name],
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
      let techs = proj.at("technologies", default: ())
      if techs.len() > 0 {
        v(space-s)
        techs.map(badge).join(h(space-m))
      }
    })
  }
}

// ──────────────────────────────────────────────
// Certifications
// ──────────────────────────────────────────────

#let render-certifications(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Certifications" }, section)

  for i in range(items.len()) {
    let cert = items.at(i)
    if i > 0 { v(space-l) }
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
    })
  }
}

// ──────────────────────────────────────────────
// Awards
// ──────────────────────────────────────────────

#let render-awards(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Awards & Honors" }, section)

  for i in range(items.len()) {
    let award = items.at(i)
    if i > 0 { v(space-l) }
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

#let render-languages(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Languages" }, section)
  items.map(l => badge(l.name + " (" + l.proficiency + ")")).join(h(space-m))
}

// ──────────────────────────────────────────────
// Volunteer
// ──────────────────────────────────────────────

#let render-volunteer(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Volunteer Experience" }, section)

  for i in range(items.len()) {
    let vol = items.at(i)
    if i > 0 { v(space-l) }
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
      let hl = vol.at("highlights", default: ())
      if hl.len() > 0 {
        v(space-m)
        bullets(hl)
      }
    })
  }
}

// ──────────────────────────────────────────────
// Publications
// ──────────────────────────────────────────────

#let render-publications(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Publications" }, section)

  for i in range(items.len()) {
    let pub = items.at(i)
    if i > 0 { v(space-l) }
    mark-entry(section, pub, pub.title)
    entry-block(keep-mode(pub), {
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

#let render-references(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "References" }, section)

  for i in range(items.len()) {
    let ref = items.at(i)
    if i > 0 { v(space-l) }
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
    })
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
#let render-custom(section) = {
  let body = section.at("body", default: "")
  let items = section.at("items", default: ())
  if body == "" and items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Additional Information" }, section)

  if body != "" {
    // Markup for the same reason as `summaryText` in `render-summary`.
    text(size: typo.body)[#eval(body, mode: "markup")]
    if items.len() > 0 { v(space-m) }
  }

  for i in range(items.len()) {
    let item = items.at(i)
    if i > 0 { v(space-l) }
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
    })
  }
}

// ──────────────────────────────────────────────
// Dispatcher
// ──────────────────────────────────────────────

#let section-body(section) = {
  let t = section.type
  if t == "summary"        { render-summary(section) }
  else if t == "experience"    { render-experience(section) }
  else if t == "education"     { render-education(section) }
  else if t == "skills"        { render-skills(section) }
  else if t == "projects"      { render-projects(section) }
  else if t == "certifications"{ render-certifications(section) }
  else if t == "awards"        { render-awards(section) }
  else if t == "languages"     { render-languages(section) }
  else if t == "volunteer"     { render-volunteer(section) }
  else if t == "publications"  { render-publications(section) }
  else if t == "references"    { render-references(section) }
  else if t == "custom"        { render-custom(section) }
}

// Section-level break semantics. `pagebreak(weak: true)` is Word's "page break before"
// with the edge case fixed: when the section is already at the top of a page it does
// nothing, so asking for it cannot leave a blank page behind.
#let render-section(section) = {
  let layout = section.at("layout", default: (:))
  if layout.at("pageBreakBefore", default: false) {
    pagebreak(weak: true)
  }
  let body = section-body(section)
  if layout.at("keepSectionTogether", default: false) {
    block(breakable: false, body)
  } else {
    body
  }
}
