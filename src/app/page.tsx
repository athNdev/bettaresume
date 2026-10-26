import type { Metadata } from "next";
import {
	Example,
	PageFit,
	Readability,
} from "@/components/marketing/capabilities";
import { Craft, TaggedPdf } from "@/components/marketing/craft";
import { Hero } from "@/components/marketing/hero";
import {
	ClosingCta,
	Faq,
	Features,
	Principles,
	Templates,
} from "@/components/marketing/sections";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { OG_IMAGE } from "@/lib/site";

const TITLE = "Betta Resume — one master resume, tailored per role";
const DESCRIPTION =
	"Keep one master record of your career, fork a variant for each application, and export a PDF whose text layer you can read before you send it. Six templates, a page-fit meter, named readability checks and a tagged PDF — never a score.";

export const metadata: Metadata = {
	title: TITLE,
	description: DESCRIPTION,
	alternates: { canonical: "/" },
	openGraph: {
		type: "website",
		url: "/",
		title: TITLE,
		description: DESCRIPTION,
		siteName: "Betta Resume",
		/*
		 * Repeated from the root layout on purpose: a page that declares `openGraph`
		 * replaces the parent object rather than merging into it, so omitting this
		 * drops the card from the only page that is ever shared as a link.
		 */
		images: [OG_IMAGE],
	},
	twitter: {
		card: "summary_large_image",
		title: TITLE,
		description: DESCRIPTION,
	},
};

/**
 * Public marketing home page.
 *
 * Server component on purpose. It prerenders to real HTML at `/index.html`, so
 * crawlers and link previews can see it — which the hash-routed app never could,
 * since `#/…` is invisible to both. It also ships no client JS: the hero preview is
 * CSS, deliberately avoiding the Typst WASM compiler that `src/lib/typst/` would
 * otherwise pull in, and every section is a server component.
 *
 * Section order is the order a visitor's questions arrive in: what is it (hero),
 * what does it do (features), what will my document look like (templates), will it
 * fit (page fit), can I trust the review (readability), is the file itself a
 * document (tagged PDF), what does a finished document look like (example), how is
 * the product made (brand and design system), what are the boundaries (principles),
 * details (FAQ), close.
 *
 * The brand band and the tagged-PDF section are the material that shipped after the
 * previous pass. The design-system page is linked from the brand band, not from the
 * nav: `test/design-system-page.test.ts` keeps it out of the product nav, and its own
 * copy says it is a reference for the people building the product.
 *
 * The app itself lives at `/app`.
 */
export default function MarketingHome() {
	return (
		<div data-marketing>
			<SiteHeader />
			<main id="main">
				<Hero />
				<Features />
				<Templates />
				<PageFit />
				<Readability />
				<TaggedPdf />
				<Example />
				<Craft />
				<Principles />
				<Faq />
				<ClosingCta />
			</main>
			<SiteFooter />
		</div>
	);
}
