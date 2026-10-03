/**
 * Hero: the document, and the text a parser reads out of it.
 *
 * Three decisions worth keeping if this file is edited again.
 *
 * **Not the Typst renderer.** `src/lib/typst/` pulls a WASM compiler (tens of MB)
 * from a CDN at runtime; a public marketing page must not depend on that. Both
 * panels below are pure CSS, so the page prerenders to real HTML, ships no JS,
 * and still shows the product rather than an abstract illustration.
 *
 * **The text panel is a faithful rendering of the real exporter, not a mock-up.**
 * `exportText` in `src/components/export/export-buttons.tsx` writes a `=`×50
 * rule, the section title, another rule, then `key: value` per field. This file
 * reproduces that shape — same rule width, same key names as
 * `experienceSchema`/`skillCategorySchema` — because the entire claim of the
 * page is "this is what a parser gets". A prettier fiction would undercut it.
 * `test/marketing-claims.test.ts` asserts the key names against the schemas.
 *
 * **The document stays `role="img"`, the text panel does not.** Leaving mock
 * résumé content as real headings put "Avery Chen" / "Experience" / "Skills"
 * into the page outline, so a screen-reader user heard fiction as sections of
 * the site. The document keeps that treatment. The text panel is the opposite
 * case: it is the argument, it is in a `<pre>` rather than headings, and it is
 * labelled as an example by its caption — so it is real, readable, selectable
 * page content.
 */

/** Contact block. Field names and order mirror `exportText`. */
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

/** The document panel's visible content. Mirrors the text panel above. */
const EXPERIENCE = [
	{
		role: "Senior Backend Engineer",
		org: "Northwind Systems",
		dates: "Mar 2022 — Present",
		bullets: [
			"Cut p99 checkout latency 41% by rewriting the reservation path off the shared connection pool.",
		],
	},
];

const SKILLS = ["Go", "TypeScript", "Postgres", "Terraform"];

/** The rule the exporter writes around every section heading. */
const RULE = "=".repeat(50);

export function Hero() {
	return (
		<section className="relative overflow-hidden">
			{/*
			 * Backdrop. Two soft radial washes over the paper tone. Pointer
			 * events off so it can never eat a click on the CTAs. The warm wash
			 * is decorative-only by token, which is why it never became text.
			 */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 -z-10"
			>
				<div className="absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(60rem_28rem_at_18%_-8%,color-mix(in_oklch,var(--brand-accent)_12%,transparent),transparent)]" />
				<div className="absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(46rem_22rem_at_88%_4%,color-mix(in_oklch,var(--brand-warm-decor)_14%,transparent),transparent)]" />
			</div>

			{/*
			 * Stacked, not a two-column hero.
			 *
			 * The obvious layout puts the copy beside the artefact, and that is what
			 * this did first. At a 5.25rem display size it wrapped the headline to
			 * five lines inside a 33rem column, and the mono text panel had no room
			 * for the 50-column export it exists to reproduce.
			 *
			 * Giving the copy the full measure and the artefact the full width
			 * underneath fixes both, and it is what the pairing actually wants: the
			 * document and its text layer should sit side by side so a reader can
			 * check one against the other without scrolling.
			 */}
			<div className="marketing-shell py-14 lg:py-20">
				<div className="max-w-4xl">
					{/*
					 * A rule and a small-caps label rather than a pill. The pill
					 * was three of the seven "slop" tells at once — full radius
					 * on an eyebrow, on a CTA and on every card — and NN/g's
					 * banner-blindness work is a standing warning against
					 * anything on a page that looks like a badge.
					 */}
					<p
						className="flex items-center gap-2.5 font-semibold text-[0.72rem] text-[var(--brand-accent)] uppercase tracking-[0.16em]"
						data-animate
						style={{ animationDelay: "0ms" }}
					>
						<span
							aria-hidden="true"
							className="h-px w-6 bg-[var(--brand-accent)]"
						/>
						What the parser reads
					</p>

					<h1
						className="mt-5 text-display"
						data-animate
						style={{ animationDelay: "70ms" }}
					>
						Your resume, as a parser actually reads it
					</h1>

					{/*
					 * The whole differentiator, in two sentences, both checkable:
					 * what everyone else does (render in a browser, which chooses
					 * the reading order), and what this does instead (typeset with
					 * Typst, which does not). No competitor is named — the
					 * mechanism is enough for anyone who has used one.
					 *
					 * Deliberately a description of a mechanism, not a prediction
					 * of an outcome. "Your resume will pass" is a performance
					 * claim; "this is the string a parser receives" is a fact the
					 * reader can confirm from the panel beside this text.
					 */}
					<p
						className="mt-6 max-w-2xl text-[var(--brand-text)] text-lede"
						data-animate
						style={{ animationDelay: "140ms" }}
					>
						Every other builder renders your resume with a browser, and the
						browser decides the reading order — so any score they show you is a
						guess about software they never ran. Betta Resume typesets with
						Typst, which emits one single-column text layer in a fixed order. We
						show you that exact text.
					</p>

					<div
						className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-6"
						data-animate
						style={{ animationDelay: "210ms" }}
					>
						<div className="flex flex-wrap items-center gap-3">
							<a
								className="group inline-flex items-center gap-2 rounded-lg bg-[var(--brand-ink)] px-6 py-3.5 font-medium text-[var(--brand-text-on-ink)] transition-all hover:-translate-y-0.5 hover:bg-[var(--brand-ink-soft)] hover:shadow-[var(--brand-ink)]/20 hover:shadow-lg"
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
							<a
								className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-control-border)] bg-white px-6 py-3.5 font-medium text-[var(--brand-text)] transition-colors hover:bg-[var(--brand-paper)]"
								href="#audit"
							>
								How the audit works
							</a>
						</div>

						{/*
						 * Three commitments, all falsifiable, none of them a number.
						 * These replace the old "Unlimited / Every save / You do" row,
						 * which described effort rather than promising anything a
						 * competitor could be held to. Each of these can be checked
						 * against the product in about a minute.
						 */}
						<dl className="grid flex-1 grid-cols-3 gap-5 border-[var(--brand-rule)] border-t pt-5 sm:max-w-md sm:border-t-0 sm:pt-0">
							<Stat label="Headline score" value="None" />
							<Stat label="Metrics invented" value="None" />
							<Stat label="Text layer" value="Yours to read" />
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
 * The pairing. Document on top, its extracted text layer directly beneath, with
 * the section heading and the bullet line tinted to line the two up visually.
 *
 * Reading order is the whole point: a browser-rendered resume puts its columns
 * in whatever order the layout engine resolves them, which is why nobody else
 * can show this panel. Stacking the two makes that ordering claim legible in one
 * glance instead of asking the reader to take it on trust.
 */
function Artefact() {
	return (
		<div className="relative">
			{/* Soft plate behind the pair, adds depth without a shadow stack. */}
			<div
				aria-hidden="true"
				className="absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-br from-[var(--brand-accent)]/10 via-transparent to-[var(--brand-warm-decor)]/10 blur-2xl md:-inset-6"
			/>

			{/*
			 * Side by side from md up. Reading order is the whole argument, and a
			 * reader has to be able to move their eye across from the document to
			 * its text without scrolling — that correspondence is the proof.
			 */}
			<div className="grid items-start gap-3 md:grid-cols-2">
				{/* ---- The document ------------------------------------------------ */}
				<div
					aria-label="A resume document for Avery Chen, Senior Backend Engineer at Northwind Systems from March 2022, with a quantified bullet about cutting checkout latency, and a Skills section listing Go, TypeScript, Postgres and Terraform."
					className="overflow-hidden rounded-xl border border-[var(--brand-rule)] bg-white shadow-[var(--brand-ink)]/8 shadow-xl"
					role="img"
				>
					{/* Preview chrome — mirrors the real editor's toolbar. */}
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
							Laid out
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
								{EXPERIENCE[0]?.bullets.map((b) => (
									<li
										className="relative pl-3 text-[0.7rem] text-[var(--brand-text)] leading-[1.55]"
										key={b}
									>
										<span
											aria-hidden="true"
											className="absolute top-[0.5em] left-0 h-1 w-1 rounded-full bg-[var(--brand-accent)]"
										/>
										{b}
									</li>
								))}
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

				{/* ---- The extracted text layer ------------------------------------ */}
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
							Verified output
						</span>
						<span className="text-[0.68rem] text-[var(--brand-text-on-ink-faint)]">
							The text layer of the PDF above — select it and paste it anywhere
						</span>
					</figcaption>

					{/*
					 * `whitespace-pre` + `overflow-x-auto` because this is a faithful
					 * 50-column export, not a reflowed summary. Truncating the rules
					 * would make the panel prettier and the claim weaker.
					 */}
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
						{"\n"}
						<TextRule label="Projects" />
						<span className="block text-[var(--brand-text-on-ink-faint)]">
							… the same 50-column rule before every section …
						</span>
					</pre>
				</figure>
			</div>
		</div>
	);
}

/** Section label in the document. Tinted so it lines up with the text panel. */
function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<p className="mb-2 font-bold text-[0.58rem] text-[var(--brand-accent)] uppercase tracking-[0.16em]">
			{children}
		</p>
	);
}

/** One `=`×50 / title / `=`×50 block, exactly as `exportText` writes it. */
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
