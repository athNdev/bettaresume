import type { Metadata } from "next";
import { Providers } from "@/app/provider";
import { DevBadge } from "@/components/ui/dev-badge";

export const metadata: Metadata = {
	title: "Betta Resume",
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