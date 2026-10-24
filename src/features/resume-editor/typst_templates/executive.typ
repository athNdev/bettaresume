// Executive — directors, VPs and C-level.
//
// A longer history needs a stronger opening and more air between roles, so this archetype
// spends its budget on the header and on the gaps rather than on decoration:
//
//   * The name is set at 20 pt (the top of the researched 16–20 pt band) through this
//     archetype's settings default, so the user's own type scale still governs the body.
//   * Section headings get a quiet 0.5 pt text-ink hairline, not the accent rule.
//   * Skills collapse to one comma-separated line — "core expertise", not a keyword
//     table (research §7.6).
//   * Projects keep their highlights: an executive's evidence is the outcome, not the tool
//     list.
//
// The summary is the first thing a reader should meet, but section order is the
// document's, not the template's. Put `Summary` first; the archetype does not move it.
//
// Type sizes and margins are true points (see `sections.typ`). The 0.75 in margins and the
// 1.4 leading are settings defaults in `TEMPLATE_CONFIGS`.

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
  heading: "hairline",
  skills: "inline",
  projects: "detail",
))

// ──────────────────────────────────────────────
// HEADER — the name block carries the document
// ──────────────────────────────────────────────

// `header-gap-half` below the block plus `space-m` below the rule is the header → body
// gap (`header-gap`).
#block(width: 100%, below: header-gap-half)[
  #text(
    size: typo.at("name", default: 18pt),
    weight: "bold",
    fill: rgb(colors.at("heading", default: "#111827")),
  )[#personal.fullName]

  #if personal.professionalTitle != "" {
    linebreak()
    v(space-xs)
    text(
      size: typo.at("title", default: 11pt),
      fill: rgb(colors.at("secondary", default: "#6b7280")),
    )[#personal.professionalTitle]
  }

  #v(contact-gap)
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
