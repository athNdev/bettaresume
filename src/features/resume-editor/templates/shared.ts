/**
 * Shared Typst section renderers.
 *
 * Exported as a raw string that every template imports at the top
 * via string concatenation (no virtual filesystem needed).
 *
 * Expects: `data`, `settings`, `colors`, `typo`, `spacing-val` to be in scope.
 */

export const SHARED_RENDERERS = /* typst */ `

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

#let px-to-pt(px) = { float(px) * 0.75pt }

#let badge(content) = box(
  fill: rgb(colors.accent + "20"),
  inset: (x: px-to-pt(6), y: px-to-pt(2)),
  radius: px-to-pt(4),
)[#text(size: px-to-pt(typo.small), fill: rgb(colors.accent))[#content]]

#let date-range(start, end-val, is-current) = {
  if start != "" {
    start
    " – "
    if is-current { "Present" } else if end-val != "" { end-val } else { "" }
  }
}

// ──────────────────────────────────────────────
// Section title
// ──────────────────────────────────────────────

#let section-title(content) = {
  v(spacing-val)
  let style = settings.at("accentStyle", default: "underline")
  if style == "underline" {
    stack(
      dir: ttb,
      text(
        size: px-to-pt(typo.sectionHeading),
        weight: "semibold",
        fill: rgb(colors.heading),
      )[#content],
      v(2pt),
      line(length: 100%, stroke: 1.5pt + rgb(colors.accent)),
    )
  } else if style == "background" {
    block(
      fill: rgb(colors.accent),
      inset: (x: px-to-pt(6), y: px-to-pt(3)),
      width: 100%,
    )[
      #text(
        size: px-to-pt(typo.sectionHeading),
        weight: "semibold",
        fill: white,
      )[#content]
    ]
  } else if style == "border" {
    stack(
      dir: ltr,
      rect(width: 3pt, height: px-to-pt(typo.sectionHeading) + 4pt, fill: rgb(colors.accent)),
      h(6pt),
      text(
        size: px-to-pt(typo.sectionHeading),
        weight: "semibold",
        fill: rgb(colors.heading),
      )[#content],
    )
  } else {
    text(
      size: px-to-pt(typo.sectionHeading),
      weight: "semibold",
      fill: rgb(colors.heading),
    )[#content]
  }
  v(4pt)
}

// ──────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────

#let render-summary(section) = {
  if section.summaryText == "" { return }
  section-title(if section.title != "" { section.title } else { "Professional Summary" })
  text(size: px-to-pt(typo.body))[#section.summaryText]
  v(spacing-val * 0.5)
}

// ──────────────────────────────────────────────
// Experience
// ──────────────────────────────────────────────

#let render-experience(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Work Experience" })

  for exp in items {
    grid(
      columns: (1fr, auto),
      gutter: 4pt,
      {
        text(
          size: px-to-pt(typo.itemTitle),
          weight: "semibold",
          fill: rgb(colors.heading),
        )[#exp.position]
        linebreak()
        text(size: px-to-pt(typo.body), fill: rgb(colors.secondary))[
          #exp.company#if exp.location != "" { " • " + exp.location }
        ]
      },
      align(right)[
        #text(size: px-to-pt(typo.small), fill: rgb(colors.secondary))[
          #date-range(exp.startDate, exp.endDate, exp.current)
        ]
      ],
    )

    if exp.description != "" {
      v(2pt)
      text(size: px-to-pt(typo.body))[#exp.description]
    }

    let hl = exp.at("highlights", default: ())
    if hl.len() > 0 {
      v(2pt)
      list(..hl.map(h => text(size: px-to-pt(typo.body))[#h]))
    }
    v(spacing-val * 0.6)
  }
}

// ──────────────────────────────────────────────
// Education
// ──────────────────────────────────────────────

#let render-education(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Education" })

  for edu in items {
    grid(
      columns: (1fr, auto),
      gutter: 4pt,
      {
        text(
          size: px-to-pt(typo.itemTitle),
          weight: "semibold",
          fill: rgb(colors.heading),
        )[
          #edu.degree#if edu.field != "" { " in " + edu.field }
        ]
        linebreak()
        text(size: px-to-pt(typo.body), fill: rgb(colors.secondary))[
          #edu.institution#if edu.gpa != "" { " • GPA: " + edu.gpa }
        ]
      },
      align(right)[
        #text(size: px-to-pt(typo.small), fill: rgb(colors.secondary))[
          #edu.graduationDate
        ]
      ],
    )
    v(spacing-val * 0.6)
  }
}

// ──────────────────────────────────────────────
// Skills
// ──────────────────────────────────────────────

#let render-skills(section) = {
  let cats = section.at("categories", default: ())
  if cats.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Skills" })

  for cat in cats {
    text(
      size: px-to-pt(typo.itemTitle),
      weight: "semibold",
      fill: rgb(colors.heading),
    )[#cat.name]
    v(3pt)
    cat.skills.map(s => badge(s.name)).join(h(4pt))
    v(spacing-val * 0.5)
  }
}

// ──────────────────────────────────────────────
// Projects
// ──────────────────────────────────────────────

#let render-projects(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Projects" })

  for proj in items {
    grid(
      columns: (1fr, auto),
      gutter: 4pt,
      text(
        size: px-to-pt(typo.itemTitle),
        weight: "semibold",
        fill: rgb(colors.heading),
      )[#proj.name],
      align(right)[
        #text(size: px-to-pt(typo.small), fill: rgb(colors.secondary))[
          #if proj.startDate != "" {
            date-range(proj.startDate, proj.endDate, proj.current)
          }
        ]
      ],
    )
    if proj.description != "" {
      v(2pt)
      text(size: px-to-pt(typo.body))[#proj.description]
    }
    let techs = proj.at("technologies", default: ())
    if techs.len() > 0 {
      v(3pt)
      techs.map(badge).join(h(4pt))
    }
    v(spacing-val * 0.6)
  }
}

// ──────────────────────────────────────────────
// Certifications
// ──────────────────────────────────────────────

#let render-certifications(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Certifications" })

  for cert in items {
    grid(
      columns: (1fr, auto),
      gutter: 4pt,
      {
        text(
          size: px-to-pt(typo.itemTitle),
          weight: "semibold",
          fill: rgb(colors.heading),
        )[#cert.name]
        linebreak()
        text(size: px-to-pt(typo.body), fill: rgb(colors.secondary))[#cert.issuer]
      },
      align(right)[
        #text(size: px-to-pt(typo.small), fill: rgb(colors.secondary))[#cert.date]
      ],
    )
    v(spacing-val * 0.5)
  }
}

// ──────────────────────────────────────────────
// Awards
// ──────────────────────────────────────────────

#let render-awards(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Awards & Honors" })

  for award in items {
    grid(
      columns: (1fr, auto),
      gutter: 4pt,
      {
        text(
          size: px-to-pt(typo.itemTitle),
          weight: "semibold",
          fill: rgb(colors.heading),
        )[#award.title]
        linebreak()
        text(size: px-to-pt(typo.body), fill: rgb(colors.secondary))[#award.issuer]
      },
      align(right)[
        #text(size: px-to-pt(typo.small), fill: rgb(colors.secondary))[#award.date]
      ],
    )
    if award.description != "" {
      v(2pt)
      text(size: px-to-pt(typo.body))[#award.description]
    }
    v(spacing-val * 0.5)
  }
}

// ──────────────────────────────────────────────
// Languages
// ──────────────────────────────────────────────

#let render-languages(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Languages" })
  items.map(l => badge(l.name + " (" + l.proficiency + ")")).join(h(4pt))
  v(spacing-val * 0.5)
}

// ──────────────────────────────────────────────
// Volunteer
// ──────────────────────────────────────────────

#let render-volunteer(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Volunteer Experience" })

  for vol in items {
    grid(
      columns: (1fr, auto),
      gutter: 4pt,
      {
        text(
          size: px-to-pt(typo.itemTitle),
          weight: "semibold",
          fill: rgb(colors.heading),
        )[#vol.role]
        linebreak()
        text(size: px-to-pt(typo.body), fill: rgb(colors.secondary))[
          #vol.organization#if vol.location != "" { " • " + vol.location }
        ]
      },
      align(right)[
        #text(size: px-to-pt(typo.small), fill: rgb(colors.secondary))[
          #date-range(vol.startDate, vol.endDate, vol.current)
        ]
      ],
    )
    if vol.description != "" {
      v(2pt)
      text(size: px-to-pt(typo.body))[#vol.description]
    }
    let hl = vol.at("highlights", default: ())
    if hl.len() > 0 {
      v(2pt)
      list(..hl.map(h => text(size: px-to-pt(typo.body))[#h]))
    }
    v(spacing-val * 0.6)
  }
}

// ──────────────────────────────────────────────
// Publications
// ──────────────────────────────────────────────

#let render-publications(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "Publications" })

  for pub in items {
    text(
      size: px-to-pt(typo.itemTitle),
      weight: "semibold",
      fill: rgb(colors.heading),
    )[#pub.title]
    linebreak()
    text(size: px-to-pt(typo.body), fill: rgb(colors.secondary))[
      #pub.publisher • #pub.date
    ]
    let authors = pub.at("authors", default: ())
    if authors.len() > 0 {
      linebreak()
      text(size: px-to-pt(typo.small), fill: rgb(colors.secondary))[
        Authors: #authors.join(", ")
      ]
    }
    if pub.summary != "" {
      v(2pt)
      text(size: px-to-pt(typo.body))[#pub.summary]
    }
    v(spacing-val * 0.5)
  }
}

// ──────────────────────────────────────────────
// References
// ──────────────────────────────────────────────

#let render-references(section) = {
  let items = section.at("items", default: ())
  if items.len() == 0 { return }
  section-title(if section.title != "" { section.title } else { "References" })

  for ref in items {
    text(
      size: px-to-pt(typo.itemTitle),
      weight: "semibold",
      fill: rgb(colors.heading),
    )[#ref.name]
    linebreak()
    text(size: px-to-pt(typo.body), fill: rgb(colors.secondary))[
      #ref.position#if ref.company != "" { " at " + ref.company }
    ]
    if ref.email != "" {
      linebreak()
      text(size: px-to-pt(typo.small))[#ref.email]
    }
    v(spacing-val * 0.5)
  }
}

// ──────────────────────────────────────────────
// Dispatcher
// ──────────────────────────────────────────────

#let render-section(section) = {
  let t = section.type
  if t == "summary"        { render-summary(section) }
  else if t == "experience"    { render-experience(section) }
  else if t == "education"     { render-education(section) }
  else if t == "skills"        { render-skills(section) }
  else if t == "projects"      { render-projects(section) }
  else if t == "certifications"{ render-certifications(section) }
  else if t == "awards"        { render-awards(section) }
  else if t == "languages"     { render-languages(section) }
  else if t == "volunteer"     { render-volunteer(section) }
  else if t == "publications"  { render-publications(section) }
  else if t == "references"    { render-references(section) }
}
`;
