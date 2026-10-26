// Graduate — current students and new graduates.
//
// Education is the strongest evidence a student has, so this archetype draws the detail
// the standard renderer dropped: GPA in the institution line, then coursework, honours and
// achievements. Projects draw their highlights and stack for the same reason — coursework
// and a capstone project are the work history.
//
// The heading is weight alone (no rule), which buys a line back per section on a document
// that has to hold on one page. Put Education first in the section list; section order is
// the document's, not the template's, so the archetype styles it but does not move it.
//
// Type sizes and margins are true points (see `sections.typ`).

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
  heading: "plain",
  education: "full",
  skills: "lines",
  projects: "detail",
))

// ──────────────────────────────────────────────
// HEADER — name, role and contacts
// ──────────────────────────────────────────────

// Weight and case do the separating: no rule and no second column, so the document spends
// its vertical budget on the work history instead.
#render-header(content-align: left, title-style: "line", header-rule: "none")

// ──────────────────────────────────────────────
// BODY — sections
// ──────────────────────────────────────────────

#for section in sections {
  render-section(section, profile: profile)
}

// The fit meter's end-of-content marker (see `sections.typ`).
#fit-end()
