import type { Metadata, Viewport } from "next";
import { defaultFont, fontVariables } from "@/lib/fonts";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import "@/styles/globals.css";

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		default: "Betta Resume — a workbench for the resumes you actually manage",
		template: "%s · Betta Resume",
	},
	description:
		"Versioning, linked variants, a content library, and a rich editor that stays out of your way. Betta Resume does everything around writing a resume — and stops right before it.",
	keywords: [
		"resume builder",
		"resume workbench",
		"resume variants",
		"resume versioning",
		"ATS resume",
		"cv builder",
		"tailored resume",
	],
	applicationName: "Betta Resume",
	authors: [{ name: "Betta Resume" }],
	icons: {
		icon: "/logo.svg",
	},
	openGraph: {
		type: "website",
		siteName: "Betta Resume",
		locale: "en_GB",
		/*
		 * `/og.png`, not the file convention's `/opengraph-image`.
		 *
		 * The convention emits an extensionless URL, and GitHub Pages types
		 * extensionless files as `application/octet-stream`. Crawlers read the
		 * extension before they read `og:image:type`, so a card that renders
		 * perfectly in a browser would silently refuse to unfurl.
		 */
		images: [OG_IMAGE],
	},
	twitter: {
		card: "summary_large_image",
	},
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#121212" },
	],
	width: "device-width",
	initialScale: 1,
};

/**
 * Root layout: document shell only.
 *
 * The provider tree (Clerk, tRPC, auth, toasts) deliberately lives in
 * `src/app/app/layout.tsx` instead of here. `ClerkAuthProvider` suspends while
 * Clerk initialises, and because a root layout wraps every route, that
 * suspense forced the marketing page to prerender as an empty shell plus a
 * client-side flight payload — i.e. invisible to any crawler that does not run
 * JavaScript, which defeats the entire point of having a real `/` route.
 *
 * Keeping the shell provider-free makes `/` genuinely static HTML.
 */
export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			{/*
			 * The app used to be mounted at `/`, so `#/dashboard` and friends
			 * exist in people's bookmarks and in shared links. `/` is now the
			 * marketing page and ignores fragments, which would silently strand
			 * those links. Bounce them to the app's new mount point before
			 * paint — a few bytes, and it keeps every existing deep link alive.
			 */}
			<head>
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: plain string script
					dangerouslySetInnerHTML={{
						__html:
							"try{if(/^#\\/(?!$)/.test(location.hash)&&location.pathname==='/'){location.replace('/app'+location.hash)}}catch(e){}",
					}}
				/>
			</head>
			<body className={`${fontVariables} ${defaultFont}`}>{children}</body>
		</html>
	);
}
