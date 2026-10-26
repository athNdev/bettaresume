/**
 * The two sections that describe the product as a made thing: the tagged file, the
 * brand, and the design system behind both.
 *
 * They live together because they answer the same question — *how is this built?* — and
 * because they are the material that shipped after the previous home-page pass. The
 * page-fit numbers are a measurement of the document; these are the document's
 * structure and the identity wrapped around it.
 *
 * ## The copy rules still apply
 *
 * **Tagged PDF is stated as markers, not as a certification.** Typst 0.14 emits a
 * tagged PDF by default, and `scripts/probe/export.cjs` reads `/StructTreeRoot`,
 * `/MarkInfo` and `/Lang` back out of a real export. That is what the page says. It
 * deliberately does not say "accessible" or "compliant": those are legal terms with a
 * conformance audit behind them, not properties a landing page can grant.
 *
 * **The design CV is quoted, not paraphrased.** Its warning is copied verbatim from
 * `src/features/resume-editor/design-export/index.ts`, and
 * `test/marketing-claims.test.ts` imports that constant and asserts this page carries
 * it. Importing the module here would pull the export pipeline into the server bundle
 * for a sentence, so the page holds the string and the test holds the two together.
 *
 * **The brand is the components, not a text heading.** `BrandLockup` and `BrandMark`
 * are server components with no hooks, which is why the page keeps its zero-client-JS
 * property. The accent variant appears once on the page, in the hero; this band shows
 * the mono system at its sizes.
 *
 * Everything here renders on paper or a white card, using only the tokens
 * `test/marketing-contrast.test.ts` has classified for those backdrops.
 */

import { BrandLockup, BrandMark } from "@/components/brand";

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

const BRAND_FACTS = [
	{
		title: "A master and a variant",
		body: "The back sheet is the record; the front sheet is the copy. The mark is the product's thesis in one glyph: fork, don't retype.",
	},
	{
		title: "One solid path",
		body: "The text lines are knocked out with fill-rule evenodd, not drawn on top. It survives one colour, a 16px favicon and a photocopier.",
	},
	{
		title: "Two weights of Inter",
		body: "Betta at 700, Resume at 400, tracking −0.01em. The face is already self-hosted for the PDF pipeline, so the wordmark costs no extra request.",
	},
	{
		title: "One accent, as an event",
		body: "Monochrome is the default. The accent marks the primary action, selection and focus. It is never a status and never decoration.",
	},
] as const;

const BUILT_FACTS = [
	{
		title: "Designed to 360px",
		body: "Every surface is designed at 360px. Below 1024px the editor becomes one pane at a time — Sections, Form, Preview — and the form rows stack instead of crushing two date fields into a phone width.",
	},
	{
		title: "Generated, not drawn",
		body: "The mark, wordmark, lockups, app icon and three-size favicon come from one geometry definition and the self-hosted Inter files. There is no hand-drawn asset to drift.",
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
								exactly what the file contains — and{" "}
								<span className="font-mono text-[var(--brand-text)]">
									scripts/probe/export.cjs
								</span>{" "}
								reads the three markers back out of a real export.
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

/* --------------------------------------------------------------------------
 * 2. The brand and the system
 * -------------------------------------------------------------------------- */

export function Craft() {
	return (
		<section className="bg-[var(--brand-paper)]" id="craft">
			<div className="marketing-shell py-16 lg:py-24">
				<div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
					<div>
						<p className="font-semibold text-[var(--brand-accent)] text-xs uppercase tracking-[0.16em]">
							The brand
						</p>
						<h2 className="mt-4 text-title">Two sheets, one geometry.</h2>
						<p className="mt-4 text-[var(--brand-text-muted)] text-lede">
							The mark is a master record and a variant of it — the product's
							thesis in one glyph. It is drawn as one solid path with the text
							lines knocked out, so it survives one colour, a 16px favicon and a
							photocopier.
						</p>

						<div className="mt-8 rounded-lg border border-[var(--brand-rule)] bg-[var(--brand-card)] p-6">
							<div className="flex flex-wrap items-center gap-6 text-[var(--brand-text)]">
								<BrandLockup size="lg" />
								<div className="flex items-end gap-3">
									<BrandMark className="size-14" label={null} />
									<BrandMark className="size-7" label={null} />
									<BrandMark className="size-5" label={null} />
								</div>
							</div>
							<p className="mt-4 text-[var(--brand-text-faint)] text-xs">
								The large lockup, and the mark at 56, 28 and 20px. The mark is
								mono by default; its accent variant appears once, in the hero.
							</p>
						</div>
					</div>

					<ul className="grid content-start gap-4 sm:grid-cols-2">
						{BRAND_FACTS.map((fact) => (
							<li
								className="rounded-lg border border-[var(--brand-rule)] bg-[var(--brand-card)] p-4"
								key={fact.title}
							>
								<h3 className="font-semibold text-[var(--brand-text)] text-base">
									{fact.title}
								</h3>
								<p className="mt-2 text-[var(--brand-text-muted)] text-base">
									{fact.body}
								</p>
							</li>
						))}
					</ul>
				</div>

				<div className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
					<ul className="grid content-start gap-4 sm:grid-cols-2 lg:grid-cols-1">
						{BUILT_FACTS.map((fact) => (
							<li
								className="rounded-lg border border-[var(--brand-rule)] bg-[var(--brand-card)] p-4"
								key={fact.title}
							>
								<h3 className="font-semibold text-[var(--brand-text)] text-base">
									{fact.title}
								</h3>
								<p className="mt-2 text-[var(--brand-text-muted)] text-base">
									{fact.body}
								</p>
							</li>
						))}
					</ul>

					<a
						className="group flex flex-col justify-between rounded-lg border border-[var(--brand-control-border)] bg-[var(--brand-card)] p-6 transition-colors hover:bg-[var(--brand-paper)]"
						href="/design-system"
					>
						<div>
							<h3 className="font-semibold text-[var(--brand-text)] text-lg">
								See the design system
							</h3>
							<p className="mt-2 text-[var(--brand-text-muted)] text-base">
								Brand, colour, type, space, depth, motion, and every component
								in every state — built from the same tokens as this page.
							</p>
						</div>
						<span className="mt-6 inline-flex items-center gap-2 font-medium text-[var(--brand-accent)] text-base">
							Open the system
							<span
								aria-hidden="true"
								className="transition-transform group-hover:translate-x-0.5"
							>
								→
							</span>
						</span>
					</a>
				</div>
			</div>
		</section>
	);
}
