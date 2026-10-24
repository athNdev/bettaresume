/**
 * Marketing sections below the hero.
 *
 * ## What changed, and why
 *
 * The previous version was an argument about the category rather than a description of
 * this product: a full-width "No score / No invented numbers / No application tracker /
 * No auto-apply / No hidden keywords" section, a three-card essay on parser constraints,
 * a coverage essay, and an FAQ whose first three answers were also refusals. A visitor
 * could finish the page without learning that the app has a content library, variants or
 * version history.
 *
 * The order here answers the questions a visitor actually has, in the order they have
 * them: what does it do (Features), what does using it look like (Workflow), why is this
 * one different (Inspect), what will my document look like (Templates), what are the
 * boundaries (Principles), and the details (FAQ).
 *
 * ## Copy rules
 *
 * **Every claim must be a shipped code path.** Feature names map to modules:
 * `resume-editor.tsx`, `content.ts`, `resume.createVariation`, `maybeSnapshot`,
 * `lib/import/`, `lib/export/docx.ts`, `lib/analysis/parse-fidelity.ts`,
 * `lib/analysis/ats-match.ts`. `test/marketing-claims.test.ts` pins the specifics.
 *
 * **No outcome numbers.** Not an ATS score, not "3x more interviews". There is no
 * measurement behind either, and this category's credibility problem is exactly that.
 *
 * **No count that the product does not have.** The hero's three figures — 13 section
 * types, 4 export formats, 3 templates — are each checkable in the app in under a minute.
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
		body: "Summary, experience, education, skills, projects, certifications, awards, languages, publications, volunteer work, references, personal details, and a free-form section for anything else. Typed fields where the export has to stay clean; rich text where you actually need it.",
		detail: "Drag to reorder · hide without deleting",
	},
	{
		title: "A library you type once",
		body: "Save a section to your library and place it in as many resumes as you like. Change the master and every placement can follow; freeze one and it keeps what you wrote.",
		detail: "One master record · per-placement divergence",
	},
	{
		title: "Variants that follow the master",
		body: "Fork a resume for a specific role. Each section is either linked — it tracks the base — or detached, because you took it over. Editing a linked copy detaches it instead of quietly diverging.",
		detail: "Per-section linked / detached",
	},
	{
		title: "History recorded as you work",
		body: "Snapshots are captured automatically, at most once every five minutes, and you can save a named version whenever you want. Compare any version with what you have now, and restore it in one click.",
		detail: "Automatic + named versions · word-level diff",
	},
	{
		title: "Import what you already have",
		body: "PDF, Word, Markdown, plain text, or a JSON export of a resume built here. Extraction runs in your browser, then everything lands in a review screen before a single section is saved.",
		detail: "PDF · DOCX · Markdown · text · JSON",
	},
	{
		title: "Four ways out",
		body: "A PDF typeset with Typst, a DOCX written straight to WordprocessingML, a plain-text file of the exact layer a parser reads, and JSON of the whole document. They paginate differently, so they are labelled by what they are for.",
		detail: "PDF · DOCX · TXT · JSON",
	},
	{
		title: "A parser-fit review",
		body: "Checks your document against documented parser constraints: section headings against a parser dictionary, date formats, single-column reading order, and bullets that make a claim without evidence. Each finding names the setting to change.",
		detail: "Line-anchored findings, not a score",
	},
	{
		title: "Job-target matching",
		body: "Paste the description you are applying to. Required terms are weighted over preferred ones, both forms of an acronym are written, and an ambiguous mention is reported as uncertain instead of counted as covered.",
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
				 * Each item leads with a `text-lg` title, so the grid reads as eight
				 * anchored items rather than eight dense paragraphs — the audit's
				 * finding at 1440 was that nothing in this grid had visual priority.
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
 * 3. Workflow
 * -------------------------------------------------------------------------- */

const STEPS = [
	{
		title: "Build the master",
		body: "Put everything in: every role, every bullet, every qualification. The master is the record you keep, not the one-pager you send, so there is no pressure to cut it down.",
	},
	{
		title: "Fork it for the role",
		body: "Create a variant, choose which sections stay linked, and tailor the rest. Change a job title in the master later and the linked sections in every variant follow it.",
	},
	{
		title: "Check it, then send it",
		body: "Run the parser-fit review and the job-target match. Export a PDF, read its text layer, and know what arrives on the other side before you attach it.",
	},
] as const;

export function Workflow() {
	return (
		<section className="bg-[var(--brand-paper)]" id="workflow">
			<div className="marketing-shell py-16 lg:py-24">
				<div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
					<div>
						<h2 className="text-title">One record, many applications</h2>
						<p className="mt-4 text-[var(--brand-text-muted)] text-lede">
							The alternative is the thing everyone actually does: duplicate a
							file, rename it, and lose track of which version went where.
						</p>
					</div>

					<ol className="grid gap-8">
						{STEPS.map((step, index) => (
							<li className="flex gap-4" key={step.title}>
								<span
									aria-hidden="true"
									className="tnum mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-accent)]/10 font-mono font-semibold text-[var(--brand-accent)] text-xs"
								>
									{index + 1}
								</span>
								<div className="min-w-0">
									<h3 className="font-semibold text-[var(--brand-text)] text-lg">
										{step.title}
									</h3>
									<p className="mt-2 text-[var(--brand-text-muted)] text-base">
										{step.body}
									</p>
								</div>
							</li>
						))}
					</ol>
				</div>
			</div>
		</section>
	);
}

/* --------------------------------------------------------------------------
 * 4. Inspect — the differentiator, in one place
 * -------------------------------------------------------------------------- */

const CHECKS = [
	{
		title: "Headings a parser will recognise",
		body: 'Renaming "Work Experience" to "Where I have worked" reads better to a person and may lose the section to a parser. The review names the heading it actually renders and the dictionary entry it should match.',
	},
	{
		title: "Dates in a parseable format",
		body: "A slash-separated date is safe for a human and ambiguous for a parser. Findings quote the value and the accepted form, so the fix is a single edit rather than a research project.",
	},
	{
		title: "Bullets that assert without evidence",
		body: 'Every bullet is checked for a number and for duty language — "responsible for", "assisted with", "worked on". The finding points at the gap. It does not choose a number for you.',
	},
] as const;

export function Inspect() {
	return (
		<section className="rule-soft" id="inspect">
			<div className="marketing-shell py-16 lg:py-24">
				<div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
					<div>
						<h2 className="text-title">Read the file before they do</h2>
						<p className="mt-4 text-[var(--brand-text-muted)] text-lede">
							Most builders render your resume in a browser and then guess what
							a parser will extract. We typeset with Typst, which emits a single
							column in a fixed order — so the text layer is knowable, and you
							can read it yourself.
						</p>
						<p className="mt-4 max-w-(--marketing-measure) text-[var(--brand-text-muted)] text-base">
							That is also why the review is a list of named checks rather than
							a percentage. A number would be a verdict on software neither of
							us ran; a check is something you can act on and verify.
						</p>
					</div>

					<ul className="grid gap-4">
						{CHECKS.map((check) => (
							<li
								className="rounded-lg border border-[var(--brand-rule)] bg-[var(--brand-card)] p-6"
								key={check.title}
							>
								<h3 className="flex items-start gap-2 font-semibold text-[var(--brand-text)] text-lg">
									<svg
										aria-hidden="true"
										className="mt-1 h-4 w-4 shrink-0 text-[var(--brand-verified)]"
										fill="none"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2.4"
										viewBox="0 0 24 24"
									>
										<path d="M4 12.5 9.5 18 20 6.5" />
									</svg>
									{check.title}
								</h3>
								<p className="mt-2 pl-6 text-[var(--brand-text-muted)] text-base">
									{check.body}
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
 * 5. Templates
 * -------------------------------------------------------------------------- */

const TEMPLATES = [
	{
		id: "minimal",
		name: "Minimal",
		note: "The default. One column, generous leading, nothing between the reader and the content.",
		best: "Most applications",
		alt: "The Minimal template: right-aligned dates, small caps section headings, and a single column of experience, education and skills for Avery Chen.",
	},
	{
		id: "postgrad",
		name: "Postgrad",
		note: "Centred header, justified body, looser leading — the shape an academic CV is read in.",
		best: "Research and academic roles",
		alt: "The Postgrad template: a centred name and contact block above a justified academic CV for Avery Chen.",
	},
	{
		id: "undergrad",
		name: "Undergrad",
		note: "Compact, with a tinted header band and tighter spacing, for a document aiming at one page.",
		best: "First roles and internships",
		alt: "The Undergrad template: a tinted header band above a compact one-page resume for Avery Chen.",
	},
] as const satisfies ReadonlyArray<{
	id: keyof typeof TEMPLATE_CONFIGS;
	name: string;
	note: string;
	best: string;
	alt: string;
}>;

export function Templates() {
	return (
		<section className="bg-[var(--brand-paper)]" id="templates">
			<div className="marketing-shell py-16 lg:py-24">
				<div className="max-w-2xl">
					<h2 className="text-title">Three templates, all single-column</h2>
					<p className="mt-4 text-[var(--brand-text-muted)] text-lede">
						Typography, spacing and colours are yours to tune. The layout stays
						one column, because that is the part the text layer depends on.
					</p>
				</div>

				{/*
				 * Real pages, not mock-ups. Each file is compiled from `sections.typ` plus that
				 * template's own `.typ` by the same function the export button calls, and
				 * `test/template-gallery.test.ts` fails if they are stale. Typst outlines its
				 * glyphs, so these are self-contained and need no web font.
				 *
				 * The frame crops the specimen at 560 of the page's 842pt. The committed
				 * renders put their last ink at 445–480pt (measured on the real SVGs), so
				 * everything each template draws is visible with room to spare, and the
				 * ~360pt of blank paper that made these cards read as half-empty is gone —
				 * what is left below the content is a page that visibly continues, not a
				 * void. If `npm run templates:render` ever moves the ink past 560, the crop
				 * moves with it.
				 */}
				<div className="mt-12 grid gap-6 md:grid-cols-3">
					{TEMPLATES.map((template) => (
						<article
							className="flex flex-col overflow-hidden rounded-lg border border-[var(--brand-rule)] bg-[var(--brand-card)]"
							key={template.id}
						>
							<div className="border-[var(--brand-rule)] border-b bg-[var(--brand-paper)] p-3">
								<div className="aspect-[595/560] overflow-hidden rounded-sm border border-[var(--brand-rule)] bg-[var(--brand-card)] shadow-elev-1">
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
 * 6. Principles — one band, not a section per refusal
 * -------------------------------------------------------------------------- */

const PRINCIPLES = [
	{
		title: "No invented content",
		body: "Nothing here writes a claim you did not make: no generated bullets, no fabricated metric, no keyword stuffed into white text.",
	},
	{
		title: "No score",
		body: "Named checks instead of a number. A score would be a prediction about software that was never run.",
	},
	{
		title: "No tracker, no auto-apply",
		body: "This is a writing and management tool. It does not log into job boards or apply on your behalf.",
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
 * 7. FAQ
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
		q: "Where does my data go?",
		a: "Signing in is handled by Clerk and resumes are stored in a Cloudflare D1 database. There is no analytics script, no advertising tracker and no third-party tag on this site. Exports are generated in your browser.",
	},
	{
		q: "Can I get everything out?",
		a: "Yes — PDF, DOCX, plain text, or JSON of the whole document, at any time. Import accepts the same JSON, plus PDF, DOCX, Markdown and plain text.",
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
 * 8. Close
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
					Import a document, or start from an empty one. Your first variant is
					two clicks after that.
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
