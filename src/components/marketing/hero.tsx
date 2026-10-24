/**
 * Hero: what the product is, in one screen.
 *
 * The previous version led with a claim about competitors' rendering pipelines and a
 * three-way "None / None / Yours to read" stat row. It described an argument, not a
 * product. This one leads with the job the product does — write once, tailor per role —
 * and keeps the inspectable export as the *proof* underneath it.
 *
 * The artefact below is pure CSS and stays that way: `src/lib/typst/` pulls a WASM
 * compiler tens of megabytes large from a CDN, and a public page must prerender to real
 * HTML with no runtime dependency. But its *text* is not a mock-up — it is
 * `buildPlainText(SAMPLE_RESUME)`, the same function the app's export button calls. This
 * is a server component, so the call happens once at build time and ships no client JS.
 *
 * That indirection is deliberate. The panel used to be a hand-written `key: value` list
 * asserting it matched the exporter, and it stopped matching the day the exporter was
 * fixed — leaving the most prominent panel on the site advertising `startDate: 2020-09`.
 * Rendering the real output is the only version of this that cannot drift.
 *
 * Type and spacing are the closed scales (`docs/design-system/README.md` §3.1–3.2): the
 * specimen reads at `text-lg` + `text-xs` — two sizes, with weight and tone carrying the
 * rest of its internal hierarchy — and the page's body copy is the one `text-base` step.
 * The audit's per-element rem values (22 sizes on this page, four of them within 0.8px)
 * are gone; nothing here may choose a size that is not on the scale.
 */

import { buildPlainText } from "@/lib/export/text";
import { SAMPLE_RESUME } from "./sample-resume";

/** The exact bytes the export button produces for the sample document. */
const EXPORTED_TEXT = buildPlainText(SAMPLE_RESUME);

/**
 * The same lines, each with a stable identity for rendering.
 *
 * Keyed by content plus the number of times that content has already appeared, because
 * the text contains plenty of identical blank lines and a bare index would make every
 * line's key change if the exporter's leading blank line ever moved.
 */
const EXPORTED_LINES = (() => {
	const seen = new Map<string, number>();
	return EXPORTED_TEXT.split("\n").map((text) => {
		const occurrence = (seen.get(text) ?? 0) + 1;
		seen.set(text, occurrence);
		return { id: `${occurrence}\u0000${text}`, text };
	});
})();

const SKILLS = ["Go", "TypeScript", "Postgres", "Terraform"];

export function Hero() {
	return (
		<section className="relative overflow-hidden">
			{/*
			 * Decorative wash behind the hero. Positioned (not z-indexed below the
			 * content): the content column is `relative`, so tree order paints it
			 * above the wash without reaching for an off-ladder z value.
			 */}
			<div aria-hidden="true" className="pointer-events-none absolute inset-0">
				<div className="absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(60rem_28rem_at_18%_-8%,color-mix(in_oklch,var(--brand-accent)_12%,transparent),transparent)]" />
				<div className="absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(46rem_22rem_at_88%_4%,color-mix(in_oklch,var(--brand-warm-decor)_14%,transparent),transparent)]" />
			</div>

			<div className="marketing-shell relative py-12 lg:py-16">
				<div className="max-w-4xl">
					<p
						className="flex items-center gap-2 font-semibold text-[var(--brand-accent)] text-xs uppercase tracking-[0.16em]"
						data-animate
						style={{ animationDelay: "0ms" }}
					>
						<span
							aria-hidden="true"
							className="h-px w-6 bg-[var(--brand-accent)]"
						/>
						Resume workbench
					</p>

					<h1
						className="mt-4 text-display"
						data-animate
						style={{ animationDelay: "70ms" }}
					>
						Write it once. Tailor it for every role.
					</h1>

					<p
						className="mt-6 max-w-2xl text-[var(--brand-text)] text-lede"
						data-animate
						style={{ animationDelay: "140ms" }}
					>
						Keep one master record of your career. Fork a variant for each job
						without retyping a word. And when you export, read the exact text
						layer a parser will extract from the PDF — before you send it.
					</p>

					<div
						className="mt-8"
						data-animate
						style={{ animationDelay: "210ms" }}
					>
						<div className="flex flex-wrap items-center gap-3">
							<a
								className="group inline-flex items-center gap-2 rounded-lg bg-[var(--brand-ink)] px-6 py-3 font-medium text-[var(--brand-text-on-ink)] transition-[color,background-color,box-shadow,transform] duration-(--br-duration-fast) ease-enter hover:-translate-y-0.5 hover:bg-[var(--brand-ink-soft)] hover:shadow-elev-1"
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
							<a
								className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-control-border)] bg-[var(--brand-card)] px-6 py-3 font-medium text-[var(--brand-text)] transition-colors hover:bg-[var(--brand-paper)]"
								href="#features"
							>
								What it does
							</a>
						</div>

						{/*
						 * Three counts, each verifiable in the app in under a minute. These
						 * replace "None / None / Yours to read", which were positions
						 * rather than facts about the product.
						 *
						 * A strip of its own under the actions, divided by a hairline: the
						 * audit found this row floating at button mid-height as the
						 * second-largest cluster on the screen, competing with the CTA.
						 * Numbers with no decision value are support, not peers.
						 */}
						<dl className="mt-8 grid max-w-2xl grid-cols-3 gap-6 border-[var(--brand-rule)] border-t pt-6">
							<Stat label="Section types" value="13" />
							<Stat label="Export formats" value="4" />
							<Stat label="Templates" value="3" />
						</dl>
					</div>
				</div>

				<div
					className="mt-12 lg:mt-16"
					data-animate-fade
					style={{ animationDelay: "200ms" }}
				>
					<Artefact />
				</div>
			</div>
		</section>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="font-semibold text-[var(--brand-text-faint)] text-xs uppercase leading-tight tracking-wide">
				{label}
			</dt>
			<dd className="mt-1 font-semibold text-[var(--brand-text)] text-base">
				{value}
			</dd>
		</div>
	);
}

/**
 * The document and the text a parser reads out of it.
 *
 * Kept because it is the one thing on this page no competitor can show: they render in a
 * browser and do not know the extraction order. Here the two panels are the same
 * document, and the correspondence is visible without scrolling.
 */
function Artefact() {
	return (
		<div className="relative">
			<div
				aria-hidden="true"
				className="absolute -inset-4 rounded-lg bg-gradient-to-br from-[var(--brand-accent)]/10 via-transparent to-[var(--brand-warm-decor)]/10 blur-2xl md:-inset-6"
			/>

			{/*
			 * `items-start` keeps the panels top-aligned. The figure's `mt-3` is the
			 * mobile stack gap only (12 + the grid's 12 = the 24px step); on desktop
			 * it is zeroed, because the audit caught the two panel headers sitting a
			 * deliberate-looking 12px out of alignment.
			 */}
			<div className="relative grid items-start gap-3 md:grid-cols-2">
				<div
					aria-label="A resume document for Avery Chen, Senior Backend Engineer at Northwind Systems from March 2022, with one quantified bullet and a Skills section listing Go, TypeScript, Postgres and Terraform."
					className="overflow-hidden rounded-lg border border-[var(--brand-rule)] bg-[var(--brand-card)] shadow-elev-2"
					role="img"
				>
					<div className="flex items-center gap-2 border-[var(--brand-rule)] border-b bg-[var(--brand-paper)] px-4 py-2">
						<div className="flex gap-1">
							<span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-ink)]/15" />
							<span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-ink)]/15" />
							<span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-ink)]/15" />
						</div>
						<span className="tnum ml-2 truncate font-mono text-[var(--brand-text-muted)] text-xs">
							avery-chen — master
						</span>
						<span className="ml-auto rounded bg-[var(--brand-accent)]/10 px-2 py-0.5 font-medium text-[var(--brand-accent)] text-xs">
							Typst
						</span>
					</div>

					<div className="p-6">
						<div className="border-[var(--brand-rule)] border-b pb-4">
							<p className="font-bold text-[var(--brand-text)] text-lg">
								Avery Chen
							</p>
							<p className="text-[var(--brand-text-muted)] text-xs">
								Senior Backend Engineer
							</p>
							<p className="tnum mt-1 font-mono text-[var(--brand-text-faint)] text-xs">
								avery@chen.dev · +49 30 555 0142 · Berlin
							</p>
						</div>

						<div className="mt-4">
							<SectionLabel>Work Experience</SectionLabel>
							<div className="flex items-baseline justify-between gap-3">
								<p className="font-semibold text-[var(--brand-text)] text-xs">
									Senior Backend Engineer
								</p>
								<p className="tnum shrink-0 text-[var(--brand-text-faint)] text-xs">
									Mar 2022 — Present
								</p>
							</div>
							<p className="text-[var(--brand-text-muted)] text-xs italic">
								Northwind Systems
							</p>
							<ul className="mt-2 space-y-1">
								<li className="flex gap-2 text-[var(--brand-text)] text-xs">
									<span
										aria-hidden="true"
										className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--brand-accent)]"
									/>
									<span>
										Cut p99 checkout latency 41% by rewriting the reservation
										path off the shared connection pool.
									</span>
								</li>
							</ul>
						</div>

						<div className="mt-4">
							<SectionLabel>Skills</SectionLabel>
							<div className="flex flex-wrap gap-2">
								{SKILLS.map((s) => (
									<span
										className="rounded border border-[var(--brand-rule)] bg-[var(--brand-paper)] px-2 py-0.5 text-[var(--brand-text-muted)] text-xs"
										key={s}
									>
										{s}
									</span>
								))}
							</div>
						</div>
					</div>
				</div>

				<figure className="mt-3 overflow-hidden rounded-lg border border-[var(--brand-rule)] bg-[var(--brand-ink)] md:mt-0">
					<figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 border-[var(--brand-ink-soft)] border-b px-4 py-2">
						<span className="inline-flex items-center gap-2 font-semibold text-[var(--brand-verified-on-ink)] text-xs uppercase tracking-[0.12em]">
							<svg
								aria-hidden="true"
								className="h-3 w-3"
								fill="none"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2.4"
								viewBox="0 0 24 24"
							>
								<path d="M4 12.5 9.5 18 20 6.5" />
							</svg>
							Exported text
						</span>
						<span className="text-[var(--brand-text-on-ink-faint)] text-xs">
							Copy this from the editor before you send the file
						</span>
					</figcaption>

					<pre className="tnum select-text whitespace-pre-wrap break-words px-4 py-3 font-mono text-[var(--brand-text-on-ink-muted)] text-xs">
						{EXPORTED_LINES.map((line) => (
							<span
								className={
									line.text.startsWith("-")
										? "block text-[var(--brand-text-on-ink)]"
										: /^=+$/.test(line.text)
											? "block text-[var(--brand-text-on-ink-faint)]"
											: "block"
								}
								key={line.id}
							>
								{line.text === "" ? "\u00a0" : line.text}
							</span>
						))}
					</pre>
				</figure>
			</div>
		</div>
	);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<p className="mb-2 font-semibold text-[var(--brand-accent)] text-xs uppercase tracking-[0.16em]">
			{children}
		</p>
	);
}
