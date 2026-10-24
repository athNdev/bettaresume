import type { FitProbe } from "@/lib/layout/page-fit";

/**
 * The fit probe — the invisible measurement appended to a compile.
 *
 * ## Why this shape
 *
 * The compiler runs in the browser. The app needs structured numbers out of a Typst
 * layout, and Typst's introspection can compute them *inside* the document and hand them
 * back through `metadata`, which is invisible and layout-neutral. The probe is therefore
 * appended only for meter compiles: the SVG preview and the PDF export never contain it,
 * so they stay byte-identical to what they were before this feature.
 *
 * The document marks itself as it lays out (`#metadata((kind: "entry", …))` before each
 * entry, `<fit-end>` after the last block — both in `sections.typ`), then this block
 * reads every marker back with `query(metadata)`. `locate`/`position()` gives each
 * marker's `(page, y)`, with `y` measured from the page's top edge in points — verified
 * against the bundled compiler: the first body line at a 43pt top margin reports `y = 43`.
 *
 * ## Version note
 *
 * `context` and `counter(page).final()` need Typst ≥ 0.11; the bundled WASM compiler is
 * Typst 0.14.2. The probe is never compiled by the `typst` CLI used in tests (that one is
 * 0.10 and would reject `context`), because it is added by this module at compile time,
 * not written into the `.typ` files.
 */
export const FIT_PROBE_SOURCE = `// ── fit probe (invisible; appended only for measurement compiles) ──
#context {
  let located(kind) = query(metadata)
    .filter(m => type(m.value) == dictionary and m.value.at("kind", default: "") == kind)
    .map(m => {
      let p = m.location().position()
      (
        id: m.value.at("id", default: ""),
        section: m.value.at("section", default: ""),
        label: m.value.at("label", default: ""),
        page: p.page,
        y: p.y.pt(),
      )
    })
  let ends = located("end")
  let end = if ends.len() > 0 {
    (page: ends.at(0).page, y: ends.at(0).y)
  } else {
    (page: 1, y: float(margins.top))
  }
  // Line length: how many characters of body text fit on a full line. Measured, not
  // assumed — the reference string's mean advance is taken at the rendered body size,
  // which already includes fontScale and the resolved family.
  let reference = "The quick brown fox jumps over the lazy dog 0123456789"
  let content-width = page-width - margins.left * 1pt - margins.right * 1pt
  let unit = measure(text(size: typo.body)[#reference]).width / reference.len()
  metadata((
    kind: "fit-probe",
    pages: counter(page).final().first(),
    end: end,
    entries: located("entry"),
    sections: located("section"),
    lineChars: content-width / unit,
    usableHeight: usable-height.pt(),
  ))
}
`;

/** Append the probe to a document source. Idempotent for one compile. */
export function withFitProbe(source: string): string {
	return `${source}\n\n${FIT_PROBE_SOURCE}`;
}

export type { FitProbe };
