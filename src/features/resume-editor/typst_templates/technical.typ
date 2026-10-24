// Technical — engineering, data and software roles.
//
// The same content model and the same helpers as `standard.typ`; the archetype changes
// what a section draws:
//
//   * Skills become `Languages: Go, TypeScript, Python` lines instead of a label over a
//     chip cluster (research §7.3). One line per category is both denser and easier to
//     scan for a named technology.
//   * Experience and projects surface their `technologies` as a labelled line — "say what
//     language you used" — and a project draws the highlights it already carries.
//   * The header puts the role beside the name, because the role is the first filter on a
//     technical application.
//
// No skill bars, no rating dots, no icons: those are stand-ins for written text and the
// research deletes them (§6). Type sizes and margins are true points (see `sections.typ`).

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

#set par(leading: par-leading, justify: false)

#let profile = archetype-profile((
  skills: "lines",
  projects: "detail",
  experience: "stack",
))

// ──────────────────────────────────────────────
// HEADER — name and role on one line
// ──────────────────────────────────────────────

// `header-gap-half` below the block plus `space-m` below the rule is the header → body
// gap (`header-gap`); the first section heading does not add its `section-gap`.
#block(width: 100%, below: header-gap-half)[
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

#line(length: 100%, stroke: 0.5pt + rgb(colors.at("divider", default: "#e2e8f0")))
#v(space-m)

// ──────────────────────────────────────────────
// BODY — sections
// ──────────────────────────────────────────────

#for section in sections {
  render-section(section, profile: profile)
}

// The fit meter's end-of-content marker (see `sections.typ`).
#fit-end()
