import { cn } from "@/lib/utils";

/**
 * Marketing sections below the hero.
 *
 * Structure follows trust order rather than feature excitement: the hero makes
 * the claim and shows the artefact, then each section buys the credibility of
 * the next. The spine is "don't take our word for it — take the parser's".
 *
 * Three rules govern every line of copy here.
 *
 * **No unsubstantiated numbers.** Not just no ATS score — no outcome claims of
 * any kind. "3x interviews", "62% interview rate" and the whole genre of CRO
 * folklore ("57% of time above the fold", "CTAs at every fold: +20–35%") are
 * performance claims nobody can reproduce, and several are fabrications
 * attributed to research that does not exist. The category's trust failure is
 * exactly this; doing it would be self-refuting.
 *
 * **Every feature claim here is checkable against the source.** The audit
 * section mirrors `src/lib/analysis/parse-fidelity.ts`, the coverage section
 * mirrors `ats-match.ts` and `skills.ts`, the proof section mirrors
 * `history-diff.ts` and the content library. `test/marketing-claims.test.ts`
 * asserts the specifics so copy cannot drift away from the product.
 *
 * **No colour claims on the page that are decorative.** `--brand-warm-decor`
 * measures 2:1 on paper and is named so that using it for type becomes an
 * undefined variable instead of a passing contrast check.
 */

/* --------------------------------------------------------------------------
 * 2. The audit
 * -------------------------------------------------------------------------- */

/**
 * Three real parser constraints, taken from `parse-fidelity.ts`. The examples
 * are the ones that module actually fires on: "Professional Summary" is a
 * `heading-alias` finding, and a slash-separated date is a `date-format-unsafe`
 * finding, both hardcoded in the shipped code.
 */
const CONSTRAINTS = [
	{
		heading: "Section headings are matched, not understood",
		what: "A parser matches your headings against a fixed dictionary. Anything outside it may be filed as unstructured text and lose its section.",
		example: "Professional Summary",
		verdict: "reads fine to a person, not in the dictionary",
		fix: 'Rename it to "Summary".',
		accepted:
			"Summary · Work Experience · Education · Skills · Certifications · Awards · Publications · Languages · Volunteer · References · Projects",
	},
	{
		heading: "Dates are parsed from the first one it reads",
		what: "The first date sets the expected pattern. One entry in a different format can then corrupt the rest of the timeline.",
		example: "03/2026",
		verdict: "safe for a human, ambiguous for a parser",
		fix: 'Use "March 2026" — or "Mar 2026". Both are in the accepted set.',
		accepted: "Accepted: March 2026 · Mar 2026. Flagged: 03/2026 · 2026",
	},
	{
		heading: "Reading order is decided by the renderer",
		what: "In a multi-column layout the order text comes out in is whatever the layout engine resolves — usually not the order you wrote it.",
		example: "Two columns",
		verdict: "your order becomes the renderer's guess",
		fix: "Export single-column. Our templates are single-column, so this cannot happen by accident.",
		accepted: "Every Typst template in this product is single-column.",
	},
];

export function Audit() {
	return (
		<section className="rule-soft" id="audit">
			<div className="marketing-shell py-18 lg:py-24">
				<div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
					<div>
						<h2 className="text-title">A constraint, not a score.</h2>
						<p className="mt-5 text-[var(--brand-text-muted)] text-lede">
							There is no number at the top of this panel, and there will not be
							one. A single figure would be a verdict on software neither you
							nor we have ever run. Instead you get every specific thing we can
							check, with the setting to change.
						</p>
						<p className="mt-5 max-w-prose text-[0.95rem] text-[var(--brand-text-muted)] leading-relaxed">
							When a check is clean it stays quiet. Telling you your resume is
							fine when it is not costs you the role; telling you it is broken
							when it is fine costs you ten seconds.
						</p>
					</div>

					<ol className="grid gap-4">
						{CONSTRAINTS.map((c, i) => (
							<li
								className="rounded-xl border border-[var(--brand-rule)] bg-white p-5"
								key={c.heading}
							>
								<div className="flex items-start gap-3">
									<span
										aria-hidden="true"
										className="tnum mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-accent)]/10 font-mono font-semibold text-[0.7rem] text-[var(--brand-accent)]"
									>
										{i + 1}
									</span>
									<div className="min-w-0">
										<h3 className="font-semibold text-[1.02rem] text-[var(--brand-text)] tracking-tight">
											{c.heading}
										</h3>
										<p className="mt-1.5 text-[0.92rem] text-[var(--brand-text-muted)] leading-relaxed">
											{c.what}
										</p>

										{/*
										 * The violation, stated as a before/after. This is the part
										 * a visitor can check against their own resume in ten seconds,
										 * which is the whole reason the section exists.
										 */}
										<div className="mt-3.5 grid gap-2 rounded-lg bg-[var(--brand-paper)] p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
											<code className="font-mono text-[0.72rem] text-[var(--brand-text-muted)] line-through decoration-[var(--brand-text-faint)]">
												{c.example}
											</code>
											<span
												aria-hidden="true"
												className="hidden text-[var(--brand-text-faint)] sm:block"
											>
												→
											</span>
											<code className="font-mono font-semibold text-[0.72rem] text-[var(--brand-verified)]">
												{c.fix}
											</code>
										</div>

										<p className="mt-2 text-[0.78rem] text-[var(--brand-text-faint)]">
											{c.verdict}
										</p>
										<p className="mt-1 font-mono text-[0.72rem] text-[var(--brand-text-muted)] leading-relaxed">
											{c.accepted}
										</p>
									</div>
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
 * 3. Policy — the section no competitor can write
 * -------------------------------------------------------------------------- */

/**
 * The roadmap's "Explicitly rejected" table, published. Every reason here is
 * the reason in `docs/ROADMAP.md`; none of it is invented for effect.
 */
const REFUSALS = [
	{
		title: "No hidden keywords",
		body: "White text on a white background, or 1px type, is how you beat a parser you cannot inspect. It is detectable, it is why one large competitor now has a patch on its reputation, and we will not ship it.",
	},
	{
		title: "No 0–100 ATS score",
		body: "A single number summarising software that was never run is a guess with a percentage sign on it. Ours is a list of named checks you can work through item by item.",
	},
	{
		title: "No invented metrics",
		body: "If a bullet makes a claim and carries no evidence, we point at the gap. We do not fill it in. You are the one signing your name to the document.",
	},
	{
		title: "No application tracker",
		body: "It is a CRM. It would drag this product toward job aggregation and auto-apply, and it is not what anyone opened this page for.",
	},
	{
		title: "No auto-apply",
		body: "Logging into an employer's system on your behalf is a scraping and authentication arms race against two of the largest companies in software. We would rather not enter it.",
	},
];

export function Policy() {
	return (
		<section className="bg-[var(--brand-ink)]" id="policy">
			<div className="marketing-shell py-18 lg:py-24">
				<div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
					<div>
						<h2 className="text-[var(--brand-text-on-ink)] text-title">
							No score. No invented numbers. Just the text.
						</h2>
						<p className="mt-5 text-[var(--brand-text-on-ink-muted)] text-lede">
							Most of what this category sells is a number. These are the five
							things we have decided not to build, and why.
						</p>
						<p className="mt-6 max-w-prose text-[0.95rem] text-[var(--brand-text-on-ink-faint)] leading-relaxed">
							Leaving something out is only a position if you are willing to be
							held to it. So this is a list you can hold us to.
						</p>
					</div>

					<ul className="grid gap-5">
						{REFUSALS.map((item) => (
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
 * 4. Coverage
 * -------------------------------------------------------------------------- */

/**
 * Real behaviour from `ats-match.ts`, `skills.ts` and `metrics.ts`. The 3:1
 * figure is `REQUIRED_WEIGHT`/`PREFERRED_WEIGHT`; the comment in that file says
 * the weight is "used only for ordering the report, never collapsed into a
 * total", which is why "required counts more" and "there is no score" are the
 * same claim here.
 */
const COVERAGE = [
	{
		title: "Required outranks preferred",
		body: 'The job description is read for "required", "must" and "must have" against "preferred" and "nice to have". Required terms are weighted three to one — and that weight orders the list of gaps. It is never added up into a total.',
		example: "required TypeScript · preferred GraphQL",
	},
	{
		title: "Both acronym forms, always",
		body: 'One large ATS vendor has been observed to match "AWS" but not "Amazon Web Services", and to drop "GCP" entirely. We write both forms of every acronym we find, because the inverse failure is just as real.',
		example: "AWS · Amazon Web Services",
	},
	{
		title: "AWS is not always Amazon",
		body: '"AWS" is also the American Welding Society, "Azure" is also a colour, and "Node" is also a graph node. A bare mention with no supporting context is reported as uncertain. It is never counted as covered — being told you can do something you cannot is worse than the reverse.',
		example: '"AWS certified welding" → welding, not cloud',
	},
	{
		title: "Bullets that claim without evidence",
		body: 'Every bullet is checked for a number, and for duty language — "responsible for", "assisted with", "worked on", "participated in". The finding says "add a number here". It does not choose one for you.',
		example: '"Responsible for migrating the database" → flagged',
	},
];

export function Coverage() {
	return (
		<section className="rule-soft" id="coverage">
			<div className="marketing-shell py-18 lg:py-24">
				<div className="max-w-2xl">
					<h2 className="text-title">Coverage, without a percentage</h2>
					<p className="mt-5 text-[var(--brand-text-muted)] text-lede">
						Matching a job description is mostly a question of reading it
						properly. These are the four judgement calls that decide whether a
						match report is worth anything.
					</p>
				</div>

				<div className="mt-12 grid gap-x-8 gap-y-10 md:grid-cols-2">
					{COVERAGE.map((c) => (
						<div className="group" key={c.title}>
							<h3 className="flex items-start gap-2.5 font-semibold text-[1.05rem] text-[var(--brand-text)] tracking-tight">
								<span
									aria-hidden="true"
									className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-accent)]"
								/>
								{c.title}
							</h3>
							<p className="mt-2.5 pl-6 text-[0.925rem] text-[var(--brand-text-muted)] leading-relaxed">
								{c.body}
							</p>
							<p className="mt-3 pl-6 font-mono text-[0.78rem] text-[var(--brand-text-faint)]">
								{c.example}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

/* --------------------------------------------------------------------------
 * 5. Proof — the parts with no equivalent elsewhere
 * -------------------------------------------------------------------------- */

const PROOF = [
	{
		title: "Every save is a version you can diff",
		body: "Edits are captured as snapshots and shown side by side, with each change marked as added, removed, edited or unchanged. Restore a version without reconstructing what you lost, and without guessing which of four near-identical files was the one you sent.",
		points: [
			"Word-level added / removed / edited / unchanged",
			"Restore any earlier version",
			"Identical snapshots are deduplicated, so the history stays readable",
		],
	},
	{
		title: "Variants that stay linked until you take one over",
		body: "Keep fifteen bullets per role in a library, then show three or four per variant. A section follows the master until you edit it yourself — then it freezes, and the difference is flagged rather than drifting silently underneath you.",
		points: [
			"Master library, per-role variants",
			"Linked until edited, then explicitly frozen",
			"Differences are surfaced, never applied behind your back",
		],
	},
];

const TEMPLATES: { name: string; note: string; density: Density }[] = [
	{ name: "Minimal", note: "One column, generous leading", density: "airy" },
	{
		name: "Postgrad",
		note: "Academic, publications-forward",
		density: "dense",
	},
	{ name: "Undergrad", note: "Compact, coursework-friendly", density: "mid" },
];

type Density = "airy" | "mid" | "dense";

export function Proof() {
	return (
		<section className="bg-[var(--brand-paper)]" id="proof">
			<div className="marketing-shell py-18 lg:py-24">
				<div className="max-w-2xl">
					<h2 className="text-title">
						One record. Every version correct in all of them.
					</h2>
					<p className="mt-5 text-[var(--brand-text-muted)] text-lede">
						Once the text a parser reads is right, the rest is about not
						breaking it again. These two are the parts with no real equivalent
						elsewhere.
					</p>
				</div>

				<div className="mt-14 grid gap-8 lg:grid-cols-2">
					{PROOF.map((p) => (
						<article
							className="rounded-xl border border-[var(--brand-rule)] bg-white p-6 lg:p-7"
							key={p.title}
						>
							<h3 className="font-semibold text-[1.15rem] text-[var(--brand-text)] tracking-tight">
								{p.title}
							</h3>
							<p className="mt-3 text-[0.95rem] text-[var(--brand-text-muted)] leading-relaxed">
								{p.body}
							</p>
							<ul className="mt-5 space-y-2 border-[var(--brand-rule)] border-t pt-5">
								{p.points.map((point) => (
									<li
										className="flex gap-2.5 text-[0.875rem] text-[var(--brand-text)] leading-relaxed"
										key={point}
									>
										<svg
											aria-hidden="true"
											className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--brand-verified)]"
											fill="none"
											stroke="currentColor"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2.4"
											viewBox="0 0 24 24"
										>
											<path d="M4 12.5 9.5 18 20 6.5" />
										</svg>
										{point}
									</li>
								))}
							</ul>
						</article>
					))}
				</div>

				{/*
				 * Templates stay, but honestly framed. Every competitor has
				 * templates; the honest differentiator is that ours are
				 * single-column and page breaks respect content, so what you see
				 * is what the text layer says. Not a section of its own, because
				 * it is not a differentiator on its own.
				 */}
				<div className="mt-16 border-[var(--brand-rule)] border-t pt-12">
					<div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
						<div className="max-w-xl">
							<h3 className="font-semibold text-[1.5rem] text-[var(--brand-text)] tracking-tight">
								Three templates, all single-column
							</h3>
							<p className="mt-3 text-[0.95rem] text-[var(--brand-text-muted)] leading-relaxed">
								Typography and spacing you can tune, with page breaks that
								respect your content instead of slicing a bullet in half.
							</p>
						</div>
						<p className="shrink-0 text-[0.85rem] text-[var(--brand-text-faint)]">
							More as they are finished.
						</p>
					</div>

					<div className="mt-10 grid gap-6 md:grid-cols-3">
						{TEMPLATES.map((t) => (
							<figure
								className="group overflow-hidden rounded-xl border border-[var(--brand-rule)] bg-white transition-all hover:-translate-y-1 hover:shadow-[var(--brand-ink)]/6 hover:shadow-lg"
								key={t.name}
							>
								<div className="flex h-64 justify-center overflow-hidden bg-[var(--brand-paper)] p-6">
									<TemplateThumb density={t.density} />
								</div>
								<figcaption className="border-[var(--brand-rule)] border-t px-5 py-4">
									<h4 className="font-semibold text-[var(--brand-text)] tracking-tight">
										{t.name}
									</h4>
									<p className="mt-0.5 text-[0.85rem] text-[var(--brand-text-muted)]">
										{t.note}
									</p>
								</figcaption>
							</figure>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

/** Schematic thumbnail — suggests a layout without pretending to be a screenshot. */
function TemplateThumb({ density }: { density: Density }) {
	const gap =
		density === "airy" ? "gap-4" : density === "mid" ? "gap-2.5" : "gap-1.5";
	const line =
		density === "dense" ? "h-[3px]" : density === "mid" ? "h-[4px]" : "h-[5px]";
	return (
		<div
			aria-hidden="true"
			className={cn(
				"flex w-full max-w-44 flex-col rounded-md bg-white p-4 shadow-md ring-1 ring-[var(--brand-rule)]",
				gap,
			)}
		>
			<div className="h-3 w-2/3 rounded-sm bg-[var(--brand-ink)]/80" />
			<div className="h-[3px] w-1/2 rounded-sm bg-[var(--brand-ink)]/25" />
			<div className="mt-1 h-[3px] w-full rounded-sm bg-[var(--brand-accent)]/60" />
			{[1, 1, 1].map((row) => (
				<div className="flex flex-col gap-1" key={row}>
					<div
						className={cn(line, "w-1/3 rounded-sm bg-[var(--brand-ink)]/45")}
					/>
					<div
						className={cn(line, "w-full rounded-sm bg-[var(--brand-ink)]/12")}
					/>
					<div
						className={cn(line, "w-11/12 rounded-sm bg-[var(--brand-ink)]/12")}
					/>
				</div>
			))}
		</div>
	);
}

/* --------------------------------------------------------------------------
 * 6. Export
 * -------------------------------------------------------------------------- */

/**
 * Four real exports. The first two are deliberately *not* described as
 * equivalent: DOCX and PDF paginate differently, so calling them two views of
 * one file would be a small lie that the user discovers when the page break
 * moves.
 */
const FORMATS = [
	{
		name: "PDF",
		label: "Visual fidelity",
		ext: ".pdf",
		body: "Typeset with Typst, single column, in a fixed reading order. This is the file you send, and the one whose text layer the audit checks.",
		verified: true,
	},
	{
		name: "DOCX",
		label: "Parse-optimised",
		ext: ".docx",
		body: "Written straight to WordprocessingML, so the order is explicit rather than inferred. Parses more consistently than PDF — and paginates differently, which is why it is labelled separately.",
		verified: false,
	},
	{
		name: "Plain text",
		label: "The text layer itself",
		ext: ".txt",
		body: "Exactly what the parser receives. Select it, paste it anywhere, read it top to bottom. If something is missing here, it is missing there too.",
		verified: true,
	},
	{
		name: "JSON",
		label: "Your data, unmapped",
		ext: ".json",
		body: "The whole document as structured data, so you are never locked in. Richer than the community JSON Resume format, and deliberately not contorted to fit it.",
		verified: false,
	},
];

export function Export() {
	return (
		<section className="rule-soft" id="export">
			<div className="marketing-shell py-18 lg:py-24">
				<div className="max-w-2xl">
					<h2 className="text-title">Four ways out, and they disagree</h2>
					<p className="mt-5 text-[var(--brand-text-muted)] text-lede">
						Nothing here is locked in. But the formats are not interchangeable,
						so they are labelled by what they are actually good for instead of
						by a word like "flexible".
					</p>
				</div>

				<dl className="mt-12 grid gap-6 sm:grid-cols-2">
					{FORMATS.map((f) => (
						<div
							className="rounded-xl border border-[var(--brand-rule)] bg-white p-6"
							key={f.name}
						>
							<div className="flex items-baseline justify-between gap-3">
								<dt className="flex items-baseline gap-2 font-semibold text-[1.1rem] text-[var(--brand-text)] tracking-tight">
									{f.name}
									<span className="font-mono font-normal text-[0.75rem] text-[var(--brand-text-faint)]">
										{f.ext}
									</span>
								</dt>
								{f.verified ? (
									<span className="shrink-0 rounded bg-[var(--brand-verified)]/10 px-1.5 py-0.5 font-semibold text-[0.62rem] text-[var(--brand-verified)] uppercase tracking-wide">
										Verified
									</span>
								) : null}
							</div>
							<dd>
								<p className="mt-1 font-medium text-[0.8rem] text-[var(--brand-accent)] uppercase tracking-wide">
									{f.label}
								</p>
								<p className="mt-2.5 text-[0.925rem] text-[var(--brand-text-muted)] leading-relaxed">
									{f.body}
								</p>
							</dd>
						</div>
					))}
				</dl>
			</div>
		</section>
	);
}

/* --------------------------------------------------------------------------
 * 7. Trust
 * -------------------------------------------------------------------------- */

/**
 * Deliberately short. The field study behind this (privacy notices measurably
 * *reduce* trust and engagement unless they are framed by a benevolence cue)
 * says a wall of policy text is worse than three honest sentences. GDPR is a
 * transparency duty, not a volume duty — so: what data, where, how to leave.
 *
 * Note what is absent. No "your data is never shared": that would be false.
 * Clerk and Cloudflare are both third-party processors, and an absolute claim
 * is the fastest way to lose a reader who has read a privacy policy before.
 */
export function Trust() {
	return (
		<section className="bg-[var(--brand-paper)]" id="trust">
			<div className="marketing-shell py-18 lg:py-24">
				<div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
					<div>
						<h2 className="text-title">Where your data goes</h2>
						<p className="mt-5 text-[var(--brand-text-muted)] text-lede">
							Three sentences rather than a policy page, because a wall of text
							is not the same thing as being told something.
						</p>
					</div>

					<div className="grid gap-5">
						<p className="max-w-prose text-[1rem] text-[var(--brand-text)] leading-relaxed">
							Signing in is handled by Clerk, and your resumes are stored in a
							Cloudflare D1 database. Those two companies process data on our
							behalf — that is the whole list.
						</p>
						<p className="max-w-prose text-[1rem] text-[var(--brand-text)] leading-relaxed">
							There is no analytics script, no advertising tracker and no
							third-party tag on this site, which is also why there is no cookie
							banner to dismiss. We could not tell you what we do not collect,
							because we do not collect it.
						</p>
						<p className="max-w-prose text-[1rem] text-[var(--brand-text)] leading-relaxed">
							Everything you write is exportable as JSON at any time, and
							deleting your account deletes the documents with it. There is no
							AI writing your resume, so there is nothing to disclose.
						</p>
						<p className="text-[0.85rem] text-[var(--brand-text-faint)]">
							This is a product that reads your career history. It has no
							business being curious about it.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}

/* --------------------------------------------------------------------------
 * 8. FAQ
 * -------------------------------------------------------------------------- */

const FAQ = [
	{
		q: "Will the PDF pass an ATS?",
		a: "We will not tell you that, because nobody can. What we can do is show you the text the PDF actually contains, in the order it appears, and name every parser constraint we can check — single-column reading order, headings against a parser's dictionary, dates in a parseable format. Read that and judge for yourself. That is the whole offer.",
	},
	{
		q: "Is this an AI resume generator?",
		a: "No, and that is a deliberate line rather than a missing feature. A generator writes your resume for you, which is the moment you stop owning it. This gives you the editor, the library, the variants, the diff and the diagnostics — and stops there. It will point out that a bullet claims something without evidence. It will not choose the number.",
	},
	{
		q: "Why is there no score?",
		a: "Because a score is a prediction about software that was never run, and a confident wrong number is worse than no number. You get a list of named checks instead: each one says what the constraint is, what in your resume triggered it, and which setting to change. You can check every line of it.",
	},
	{
		q: "What happens to my variants when I edit the master?",
		a: "Each section is either linked or detached. Linked sections pick up master edits. Detached ones are frozen, because you took that section over for a specific role. You decide per section, and you can see which is which.",
	},
	{
		q: "Can I get my data out?",
		a: "Yes — PDF, DOCX, plain text, or JSON, at any time, from any resume. JSON contains the whole document as structured data. Your resume should not require this app to remain readable.",
	},
	{
		q: "How much does it cost?",
		a: "There is no price and no checkout yet. Sign in and build — nothing on this page is gated behind a plan, because there is no plan to gate it behind.",
	},
];

export function Faq() {
	return (
		<section className="rule-soft" id="faq">
			<div className="marketing-shell py-18 lg:py-24">
				<div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
					<div>
						<h2 className="text-title">Questions</h2>
						<p className="mt-5 text-[var(--brand-text-muted)] text-lede">
							Including the one about the score.
						</p>
					</div>

					{/*
					 * Native <details> rather than an accordion widget: no client JS,
					 * works without hydration, and is keyboard/screen-reader correct
					 * for free.
					 */}
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
 * 9. Close
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
					Stop guessing what the software sees.
				</h2>
				<p className="mx-auto mt-6 text-[var(--brand-text-on-ink-muted)] text-lede">
					Build one accurate record, then read the text a parser gets out of it.
				</p>
				<div className="mt-10">
					<a
						className="group inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3.5 font-medium text-[var(--brand-ink)] transition-all hover:-translate-y-0.5 hover:shadow-xl"
						href="/app"
					>
						Check your own resume
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
