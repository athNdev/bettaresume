// Standard — the reference archetype for most applications.
//
// Left-aligned header, name above a role line, contacts on their own line, and a hairline
// rule before the body. Entries put their dates in a right-hand column, skills are a
// category label over a chip cluster, and every section renders the structure the
// document gives it.
//
// This file is also the source for `compact`. That archetype is the same document (hence
// the same layout) at the tight end of the spacing scale; it differs only by the settings
// its `TEMPLATE_CONFIGS.defaults` applies, which is why there is no `compact.typ` to drift
// from this one.
//
// Type sizes and margins are true points (see `sections.typ`); the gaps come from the same
// named spacing scale the render helpers use.

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
  // Font is requested by name; Typst falls back to "New Computer Modern" if unavailable
  font: settings.at("fontFamily", default: "Inter"),
)
// `par-leading` is the one leading mapping (`sections.typ`), shared with every template so
// the preview and the PDF cannot disagree about line spacing.
#set par(leading: par-leading, justify: false)

// The standard structure: rule-by-choice headings, `Category: items` skills, standard
// entries. `render-header()` draws the one header every archetype shares: name, the
// professional title, and a single contact line.
#let profile = default-profile

// ──────────────────────────────────────────────
// HEADER — personal info
// ──────────────────────────────────────────────

// `gaps.header` is the whole header → body distance; the first section heading does not
// add its own section gap on top of it (see `section-title`).
#render-header(content-align: left, title-style: "line", header-rule: "hairline")

// ──────────────────────────────────────────────
// BODY — sections
// ──────────────────────────────────────────────

#for section in sections {
  render-section(section, profile: profile)
}

// The fit meter's end-of-content marker (see `sections.typ`).
#fit-end()
