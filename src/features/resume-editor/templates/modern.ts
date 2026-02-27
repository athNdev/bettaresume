/**
 * Modern resume template for Typst.
 *
 * Styled header with accent color, respects the `layout` setting
 * (single-column, two-column, or sidebar).
 */

import { SHARED_RENDERERS } from "./shared";

export function modernTemplate(): string {
	return /* typst */ `
// ══════════════════════════════════════════════
// MODERN TEMPLATE
// data is injected as: #let data = json.decode("...")
// ══════════════════════════════════════════════

#let settings  = data.settings
#let personal  = data.personalInfo
#let sections  = data.sections
#let colors    = settings.colors
#let typo      = settings.typography
#let margins   = settings.margins
#let layout    = settings.at("layout", default: "single-column")

#let spacing-val = if settings.sectionSpacing == "compact" {
  8pt
} else if settings.sectionSpacing == "spacious" {
  20pt
} else { 12pt }

// Page
#set page(
  paper: if settings.pageSize == "A4" { "a4" } else { "us-letter" },
  margin: (
    top:    float(margins.top)    * 0.75pt,
    right:  float(margins.right)  * 0.75pt,
    bottom: float(margins.bottom) * 0.75pt,
    left:   float(margins.left)   * 0.75pt,
  ),
  fill: rgb(colors.background),
)

#set text(
  size:  float(typo.body) * 1pt,
  fill:  rgb(colors.text),
  font:  settings.fontFamily,
)
#set par(leading: float(settings.lineHeight) * 0.5em, justify: false)
#set list(marker: [•], indent: 0pt, body-indent: 8pt)

${SHARED_RENDERERS}

// ──────────────────────────────────────────────
// HEADER — styled with accent bar
// ──────────────────────────────────────────────

#block(
  width: 100%,
  below: 0pt,
)[
  // Accent bar top
  #rect(width: 100%, height: 3pt, fill: rgb(colors.accent))
  #v(10pt)

  #grid(
    columns: (1fr, auto),
    gutter: 8pt,
    {
      text(
        size:   float(typo.name) * 1pt,
        weight: "bold",
        fill:   rgb(colors.heading),
      )[#personal.fullName]

      if personal.professionalTitle != "" {
        linebreak()
        v(2pt)
        text(
          size: float(typo.title) * 1pt,
          fill: rgb(colors.primary),
          weight: "semibold",
        )[#personal.professionalTitle]
      }
    },
    // Right column: contact details
    align(right)[
      #let lines = ()
      #if personal.email    != "" { lines.push(personal.email) }
      #if personal.phone    != "" { lines.push(personal.phone) }
      #if personal.location != "" { lines.push(personal.location) }
      #if personal.linkedin != "" { lines.push(personal.linkedin) }
      #if personal.github   != "" { lines.push(personal.github) }
      #if personal.website  != "" { lines.push(personal.website) }
      #for l in lines {
        text(size: float(typo.small) * 1pt, fill: rgb(colors.secondary))[#l]
        linebreak()
      }
    ],
  )
  #v(10pt)
  #line(length: 100%, stroke: 1pt + rgb(colors.divider))
  #v(4pt)
]

// ──────────────────────────────────────────────
// BODY — single-column or two-column
// ──────────────────────────────────────────────

#let primary-types = ("summary", "experience", "projects", "education",
                      "volunteer", "publications", "references")
#let secondary-types = ("skills", "certifications", "languages", "awards")

#if layout == "single-column" {
  for section in sections {
    render-section(section)
  }
} else {
  // Two-column and sidebar: split sections into main/side
  let main-secs = sections.filter(s => primary-types.contains(s.type))
  let side-secs = sections.filter(s => secondary-types.contains(s.type))
  // rest (custom, etc.) goes to main
  let rest-secs = sections.filter(s =>
    not primary-types.contains(s.type) and not secondary-types.contains(s.type)
  )
  let all-main = main-secs + rest-secs

  let side-width = if layout == "two-column" { 38% } else { 35% }

  if layout == "sidebar" {
    grid(
      columns: (side-width, 1fr),
      gutter: 16pt,
      {
        for s in side-secs { render-section(s) }
      },
      {
        for s in all-main { render-section(s) }
      },
    )
  } else {
    // two-column: main on left, side on right
    grid(
      columns: (1fr, side-width),
      gutter: 16pt,
      {
        for s in all-main { render-section(s) }
      },
      {
        for s in side-secs { render-section(s) }
      },
    )
  }
}
`;
}
