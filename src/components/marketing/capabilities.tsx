/**
 * The three sections that describe what shipped after the page was last written:
 * page fit, readability checks, and the worked example.
 *
 * They live here rather than in `sections.tsx` because each one is a *demonstration*
 * rather than a paragraph: the page-fit chip is rendered by `formatFitChip`, the
 * readability bands are read from `READABILITY_RULES`, and the example's facts come from
 * the seed that ships in `api/src/db/seed.sql`. A copy change cannot make any of those
 * disagree with the code, and `test/marketing-claims.test.ts` holds each one in place.
 *
 * Everything here is a server component: the page prerenders to static HTML and ships no
 * client JavaScript. The editorial rules from `sections.tsx` apply unchanged — every
 * sentence is a shipped code path, and there is no composite score anywhere.
 */

import { READABILITY_RULES } from "@/lib/analysis/rubric";
import {
	DENSITY_DESCRIPTIONS,
	DENSITY_LABELS,
	DENSITY_PRESETS_ORDER,
} from "@/lib/layout/density";
import {
	type FitReport,
	formatFitChip,
	mmToPt,
	ptToMm,
} from "@/lib/layout/page-fit";

/* --------------------------------------------------------------------------
 * 1. Page fit
 * -------------------------------------------------------------------------- */

/**
 * An example reading, rendered through the real formatter.
 *
 * The numbers are a specimen, not a measurement of anything on this page — the caption
 * says so. What is not a specimen is the *sentence*: it comes from `formatFitChip`, the
 * same function the editor toolbar calls, so the chip on the landing page and the chip in
 * the product cannot drift into two different formats.
 */
export const FIT_EXAMPLE: FitReport = {
	pages: 2,
	usableHeightPt: 754,
	target: 1,
	overPt: mmToPt(22),
	overMm: 22,
	pageEstimate: 1.2,
	lastPageFill: 0.31,
	lineChars: 94,
	overflow: {
		id: "marketing-fit-example",
		section: "Work Experience",
		label: "Northwind Systems · Senior Backend Engineer",
		page: 2,
		y: 43,
	},
	atFloor: false,
};

/** The exact string the editor's fit chip renders for this reading. */
export const FIT_EXAMPLE_CHIP = formatFitChip(FIT_EXAMPLE);

const FIT_FACTS = [
	{
		title: "A target, not a guess",
		body: "Set one page or two. Each archetype starts with a default — one for most, two for Executive, none for Academic — and your choice overrides it.",
	},
	{
		title: "The spill has a location",
		body: "The meter names the first entry on the page past the target, so the fix has somewhere to point instead of a page count to puzzle over.",
	},
	{
		title: "Every layout fix has a price",
		body: "Each lever is priced with a what-if compile: a density step or a smaller type scale says how many millimetres it buys. Measured, not extrapolated.",
	},
	{
		title: "A preset moves every gap",
		body: "Margins and leading are only half of it. The gap above a section, between entries, between bullets, between a meta line and its first bullet, and between the header and the body all belong to the preset. Compact is a different composition, not a smaller page.",
	},
	{
		title: "Content is never spent for you",
		body: "Layout rows apply behind a diff-confirm with one-click undo. Content rows have no Apply button: we will not hide a section or cut a bullet on your behalf.",
	},
] as const;

const BREAKS = [
	{
		title: "Keep entries together",
		body: "Auto keeps an entry whole only when it is small enough to move as a unit; always and never override that, per section or per entry.",
	},
	{
		title: "Keep the whole section on one page",
		body: "For a short section you do not want split across a page boundary.",
	},
	{
		title: "Start this section on a new page",
		body: "Typst's weak page break: it does nothing when the section is already at the top, so asking for a break cannot leave a blank page behind.",
	},
] as const;

export function PageFit() {
	return (
		<section className="rule-soft" id="page-fit">
			<div className="marketing-shell py-16 lg:py-24">
				<div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
					<div>
						<h2 className="text-title">Will it fit on one page?</h2>
						<p className="mt-4 text-[var(--brand-text-muted)] text-lede">
							Set a page target while you write. The editor measures the
							compiled document, names the entry where the spill starts, and
							prices every layout fix in millimetres — because a fraction of a
							page does not tell you what to change.
						</p>
						<p className="mt-4 max-w-(--marketing-measure) text-[var(--brand-text-muted)] text-base">
							When the layout is at its floor — a 10 pt body and 0.5 in margins
							— the meter says so. The remaining millimetres have to come from
							the content, and that decision stays yours.
						</p>
					</div>

					<div className="space-y-4">
						{/*
						 * The chip, at toolbar scale. This is the product's own string, not a
						 * transcription of it: `formatFitChip` is what the editor renders.
						 */}
						<div className="rounded-lg border border-[var(--brand-rule)] bg-[var(--brand-card)] p-6">
							<p className="font-semibold text-[var(--brand-text-faint)] text-xs uppercase tracking-wide">
								The fit chip
							</p>
							<div className="mt-3 flex flex-wrap items-center gap-3">
								<span className="inline-flex items-center gap-2 rounded-md border border-[var(--brand-rule)] bg-[var(--brand-paper)] px-3 py-2 font-medium text-[var(--brand-text)] text-sm">
									<span
										aria-hidden="true"
										className="h-2 w-2 rounded-full bg-[var(--brand-accent)]"
									/>
									<span className="tnum">{FIT_EXAMPLE_CHIP}</span>
								</span>
								<span className="text-[var(--brand-text-faint)] text-xs">
									An example reading, in the editor's own format
								</span>
							</div>
							<p className="mt-4 text-[var(--brand-text-muted)] text-base">
								Opening the chip names{" "}
								<span className="font-medium text-[var(--brand-text)]">
									{FIT_EXAMPLE.overflow?.label}
								</span>{" "}
								as where the overflow starts, then lists each layout lever with
								its measured gain in millimetres.
							</p>
						</div>

						<ul className="grid gap-4 sm:grid-cols-2">
							{FIT_FACTS.map((fact) => (
								<li
									className="rounded-lg border border-[var(--brand-rule)] bg-[var(--brand-card)] p-6"
									key={fact.title}
								>
									<h3 className="font-semibold text-[var(--brand-text)] text-lg">
										{fact.title}
									</h3>
									<p className="mt-2 text-[var(--brand-text-muted)] text-base">
										{fact.body}
									</p>
								</li>
							))}
						</ul>
					</div>
				</div>

				{/*
				 * The number this page is allowed to print: a measurement of the document.
				 *
				 * `test/fill-ratio.test.ts` compiles the seeded showcase at all three densities
				 * and asserts the default lands in 78–85 % of one page. The 83 % is the reading
				 * from that compile; the band is what the test enforces, so a template edit that
				 * moves it fails CI rather than leaving the sentence true only until someone
				 * looks. It is not an outcome claim — it is the height of ink on paper.
				 */}
				<div className="mt-12 rounded-lg border border-[var(--brand-rule)] bg-[var(--brand-card)] p-6">
					<div className="flex flex-wrap items-start justify-between gap-8">
						<div className="max-w-md">
							<p className="font-semibold text-[var(--brand-text-faint)] text-xs uppercase tracking-wide">
								Measured from the compiled PDF
							</p>
							<p className="tnum mt-3 font-semibold text-3xl text-[var(--brand-text)]">
								83% of one page
							</p>
							<p className="mt-2 text-[var(--brand-text-muted)] text-base">
								The seeded one-pager, compiled at the shipped default density,
								with seven visible sections and a one-page target. It fits, and
								it leaves room for another two lines before the page breaks.
							</p>
						</div>
						<dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
							<Metric label="Band a test enforces" value="78–85%" />
							<Metric label="Pages at every density" value="1" />
							<Metric label="Density presets" value="3" />
						</dl>
					</div>
					<p className="mt-6 border-[var(--brand-rule)] border-t pt-4 text-[var(--brand-text-faint)] text-xs">
						Every document is measured at Compact, Normal and Relaxed before it
						ships. The default has to land in 78–85% of one page, and every
						preset has to stay on one page. These are measurements of the
						document, not a prediction about a hiring outcome.
					</p>
				</div>

				<div className="mt-12 grid gap-6 lg:grid-cols-2">
					<div className="rounded-lg border border-[var(--brand-rule)] bg-[var(--brand-card)] p-6">
						<h3 className="font-semibold text-[var(--brand-text)] text-lg">
							Three densities, one click each
						</h3>
						<p className="mt-2 text-[var(--brand-text-muted)] text-base">
							The spacing knobs are a composition, not three separate decisions.
							Normal is exactly the shipped default, so choosing it moves no
							line.
						</p>
						<dl className="mt-4 grid gap-3">
							{DENSITY_PRESETS_ORDER.map((preset) => (
								<div key={preset}>
									<dt className="font-medium text-[var(--brand-text)] text-sm">
										{DENSITY_LABELS[preset]}
									</dt>
									<dd className="text-[var(--brand-text-muted)] text-base">
										{DENSITY_DESCRIPTIONS[preset]}
									</dd>
								</div>
							))}
						</dl>
					</div>

					<div className="rounded-lg border border-[var(--brand-rule)] bg-[var(--brand-card)] p-6">
						<h3 className="font-semibold text-[var(--brand-text)] text-lg">
							Page breaks with names, not guesses
						</h3>
						<p className="mt-2 text-[var(--brand-text-muted)] text-base">
							Word's vocabulary, stored on the section, honoured by the
							exporter.
						</p>
						<ul className="mt-4 grid gap-3">
							{BREAKS.map((item) => (
								<li key={item.title}>
									<p className="font-medium text-[var(--brand-text)] text-sm">
										{item.title}
									</p>
									<p className="text-[var(--brand-text-muted)] text-base">
										{item.body}
									</p>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</section>
	);
}

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="font-semibold text-[var(--brand-text-faint)] text-xs uppercase leading-tight tracking-wide">
				{label}
			</dt>
			<dd className="tnum mt-1 font-semibold text-[var(--brand-text)] text-lg">
				{value}
			</dd>
		</div>
	);
}

/* --------------------------------------------------------------------------
 * 2. Readability
 * -------------------------------------------------------------------------- */

/**
 * The five readability rows, with the app's own titles and the bands it checks.
 *
 * The bands are imported, not typed: raise `lineChars.max` in `rubric.ts` and this section
 * follows. The titles are pinned to `rubric.ts` by `test/marketing-claims.test.ts`, so a
 * rename fails there rather than leaving the page describing a check that no longer
 * exists.
 */
const READABILITY_CHECKS = [
	{
		id: "line-spacing",
		title: "Line spacing is in the readable range",
		band: `${READABILITY_RULES.lineHeight.min}–${READABILITY_RULES.lineHeight.max}`,
		body: "Printed lines tangle below the floor and read as coursework above the ceiling.",
	},
	{
		id: "line-length",
		title: "Lines are a readable length",
		band: `${READABILITY_RULES.lineChars.min}–${READABILITY_RULES.lineChars.max} characters`,
		body: "Measured on the compiled page, not guessed from the font size. A full line past the top of the band loses the eye on the return sweep.",
	},
	{
		id: "margins-printable",
		title: "Margins keep text printable",
		band: `${ptToMm(READABILITY_RULES.marginMinPt).toFixed(1)} mm or wider`,
		body: "Printers cannot lay ink within about 5 mm of the paper edge, so a margin below the floor can lose text on paper even when the PDF looks right.",
	},
	{
		id: "font-embedded",
		title: "The export uses the font you picked",
		band: "Embedded, or replaced by the same kind",
		body: "A family the engine cannot embed is replaced by a face of the same kind, and the check says so — the substitution is visible rather than silent.",
	},
	{
		id: "last-page-fill",
		title: "The last page is substantial",
		band: `${READABILITY_RULES.lastPageFillMin} of a page or more`,
		body: "A final page with a few lines reads as an accident. The check says how much of the page is used and what to do about it.",
	},
] as const;

export function Readability() {
	return (
		<section className="bg-[var(--brand-paper)]" id="readability">
			<div className="marketing-shell py-16 lg:py-24">
				<div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
					<div>
						<h2 className="text-title">Named checks, not a score</h2>
						<p className="mt-4 text-[var(--brand-text-muted)] text-lede">
							The review reads the compiled document and reports a list of rows.
							Each one passes, fails or advises, and says what to change.
						</p>
						<div className="mt-6 rounded-lg border border-[var(--brand-rule)] border-l-2 border-l-[var(--brand-accent)] bg-[var(--brand-card)] p-4">
							<p className="font-semibold text-[var(--brand-text)] text-lg">
								No 0–100 score
							</p>
							<p className="mt-2 max-w-(--marketing-measure) text-[var(--brand-text-muted)] text-base">
								A score would be a verdict on software neither of us ran. Two
								checkers can read the same document differently; a number hides
								that behind a decimal. A named check is something you can act on
								and verify.
							</p>
						</div>
					</div>

					<ul className="grid gap-3">
						{READABILITY_CHECKS.map((check) => (
							<li
								className="rounded-lg border border-[var(--brand-rule)] bg-[var(--brand-card)] p-4"
								key={check.id}
							>
								<div className="flex flex-wrap items-baseline justify-between gap-2">
									<h3 className="font-semibold text-[var(--brand-text)] text-base">
										{check.title}
									</h3>
									<span className="tnum font-mono text-[var(--brand-text-faint)] text-xs">
										{check.band}
									</span>
								</div>
								<p className="mt-2 text-[var(--brand-text-muted)] text-base">
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
