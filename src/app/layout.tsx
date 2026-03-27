import type { Metadata } from "next";
import { Providers } from "@/app/provider";
import { DevBadge } from "@/components/ui/dev-badge";
import { defaultFont, fontVariables } from "@/lib/fonts";
import "@/styles/globals.css";

export const metadata: Metadata = {
	title: "Betta Resume - Professional Resume Builder",
	description: "Create professional, customizable resumes with ease",
	keywords: ["resume", "cv", "resume builder", "professional resume"],
	icons: {
		icon: "/logo.svg",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${fontVariables} ${defaultFont}`}>
				<Providers>{children}</Providers>
				<DevBadge />
			</body>
		</html>
	);
}
