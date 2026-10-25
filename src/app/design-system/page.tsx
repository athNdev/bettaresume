import type { Metadata } from "next";
import Link from "next/link";

import { BrandLockup } from "@/components/brand/brand-lockup";
import { BrandSection } from "@/components/design-system/brand-section";
import { ColourSection } from "@/components/design-system/colour-section";
import { ComponentSection } from "@/components/design-system/component-section";
import { DSSection } from "@/components/design-system/primitives";
import { RulesSection } from "@/components/design-system/rules-section";
import { ScalesSection } from "@/components/design-system/scales-section";
import {
	OrnamentSection,
	StateSection,
} from "@/components/design-system/state-section";
import { ThemeToggle } from "@/components/design-system/theme-toggle";
import { TypeSection } from "@/components/design-system/type-section";
import { Button } from "@/components/ui/button";
import { loadTokenTheme } from "@/lib/design-system/token-theme";

export const metadata: Metadata = {
	title: "Design system",
	description:
		"The Betta Resume design system: brand, colour, type, density, every component state, and the numbered rules the tests enforce.",
	// Internal reference. The marketing page owns the public surface.
	robots: { index: false, follow: false },
};

/**
 * `/design-system` — a static route, not a hash route.
 *
 * Three reasons, in order of weight:
 *
 * 1. **Review access.** Every route inside the hash router is behind Clerk —
 *    `/` redirects an unauthenticated visitor to sign-in. A page whose whole
 *    purpose is "let the maintainer read and comment on the system" cannot be
 *    behind a login, and it needs no user data to render.
 * 2. **It is documentation.** Static HTML is readable by crawlers, by link
 *    previews and by `view-source`, and it survives being shared as a URL.
 *    The hash router is for application state; this page has none.
 * 3. **No providers.** It lives outside `/app`, so it inherits the provider-free
 *    root layout and ships no Clerk/tRPC bundle. The only client JavaScript is
 *    the theme switch and the copy-token buttons.
 *
 * It is deliberately absent from the marketing nav: that copy is pinned by
 * `test/marketing-claims.test.ts`, and this is a tool for the people building
 * the product, not a marketing claim.
 *
 * The contrast figures are computed at build time from `globals.css` by the
 * same resolver the tests use, so they cannot be stale.
 */
const SECTIONS = [
	["brand", "Brand"],
	["colour", "Colour"],
	["type", "Typography"],
	["scales", "Space & depth"],
	["components", "Components"],
	["states", "States"],
	["ornament", "Ornament"],
	["rules", "Rules"],
] as const;

export default function DesignSystemPage() {
	const theme = loadTokenTheme();

	return (
		<div className="min-h-dvh bg-background text-foreground">
			<header className="sticky top-0 z-(--br-z-sticky) border-b bg-background">
				<div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-6">
					<Link
						aria-label="Betta Resume — home"
						className="flex items-center"
						href="/"
					>
						<BrandLockup size="sm" />
					</Link>
					<span
						className="hidden text-fg-muted text-xs sm:inline"
						data-responsive-duplicate="page title"
					>
						Design system
					</span>
					<div className="ml-auto flex items-center gap-2">
						<ThemeToggle />
						<Button asChild size="sm" variant="outline">
							<Link href="/app">Open the app</Link>
						</Button>
					</div>
				</div>
			</header>

			<div className="mx-auto flex max-w-7xl gap-12 px-6 py-12">
				<aside
					className="hidden w-52 shrink-0 lg:block"
					data-responsive-duplicate="mobile contents nav"
				>
					<nav
						aria-label="Sections"
						className="sticky top-20 flex flex-col gap-1"
					>
						<span className="br-micro mb-2">Contents</span>
						{SECTIONS.map(([id, label]) => (
							<a
								className="rounded-sm px-2 py-1 text-fg-muted text-sm transition-colors hover:bg-accent hover:text-foreground"
								href={`#${id}`}
								key={id}
							>
								{label}
							</a>
						))}
						<span className="br-micro mt-6 mb-2">Review</span>
						<span className="px-2 text-fg-muted text-xs leading-relaxed">
							Cite a rule as DS-n. Copy any token with its row. Toggle the theme
							in the header; every specimen follows.
						</span>
					</nav>
				</aside>

				<main className="min-w-0 flex-1">
					<div className="mb-16 flex max-w-prose flex-col gap-4">
						<span className="br-micro">Betta Resume · design system v2</span>
						<h1 className="font-semibold text-xl tracking-title">
							Ink, paper, and instrument
						</h1>
						<p className="text-base leading-relaxed">
							A workbench that treats a resume as a document being machined
							toward an interview: calm, exact, editorial. This page renders the
							system — brand, colour, type, depth, every component state, and
							the numbered rules. It is built from the same tokens it documents.
						</p>
						<div className="flex flex-wrap items-center gap-2 text-fg-muted text-xs">
							<span className="br-chip" data-tone="success">
								<span aria-hidden>✓</span>
								Both themes complete
							</span>
							<span className="br-chip" data-tone="success">
								<span aria-hidden>✓</span>
								Text ≥ 4.5:1
							</span>
							<span className="br-chip" data-tone="success">
								<span aria-hidden>✓</span>
								Controls ≥ 3:1
							</span>
							<span className="br-chip" data-tone="success">
								<span aria-hidden>✓</span>
								Scales closed
							</span>
						</div>
						<nav
							aria-label="Sections"
							className="flex flex-wrap gap-2 pt-2 lg:hidden"
						>
							{SECTIONS.map(([id, label]) => (
								<a
									className="rounded-sm border px-2 py-1 text-fg-muted text-xs transition-colors hover:bg-accent hover:text-foreground"
									href={`#${id}`}
									key={id}
								>
									{label}
								</a>
							))}
						</nav>
					</div>

					<div className="space-y-24">
						<DSSection
							id="brand"
							index="01"
							lede="Wordmark, mark, sizes, clear space and colour. The mark is two offset sheets — a master and a variant; the wordmark is Inter at two weights. Mono first, accent as an event."
							title="Brand"
						>
							<BrandSection />
						</DSSection>

						<DSSection
							id="colour"
							index="02"
							lede="One neutral ramp, one accent hue, four status meanings. Every ratio below is measured from the token file in both themes — a reviewer does not have to trust a number typed by hand."
							title="Colour"
						>
							<ColourSection theme={theme} />
						</DSSection>

						<DSSection
							id="type"
							index="03"
							lede="Seven sizes, nine roles. Hierarchy comes from tone, then weight, then spacing, then case — in that order. Two sizes live in any one view; 12px is the floor."
							title="Typography"
						>
							<TypeSection />
						</DSSection>

						<DSSection
							id="scales"
							index="04"
							lede="The closed scales: 4px spacing, 28/32/40 controls, 4/6/8/12 radii, two-layer elevation, three durations and one z-index ladder. Off-scale is a bug, not a preference."
							title="Space, depth & motion"
						>
							<ScalesSection theme={theme} />
						</DSSection>

						<DSSection
							id="components"
							index="05"
							lede="Every primitive in the states it owns. Hover, active and focus are shown as the surface values they resolve to; default, disabled, loading, error and selection are real props."
							title="Components"
						>
							<ComponentSection />
						</DSSection>

						<DSSection
							id="states"
							index="06"
							lede="Empty is designed, loading keeps the shape, errors are callouts in the region they affect. These are the app's real components, not illustrations."
							title="Empty, loading, error"
						>
							<StateSection />
						</DSSection>

						<DSSection
							id="ornament"
							index="07"
							lede="Exactly five places may be decorative, and the rest of the chrome is deliberately quiet. The budget is a list, not a mood."
							title="Ornament budget"
						>
							<OrnamentSection />
						</DSSection>

						<DSSection
							id="rules"
							index="08"
							lede="Fifteen numbered rules, each with the test that fails when it is broken. Cite them in review."
							title="Rules"
						>
							<RulesSection />
						</DSSection>
					</div>

					<footer className="mt-24 flex flex-col gap-2 border-t pt-8 text-fg-muted text-xs">
						<span>
							Source of truth:{" "}
							<code className="font-mono">src/styles/globals.css</code>.
							Enforced by <code className="font-mono">npx vitest run</code> and{" "}
							<code className="font-mono">npx biome check .</code>.
						</span>
						<span>
							Brand assets are generated by{" "}
							<code className="font-mono">scripts/brand-assets.cjs</code>. The
							resume document (Surface B) is out of scope: paper stays paper,
							with its own palette and no chrome tokens.
						</span>
					</footer>
				</main>
			</div>
		</div>
	);
}
