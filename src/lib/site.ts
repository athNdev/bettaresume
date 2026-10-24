/**
 * The site's canonical origin and link-preview copy, in one place.
 *
 * Production is served from the GitHub Pages custom domain; the Pages hostname
 * redirects to it. The origin used to be repeated in `layout.tsx`, `sitemap.ts` and
 * `robots.ts`, each defaulting to `https://athndev.github.io/bettaresume`, so every
 * canonical, sitemap entry and OG image URL pointed at the redirecting host rather
 * than the real one — precisely the duplicate-origin signal a canonical tag exists
 * to prevent. Override with `NEXT_PUBLIC_SITE_URL` if the domain changes again.
 */
export const SITE_URL =
	process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.bettaresume.com";

/**
 * Alt text for the link-preview card.
 *
 * Shared by the image route and the metadata that points at it, because a card whose
 * description disagrees with its own pixels is worse than no card.
 */
export const OG_ALT =
	"Betta Resume — one master resume, tailored per role. Keep one master record, fork a variant for each application, export a PDF whose text layer you can read.";

/**
 * The link-preview image, as metadata wants it.
 *
 * `/og.png` is a route (`src/app/og.png/route.tsx`) so the file it writes carries the
 * extension GitHub Pages needs to serve it as `image/png`.
 *
 * This has to be attached to every route that declares its own `openGraph` object:
 * Next merges metadata per field, and a page that sets `openGraph` replaces the parent
 * object rather than merging into it. That is why the marketing page silently lost its
 * card when only the root layout carried one.
 */
export const OG_IMAGE = {
	url: "/og.png",
	width: 1200,
	height: 630,
	alt: OG_ALT,
} as const;
