import type { Metadata } from "next";
import {
	ClosingCta,
	Faq,
	Positioning,
	Templates,
	Workflow,
	Workbench,
} from "@/components/marketing/sections";
import { Hero } from "@/components/marketing/hero";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";

export const metadata: Metadata = {
	title: "Betta Resume — a workbench for the resumes you actually manage",
	description:
		"Versioning, linked variants, a content library, and a rich editor that stays out of your way. Betta Resume does everything around writing a resume — and stops right before it.",
	alternates: { canonical: "/" },
	openGraph: {
		type: "website",
		url: "/",
		title: "Betta Resume — a workbench for the resumes you actually manage",
		description:
			"Versioning, linked variants, a content library, and a rich editor that stays out of your way.",
		siteName: "Betta Resume",
	},
	twitter: {
		card: "summary_large_image",
		title: "Betta Resume — a workbench for the resumes you actually manage",
		description:
			"Versioning, linked variants, a content library, and a rich editor that stays out of your way.",
	},
};

/**
 * Public marketing home page.
 *
 * Server component on purpose. It prerenders to real HTML at `/index.html`, so
 * crawlers and link previews can see it — which the hash-routed app never
 * could, since `#/…` is invisible to both. It also ships no client JS: the
 * hero preview is CSS, deliberately avoiding the Typst WASM compiler that
 * `src/lib/typst/` would otherwise pull in.
 *
 * The app itself moved to `/app`.
 */
export default function MarketingHome() {
	return (
		<div data-marketing>
			<SiteHeader />
			<main id="main">
				<Hero />
				<Positioning />
				<Workbench />
				<Templates />
				<Workflow />
				<Faq />
				<ClosingCta />
			</main>
			<SiteFooter />
		</div>
	);
}