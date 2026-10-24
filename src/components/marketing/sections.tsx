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
 */

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
			<div className="marketing-shell py-18 lg:py-24">
				<div className="max-w-2xl">
					<h2 className="text-title">
						Everything between the blank page and the file
					</h2>
					<p className="mt-5 text-[var(--brand-text-muted)] text-lede">
						A resume builder that keeps your history as a record, not a single
						document you are afraid to edit.
					</p>
				</div>

				<div className="mt-12 grid gap-x-10 gap-y-9 md:grid-cols-2">
					{FEATURES.map((feature) => (
						<article key={feature.title}>
							<h3 className="font-semibold text-[1.05rem] text-[var(--brand-text)] tracking-tight">
								{feature.title}
							</h3>
							<p className="mt-2 text-[0.925rem] text-[var(--brand-text-muted)] leading-relaxed">
								{feature.body}
							</p>
							<p className="mt-2.5 font-mono text-[0.74rem] text-[var(--brand-text-faint)]">
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
			<div className="marketing-shell py-18 lg:py-24">
				<div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
					<div>
						<h2 className="text-title">One record, many applications</h2>
						<p className="mt-5 text-[var(--brand-text-muted)] text-lede">
							The alternative is the thing everyone actually does: duplicate a
							file, rename it, and lose track of which version went where.
						</p>
					</div>

					<ol className="grid gap-8">
						{STEPS.map((step, index) => (
							<li className="flex gap-4" key={step.title}>
								<span
									aria-hidden="true"
									className="tnum mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-accent)]/10 font-mono font-semibold text-[0.72rem] text-[var(--brand-accent)]"
								>
									{index + 1}
								</span>
								<div className="min-w-0">
									<h3 className="font-semibold text-[1.05rem] text-[var(--brand-text)] tracking-tight">
										{step.title}
									</h3>
									<p className="mt-1.5 text-[0.925rem] text-[var(--brand-text-muted)] leading-relaxed">
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
			<div className="marketing-shell py-18 lg:py-24">
				<div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
					<div>
						<h2 className="text-title">Read the file before they do</h2>
						<p className="mt-5 text-[var(--brand-text-muted)] text-lede">
							Most builders render your resume in a browser and then guess what
							a parser will extract. We typeset with Typst, which emits a single
							column in a fixed order — so the text layer is knowable, and you
							can read it yourself.
						</p>
						<p className="mt-5 max-w-prose text-[0.95rem] text-[var(--brand-text-muted)] leading-relaxed">
							That is also why the review is a list of named checks rather than
							a percentage. A number would be a verdict on software neither of
							us ran; a check is something you can act on and verify.
						</p>
					</div>

					<ul className="grid gap-4">
						{CHECKS.map((check) => (
							<li
								className="rounded-xl border border-[var(--brand-rule)] bg-white p-5"
								key={check.title}
							>
								<h3 className="flex items-start gap-2.5 font-semibold text-[1.02rem] text-[var(--brand-text)] tracking-tight">
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
								<p className="mt-1.5 pl-6.5 text-[0.92rem] text-[var(--brand-text-muted)] leading-relaxed">
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
		name: "Minimal",
		note: "The default. One column, generous leading, nothing between the reader and the content.",
		best: "Most applications",
	},
	{
		name: "Postgrad",
		note: "Centred header, justified body, looser leading — the shape an academic CV is read in.",
		best: "Research and academic roles",
	},
	{
		name: "Undergrad",
		note: "Compact, with a tinted header band and tighter spacing, for a document aiming at one page.",
		best: "First roles and internships",
	},
] as const;

export function Templates() {
	return (
		<section className="bg-[var(--brand-paper)]" id="templates">
			<div className="marketing-shell py-18 lg:py-24">
				<div className="max-w-2xl">
					<h2 className="text-title">Three templates, all single-column</h2>
					<p className="mt-5 text-[var(--brand-text-muted)] text-lede">
						Typography, spacing and colours are yours to tune. The layout stays
						one column, because that is the part the text layer depends on.
					</p>
				</div>

				<div className="mt-12 grid gap-6 md:grid-cols-3">
					{TEMPLATES.map((template) => (
						<article
							className="flex flex-col rounded-xl border border-[var(--brand-rule)] bg-white p-6"
							key={template.name}
						>
							<h3 className="font-semibold text-[1.1rem] text-[var(--brand-text)] tracking-tight">
								{template.name}
							</h3>
							<p className="mt-2.5 flex-1 text-[0.92rem] text-[var(--brand-text-muted)] leading-relaxed">
								{template.note}
							</p>
							<p className="mt-4 border-[var(--brand-rule)] border-t pt-3 text-[0.78rem] text-[var(--brand-text-faint)] uppercase tracking-wide">
								{template.best}
							</p>
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
			<div className="marketing-shell py-18 lg:py-24">
				<div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
					<div>
						<h2 className="text-[var(--brand-text-on-ink)] text-title">
							Where the line is
						</h2>
						<p className="mt-5 text-[var(--brand-text-on-ink-muted)] text-lede">
							Three things this product deliberately does not do, in one short
							list rather than scattered through the page.
						</p>
					</div>

					<ul className="grid gap-6">
						{PRINCIPLES.map((item) => (
							<li
								className="border-[var(--brand-accent-on-ink)] border-l-2 pl-5"
								key={item.title}
							>
								<h3 className="font-semibold text-[1.02rem] text-[var(--brand-text-on-ink)] tracking-tight">
									{item.title}
								</h3>
								<p className="mt-1.5 text-[0.92rem] text-[var(--brand-text-on-ink-muted)] leading-relaxed">
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
			<div className="marketing-shell py-18 lg:py-24">
				<div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
					<div>
						<h2 className="text-title">Questions</h2>
						<p className="mt-5 text-[var(--brand-text-muted)] text-lede">
							Short answers, including the one about the score.
						</p>
					</div>

					<div className="divide-y divide-[var(--brand-rule)] border-[var(--brand-rule)] border-y">
						{FAQ.map((item) => (
							<details className="group py-5" key={item.q}>
								<summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-medium text-[var(--brand-text)] marker:content-none">
									{item.q}
									<span
										aria-hidden="true"
										className="mt-1 shrink-0 text-[var(--brand-accent)] transition-transform group-open:rotate-45"
									>
										+
									</span>
								</summary>
								<p className="mt-3 max-w-prose text-[0.925rem] text-[var(--brand-text-muted)] leading-relaxed">
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
			<div className="marketing-shell relative py-18 text-center lg:py-24">
				<h2 className="mx-auto max-w-3xl text-[var(--brand-text-on-ink)] text-title">
					Start with the history you already have.
				</h2>
				<p className="mx-auto mt-6 text-[var(--brand-text-on-ink-muted)] text-lede">
					Import a document, or start from an empty one. Your first variant is
					two clicks after that.
				</p>
				<div className="mt-10">
					<a
						className="group inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3.5 font-medium text-[var(--brand-ink)] transition-[box-shadow,transform] duration-200 ease-enter hover:-translate-y-0.5 hover:shadow-xl"
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
