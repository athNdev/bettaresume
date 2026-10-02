import Link from "next/link";

/**
 * Marketing header. Server component — no client JS.
 *
 * The CTA points at `/app`, which is where the hash-routed SPA now lives.
 * Hash fragments are invisible to crawlers, so the app cannot own `/`.
 */
const NAV = [
	{ href: "/#workbench", label: "Workbench" },
	{ href: "/#templates", label: "Templates" },
	{ href: "/#workflow", label: "Workflow" },
	{ href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
	return (
		<>
			{/*
			 * WCAG 2.4.1 bypass block. The header is sticky and first in tab
			 * order, so without this a keyboard user tabs through the nav on
			 * every page before reaching content. Visually hidden until focused.
			 */}
			<a
				className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-lg focus:bg-[var(--brand-ink)] focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white"
				href="#main"
			>
				Skip to content
			</a>
			<header className="sticky top-0 z-50 border-b border-[var(--brand-ink)]/10 bg-[var(--brand-paper)]/85 backdrop-blur-xl">
				<div className="marketing-shell flex h-16 items-center justify-between gap-6">
					<Link
						className="flex items-center gap-2.5 font-semibold tracking-tight"
						href="/"
					>
						<BrandMark />
						<span className="text-[0.95rem]">Betta Resume</span>
					</Link>

					{/*
					 * Hidden below md rather than collapsed into a JS hamburger:
					 * a marketing nav with four items should not ship a menu
					 * bundle. Revisit if the nav grows.
					 */}
					<nav
						aria-label="Primary"
						className="hidden items-center gap-7 text-[0.9rem] text-[var(--brand-ink)]/70 md:flex"
					>
						{NAV.map((item) => (
							<Link
								className="transition-colors hover:text-[var(--brand-ink)]"
								href={item.href}
								key={item.href}
							>
								{item.label}
							</Link>
						))}
					</nav>

					<div className="flex items-center gap-2">
						<Link
							className="rounded-lg px-3.5 py-2 text-[0.9rem] font-medium text-[var(--brand-ink)]/75 transition-colors hover:bg-[var(--brand-ink)]/5 hover:text-[var(--brand-ink)]"
							href="/app"
						>
							Sign in
						</Link>
						<Link
							className="rounded-lg bg-[var(--brand-ink)] px-4 py-2 text-[0.9rem] font-medium text-white transition-transform hover:-translate-y-px hover:bg-[var(--brand-ink-soft)]"
							href="/app"
						>
							Start building
						</Link>
					</div>
				</div>
			</header>
		</>
	);
}

export function SiteFooter() {
	return (
		<footer className="bg-[var(--brand-ink)] text-white/70">
			<div className="marketing-shell py-14">
				<div className="flex flex-col gap-10 md:flex-row md:justify-between">
					<div className="max-w-xs">
						<div className="flex items-center gap-2.5 text-white">
							<BrandMark />
							<span className="font-semibold tracking-tight">
								Betta Resume
							</span>
						</div>
						<p className="mt-3.5 text-[0.9rem] leading-relaxed">
							A workbench for the resumes you actually manage — versioning,
							variants, and an editor that stays out of your way.
						</p>
					</div>

					<div className="grid grid-cols-2 gap-8 text-[0.9rem] sm:grid-cols-3">
						<FooterCol
							heading="Product"
							links={[
								["Workbench", "/#workbench"],
								["Templates", "/#templates"],
								["Workflow", "/#workflow"],
							]}
						/>
						<FooterCol
							heading="Resources"
							links={[
								["FAQ", "/#faq"],
								["Templates", "/#templates"],
							]}
						/>
						<FooterCol
							heading="Account"
							links={[
								["Sign in", "/app"],
								["Get started", "/app"],
							]}
						/>
					</div>
				</div>

				<div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-[0.8rem] sm:flex-row sm:items-center sm:justify-between">
					<p>© {new Date().getFullYear()} Betta Resume.</p>
					<p className="text-white/45">
						Built for people who send more than one resume.
					</p>
				</div>
			</div>
		</footer>
	);
}

function FooterCol({
	heading,
	links,
}: {
	heading: string;
	links: [string, string][];
}) {
	return (
		<div>
			<h2 className="font-semibold text-white">{heading}</h2>
			<ul className="mt-3.5 space-y-2.5">
				{links.map(([label, href]) => (
					<li key={href + label}>
						<Link
							className="transition-colors hover:text-white"
							href={href}
						>
							{label}
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}

/** Wordmark. Inline SVG so it inherits currentColor and costs no request. */
export function BrandMark({ className = "" }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={`h-7 w-7 shrink-0 ${className}`}
			viewBox="0 0 32 32"
			fill="none"
		>
			<rect height="32" rx="9" fill="var(--brand-accent)" />
			<path
				d="M10 9h7.2c3.5 0 5.6 1.7 5.6 4.3 0 1.7-.9 3-2.4 3.6 1.9.6 3.1 2 3.1 4 0 2.9-2.4 4.8-6.2 4.8H10V9Zm3.4 6.6h3c1.3 0 2.1-.7 2.1-1.8s-.8-1.8-2.1-1.8h-3v3.6Zm0 6.8h3.4c1.5 0 2.4-.8 2.4-2s-.9-2-2.4-2h-3.4v4Z"
				fill="#fff"
			/>
		</svg>
	);
}