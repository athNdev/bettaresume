import type { Metadata } from "next";
import { Providers } from "@/app/provider";
import { DevBadge } from "@/components/ui/dev-badge";

export const metadata: Metadata = {
	/*
	 * `absolute`, not a plain string.
	 *
	 * The root layout sets `title.template: "%s · Betta Resume"`, so a page that declares
	 * a title of its own gets the suffix — and this one declared "Betta Resume", which
	 * shipped a tab reading "Betta Resume · Betta Resume". `absolute` opts out of the
	 * template, which is what a page whose title IS the bare product name wants.
	 */
	title: { absolute: "Betta Resume" },
	// The app is behind auth and hash routing; nothing here is worth indexing.
	robots: { index: false, follow: false },
};

/**
 * Layout for the application SPA (`/app`).
 *
 * This is where the provider tree lives. It used to sit in the root layout,
 * which meant every route — including the public marketing page — was subject
 * to `ClerkAuthProvider`'s suspense during SSR. See `src/app/layout.tsx`.
 */
export default function AppLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<Providers>
			{children}
			<DevBadge />
		</Providers>
	);
}
