import Link from "next/link";

import { BrandLockup } from "@/components/brand/brand-lockup";

/**
 * Marketing header and footer. Server component — no client JS.
 *
 * The CTA points at `/app`, which is where the hash-routed SPA now lives.
 * Hash fragments are invisible to crawlers, so the app cannot own `/`.
 *
 * The nav carries the five sections a visitor will want to jump to; the two
 * remaining anchors (`#example`, `#principles`) live in the footer so the header row
 * still fits at 768px. Every section on the page is linked from one of the two, and
 * `test/marketing-claims.test.ts` fails if a section id has no anchor.
 */
const NAV = [
	{ href: "/#features", label: "Features" },
	{ href: "/#templates", label: "Templates" },
	{ href: "/#page-fit", label: "Page fit" },
	{ href: "/#readability", label: "Readability" },
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
				 * needs more than the viewport, so the CTA sat past the right edge. A fixed
				 * height leaves wrapping nowhere to go — the same defect the dashboard and
				 * editor headers had. With the body mask gone, the matrix reports it instead
				 * of clipping it.
				 */}
				<div className="marketing-shell flex min-h-16 flex-wrap items-center justify-between gap-3 py-2 sm:gap-6">
					<Link
						aria-label="Betta Resume — home"
						className="shrink-0 whitespace-nowrap text-[var(--brand-text)]"
						href="/"
					>
						<BrandLockup size="md" />
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

					<div className="flex shrink-0 items-center gap-2">
						{/*
						 * "Sign in" is hidden below sm: the header row is one flex line,
						 * and at 390px the wordmark plus both labels overflow the viewport.
						 * It points at the same place as the CTA beside it and is still
						 * in the footer, so nothing is lost.
						 */}
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
							Open the editor
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
							<BrandLockup size="md" />
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
								["Templates", "/#templates"],
								["Page fit", "/#page-fit"],
							]}
						/>
						<FooterCol
							heading="Resources"
							links={[
								["Readability", "/#readability"],
								["Tagged PDF", "/#tagged-pdf"],
								["Example resume", "/#example"],
								["How it's built", "/#craft"],
								["What we won't build", "/#principles"],
								["FAQ", "/#faq"],
							]}
						/>
						<FooterCol
							heading="Account"
							links={[
								["Sign in", "/app"],
								["Open the editor", "/app"],
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
 * The old placeholder mark (`BrandMark`) lived here as a rounded accent tile
 * with a "B" in it. The brand is now a real system in `src/components/brand/`:
 * two offset sheets, mono by default, with the accent used as an event rather
 * than a fill. The filename stays exported for anything that linked to it.
 */
export { BrandMark } from "@/components/brand/brand-mark";
