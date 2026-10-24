// Undergrad — a compact layout for a first or second resume.
//
// The header carries the name and contact line with the name and title side by side.
// It used to sit in a tinted accent band; section background fills and shaded header
// bars are a named parse failure (they extract as graphics) and the research is
// unambiguous about them (docs/research/template-research.md §6), so the band's fill is
// gone. Everything below the header is the same content model and the same `render-*`
// helpers as the other templates.
//
// The header block is a block, not a table and not a multi-column grid. Both of those
// would change the order text is emitted in, and a student's first resume is exactly the
// one that should not gamble on extraction order. Type sizes and margins are true points
// (see `sections.typ`).

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
  size: typo.at("body", default: 10.5pt),
  fill: rgb(colors.at("text", default: "#1e293b")),
  font: settings.at("fontFamily", default: "Inter"),
)

// Tighter than `minimal`. This template exists for documents that are trying to fit on
// one page, and a student reads that as "nothing here is padding".
#set par(
  leading: float(settings.at("lineHeight", default: 1.35)) * 0.45em,
  justify: false,
)

// ──────────────────────────────────────────────
// HEADER — name and title on one line
// ──────────────────────────────────────────────

// `space-3xl` below the header block is the 16pt header → body gap; the first section
// heading does not add its `section-gap` on top of it (see `section-title`).
#block(width: 100%, below: space-3xl)[
  #text(
    size: typo.at("name", default: 18pt),
    weight: "bold",
    fill: rgb(colors.at("heading", default: "#111827")),
  )[#personal.fullName]

  #if personal.professionalTitle != "" {
    h(space-l)
    text(
      size: typo.at("title", default: 11pt),
      fill: rgb(colors.at("secondary", default: "#6b7280")),
    )[#personal.professionalTitle]
  }

  #v(space-m)
  #let contacts = ()
  #if personal.email    != "" { contacts.push(personal.email) }
  #if personal.phone    != "" { contacts.push(personal.phone) }
  #if personal.location != "" { contacts.push(personal.location) }
  #if personal.linkedin != "" { contacts.push("LinkedIn: " + personal.linkedin) }
  #if personal.github   != "" { contacts.push("GitHub: " + personal.github) }
  #if personal.website  != "" { contacts.push(personal.website) }
  #text(size: typo.at("small", default: 9.5pt), fill: rgb(colors.at("secondary", default: "#6b7280")))[
    #contacts.join("  |  ")
  ]
]

// ──────────────────────────────────────────────
// BODY — sections
// ──────────────────────────────────────────────

#for section in sections {
  render-section(section)
}
