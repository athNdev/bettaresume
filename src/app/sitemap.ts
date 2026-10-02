import type { MetadataRoute } from "next";

// `output: "export"` requires an explicit static directive on metadata routes.
export const dynamic = "force-static";

const SITE_URL =
	process.env.NEXT_PUBLIC_SITE_URL ?? "https://athndev.github.io/bettaresume";

/**
 * The marketing page is the only crawlable surface — the app lives at `/app`
 * behind hash fragments, which crawlers cannot index. Keeping the sitemap to
 * real routes avoids advertising dozens of empty hash routes.
 */
export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{
			url: `${SITE_URL}/`,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 1,
		},
	];
}