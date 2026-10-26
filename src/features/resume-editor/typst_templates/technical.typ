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

// The role sits beside the name because it is the first filter on a technical
// application. Everything else (contacts, separators, the hairline) is the shared header.
#render-header(content-align: left, title-style: "inline", header-rule: "hairline")

// ──────────────────────────────────────────────
// BODY — sections
// ──────────────────────────────────────────────

#for section in sections {
  render-section(section, profile: profile)
}

// The fit meter's end-of-content marker (see `sections.typ`).
#fit-end()
