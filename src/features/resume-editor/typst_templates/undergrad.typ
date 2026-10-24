// Undergrad — a compact layout for a first or second resume.
//
// The identity is the header: a tinted band carrying the name and contact line, which
// uses the accent colour the student picked. Everything below it is the same content
// model and the same `render-*` helpers as the other templates.
//
// The band is a background block, not a table and not a multi-column grid. Both of those
// would change the order text is emitted in, and a student's first resume is exactly the
// one that should not gamble on extraction order. Nothing about the tint survives into
// the text layer beyond the words themselves.

#set page(
  paper: if settings.at("pageSize", default: "Letter") == "A4" { "a4" } else { "us-letter" },
  margin: (
    top:    float(margins.top)    * 0.75pt,
    right:  float(margins.right)  * 0.75pt,
    bottom: float(margins.bottom) * 0.75pt,
    left:   float(margins.left)   * 0.75pt,
  ),
  fill: rgb(colors.at("background", default: "#ffffff")),
)

#set text(
  size: float(typo.at("body", default: 11)) * 1pt,
  fill: rgb(colors.at("text", default: "#1e293b")),
  font: settings.at("fontFamily", default: "Inter"),
)

// Tighter than `minimal`. This template exists for documents that are trying to fit on
// one page, and a student reads that as "nothing here is padding".
#set par(
  leading: float(settings.at("lineHeight", default: 1.5)) * 0.45em,
  justify: false,
)

#set list(marker: [•], indent: 0pt, body-indent: 8pt)

// ──────────────────────────────────────────────
// HEADER — tinted band
// ──────────────────────────────────────────────

#block(
  width: 100%,
  fill: rgb(colors.at("accent", default: "#2563eb") + "14"),
  inset: (x: 12pt, y: 10pt),
  radius: 4pt,
  below: 12pt,
)[
  #text(
    size: float(typo.at("name", default: 24)) * 1pt,
    weight: "bold",
    fill: rgb(colors.at("heading", default: "#111827")),
  )[#personal.fullName]

  #if personal.professionalTitle != "" {
    h(8pt)
    text(
      size: float(typo.at("title", default: 14)) * 1pt,
      fill: rgb(colors.at("secondary", default: "#6b7280")),
    )[#personal.professionalTitle]
  }

  #v(5pt)
  #let contacts = ()
  #if personal.email    != "" { contacts.push(personal.email) }
  #if personal.phone    != "" { contacts.push(personal.phone) }
  #if personal.location != "" { contacts.push(personal.location) }
  #if personal.linkedin != "" { contacts.push("LinkedIn: " + personal.linkedin) }
  #if personal.github   != "" { contacts.push("GitHub: " + personal.github) }
  #if personal.website  != "" { contacts.push(personal.website) }
  #text(size: float(typo.at("small", default: 9)) * 1pt, fill: rgb(colors.at("secondary", default: "#6b7280")))[
    #contacts.join("  |  ")
  ]
]

// ──────────────────────────────────────────────
// BODY — sections
// ──────────────────────────────────────────────

#for section in sections {
  render-section(section)
}
