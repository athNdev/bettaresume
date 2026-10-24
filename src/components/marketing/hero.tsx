/**
 * Hero: what the product is, in one screen.
 *
 * The previous version led with a claim about competitors' rendering pipelines and a
 * three-way "None / None / Yours to read" stat row. It described an argument, not a
 * product. This one leads with the job the product does — write once, tailor per role —
 * and keeps the inspectable export as the *proof* underneath it.
 *
 * The artefact below is still pure CSS, and deliberately so: `src/lib/typst/` pulls a
 * WASM compiler tens of megabytes large from a CDN, and a public page must prerender to
 * real HTML with no runtime dependency. It shows a real exported shape (the same
 * `key: value` lines the exporter writes), not a fictional screenshot.
 */

import { SECTION_RULE } from "@/lib/export/rules";

/** Contact block. Field names and order mirror the text export. */
const CONTACT = [
	"Avery Chen",
	"Senior Backend Engineer",
	"",
	"Email: avery@chen.dev",
	"Phone: +49 30 555 0142",
	"Location: Berlin",
	"GitHub: github.com/averychen",
] as const;

/** One `key: value` line per experience field, in schema order. */
const EXPERIENCE_TEXT = [
	{ key: "company", value: "Northwind Systems" },
	{ key: "position", value: "Senior Backend Engineer" },
	{ key: "startDate", value: "March 2022" },
	{
		key: "highlights",
		value: "• Cut p99 checkout latency 41% by rewriting the reservation path",
	},
] as const;

const SKILLS = ["Go", "TypeScript", "Postgres", "Terraform"];

/**
 * The rule the plain-text exporter writes around every section heading.
 *
 * Imported rather than redefined: the whole claim of this panel is "this is what the
 * exporter produces", and a second constant is how the page and the artefact drift
 * apart. `src/lib/export/rules.ts` is the one definition, and it carries no imports so
 * this page stays free of the export path's dependencies.
 */
const RULE = SECTION_RULE;

export function Hero() {
	return (
		<section className="relative overflow-hidden">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 -z-10"
			>
				<div className="absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(60rem_28rem_at_18%_-8%,color-mix(in_oklch,var(--brand-accent)_12%,transparent),transparent)]" />
				<div className="absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(46rem_22rem_at_88%_4%,color-mix(in_oklch,var(--brand-warm-decor)_14%,transparent),transparent)]" />
			</div>

			<div className="marketing-shell py-14 lg:py-20">
				<div className="max-w-4xl">
					<p
						className="flex items-center gap-2.5 font-semibold text-[0.72rem] text-[var(--brand-accent)] uppercase tracking-[0.16em]"
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
						className="mt-5 text-display"
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
						className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-6"
						data-animate
						style={{ animationDelay: "210ms" }}
					>
						<div className="flex flex-wrap items-center gap-3">
							<a
								className="group inline-flex items-center gap-2 rounded-lg bg-[var(--brand-ink)] px-6 py-3.5 font-medium text-[var(--brand-text-on-ink)] transition-[color,background-color,box-shadow,transform] duration-200 ease-enter hover:-translate-y-0.5 hover:bg-[var(--brand-ink-soft)] hover:shadow-[var(--brand-ink)]/20 hover:shadow-lg"
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
								className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-control-border)] bg-white px-6 py-3.5 font-medium text-[var(--brand-text)] transition-colors hover:bg-[var(--brand-paper)]"
								href="#features"
							>
								What it does
							</a>
						</div>

						{/*
						 * Three counts, each verifiable in the app in under a minute. These
						 * replace "None / None / Yours to read", which were positions
						 * rather than facts about the product.
						 */}
						<dl className="grid flex-1 grid-cols-3 gap-5 border-[var(--brand-rule)] border-t pt-5 sm:max-w-md sm:border-t-0 sm:pt-0">
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
			<dt className="text-[0.7rem] text-[var(--brand-text-faint)] uppercase leading-tight tracking-wide">
				{label}
			</dt>
			<dd className="mt-1.5 font-semibold text-[0.95rem] text-[var(--brand-text)]">
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
				className="absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-br from-[var(--brand-accent)]/10 via-transparent to-[var(--brand-warm-decor)]/10 blur-2xl md:-inset-6"
			/>

			<div className="grid items-start gap-3 md:grid-cols-2">
				<div
					aria-label="A resume document for Avery Chen, Senior Backend Engineer at Northwind Systems from March 2022, with one quantified bullet and a Skills section listing Go, TypeScript, Postgres and Terraform."
					className="overflow-hidden rounded-xl border border-[var(--brand-rule)] bg-white shadow-[var(--brand-ink)]/8 shadow-xl"
					role="img"
				>
					<div className="flex items-center gap-2 border-[var(--brand-rule)] border-b bg-[var(--brand-paper)] px-4 py-2.5">
						<div className="flex gap-1.5">
							<span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-ink)]/15" />
							<span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-ink)]/15" />
							<span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-ink)]/15" />
						</div>
						<span className="tnum ml-2 truncate font-mono text-[0.66rem] text-[var(--brand-text-muted)]">
							avery-chen — master
						</span>
						<span className="ml-auto rounded bg-[var(--brand-accent)]/10 px-1.5 py-0.5 font-medium text-[0.6rem] text-[var(--brand-accent)]">
							Typst
						</span>
					</div>

					<div className="p-6 sm:p-7">
						<div className="border-[var(--brand-rule)] border-b pb-4">
							<p className="font-bold text-[1.3rem] text-[var(--brand-text)] leading-tight tracking-tight">
								Avery Chen
							</p>
							<p className="text-[0.76rem] text-[var(--brand-text-muted)]">
								Senior Backend Engineer
							</p>
							<p className="tnum mt-1.5 font-mono text-[0.64rem] text-[var(--brand-text-faint)]">
								avery@chen.dev · +49 30 555 0142 · Berlin
							</p>
						</div>

						<div className="mt-5">
							<SectionLabel>Work Experience</SectionLabel>
							<div className="flex items-baseline justify-between gap-3">
								<p className="font-semibold text-[0.8rem] text-[var(--brand-text)]">
									Senior Backend Engineer
								</p>
								<p className="tnum shrink-0 text-[0.62rem] text-[var(--brand-text-faint)]">
									Mar 2022 — Present
								</p>
							</div>
							<p className="text-[0.66rem] text-[var(--brand-text-muted)] italic">
								Northwind Systems
							</p>
							<ul className="mt-2 space-y-1">
								<li className="relative pl-3 text-[0.7rem] text-[var(--brand-text)] leading-[1.55]">
									<span
										aria-hidden="true"
										className="absolute top-[0.5em] left-0 h-1 w-1 rounded-full bg-[var(--brand-accent)]"
									/>
									Cut p99 checkout latency 41% by rewriting the reservation path
									off the shared connection pool.
								</li>
							</ul>
						</div>

						<div className="mt-5">
							<SectionLabel>Skills</SectionLabel>
							<div className="flex flex-wrap gap-1.5">
								{SKILLS.map((s) => (
									<span
										className="rounded border border-[var(--brand-rule)] bg-[var(--brand-paper)] px-1.5 py-0.5 text-[0.62rem] text-[var(--brand-text-muted)]"
										key={s}
									>
										{s}
									</span>
								))}
							</div>
						</div>
					</div>
				</div>

				<figure className="mt-3 overflow-hidden rounded-xl border border-[var(--brand-rule)] bg-[var(--brand-ink)]">
					<figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 border-white/10 border-b px-4 py-2.5">
						<span className="inline-flex items-center gap-1.5 font-semibold text-[0.62rem] text-[var(--brand-verified-on-ink)] uppercase tracking-[0.12em]">
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
						<span className="text-[0.68rem] text-[var(--brand-text-on-ink-faint)]">
							Copy this from the editor before you send the file
						</span>
					</figcaption>

					<pre className="tnum select-text overflow-x-auto px-4 py-3.5 font-mono text-[0.6rem] text-[var(--brand-text-on-ink-muted)] leading-[1.7] sm:text-[0.64rem]">
						{CONTACT.join("\n")}
						{"\n\n"}
						<TextRule label="Work Experience" />
						{EXPERIENCE_TEXT.map((line) => (
							<span
								className={
									line.key === "highlights"
										? "block text-[var(--brand-text-on-ink)]"
										: "block"
								}
								key={line.key}
							>
								{line.key}: {line.value}
							</span>
						))}
						{"\n"}
						<TextRule label="Skills" />
						<span className="block">name: Backend</span>
						<span className="block">skills: Go, TypeScript, Postgres</span>
					</pre>
				</figure>
			</div>
		</div>
	);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<p className="mb-2 font-bold text-[0.58rem] text-[var(--brand-accent)] uppercase tracking-[0.16em]">
			{children}
		</p>
	);
}

function TextRule({ label }: { label: string }) {
	return (
		<>
			<span className="block">{RULE}</span>
			<span className="block font-semibold text-[var(--brand-text-on-ink)]">
				{label}
			</span>
			<span className="block">{RULE}</span>
			{"\n"}
		</>
	);
}
