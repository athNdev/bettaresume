// Academic CV — research, postdoc and faculty applications.
//
// The differences from `standard.typ` are the ones the research names for this market
// (§7.5), and all of them are structure:
//
//   * A centred header with an italic role line and a short rule, justified body text.
//   * Publications are numbered, so a reviewer can cite "[7]".
//   * Education carries coursework, honours and achievements.
//   * Skills are `Category: item` lines; projects show highlights and their stack.
//
// The 1 in margins and looser leading are this archetype's settings defaults
// (`TEMPLATE_CONFIGS.academic.defaults`), not values baked in here: margins are a user
// control, and a document that keeps its own margin would ignore it.
//
// Two or three pages is normal. `pageTargetForTemplate` returns no target for this
// archetype, so the fit meter does not call a complete CV an overflow.
//
// Deliberately NOT changed: section order and headings. A template that renamed
// "Work Experience" to "Academic Appointments" would look scholarly and stop being
// parseable (§5).

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

// Justified — the convention for a multi-page academic CV, where the right rag costs more
// than the extra line gaps. Leading is the shared `par-leading` mapping: a template does
// not get to reinterpret `lineHeight`.
#set par(leading: par-leading, justify: true)

#let profile = archetype-profile((
  heading: "hairline",
  education: "full",
  skills: "lines",
  projects: "detail",
  publications: "numbered",
))

// ──────────────────────────────────────────────
// HEADER — centred, academic
// ──────────────────────────────────────────────

#render-header(content-align: center, title-style: "italic", header-rule: "short")

// ──────────────────────────────────────────────
// BODY — sections
// ──────────────────────────────────────────────

#for section in sections {
  render-section(section, profile: profile)
}

// The fit meter's end-of-content marker (see `sections.typ`).
#fit-end()
