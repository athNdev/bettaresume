// Postgrad — an academic CV layout.
//
// Same content model and the same `render-*` helpers as `minimal.typ`; the difference is
// presentation, because that is the only thing a template should own. The header is
// centred, body text is justified, and leading is slightly looser, which is the
// convention for a multi-page academic CV. Type sizes and margins are true points (see
// `sections.typ`).
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

// Justified and a little looser than `minimal`: academic CVs are read as prose and run
// to several pages, so the right rag costs more than the extra leading.
#set par(
  leading: float(settings.at("lineHeight", default: 1.35)) * 0.55em,
  justify: true,
)

// ──────────────────────────────────────────────
// HEADER — centred, academic
// ──────────────────────────────────────────────

// 16pt header → body: `space-2xl` below the block + `space-m` below the rule.
#block(width: 100%, below: space-2xl)[
  #align(center)[
    #text(
      size: typo.at("name", default: 18pt),
      weight: "bold",
      fill: rgb(colors.at("heading", default: "#111827")),
    )[#personal.fullName]

    #if personal.professionalTitle != "" {
      linebreak()
      text(
        size: typo.at("title", default: 11pt),
        fill: rgb(colors.at("secondary", default: "#6b7280")),
        style: "italic",
      )[#personal.professionalTitle]
    }

    #v(space-l)
    #let contacts = ()
    #if personal.email    != "" { contacts.push(personal.email) }
    #if personal.phone    != "" { contacts.push(personal.phone) }
    #if personal.location != "" { contacts.push(personal.location) }
    #if personal.linkedin != "" { contacts.push("LinkedIn: " + personal.linkedin) }
    #if personal.github   != "" { contacts.push("GitHub: " + personal.github) }
    #if personal.website  != "" { contacts.push(personal.website) }
    #text(size: typo.at("small", default: 9.5pt), fill: rgb(colors.at("secondary", default: "#6b7280")))[
      #contacts.join("  ·  ")
    ]
  ]
]

#align(center)[
  #line(length: 60%, stroke: 0.6pt + rgb(colors.at("divider", default: "#e2e8f0")))
]
#v(space-m)

// ──────────────────────────────────────────────
// BODY — sections
// ──────────────────────────────────────────────

#for section in sections {
  render-section(section)
}
