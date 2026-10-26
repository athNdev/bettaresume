/**
 * Marketing sections below the hero: what the product does, the archetypes, the
 * boundary, the FAQ, and the close.
 *
 * ## What changed, and why
 *
 * This page used to describe a product with three templates, no page-fit suite and no
 * readability review. Those shipped, so the copy is now a description of the app as it
 * exists. The order still answers the questions a visitor actually has, in the order they
 * have them: what does it do (Features), what will my document look like (Templates), how
 * does it fit (Page fit, in `capabilities.tsx`), is the review trustworthy (Readability,
 * there too), what does a finished document look like (Example), what are the boundaries
 * (Principles), and the details (FAQ).
 *
 * ## Copy rules
 *
 * **Every claim must be a shipped code path.** Feature names map to modules:
 * `resume-editor.tsx`, `content.ts`, `resume.createVariation`, `maybeSnapshot`,
 * `lib/import/`, `lib/rich-text.ts`, `lib/export/docx.ts`, `lib/export/text.ts`,
 * `lib/analysis/parse-fidelity.ts` and `lib/analysis/ats-match.ts`.
 * `test/marketing-claims.test.ts` pins the specifics.
 *
 * **No outcome numbers.** Not an ATS score, not "3x more interviews". There is no
 * measurement behind either, and this category's credibility problem is exactly that.
 *
 * **No count the product does not have.** Thirteen section types, four export formats and
 * the template count (derived from the registry) are each checkable in the app.
 *
 * ## Rhythm
 *
 * Section padding is `py-16 lg:py-24` (the 64/96 steps) everywhere; headline → lede is
 * 16px, title → body is 8px, body → meta is 8px. Item titles are `text-lg`, body is the
 * one `text-base` step, meta is `text-xs` — the audit's four body sizes inside 0.8px of
 * each other collapsed to one (`docs/design-system/README.md` §3.1–3.2).
 */

import { TEMPLATE_CONFIGS } from "@/features/resume-editor/types";

/* --------------------------------------------------------------------------
 * 2. Features
 * -------------------------------------------------------------------------- */

const FEATURES = [
	{
		title: "One editor, thirteen section types",
		body: "Personal details, summary, experience, education, skills, projects, certifications, awards, languages, publications, volunteer work, references, and a free-form section for anything else. Typed fields where the export has to stay clean; rich text where you actually need it.",
		detail: "Drag to reorder · hide without deleting",
	},
	{
		title: "A library you type once",
		body: "Save a section to your library and place it in as many resumes as you like. Change the master and every placement can follow; edit a placement and it keeps what you wrote. The panel reports where a placement has diverged.",
		detail: "One master · per-placement divergence",
	},
	{
		title: "Variants that follow the master",
		body: "Fork a resume for a specific role. Each section is either linked — it tracks the base — or detached, because you took it over. Editing a linked copy detaches it instead of quietly diverging.",
		detail: "Per-section linked / detached",
	},
	{
		title: "History recorded as you work",
		body: "Snapshots are captured automatically, at most once every five minutes, and you can name a version whenever you want. Compare a version with what you have now, and restore it in one click.",
		detail: "Automatic + named versions · field-level diff",
	},
	{
		title: "Rich text that reaches the file",
		body: "Bold, italic, underline, strikethrough and links are stored as structure, not flattened to plain text. The PDF and the DOCX carry the formatting; the plain-text export carries the words and spells a link's target out as text [url].",
		detail: "Bold · italic · underline · strike · links",
	},
	{
		title: "Import what you already have",
		body: "PDF, Word, Markdown, plain text, or a JSON export of a resume built here. Extraction runs in your browser, then everything lands in a review screen before a single section is saved.",
		detail: "PDF · DOCX · Markdown · text · JSON",
	},
	{
		title: "Four ways out",
		body: "A PDF typeset with Typst, a DOCX written straight to WordprocessingML, a plain-text file of the exact layer a parser reads, and JSON of the whole document. Each is labelled by what it is for, because they do different jobs.",
		detail: "PDF · DOCX · TXT · JSON",
	},
	{
		title: "A design CV, labelled",
		body: "A second PDF target for the copy you hand to a person: two columns, sidebar first, a plain-text layer in the page's visual reading order. It is not a template and not a layout setting, the menu says it is not parser-safe, and DOCX is refused rather than faked.",
		detail: "PDF only · permanent warning · visual reading order",
	},
	{
		title: "A parser-fit review",
		body: "Checks the document against documented parser constraints: section headings against a parser dictionary, date formats, single-column reading order, and bullets that make a claim without evidence. Each finding names the setting to change. It does not choose a number for you.",
		detail: "Line-anchored findings, not a score",
	},
	{
		title: "Job-target matching",
		body: "Paste the description you are applying to. Required terms are weighted over preferred ones, both forms of an acronym are called out, and an ambiguous mention is reported as uncertain instead of counted as covered.",
		detail: "Required vs preferred · acronyms · ambiguity",
	},
] as const;

export function Features() {
	return (
		<section className="rule-soft" id="features">
			<div className="marketing-shell py-16 lg:py-24">
				<div className="max-w-2xl">
					<h2 className="text-title">
						Everything between the blank page and the file
					</h2>
					<p className="mt-4 text-[var(--brand-text-muted)] text-lede">
						A resume builder that keeps your history as a record, not a single
						document you are afraid to edit.
					</p>
				</div>

				{/*
				 * Each item leads with a `text-lg` title, so the grid reads as anchored
				 * items rather than dense paragraphs — the audit's finding at 1440 was
				 * that nothing in this grid had visual priority.
				 */}
				<div className="mt-12 grid gap-x-8 gap-y-8 md:grid-cols-2">
					{FEATURES.map((feature) => (
						<article key={feature.title}>
							<h3 className="font-semibold text-[var(--brand-text)] text-lg">
								{feature.title}
							</h3>
							<p className="mt-2 text-[var(--brand-text-muted)] text-base">
								{feature.body}
							</p>
							<p className="mt-2 font-mono text-[var(--brand-text-faint)] text-xs">
								{feature.detail}
							</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

/* --------------------------------------------------------------------------
 * 3. Templates
 * -------------------------------------------------------------------------- */

const TEMPLATES = [
	{
		id: "standard",
		name: "Standard",
		note: "Left-aligned header, dates in their own column, sections in the order you set. The reference layout, at the default density.",
		best: "Most applications",
		alt: "The Standard template: a left-aligned name and contact block above dated experience, education and skills for Avery Chen.",
	},
	{
		id: "compact",
		name: "Compact",
		note: "The Standard layout at the tight end of the spacing scale: 0.5 in margins, 1.22 leading, compact section gaps.",
		best: "One page with a lot to say",
		alt: "The Compact template: the standard layout with tighter section gaps and narrower margins for Avery Chen.",
	},
	{
		id: "technical",
		name: "Technical",
		note: "Skills become scannable category lines such as \u201cLanguages: Go, TypeScript\u201d; projects show their stack and bullets.",
		best: "Software, data and engineering roles",
		alt: "The Technical template: a name and role on one line, skills as category-to-items lines, and project entries for Avery Chen.",
	},
	{
		id: "graduate",
		name: "Graduate",
		note: "Education carries GPA, coursework and honours; projects show the bullets that were already in the document.",
		best: "Students and new graduates",
		alt: "The Graduate template: a plain header above an education entry listing coursework and honours for Avery Chen.",
	},
	{
		id: "academic",
		name: "Academic CV",
		note: "Centred header, justified body, 1 in margins, and publications numbered so a reviewer can cite them.",
		best: "Research, postdoc and faculty",
		alt: "The Academic CV template: a centred name and contact block above a justified academic document for Avery Chen.",
	},
	{
		id: "executive",
		name: "Executive",
		note: "A 20 pt name, expertise collapsed to one line, and more air around each selected role.",
		best: "Directors, VPs and C-level",
		alt: "The Executive template: a large name and role block above a spacious summary and selected roles for Avery Chen.",
	},
] as const satisfies ReadonlyArray<{
	id: keyof typeof TEMPLATE_CONFIGS;
	name: string;
	note: string;
	best: string;
	alt: string;
}>;

/**
 * The heading's count is derived, not typed.
 *
 * "Six templates" is the kind of sentence that stays true until somebody adds an
 * archetype, and then quietly stops being true. `test/marketing-claims.test.ts` checks the
 * heading against the registry, so the only way to change the count is to change it in
 * both places.
 */
const TEMPLATE_COUNT = Object.keys(TEMPLATE_CONFIGS).length;
const COUNT_WORDS = [
	"Zero",
	"One",
	"Two",
	"Three",
	"Four",
	"Five",
	"Six",
	"Seven",
	"Eight",
	"Nine",
	"Ten",
];

export function Templates() {
	return (
		<section className="bg-[var(--brand-paper)]" id="templates">
			<div className="marketing-shell py-16 lg:py-24">
				<div className="max-w-2xl">
					<h2 className="text-title">
						{COUNT_WORDS[TEMPLATE_COUNT] ?? TEMPLATE_COUNT} templates, all
						single-column
					</h2>
					<p className="mt-4 text-[var(--brand-text-muted)] text-lede">
						{COUNT_WORDS[TEMPLATE_COUNT] ?? TEMPLATE_COUNT} archetypes,
						differentiated by structure and density: where the header sits, what
						an entry renders, how much air the body gets. No archetype carries
						its own colour — headings are text ink, and emphasis is weight, case
						and one rule.
					</p>
					<p className="mt-4 max-w-(--marketing-measure) text-[var(--brand-text-muted)] text-base">
						The layout stays one column in every archetype, because that is the
						part the text layer depends on. Each specimen below is a real first
						page compiled by the same pipeline the export button runs — not a
						drawing.
					</p>
				</div>

				{/*
				 * Real pages, not mock-ups. Each file is compiled from `sections.typ` plus that
				 * template's own `.typ` by the same function the export button calls, and
				 * `test/template-gallery.test.ts` fails if they are stale. Typst outlines its
				 * glyphs, so these are self-contained and need no web font.
				 *
				 * The frame crops the specimen at 600 of the page's 842pt. The six committed
				 * renders put their last ink at 450–556pt, so everything each archetype draws
				 * is visible with room to spare, and the ~300pt of blank paper that made these
				 * cards read as half-empty is gone.
				 */}
				<div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{TEMPLATES.map((template) => (
						<article
							className="flex flex-col overflow-hidden rounded-lg border border-[var(--brand-rule)] bg-[var(--brand-card)]"
							key={template.id}
						>
							<div className="border-[var(--brand-rule)] border-b bg-[var(--brand-paper)] p-3">
								<div className="aspect-[595/600] overflow-hidden rounded-sm border border-[var(--brand-rule)] bg-[var(--brand-card)] shadow-elev-1">
									{/*
									 * A plain `<img>`, deliberately. `next/image` cannot optimise in a static
									 * export (`images.unoptimized` is on), and these are already-small SVG
									 * files with outlined glyphs — there is nothing left to compress. It also
									 * keeps the marketing page free of any client component.
									 */}
									{/* biome-ignore lint/performance/noImgElement: static SVG, nothing to optimise */}
									<img
										alt={template.alt}
										className="block w-full"
										height={842}
										loading="lazy"
										// From the registry, so a renamed or removed template breaks the build
										// here rather than silently leaving a broken image.
										src={TEMPLATE_CONFIGS[template.id].thumbnail}
										width={595}
									/>
								</div>
							</div>
							<div className="flex flex-1 flex-col p-6">
								<h3 className="font-semibold text-[var(--brand-text)] text-lg">
									{template.name}
								</h3>
								<p className="mt-2 flex-1 text-[var(--brand-text-muted)] text-base">
									{template.note}
								</p>
								<p className="mt-4 border-[var(--brand-rule)] border-t pt-3 text-[var(--brand-text-faint)] text-xs uppercase tracking-wide">
									{template.best}
								</p>
							</div>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

/* --------------------------------------------------------------------------
 * 4. Principles — one band, not a section per refusal
 * -------------------------------------------------------------------------- */

const PRINCIPLES = [
	{
		title: "No invented content",
		body: "Nothing here writes a claim you did not make: no generated bullets, no fabricated metric, no keyword stuffed into white text. The review detects a gap and points at it.",
	},
	{
		title: "No score",
		body: "Named checks instead of a number, in the review and the fit meter. A score would be a prediction about software that was never run.",
	},
	{
		title: "No tracker, no auto-apply",
		body: "This is a writing and management tool. It does not log into job boards, follow your applications or apply on your behalf.",
	},
] as const;

export function Principles() {
	return (
		<section className="bg-[var(--brand-ink)]" id="principles">
			<div className="marketing-shell py-16 lg:py-24">
				<div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
					<div>
						<h2 className="text-[var(--brand-text-on-ink)] text-title">
							Where the line is
						</h2>
						<p className="mt-4 text-[var(--brand-text-on-ink-muted)] text-lede">
							Three things this product deliberately does not do, in one short
							list rather than scattered through the page.
						</p>
					</div>

					<ul className="grid gap-6">
						{PRINCIPLES.map((item) => (
							<li
								className="border-[var(--brand-accent-on-ink)] border-l-2 pl-4"
								key={item.title}
							>
								<h3 className="font-semibold text-[var(--brand-text-on-ink)] text-lg">
									{item.title}
								</h3>
								<p className="mt-2 text-[var(--brand-text-on-ink-muted)] text-base">
									{item.body}
								</p>
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
}

/* --------------------------------------------------------------------------
 * 5. FAQ
 * -------------------------------------------------------------------------- */

const FAQ = [
	{
		q: "How much does it cost?",
		a: "Nothing. There is no checkout, no trial and no plan gating a feature. Sign in and use it.",
	},
	{
		q: "Will the PDF pass an ATS?",
		a: "Nobody can promise that, and a product that does is guessing. What this gives you is the text the PDF actually contains, in the order it appears, plus a list of documented parser constraints you can check against it.",
	},
	{
		q: "Why is there no score?",
		a: "Because a score would be a verdict on software neither of us ran. Checkers read the same document differently, and a number hides that difference behind a decimal. The review reports named rows with a verdict and a fix instead.",
	},
	{
		q: "Where does my data go?",
		a: "Signing in is handled by Clerk and resumes are stored in a Cloudflare D1 database. There is no analytics script, no advertising tracker and no third-party tag on this site. Exports are generated in your browser.",
	},
	{
		q: "Can I get everything out?",
		a: "Yes — PDF, DOCX, plain text, or JSON of the whole document, at any time. Import accepts the same JSON, plus PDF, DOCX, Markdown and plain text. The design CV is a second PDF target, not a fifth format.",
	},
	{
		q: "Is the PDF tagged?",
		a: "Yes. Typst 0.14 emits a tagged PDF: the file carries a structure tree, a marked-content dictionary and a document language. That is what makes the text a structure rather than positioned glyphs. It is not a conformance claim; tagging is the mechanism PDF/UA-1 builds on, and conformance is a separate audit.",
	},
	{
		q: "What is the design CV?",
		a: "A two-column PDF for a person, not a parser. It is a separate export target with a permanent warning in the menu and again in the confirmation. The standard export stays single-column and parser-safe; DOCX is not offered for the design CV at all.",
	},
	{
		q: "Is this an AI resume generator?",
		a: "No. It gives you the editor, the library, the variants, the history and the checks, and stops there. It will point out that a bullet asserts something without evidence. It will not choose the number.",
	},
] as const;

export function Faq() {
	return (
		<section className="rule-soft" id="faq">
			<div className="marketing-shell py-16 lg:py-24">
				<div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
					<div>
						<h2 className="text-title">Questions</h2>
						<p className="mt-4 text-[var(--brand-text-muted)] text-lede">
							Short answers, including the one about the score.
						</p>
					</div>

					<div className="divide-y divide-[var(--brand-rule)] border-[var(--brand-rule)] border-y">
						{FAQ.map((item) => (
							<details className="group py-4" key={item.q}>
								<summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-medium text-[var(--brand-text)] marker:content-none">
									{item.q}
									<span
										aria-hidden="true"
										className="mt-1 shrink-0 text-[var(--brand-accent)] transition-transform group-open:rotate-45"
									>
										+
									</span>
								</summary>
								<p className="mt-2 max-w-(--marketing-measure) text-[var(--brand-text-muted)] text-base">
									{item.a}
								</p>
							</details>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

/* --------------------------------------------------------------------------
 * 6. Close
 * -------------------------------------------------------------------------- */

export function ClosingCta() {
	return (
		<section className="relative overflow-hidden bg-[var(--brand-ink)]">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(38rem_20rem_at_50%_120%,color-mix(in_oklch,var(--brand-accent-on-ink)_22%,transparent),transparent)]"
			/>
			<div className="marketing-shell relative py-16 text-center lg:py-24">
				<h2 className="mx-auto max-w-3xl text-[var(--brand-text-on-ink)] text-title">
					Start with the history you already have.
				</h2>
				<p className="mx-auto mt-6 text-[var(--brand-text-on-ink-muted)] text-lede">
					Import a document, or start from an empty one. Set a page target, pick
					a density, and inspect the text layer before you send it.
				</p>
				<div className="mt-8">
					<a
						className="group inline-flex items-center gap-2 rounded-lg bg-[var(--brand-card)] px-6 py-3 font-medium text-[var(--brand-ink)] transition-[box-shadow,transform] duration-(--br-duration-fast) ease-enter hover:-translate-y-0.5 hover:shadow-elev-1"
						href="/app"
					>
						Open the editor
						<span
							aria-hidden="true"
							className="transition-transform group-hover:translate-x-0.5"
						>
							→
						</span>
					</a>
				</div>
			</div>
		</section>
	);
}
