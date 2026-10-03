import type { Metadata } from "next";

import { Hero } from "@/components/marketing/hero";
import {
	Audit,
	ClosingCta,
	Coverage,
	Export,
	Faq,
	Policy,
	Proof,
	Trust,
} from "@/components/marketing/sections";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";

const TITLE = "Betta Resume — see the text an ATS actually reads";
const DESCRIPTION =
	"Other builders render your resume in a browser, so their score is a guess about software they never ran. Betta Resume typesets a single-column text layer and shows it to you, with every parser constraint named and no score.";

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
 * crawlers and link previews can see it — which the hash-routed app never
 * could, since `#/…` is invisible to both. It also ships no client JS: the
 * hero preview is CSS, deliberately avoiding the Typst WASM compiler that
 * `src/lib/typst/` would otherwise pull in.
 *
 * Section order is trust order, not feature order: the hero states the claim
 * and shows the artefact; the audit makes it checkable; the policy section
 * earns the rest; the feature sections then have something to be believed
 * about. Do not reorder by what sounds most impressive.
 *
 * The app itself moved to `/app`.
 */
export default function MarketingHome() {
	return (
		<div data-marketing>
			<SiteHeader />
			<main id="main">
				<Hero />
				<Audit />
				<Policy />
				<Coverage />
				<Proof />
				<Export />
				<Trust />
				<Faq />
				<ClosingCta />
			</main>
			<SiteFooter />
		</div>
	);
}
