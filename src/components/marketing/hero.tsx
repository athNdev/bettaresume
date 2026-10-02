/**
 * Hero section with a CSS-built resume preview.
 *
 * Deliberately NOT the Typst renderer. `src/lib/typst/` pulls a WASM compiler
 * (tens of MB) from a CDN at runtime; a public marketing page must not depend
 * on that. This preview is pure CSS so it prerenders to real HTML, costs no
 * JS, and still shows the product rather than an abstract illustration.
 */

/** The resume this page is about: one master, four tailored variants. */
const VARIANTS = [
	{ label: "Staff Backend", tag: "sent", accent: "var(--brand-accent)" },
	{ label: "Platform / SRE", tag: "sent", accent: "var(--brand-warm)" },
	{ label: "Fintech", tag: "draft", accent: "var(--brand-accent)" },
	{ label: "Contract", tag: "draft", accent: "var(--brand-ink)" },
];

const EXPERIENCE = [
	{
		role: "Senior Backend Engineer",
		org: "Northwind Systems",
		dates: "2022 — Present",
		bullets: [
			"Cut p99 checkout latency 41% by rewriting the reservation path off the shared connection pool.",
			"Migrated 30+ services to D1 with zero downtime; rollback path rehearsed per batch.",
		],
	},
	{
		role: "Platform Engineer",
		org: "Corvid Labs",
		dates: "2019 — 2022",
		bullets: [
			"Owned the CI estate: build time down from 22 to 4 minutes across 140 repositories.",
		],
	},
];

const SKILLS = [
	"Go",
	"TypeScript",
	"Postgres",
	"Distributed systems",
	"Terraform",
];

export function Hero() {
	return (
		<section className="relative overflow-hidden">
			{/*
			 * Backdrop. Two soft radial washes over the paper tone. Pointer
			 * events off so it can never eat a click on the CTAs.
			 */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 -z-10"
			>
				<div className="absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(60rem_28rem_at_18%_-8%,color-mix(in_oklch,var(--brand-accent)_16%,transparent),transparent)]" />
				<div className="absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(46rem_22rem_at_88%_4%,color-mix(in_oklch,var(--brand-warm)_15%,transparent),transparent)]" />
			</div>

			<div className="marketing-shell grid items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
				<div>
					<p
						className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-ink)]/12 bg-white/70 px-3 py-1.5 text-[0.78rem] font-medium text-[var(--brand-ink)]/75 backdrop-blur"
						data-animate
						style={{ animationDelay: "0ms" }}
					>
						<span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-accent)]" />
						A workbench, not a generator
					</p>

					<h1
						className="text-display mt-6"
						data-animate
						style={{ animationDelay: "70ms" }}
					>
						Everything around the resume.{" "}
						<span className="relative whitespace-nowrap">
							<span className="relative z-10">Except writing it.</span>
							<svg
								aria-hidden="true"
								className="absolute -bottom-1 left-0 z-0 h-3 w-full text-[var(--brand-accent)]"
								preserveAspectRatio="none"
								viewBox="0 0 200 12"
							>
								<path
									d="M2 8.5C38 3.5 92 2 198 6"
									fill="none"
									stroke="currentColor"
									strokeLinecap="round"
									strokeWidth="3.5"
								/>
							</svg>
						</span>
					</h1>

					<p
						className="text-lede mt-6 text-[var(--brand-ink)]/70"
						data-animate
						style={{ animationDelay: "140ms" }}
					>
						Most tools hand you a finished resume and wish you luck. Betta Resume is
						built for the other job: keeping one accurate record of your work, tailoring
						it per role, and controlling every word of how it reads. It does everything
						short of writing it for you.
					</p>

					<div
						className="mt-9 flex flex-wrap items-center gap-3"
						data-animate
						style={{ animationDelay: "210ms" }}
					>
						<a
							className="group inline-flex items-center gap-2 rounded-xl bg-[var(--brand-ink)] px-6 py-3.5 font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--brand-ink-soft)] hover:shadow-lg hover:shadow-[var(--brand-ink)]/20"
							href="/app"
						>
							Start your workbench
							<span
								aria-hidden="true"
								className="transition-transform group-hover:translate-x-0.5"
							>
								→
							</span>
						</a>
						<a
							className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand-ink)]/15 bg-white/70 px-6 py-3.5 font-medium text-[var(--brand-ink)] backdrop-blur transition-colors hover:bg-white"
							href="#templates"
						>
							See the templates
						</a>
					</div>

					<dl
						className="mt-11 grid max-w-md grid-cols-3 gap-6 border-t border-[var(--brand-ink)]/10 pt-7"
						data-animate
						style={{ animationDelay: "280ms" }}
					>
						<Stat label="Variants per master" value="Unlimited" />
						<Stat label="History kept" value="Every save" />
						<Stat label="Writes the copy" value="You do" />
					</dl>
				</div>

				<div
					className="relative lg:pl-4"
					data-animate-fade
					style={{ animationDelay: "200ms" }}
				>
					<ResumePreview />
				</div>
			</div>
		</section>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="text-[0.72rem] leading-tight tracking-wide text-[var(--brand-ink)]/50 uppercase">
				{label}
			</dt>
			<dd className="mt-1.5 text-[0.95rem] font-semibold">{value}</dd>
		</div>
	);
}

/**
 * The preview is the argument: one master resume on the left, its tailored
 * variants fanned out to the right. That visual is the product in a single
 * image, and it cannot be expressed with stock art.
 *
 * It is announced as a single image rather than read as document structure.
 * Leaving it as real headings put "Avery Chen" / "Experience" / "Skills" into
 * the page outline, so a screen-reader user heard mock résumé content as
 * sections of the site.
 */
function ResumePreview() {
	return (
		<div
			aria-label="A resume workbench showing one master resume on the left and four tailored variants — Staff Backend, Platform / SRE, Fintech and Contract — fanned out beside it."
			role="img"
		>
			<div className="relative">
				{/* Soft plate behind the document, adds depth without a shadow stack. */}
				<div
					aria-hidden="true"
					className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-[var(--brand-accent)]/12 via-transparent to-[var(--brand-warm)]/10 blur-2xl"
				/>

				<div className="overflow-hidden rounded-2xl border border-[var(--brand-ink)]/12 bg-white shadow-2xl shadow-[var(--brand-ink)]/12">
					{/* Preview chrome — mirrors the real editor's toolbar. */}
					<div className="flex items-center gap-2 border-b border-[var(--brand-ink)]/8 bg-[var(--brand-paper)] px-4 py-3">
						<div className="flex gap-1.5">
							<span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-ink)]/15" />
							<span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-ink)]/15" />
							<span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-ink)]/15" />
						</div>
						<span className="ml-2 truncate font-mono text-[0.68rem] text-[var(--brand-ink)]/45">
							avery-chen — master
						</span>
						<span className="ml-auto rounded bg-[var(--brand-accent)]/12 px-1.5 py-0.5 text-[0.62rem] font-medium text-[var(--brand-accent)]">
							Saved
						</span>
					</div>

					<div className="grid gap-0 sm:grid-cols-[1fr_auto]">
						<div className="p-6 sm:p-7">
							<div className="border-b border-[var(--brand-ink)]/10 pb-4">
								<p className="text-[1.35rem] leading-tight font-bold tracking-tight">
									Avery Chen
								</p>
								<p className="text-[0.78rem] text-[var(--brand-ink)]/55">
									Senior Backend Engineer
								</p>
								<p className="tnum mt-1.5 font-mono text-[0.66rem] text-[var(--brand-ink)]/45">
									avery@chen.dev · Berlin · github.com/averychen
								</p>
							</div>

							<PreviewSection title="Experience">
								{EXPERIENCE.map((job) => (
									<div className="mb-3.5 last:mb-0" key={job.org}>
										<div className="flex items-baseline justify-between gap-3">
											<p className="text-[0.8rem] font-semibold">
												{job.role}
											</p>
											<p className="tnum shrink-0 text-[0.63rem] text-[var(--brand-ink)]/45">
												{job.dates}
											</p>
										</div>
										<p className="text-[0.68rem] text-[var(--brand-ink)]/55 italic">
											{job.org}
										</p>
										<ul className="mt-1.5 space-y-1">
											{job.bullets.map((b) => (
												<li
													className="relative pl-3 text-[0.71rem] leading-[1.5] text-[var(--brand-ink)]/75"
													key={b}
												>
													<span
														aria-hidden="true"
														className="absolute top-[0.5em] left-0 h-1 w-1 rounded-full bg-[var(--brand-ink)]/30"
													/>
													{b}
												</li>
											))}
										</ul>
									</div>
								))}
							</PreviewSection>

							<PreviewSection title="Skills">
								<div className="flex flex-wrap gap-1.5">
									{SKILLS.map((s) => (
										<span
											className="rounded border border-[var(--brand-ink)]/10 bg-[var(--brand-paper)] px-1.5 py-0.5 text-[0.63rem] text-[var(--brand-ink)]/70"
											key={s}
										>
											{s}
										</span>
									))}
								</div>
							</PreviewSection>
						</div>

						{/* The variants rail. This is the whole product in one column. */}
						<div className="border-t border-[var(--brand-ink)]/8 bg-[var(--brand-paper)]/60 p-5 sm:w-44 sm:border-t-0 sm:border-l">
							<p className="text-[0.58rem] font-semibold tracking-[0.14em] text-[var(--brand-ink)]/40 uppercase">
								Variants
							</p>
							<ul className="mt-3 space-y-2">
								{VARIANTS.map((v, i) => (
									<li key={v.label}>
										<div
											className="rounded-lg border border-[var(--brand-ink)]/10 bg-white px-2.5 py-2"
											data-animate-drift
											style={{ animationDelay: `${i * 420}ms` }}
										>
											<div className="flex items-center gap-1.5">
												<span
													aria-hidden="true"
													className="h-1.5 w-1.5 shrink-0 rounded-full"
													style={{ background: v.accent }}
												/>
												<p className="truncate text-[0.66rem] font-medium">
													{v.label}
												</p>
											</div>
											<p className="mt-0.5 pl-3 text-[0.56rem] text-[var(--brand-ink)]/40">
												{v.tag} · v{i === 0 ? 12 : 4 + i}
											</p>
										</div>
									</li>
								))}
							</ul>
							<p className="mt-3.5 border-t border-[var(--brand-ink)]/8 pt-3 text-[0.58rem] leading-relaxed text-[var(--brand-ink)]/45">
								Linked sections follow the master. Detach one to freeze it.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function PreviewSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="mt-5">
			<p className="mb-2.5 text-[0.6rem] font-bold tracking-[0.16em] text-[var(--brand-accent)] uppercase">
				{title}
			</p>
			{children}
		</section>
	);
}