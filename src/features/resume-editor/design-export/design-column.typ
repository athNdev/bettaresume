// design-column — the design CV. A separate export target, never a template.
//
// This file is deliberately NOT in `typst_templates/` and NOT in `TEMPLATE_SOURCES`.
// The six archetypes are single-column because the text layer is the product's promise;
// this document trades that promise for a layout and is only reachable from the explicitly
// warned "Export design CV" action. `test/design-export.test.ts` pins the exclusion.
//
// The layout:
//
//   masthead (full width)   name, role, one accent rule
//   ┌────────────┬─────────────────────────┐
//   │  sidebar   │  main column            │
//   │  contact   │  summary                │
//   │  skills    │  experience             │
//   │  languages │  education / projects / │
//   │  certs     │  publications / …       │
//   │  awards    │                         │
//   └────────────┴─────────────────────────┘
//
// `columns(2)` rather than a grid: a grid's cells do not reflow on a continuation page, so
// a long experience section would leave the left half of page 2 blank. Columns fill the
// left column and then the right on every page, which is both better design and the only
// order the text companion can describe honestly: sidebar first, then main, per page.
//
// Sidebar width is faked with an 88%-wide block inside the left column. Typst's `columns`
// are equal width; the trailing 12% plus the gutter reads as a wider gap and gives the
// main column visual priority without a second layout engine.

#set page(
  paper: if settings.at("pageSize", default: "Letter") == "A4" { "a4" } else { "us-letter" },
  margin: (
    top:    float(margins.top)    * 1pt,
    right:  float(margins.right)  * 1pt,
    bottom: float(margins.bottom) * 1pt,
    left:   float(margins.left)   * 1pt,
  ),
  fill: rgb(colors.at("background", default: "#ffffff")),
)

#set text(
  size: typo.body,
  fill: rgb(colors.text),
  font: settings.at("fontFamily", default: "Inter"),
)
#set par(leading: par-leading, justify: false)

#let design = data.at("design", default: (:))
#let sidebar-sections = design.at("sidebar", default: ())
#let main-sections = design.at("main", default: ())
#let has-sidebar = design.at("hasSidebar", default: false)

#let accent = rgb(colors.accent)
#let ink = rgb(colors.text)
#let muted = rgb(colors.secondary)
#let divider = rgb(colors.divider)

// ──────────────────────────────────────────────
// Masthead — full width, above the columns
// ──────────────────────────────────────────────

#let masthead = {
  let title = personal.at("professionalTitle", default: "")
  block(width: 100%, below: gaps.header)[
    #text(
      size: typo.name * 1.5,
      weight: "bold",
      fill: rgb(colors.at("heading", default: "#111827")),
    )[#personal.fullName]
    #if title != "" {
      [
        #v(space-xs)
        #text(
          size: typo.title + 1.5pt,
          fill: accent,
        )[#upper(title)]
      ]
    }
    #v(space-m)
    #block(width: 100%, height: 1.4pt, fill: accent)
  ]
}

// ──────────────────────────────────────────────
// Sidebar
// ──────────────────────────────────────────────

// A small tracked capital label over a hairline. The accent is the only colour in the
// document; there are no fills, badges or icons, so the page prints cleanly and the text
// below the rule stays the only ink that matters.
#let side-heading(label, first: false) = {
  if not first { v(gaps.section) }
  text(
    size: typo.small,
    weight: "bold",
    fill: accent,
  )[#upper(label)]
  v(space-xs)
  block(width: 100%, height: 0.5pt, fill: divider)
  v(gaps.heading)
}

#let contact-rows = {
  let out = ()
  let values = (
    ("Email", personal.at("email", default: "")),
    ("Phone", personal.at("phone", default: "")),
    ("Location", personal.at("location", default: "")),
    ("LinkedIn", personal.at("linkedin", default: "")),
    ("GitHub", personal.at("github", default: "")),
    ("Website", personal.at("website", default: "")),
  )
  for row in values {
    if row.at(1) != "" { out.push(row) }
  }
  out
}

#let contact-block() = {
  if contact-rows.len() > 0 {
    side-heading("Contact", first: true)
    let cells = ()
    for row in contact-rows {
      cells.push(text(size: typo.small, fill: muted)[#row.at(0)])
      cells.push(text(size: typo.body)[#row.at(1)])
    }
    grid(
      columns: (auto, 1fr),
      column-gutter: space-m,
      row-gutter: space-s,
      ..cells,
    )
  }
}

// Sidebar sections are facts, not narrative: a label, then the values. They do not use the
// standard renderers because those put dates in a second grid column, which is unreadable
// at sidebar width. Keeping the words identical matters: `buildDesignPlainText` reads the
// same payload, and the only thing the text layer changes is the order of the columns.
#let sidebar-section(section, first: false) = {
  let t = section.type

  if t == "skills" {
    let cats = section.at("categories", default: ())
    if cats.len() == 0 { return }
    side-heading(if section.title != "" { section.title } else { "Skills" }, first: first)
    for i in range(cats.len()) {
      let cat = cats.at(i)
      if i > 0 { v(gaps.entry) }
      text(size: typo.small, weight: "bold", fill: ink)[#cat.name]
      v(space-xs)
      text(size: typo.body)[#cat.skills.map(s => s.name).join(", ")]
    }
  } else if t == "languages" {
    let items = section.at("items", default: ())
    if items.len() == 0 { return }
    side-heading(if section.title != "" { section.title } else { "Languages" }, first: first)
    for i in range(items.len()) {
      let lang = items.at(i)
      if i > 0 { v(gaps.bullet) }
      text(size: typo.body, weight: "semibold", fill: ink)[#lang.name]
      if lang.proficiency != "" {
        text(size: typo.small, fill: muted)[ — #lang.proficiency]
      }
    }
  } else if t == "certifications" {
    let items = section.at("items", default: ())
    if items.len() == 0 { return }
    side-heading(if section.title != "" { section.title } else { "Certifications" }, first: first)
    for i in range(items.len()) {
      let cert = items.at(i)
      let meta = ()
      if cert.issuer != "" { meta.push(cert.issuer) }
      if cert.date != "" { meta.push(cert.date) }
      if i > 0 { v(gaps.entry) }
      text(size: typo.body, weight: "semibold", fill: ink)[#cert.name]
      if meta.len() > 0 {
        linebreak()
        text(size: typo.small, fill: muted)[#meta.join(" • ")]
      }
    }
  } else if t == "awards" {
    let items = section.at("items", default: ())
    if items.len() == 0 { return }
    side-heading(if section.title != "" { section.title } else { "Awards" }, first: first)
    for i in range(items.len()) {
      let award = items.at(i)
      let meta = ()
      if award.issuer != "" { meta.push(award.issuer) }
      if award.date != "" { meta.push(award.date) }
      if i > 0 { v(gaps.entry) }
      text(size: typo.body, weight: "semibold", fill: ink)[#award.title]
      if meta.len() > 0 {
        linebreak()
        text(size: typo.small, fill: muted)[#meta.join(" • ")]
      }
      if award.description != "" {
        v(space-xs)
        text(size: typo.small, fill: muted)[#award.description]
      }
    }
  }
}

#let sidebar-column() = {
  let has-contact = contact-rows.len() > 0
  contact-block()
  for i in range(sidebar-sections.len()) {
    sidebar-section(
      sidebar-sections.at(i),
      first: i == 0 and not has-contact,
    )
  }
}

// ──────────────────────────────────────────────
// Main column
// ──────────────────────────────────────────────

// `rule` gives the main headings the accent rule from `sections.typ`; `auto` would follow
// the user's `accentStyle`, and a design export should not lose its one visual signature
// because a standard-export setting was "none".
#let design-profile = default-profile + (heading: "rule")

#let main-column() = {
  for section in main-sections {
    render-section(section, profile: design-profile)
  }
}

// ──────────────────────────────────────────────
// Document
// ──────────────────────────────────────────────

#masthead

#if has-sidebar {
  columns(2, gutter: 26pt)[
    #block(width: 88%)[
      #sidebar-column()
    ]
    #colbreak()
    #main-column()
  ]
} else {
  // No contact facts and no sidebar sections: a two-column page with an empty left half is
  // not a design, it is a bug. The text companion uses the same `hasSidebar` decision.
  main-column()
}
