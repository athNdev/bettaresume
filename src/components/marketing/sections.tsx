/**
 * Marketing sections below the fold.
 *
 * Content strategy: the differentiation is NOT "we're better at AI". It is
 * "we're the opposite of a generator" — control, provenance, and a single
 * source of truth. So the copy argues ownership and accuracy, and features are
 * organised around the four things that break in a one-generator workflow:
 * duplicated facts, unversioned edits, variant sprawl, and opaque rewrites.
 */

const CAPABILITIES = [
	{
		title: "One record of the truth",
		body: "Type a job once. Every resume and every variant references it. Fix a typo in one place and forty documents are correct again.",
		icon: "M3 7c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7Zm4 2h10M7 12h7M7 15.5h4",
	},
	{
		title: "Versions you can actually see",
		body: "Named snapshots before every meaningful change, plus a diff that shows which words moved. Roll back without reconstructing what you lost.",
		icon: "M12 8v5l3.5 2M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4",
	},
	{
		title: "Variants that stay linked",
		body: "Tailor per role without forking. Sections track the master until you edit them, then they detach — so a new job doesn't silently rewrite three applications.",
		icon: "M6 4v16M18 4v16M6 8h12M6 16h12M3 8h3M3 16h3M18 8h3M18 16h3",
	},
	{
		title: "An editor that stays quiet",
		body: "Full rich text where prose needs it, precise fields where structure does. Your keyboard, your formatting, nothing rewritten behind your back.",
		icon: "M4 20h4l10-10-4-4L4 16v4Zm10-14 4 4",
	},
	{
		title: "Applications, tracked",
		body: "Every send is a record: which variant, which date, what stage. Follow-ups and interviews stop living in a notes app.",
		icon: "M9 11l3 3 8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9",
	},
	{
		title: "Export you can defend",
		body: "Pixel-accurate PDF with a real page break, plus clean ATS text from the same source — no two-truths export, no mystery formatting.",
		icon: "M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
	},
];

type Density = "airy" | "mid" | "dense";

const TEMPLATES: { name: string; note: string; density: Density }[] = [
	{ name: "Minimal", note: "One column, generous leading", density: "airy" },
	{ name: "Postgrad", note: "Academic, publications-forward", density: "dense" },
	{ name: "Undergrad", note: "Compact, coursework-friendly", density: "mid" },
];

const STEPS = [
	{
		n: "01",
		title: "Build the record",
		body: "Enter your experience, education and skills once. This is the version you'll trust, and every future document draws from it.",
	},
	{
		n: "02",
		title: "Tailor per role",
		body: "Spin a variant from the master. Reorder, rewrite and trim freely — linked sections keep tracking until you take them over.",
	},
	{
		n: "03",
		title: "Send and track",
		body: "Export a clean PDF, log the application, and move it through your pipeline. Nothing is rewritten while you're not looking.",
	},
];

const FAQ = [
	{
		q: "Is this an AI resume generator?",
		a: "No. That's a deliberate boundary. Generators write your resume for you, which is exactly when you stop owning it. Betta Resume gives you the tools to do everything around the writing — keeping facts straight across documents, tailoring honestly per role, controlling every word — and stops there.",
	},
	{
		q: "What if I'm applying somewhere tomorrow?",
		a: "You already have the content; you're just selecting and trimming. That's minutes, not an afternoon. A variant is a tailoring pass over material you already maintain.",
	},
	{
		q: "Will the PDF pass an ATS?",
		a: "Yes. The PDF is generated from the same structured source as the plain-text export, so there is no second version of your resume that can drift. You always get both, from one truth.",
	},
	{
		q: "What happens to my variants when I edit the master?",
		a: "Each section is either linked or detached. Linked sections pick up master edits. Detached ones are frozen, because you took that section over for a specific role. You decide per section, and you can see which is which.",
	},
	{
		q: "Can I get my data out?",
		a: "Yes. Export to PDF, plain text, and JSON at any time. Your resume is yours; it should not require this app to remain readable.",
	},
];

export function Positioning() {
	return (
		<section className="bg-[var(--brand-ink)] text-white">
			<div className="marketing-shell py-20 lg:py-24">
				<div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
					<div>
						<h2 className="text-title">
							The problem was never the blank page.
						</h2>
						<p className="text-lede mt-5 text-white/60">
							It was keeping thirty documents true at once.
						</p>
					</div>

					<div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
						<Contrast
							heading="A generator gives you"
							items={[
								"A finished resume you didn't write",
								"No idea what changed between versions",
								"Variants that are really just copies",
								"Prose that drifts from your real experience",
							]}
						/>
						<Contrast
							accent
							heading="A workbench gives you"
							items={[
								"One accurate record, reused everywhere",
								"A visible history you can roll back",
								"Variants that still track the master",
								"Every word under your control",
							]}
						/>
					</div>
				</div>
			</div>
		</section>
	);
}

function Contrast({
	heading,
	items,
	accent = false,
}: {
	heading: string;
	items: string[];
	accent?: boolean;
}) {
	return (
		<div>
			<h3
				className={`flex items-center gap-2 text-[0.78rem] font-semibold tracking-[0.12em] uppercase ${
					accent ? "text-[var(--brand-accent-bright)]" : "text-white/40"
				}`}
			>
				{accent && (
					<span
						aria-hidden="true"
						className="h-1.5 w-1.5 rounded-full bg-[var(--brand-accent-bright)]"
					/>
				)}
				{heading}
			</h3>
			<ul className="mt-4 space-y-3">
				{items.map((item) => (
					<li
						className={`flex gap-2.5 text-[0.95rem] leading-relaxed ${
							accent ? "text-white/85" : "text-white/45"
						}`}
						key={item}
					>
						<span
							aria-hidden="true"
							className={`mt-2 h-px w-3 shrink-0 ${
								accent ? "bg-[var(--brand-accent-bright)]" : "bg-white/25"
							}`}
						/>
						{item}
					</li>
				))}
			</ul>
		</div>
	);
}

export function Workbench() {
	return (
		<section className="rule-soft" id="workbench">
			<div className="marketing-shell py-20 lg:py-24">
				<div className="max-w-2xl">
					<h2 className="text-title">The workbench</h2>
					<p className="text-lede mt-5 text-[var(--brand-ink)]/65">
						Six capabilities that only matter if you're managing resumes rather
						than generating one.
					</p>
				</div>

				<div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
					{CAPABILITIES.map((c) => (
						<div className="group" key={c.title}>
							<div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--brand-ink)]/10 bg-white text-[var(--brand-accent)] transition-colors group-hover:border-[var(--brand-accent)]/40">
								<svg
									aria-hidden="true"
									className="h-5 w-5"
									fill="none"
									stroke="currentColor"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="1.6"
									viewBox="0 0 24 24"
								>
									<path d={c.icon} />
								</svg>
							</div>
							<h3 className="mt-4 text-[1.05rem] font-semibold tracking-tight">
								{c.title}
							</h3>
							<p className="mt-2 text-[0.925rem] leading-relaxed text-[var(--brand-ink)]/60">
								{c.body}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

export function Templates() {
	return (
		<section className="bg-[var(--brand-paper)]" id="templates">
			<div className="marketing-shell py-20 lg:py-24">
				<div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
					<div className="max-w-xl">
						<h2 className="text-title">Templates that behave</h2>
						<p className="text-lede mt-5 text-[var(--brand-ink)]/65">
							Typography and spacing you can tune, with page breaks that respect
							your content instead of slicing a bullet in half.
						</p>
					</div>
					<p className="shrink-0 text-[0.85rem] text-[var(--brand-ink)]/50">
						More landing as they're finished.
					</p>
				</div>

				<div className="mt-14 grid gap-6 md:grid-cols-3">
					{TEMPLATES.map((t) => (
						<figure
							className="group overflow-hidden rounded-2xl border border-[var(--brand-ink)]/10 bg-white transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--brand-ink)]/8"
							key={t.name}
						>
							<div className="flex h-72 justify-center overflow-hidden bg-[var(--brand-paper)] p-6">
								<TemplateThumb density={t.density} />
							</div>
							<figcaption className="border-t border-[var(--brand-ink)]/8 px-5 py-4">
								<h3 className="font-semibold tracking-tight">{t.name}</h3>
								<p className="mt-0.5 text-[0.85rem] text-[var(--brand-ink)]/55">
									{t.note}
								</p>
							</figcaption>
						</figure>
					))}
				</div>
			</div>
		</section>
	);
}

/** Schematic thumbnail — suggests a layout without pretending to be a screenshot. */
function TemplateThumb({ density }: { density: Density }) {
	const gap = density === "airy" ? "gap-4" : density === "mid" ? "gap-2.5" : "gap-1.5";
	const line = density === "dense" ? "h-[3px]" : density === "mid" ? "h-[4px]" : "h-[5px]";
	return (
		<div
			aria-hidden="true"
			className={`flex w-full max-w-44 flex-col rounded-md bg-white p-4 shadow-md ring-1 ring-[var(--brand-ink)]/8 ${gap}`}
		>
			<div className="h-3 w-2/3 rounded-sm bg-[var(--brand-ink)]/80" />
			<div className="h-[3px] w-1/2 rounded-sm bg-[var(--brand-ink)]/25" />
			<div className="mt-1 h-[3px] w-full rounded-sm bg-[var(--brand-accent)]/60" />
			{[1, 1, 1].map((row) => (
				<div className="flex flex-col gap-1" key={row}>
					<div className={`${line} w-1/3 rounded-sm bg-[var(--brand-ink)]/45`} />
					<div className={`${line} w-full rounded-sm bg-[var(--brand-ink)]/12`} />
					<div className={`${line} w-11/12 rounded-sm bg-[var(--brand-ink)]/12`} />
				</div>
			))}
		</div>
	);
}

export function Workflow() {
	return (
		<section className="rule-soft" id="workflow">
			<div className="marketing-shell py-20 lg:py-24">
				<div className="max-w-2xl">
					<h2 className="text-title">A loop, not a funnel</h2>
					<p className="text-lede mt-5 text-[var(--brand-ink)]/65">
						The value compounds. Each application makes the next one cheaper, because
						you're refining a record rather than rewriting a document.
					</p>
				</div>

				<ol className="mt-14 grid gap-8 md:grid-cols-3">
					{STEPS.map((s) => (
						<li className="relative" key={s.n}>
							{/* Connector between steps, desktop only. */}
							<span
								aria-hidden="true"
								className="absolute top-4 left-0 hidden h-px w-full bg-[var(--brand-ink)]/10 md:block"
							/>
							<div className="relative">
								<span className="tnum inline-flex h-8 items-center rounded-full border border-[var(--brand-ink)]/12 bg-white px-2.5 font-mono text-[0.75rem] font-semibold text-[var(--brand-accent)]">
									{s.n}
								</span>
								<h3 className="mt-5 text-[1.1rem] font-semibold tracking-tight">
									{s.title}
								</h3>
								<p className="mt-2 text-[0.925rem] leading-relaxed text-[var(--brand-ink)]/60">
									{s.body}
								</p>
							</div>
						</li>
					))}
				</ol>
			</div>
		</section>
	);
}

export function Faq() {
	return (
		<section className="bg-[var(--brand-paper)]" id="faq">
			<div className="marketing-shell py-20 lg:py-24">
				<div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
					<div>
						<h2 className="text-title">Questions</h2>
						<p className="text-lede mt-5 text-[var(--brand-ink)]/65">
							Including the one everyone asks first.
						</p>
					</div>

					{/*
					 * Native <details> rather than an accordion widget: no client JS,
					 * works without hydration, and is keyboard/screen-reader correct
					 * for free.
					 */}
					<div className="divide-y divide-[var(--brand-ink)]/10 border-y border-[var(--brand-ink)]/10">
						{FAQ.map((item) => (
							<details className="group py-5" key={item.q}>
								<summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-medium marker:content-none">
									{item.q}
									<span
										aria-hidden="true"
										className="mt-1 shrink-0 text-[var(--brand-accent)] transition-transform group-open:rotate-45"
									>
										+
									</span>
								</summary>
								<p className="mt-3 max-w-prose text-[0.925rem] leading-relaxed text-[var(--brand-ink)]/62">
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

export function ClosingCta() {
	return (
		<section className="relative overflow-hidden bg-[var(--brand-ink)]">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(38rem_20rem_at_50%_120%,color-mix(in_oklch,var(--brand-accent)_28%,transparent),transparent)]"
			/>
			<div className="marketing-shell relative py-20 text-center lg:py-28">
				<h2 className="text-title mx-auto max-w-3xl text-white">
					Stop retyping the same job into a new document.
				</h2>
				<p className="text-lede mx-auto mt-6 text-white/60">
					Build the record once. Tailor it honestly. Keep every version.
				</p>
				<div className="mt-10 flex flex-wrap justify-center gap-3">
					<a
						className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-medium text-[var(--brand-ink)] transition-all hover:-translate-y-0.5 hover:shadow-xl"
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
						className="on-ink inline-flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3.5 font-medium text-white transition-colors hover:bg-white/10"
						href="#templates"
					>
						Browse templates
					</a>
				</div>
			</div>
		</section>
	);
}