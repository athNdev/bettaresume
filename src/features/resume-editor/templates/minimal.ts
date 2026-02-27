/**
 * Minimal resume template for Typst.
 *
 * Clean, single-column layout. No decorative elements.
 * All styling comes from `data.settings`.
 */

import { SHARED_RENDERERS } from "./shared";

// Inline font name resolution at template-build time so the Typst source
// can reference `font-name` directly from the settings mapping.
export function minimalTemplate(): string {
	return /* typst */ `
// ══════════════════════════════════════════════
// MINIMAL TEMPLATE
// data is injected as: #let data = json.decode("...")
// ══════════════════════════════════════════════

#let settings  = data.settings
#let personal  = data.personalInfo
#let sections  = data.sections
#let colors    = settings.colors
#let typo      = settings.typography
#let margins   = settings.margins

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

// Text defaults
#set text(
  size:   float(typo.body) * 1pt,
  fill:   rgb(colors.text),
  // Font is requested by name; Typst falls back to "New Computer Modern" if unavailable
  font:   settings.fontFamily,
)
#set par(leading: float(settings.lineHeight) * 0.5em, justify: false)

// List styling
#set list(marker: [•], indent: 0pt, body-indent: 8pt)

${SHARED_RENDERERS}

// ──────────────────────────────────────────────
// HEADER — personal info
// ──────────────────────────────────────────────

#block(width: 100%, below: 14pt)[
  // Name
  #text(
    size:   float(typo.name) * 1pt,
    weight: "bold",
    fill:   rgb(colors.heading),
  )[#personal.fullName]

  #if personal.professionalTitle != "" {
    linebreak()
    text(
      size: float(typo.title) * 1pt,
      fill: rgb(colors.secondary),
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
  #text(size: float(typo.small) * 1pt, fill: rgb(colors.secondary))[
    #contacts.join("  |  ")
  ]
]

#line(length: 100%, stroke: 0.5pt + rgb(colors.divider))
#v(4pt)

// ──────────────────────────────────────────────
// BODY — sections
// ──────────────────────────────────────────────

#for section in sections {
  render-section(section)
}
`;
}
