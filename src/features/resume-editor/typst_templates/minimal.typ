// Page
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

// Text defaults
#set text(
  size:   float(typo.at("body", default: 11)) * 1pt,
  fill:   rgb(colors.at("text", default: "#1e293b")),
  // Font is requested by name; Typst falls back to "New Computer Modern" if unavailable
  font:   settings.at("fontFamily", default: "Inter"),
)
#set par(leading: float(settings.at("lineHeight", default: 1.5)) * 0.5em, justify: false)

// List styling
#set list(marker: [•], indent: 0pt, body-indent: 8pt)

// ──────────────────────────────────────────────
// HEADER — personal info
// ──────────────────────────────────────────────

#block(width: 100%, below: 14pt)[
  // Name
  #text(
    size:   float(typo.at("name", default: 24)) * 1pt,
    weight: "bold",
    fill:   rgb(colors.at("heading", default: "#111827")),
  )[#personal.fullName]

  #if personal.professionalTitle != "" {
    linebreak()
    text(
      size: float(typo.at("title", default: 14)) * 1pt,
      fill: rgb(colors.at("secondary", default: "#6b7280")),
    )[#personal.professionalTitle]
  }

  // Contact row
  #v(6pt)
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

#line(length: 100%, stroke: 0.5pt + rgb(colors.at("divider", default: "#e2e8f0")))
#v(4pt)

// ──────────────────────────────────────────────
// BODY — sections
// ──────────────────────────────────────────────

#for section in sections {
  render-section(section)
}
