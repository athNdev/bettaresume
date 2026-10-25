import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Marketing header and footer. Server component — no client JS.
 *
 * The CTA points at `/app`, which is where the hash-routed SPA now lives.
 * Hash fragments are invisible to crawlers, so the app cannot own `/`.
 */
const NAV = [
	{ href: "/#features", label: "Features" },
	{ href: "/#workflow", label: "How it works" },
	{ href: "/#inspect", label: "Parser fit" },
	{ href: "/#templates", label: "Templates" },
	{ href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
	return (
		<>
			{/*
			 * WCAG 2.4.1 bypass block. The header is sticky and first in tab
			 * order, so without this a keyboard user tabs through the nav on
			 * every page before reaching content. Visually hidden until focused.
			 *
			 * `--br-z-dropdown`, not `sticky`: it must clear the sticky header
			 * below it (the ladder's `sticky` rung), and the first rung above
			 * that is the dropdown one.
			 */}
			<a
				className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--br-z-dropdown) focus:rounded-lg focus:bg-[var(--brand-ink)] focus:px-4 focus:py-2 focus:font-medium focus:text-[var(--brand-text-on-ink)] focus:text-sm"
				href="#main"
			>
				Skip to content
			</a>
			{/*
			 * Solid paper plus a hairline, not a translucent panel with a
			 * backdrop-filter. Blur-over-alpha is the 2021 glassmorphism tell,
			 * it costs an extra compositing layer, and at 85% opacity the nav
			 * text sat on a moving background — which is a legibility problem
			 * before it is a taste problem.
			 */}
			<header className="sticky top-0 z-(--br-z-sticky) border-[var(--brand-rule)] border-b bg-[var(--brand-paper)]">
				{/*
				 * `min-h-16` + wrap, not `h-16`.
				 *
				 * Measured in the viewport matrix: at 768px the nav appears and the row
				 * needs 857px, so the CTA sat 89px past the right edge. A fixed height
				 * leaves wrapping nowhere to go — the same defect the dashboard and
				 * editor headers had. With the body mask gone, the matrix reports it
				 * instead of clipping it.
				 */}
				<div className="marketing-shell flex min-h-16 flex-wrap items-center justify-between gap-3 py-2 sm:gap-6">
					<Link
						className="flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold text-[var(--brand-text)] text-base"
						href="/"
					>
						<BrandMark />
						<span>Betta Resume</span>
					</Link>

					{/*
					 * Hidden below md rather than collapsed into a JS hamburger:
					 * a marketing nav with five items should not ship a menu
					 * bundle. Revisit if the nav grows.
					 */}
					<nav
						aria-label="Primary"
						className="hidden items-center gap-6 text-[var(--brand-text-muted)] text-base md:flex"
						data-responsive-duplicate="footer nav"
					>
						{NAV.map((item) => (
							<Link
								className="transition-colors hover:text-[var(--brand-accent)]"
								href={item.href}
								key={item.href}
							>
								{item.label}
							</Link>
						))}
					</nav>

					{/*
					 * "Sign in" is hidden below sm: the header row is one flex line,
					 * and at 390px the wordmark plus both labels overflow the viewport.
					 * It points at the same place as the CTA beside it and is still
					 * in the footer, so nothing is lost.
					 */}
					<div className="flex shrink-0 items-center gap-2">
						<Link
							className="hidden whitespace-nowrap rounded-lg px-3 py-2 font-medium text-[var(--brand-text-muted)] text-base transition-colors hover:bg-[var(--brand-ink)]/5 hover:text-[var(--brand-text)] sm:block sm:px-4"
							data-responsive-duplicate="footer sign-in"
							href="/app"
						>
							Sign in
						</Link>
						<Link
							className="whitespace-nowrap rounded-lg bg-[var(--brand-ink)] px-3 py-2 font-medium text-[var(--brand-text-on-ink)] text-base transition-transform hover:-translate-y-px hover:bg-[var(--brand-ink-soft)] sm:px-4"
							href="/app"
						>
							Check your resume
						</Link>
					</div>
				</div>
			</header>
		</>
	);
}

export function SiteFooter() {
	return (
		<footer className="bg-[var(--brand-ink)] text-[var(--brand-text-on-ink-muted)]">
			<div className="marketing-shell py-12">
				<div className="flex flex-col gap-12 md:flex-row md:justify-between">
					<div className="max-w-xs">
						<div className="flex items-center gap-2 text-[var(--brand-text-on-ink)]">
							<BrandMark />
							<span className="font-semibold">Betta Resume</span>
						</div>
						<p className="mt-3 text-base">
							One master record of your career, a variant for every role, and an
							export you can inspect before you send it.
						</p>
					</div>

					<div className="grid grid-cols-2 gap-8 text-base sm:grid-cols-3">
						<FooterCol
							heading="Product"
							links={[
								["Features", "/#features"],
								["How it works", "/#workflow"],
								["Templates", "/#templates"],
							]}
						/>
						<FooterCol
							heading="Resources"
							links={[
								["Parser fit", "/#inspect"],
								["What we won't build", "/#principles"],
								["FAQ", "/#faq"],
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

				<div className="mt-12 flex flex-col gap-3 border-[var(--brand-ink-soft)] border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
					<p>© {new Date().getFullYear()} Betta Resume.</p>
					<p className="text-[var(--brand-text-on-ink-faint)]">
						No invented content. No score. No trackers.
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
			<h2 className="font-semibold text-[var(--brand-text-on-ink)]">
				{heading}
			</h2>
			<ul className="mt-3 space-y-2">
				{links.map(([label, href]) => (
					<li key={href + label}>
						<Link
							className="transition-colors hover:text-[var(--brand-text-on-ink)]"
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

/**
 * Wordmark. Inline SVG so it inherits currentColor and costs no request.
 *
 * The tile uses `--brand-accent` at 7.3:1 against paper. The white glyph on that
 * tile is 5.9:1, and the mark is decorative — `aria-hidden` — so the figure is
 * reported here only so a future colour change is checked rather than assumed.
 */
export function BrandMark({ className = "" }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={cn("h-7 w-7 shrink-0", className)}
			fill="none"
			viewBox="0 0 32 32"
		>
			<rect fill="var(--brand-accent)" height="32" rx="7" />
			<path
				d="M10 9h7.2c3.5 0 5.6 1.7 5.6 4.3 0 1.7-.9 3-2.4 3.6 1.9.6 3.1 2 3.1 4 0 2.9-2.4 4.8-6.2 4.8H10V9Zm3.4 6.6h3c1.3 0 2.1-.7 2.1-1.8s-.8-1.8-2.1-1.8h-3v3.6Zm0 6.8h3.4c1.5 0 2.4-.8 2.4-2s-.9-2-2.4-2h-3.4v4Z"
				fill="var(--brand-card)"
			/>
		</svg>
	);
}
