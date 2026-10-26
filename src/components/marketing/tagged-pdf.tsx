/**
 * The tagged PDF section of the landing page.
 *
 * One section, one claim: Typst 0.14 emits a tagged PDF by default, and
 * `scripts/probe/export.cjs` reads the three markers back out of a real export.
 * The page states the markers and explicitly does not borrow the words
 * "accessible" or "compliant" — those are legal terms with an audit behind them.
 *
 * This file held two sections until the brand band was removed from the page. The
 * `Craft` component and its brand/built facts were left behind with no importer,
 * which is the dead code this file no longer contains.
 *
 * **The copy rules still apply.** The design CV's warning is quoted verbatim from
 * `src/features/resume-editor/design-export/index.ts`, and
 * `test/marketing-claims.test.ts` keeps the two identical. Importing the exporter
 * here would pull the whole pipeline into the server bundle for one sentence, so the
 * page holds the string and the test holds them together.
 */

/**
 * The design CV's permanent warning, verbatim.
 *
 * See the header: the claims test is what keeps this sentence and the exporter's
 * constant identical. Do not "tidy" the punctuation — the dialog and the menu quote
 * the same bytes.
 */
const DESIGN_WARNING =
	"This layout is not parser-safe. Use the standard export for anything that goes through an applicant tracking system.";

/**
 * The three markers the export probe looks for.
 *
 * The names are the PDF dictionary keys, so they are rendered in mono and kept
 * unformatted. `test/marketing-claims.test.ts` asserts each one is also present in
 * `scripts/probe/export.cjs`, which is the code path that reads them back.
 */
const PDF_MARKERS = [
	{
		marker: "/StructTreeRoot",
		title: "A structure tree",
		body: "The document's sections and paragraphs, written as a tree rather than a set of coordinates.",
	},
	{
		marker: "/MarkInfo",
		title: "A marked file",
		body: "The dictionary that tells a reader the file carries marked content and a structure tree.",
	},
	{
		marker: "/Lang",
		title: "A document language",
		body: "Declared in the file itself, so a reader does not have to infer it from the first sentence.",
	},
] as const;

/* --------------------------------------------------------------------------
 * 1. The file
 * -------------------------------------------------------------------------- */

export function TaggedPdf() {
	return (
		<section className="rule-soft" id="tagged-pdf">
			<div className="marketing-shell py-16 lg:py-24">
				<div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
					<div>
						<p className="font-semibold text-[var(--brand-accent)] text-xs uppercase tracking-[0.16em]">
							The file
						</p>
						<h2 className="mt-4 text-title">
							The PDF is a document, not a picture.
						</h2>
						<p className="mt-4 text-[var(--brand-text-muted)] text-lede">
							Typst 0.14 emits a tagged PDF by default. The file carries a
							structure tree, a marked-content dictionary and a document
							language, so the text is a tree of sections and paragraphs rather
							than only positioned glyphs.
						</p>
						<p className="mt-4 max-w-(--marketing-measure) text-[var(--brand-text-muted)] text-base">
							The standard export stays single-column and its text layer is
							document order. The structure tree is the same document, so the
							file a person opens and the text a parser reads cannot describe
							two different layouts.
						</p>
					</div>

					<dl className="grid content-start gap-3">
						{PDF_MARKERS.map((item) => (
							<div
								className="rounded-lg border border-[var(--brand-rule)] bg-[var(--brand-card)] p-4"
								key={item.marker}
							>
								<div className="flex flex-wrap items-baseline justify-between gap-2">
									<dt className="font-semibold text-[var(--brand-text)] text-base">
										{item.title}
									</dt>
									<dd className="font-mono text-[var(--brand-text-faint)] text-xs">
										{item.marker}
									</dd>
								</div>
								<dd className="mt-2 text-[var(--brand-text-muted)] text-base">
									{item.body}
								</dd>
							</div>
						))}
					</dl>
				</div>

				<div className="mt-8 rounded-lg border border-[var(--brand-rule)] bg-[var(--brand-card)] p-6">
					<div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
						<div>
							<h3 className="font-semibold text-[var(--brand-text)] text-lg">
								What that means
							</h3>
							<p className="mt-2 max-w-(--marketing-measure) text-[var(--brand-text-muted)] text-base">
								It means the file carries the document's structure. It is not a
								conformance claim: tagging is the mechanism PDF/UA-1 builds on,
								and conformance is a separate audit. What is claimed here is
								exactly what the file contains — and it is checked on every build,
								against a real export.
							</p>
						</div>

						<div>
							<h3 className="font-semibold text-[var(--brand-text)] text-lg">
								The design CV, labelled
							</h3>
							<p className="mt-2 text-[var(--brand-text-muted)] text-base">
								The design CV is a second PDF target: two columns, sidebar
								first, for the copy you hand to a person. It is not a template
								and not a layout setting.
							</p>
							<p className="mt-4 border-[var(--brand-accent)] border-l-2 pl-4 text-[var(--brand-text-muted)] text-sm">
								“{DESIGN_WARNING}”
							</p>
							<p className="mt-4 text-[var(--brand-text-muted)] text-base">
								PDF only. DOCX is refused rather than faked, because a
								two-column Word file would need a second layout engine. The
								design text layer is written in the page's visual reading order
								and says so in its first line.
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
