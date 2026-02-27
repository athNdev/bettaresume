/**
 * Classic resume template — serif typography, traditional structure.
 */

import { SHARED_RENDERERS } from "./shared";

export function classicTemplate(): string {
	return /* typst */ `
// ══════════════════════════════════════════════
// CLASSIC TEMPLATE  (serif, centered header)
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

// ── Centered header ──────────────────────────
#align(center)[
  #text(size: float(typo.name) * 1pt, weight: "bold", fill: rgb(colors.heading))[
    #personal.fullName
  ]
  #if personal.professionalTitle != "" {
    linebreak()
    v(2pt)
    text(size: float(typo.title) * 1pt, fill: rgb(colors.secondary))[
      #personal.professionalTitle
    ]
  }
  #v(6pt)
  #let contacts = ()
  #if personal.email    != "" { contacts.push(personal.email) }
  #if personal.phone    != "" { contacts.push(personal.phone) }
  #if personal.location != "" { contacts.push(personal.location) }
  #if personal.linkedin != "" { contacts.push(personal.linkedin) }
  #if personal.github   != "" { contacts.push(personal.github) }
  #text(size: float(typo.small) * 1pt, fill: rgb(colors.secondary))[
    #contacts.join("  ·  ")
  ]
]
#v(8pt)
#line(length: 100%, stroke: 1pt + rgb(colors.heading))
#v(4pt)

// ── Body ─────────────────────────────────────
#for section in sections {
  render-section(section)
}
`;
}

/**
 * Professional template — two-tone header bar, formal.
 */
export function professionalTemplate(): string {
	return /* typst */ `
// ══════════════════════════════════════════════
// PROFESSIONAL TEMPLATE
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

// ── Header with solid background bar ─────────
#block(
  fill:   rgb(colors.primary),
  width:  100%,
  inset:  (x: 0pt, y: 14pt),
  radius: (top-left: 0pt, top-right: 0pt, bottom-left: 0pt, bottom-right: 0pt),
)[
  #text(size: float(typo.name) * 1pt, weight: "bold", fill: white)[
    #personal.fullName
  ]
  #if personal.professionalTitle != "" {
    linebreak()
    v(2pt)
    text(size: float(typo.title) * 1pt, fill: rgb("ffffffcc"))[
      #personal.professionalTitle
    ]
  }
]
#block(
  fill:   rgb(colors.secondary),
  width:  100%,
  inset:  (x: 0pt, y: 6pt),
  below:  12pt,
)[
  #let contacts = ()
  #if personal.email    != "" { contacts.push(personal.email) }
  #if personal.phone    != "" { contacts.push(personal.phone) }
  #if personal.location != "" { contacts.push(personal.location) }
  #if personal.linkedin != "" { contacts.push(personal.linkedin) }
  #if personal.github   != "" { contacts.push(personal.github) }
  #text(size: float(typo.small) * 1pt, fill: white)[
    #contacts.join("   |   ")
  ]
]

// ── Body ─────────────────────────────────────
#for section in sections {
  render-section(section)
}
`;
}

/**
 * Creative template — accent sidebar stripe, bold name treatment.
 */
export function creativeTemplate(): string {
	return /* typst */ `
// ══════════════════════════════════════════════
// CREATIVE TEMPLATE  (lateral accent stripe)
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

// Adjust left margin to account for the decorative stripe
#set page(
  paper: if settings.pageSize == "A4" { "a4" } else { "us-letter" },
  margin: (
    top:    float(margins.top)    * 0.75pt,
    right:  float(margins.right)  * 0.75pt,
    bottom: float(margins.bottom) * 0.75pt,
    left:   float(margins.left)   * 0.75pt,
  ),
  fill: rgb(colors.background),
  // Draw a vertical accent stripe on the left edge
  background: place(
    left + top,
    rect(
      width: 4pt,
      height: 100%,
      fill:  rgb(colors.accent),
    ),
  ),
)
#set text(
  size:  float(typo.body) * 1pt,
  fill:  rgb(colors.text),
  font:  settings.fontFamily,
)
#set par(leading: float(settings.lineHeight) * 0.5em, justify: false)
#set list(marker: [•], indent: 0pt, body-indent: 8pt)

${SHARED_RENDERERS}

// ── Header ───────────────────────────────────
#v(4pt)
#text(size: float(typo.name) * 1pt, weight: "bold", fill: rgb(colors.accent))[
  #personal.fullName
]
#if personal.professionalTitle != "" {
  linebreak()
  v(2pt)
  text(size: float(typo.title) * 1pt, fill: rgb(colors.secondary), style: "italic")[
    #personal.professionalTitle
  ]
}
#v(8pt)
#let contacts = ()
#if personal.email    != "" { contacts.push(personal.email) }
#if personal.phone    != "" { contacts.push(personal.phone) }
#if personal.location != "" { contacts.push(personal.location) }
#if personal.linkedin != "" { contacts.push(personal.linkedin) }
#if personal.github   != "" { contacts.push(personal.github) }
#text(size: float(typo.small) * 1pt, fill: rgb(colors.secondary))[
  #contacts.join("  ·  ")
]
#v(10pt)
#line(length: 100%, stroke: 1.5pt + rgb(colors.accent))
#v(4pt)

// ── Body ─────────────────────────────────────
#for section in sections {
  render-section(section)
}
`;
}

/**
 * Executive template — spacious, understated, large name.
 */
export function executiveTemplate(): string {
	return /* typst */ `
// ══════════════════════════════════════════════
// EXECUTIVE TEMPLATE  (spacious, understated)
// ══════════════════════════════════════════════

#let settings  = data.settings
#let personal  = data.personalInfo
#let sections  = data.sections
#let colors    = settings.colors
#let typo      = settings.typography
#let margins   = settings.margins

#let spacing-val = if settings.sectionSpacing == "compact" {
  10pt
} else if settings.sectionSpacing == "spacious" {
  24pt
} else { 16pt }

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
#set list(marker: [–], indent: 0pt, body-indent: 8pt)

${SHARED_RENDERERS}

// ── Header ───────────────────────────────────
#v(spacing-val)
#text(size: float(typo.name) * 1.2pt, weight: "bold", fill: rgb(colors.heading))[
  #personal.fullName
]
#v(4pt)
#line(length: 40%, stroke: 2pt + rgb(colors.primary))
#v(6pt)
#if personal.professionalTitle != "" {
  text(size: float(typo.title) * 1pt, fill: rgb(colors.primary), weight: "semibold")[
    #personal.professionalTitle
  ]
  v(6pt)
}
#let contacts = ()
#if personal.email    != "" { contacts.push(personal.email) }
#if personal.phone    != "" { contacts.push(personal.phone) }
#if personal.location != "" { contacts.push(personal.location) }
#if personal.linkedin != "" { contacts.push(personal.linkedin) }
#if personal.github   != "" { contacts.push(personal.github) }
#text(size: float(typo.small) * 1pt, fill: rgb(colors.secondary))[
  #contacts.join("    ")
]
#v(spacing-val)
#line(length: 100%, stroke: 0.5pt + rgb(colors.divider))

// ── Body ─────────────────────────────────────
#for section in sections {
  render-section(section)
}
`;
}

/**
 * Tech template — monospace accents, technical style.
 */
export function techTemplate(): string {
	return /* typst */ `
// ══════════════════════════════════════════════
// TECH TEMPLATE  (monospace accents)
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
#set list(marker: sym.triangle.r, indent: 0pt, body-indent: 8pt)

${SHARED_RENDERERS}

// ── Header ───────────────────────────────────
#block(width: 100%, below: 12pt)[
  #box(
    fill:   rgb(colors.primary),
    inset:  (x: 6pt, y: 2pt),
    radius: 3pt,
  )[
    #text(size: float(typo.small) * 1pt, fill: white)[
      $ whoami
    ]
  ]
  #v(4pt)
  #text(
    size:   float(typo.name) * 1pt,
    weight: "bold",
    fill:   rgb(colors.heading),
  )[#personal.fullName]

  #if personal.professionalTitle != "" {
    linebreak()
    v(2pt)
    text(size: float(typo.title) * 1pt, fill: rgb(colors.accent), weight: "semibold")[
      #personal.professionalTitle
    ]
  }
  #v(6pt)
  #let contacts = ()
  #if personal.email    != "" { contacts.push(personal.email) }
  #if personal.phone    != "" { contacts.push(personal.phone) }
  #if personal.location != "" { contacts.push(personal.location) }
  #if personal.github   != "" { contacts.push("github: " + personal.github) }
  #if personal.linkedin != "" { contacts.push("linkedin: " + personal.linkedin) }
  #text(size: float(typo.small) * 1pt, fill: rgb(colors.secondary))[
    #contacts.join("  //  ")
  ]
]

#line(length: 100%, stroke: 1pt + rgb(colors.accent))
#v(4pt)

// ── Body ─────────────────────────────────────
#let primary-types   = ("summary", "experience", "projects", "education",
                        "volunteer", "publications", "references")
#let secondary-types = ("skills", "certifications", "languages", "awards")

#if layout == "single-column" {
  for section in sections {
    render-section(section)
  }
} else {
  let main-secs = sections.filter(s => primary-types.contains(s.type))
  let side-secs = sections.filter(s => secondary-types.contains(s.type))

  grid(
    columns: (1fr, 36%),
    gutter:  16pt,
    {
      for s in main-secs { render-section(s) }
    },
    {
      for s in side-secs { render-section(s) }
    },
  )
}
`;
}
