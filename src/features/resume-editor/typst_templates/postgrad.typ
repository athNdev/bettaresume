// Postgrad — an academic CV layout.
//
// Same content model and the same `render-*` helpers as `minimal.typ`; the difference is
// presentation, because that is the only thing a template should own. The header is
// centred, body text is justified, and leading is slightly looser, which is the
// convention for a multi-page academic CV.
//
// Deliberately NOT changed here:
//   * Section order, headings or fields — those come from the document and the parser
//     contract. A template that renamed "Work Experience" to "Academic Appointments"
//     would look scholarly and stop being parseable.
//   * The font family — the user picks that in the editor, and silently overriding it
//     would make the preview disagree with the export.
//   * Single column. Multi-column academic layouts exist, but they change extraction
//     order, and this product's whole point is that the text layer stays predictable.

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

#set text(
  size: float(typo.at("body", default: 11)) * 1pt,
  fill: rgb(colors.at("text", default: "#1e293b")),
  font: settings.at("fontFamily", default: "Inter"),
)

// Justified and a little looser than `minimal`: academic CVs are read as prose and run
// to several pages, so the right rag costs more than the extra leading.
#set par(
  leading: float(settings.at("lineHeight", default: 1.5)) * 0.55em,
  justify: true,
)

#set list(marker: [•], indent: 0pt, body-indent: 8pt)

// ──────────────────────────────────────────────
// HEADER — centred, academic
// ──────────────────────────────────────────────

#block(width: 100%, below: 16pt)[
  #align(center)[
    #text(
      size: float(typo.at("name", default: 24)) * 1pt,
      weight: "bold",
      fill: rgb(colors.at("heading", default: "#111827")),
    )[#personal.fullName]

    #if personal.professionalTitle != "" {
      linebreak()
      text(
        size: float(typo.at("title", default: 14)) * 1pt,
        fill: rgb(colors.at("secondary", default: "#6b7280")),
        style: "italic",
      )[#personal.professionalTitle]
    }

    #v(6pt)
    #let contacts = ()
    #if personal.email    != "" { contacts.push(personal.email) }
    #if personal.phone    != "" { contacts.push(personal.phone) }
    #if personal.location != "" { contacts.push(personal.location) }
    #if personal.linkedin != "" { contacts.push("LinkedIn: " + personal.linkedin) }
    #if personal.github   != "" { contacts.push("GitHub: " + personal.github) }
    #if personal.website  != "" { contacts.push(personal.website) }
    #text(size: float(typo.at("small", default: 9)) * 1pt, fill: rgb(colors.at("secondary", default: "#6b7280")))[
      #contacts.join("  ·  ")
    ]
  ]
]

#align(center)[
  #line(length: 60%, stroke: 0.6pt + rgb(colors.at("divider", default: "#e2e8f0")))
]
#v(4pt)

// ──────────────────────────────────────────────
// BODY — sections
// ──────────────────────────────────────────────

#for section in sections {
  render-section(section)
}
