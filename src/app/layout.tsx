"use client";

import "@/styles/globals.css";

import { Geist } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={`${geist.variable}`} lang="en">
			<head>
				<title>BettaResume</title>
				<meta name="description" content="Resume builder application" />
				<link rel="icon" href="/favicon.ico" />
			</head>
			<body>
				<TRPCReactProvider>{children}</TRPCReactProvider>
			</body>
		</html>
	);
}
