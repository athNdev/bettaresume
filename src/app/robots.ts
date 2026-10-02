import type { MetadataRoute } from "next";

// `output: "export"` requires an explicit static directive on metadata routes.
export const dynamic = "force-static";

const SITE_URL =
	process.env.NEXT_PUBLIC_SITE_URL ?? "https://athndev.github.io/bettaresume";

/**
 * Allow the marketing page, keep the app out of the index. `/app` is behind
 * hash fragments and an auth gate, so it has nothing useful to offer a crawler
 * and linking it would only dilute the marketing page.
 */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/app", "/app/"],
			},
		],
		sitemap: `${SITE_URL}/sitemap.xml`,
		host: SITE_URL,
	};
}