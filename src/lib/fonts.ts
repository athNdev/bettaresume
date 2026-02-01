/**
 * Font Configuration
 *
 * Centralized font loading using next/font/google.
 */

import {
	Inter,
	Lato,
	Montserrat,
	Open_Sans,
	Playfair_Display,
	PT_Serif,
	Roboto,
} from "next/font/google";

// Primary UI font
const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

// Professional/Technical font
const roboto = Roboto({
	weight: ["300", "400", "500", "700"],
	subsets: ["latin"],
	variable: "--font-roboto",
	display: "swap",
});

// Clean readable font
const openSans = Open_Sans({
	subsets: ["latin"],
	variable: "--font-open-sans",
	display: "swap",
});

// Elegant sans-serif
const lato = Lato({
	weight: ["300", "400", "700"],
	subsets: ["latin"],
	variable: "--font-lato",
	display: "swap",
});

// Modern heading font
const montserrat = Montserrat({
	subsets: ["latin"],
	variable: "--font-montserrat",
	display: "swap",
});

// Elegant serif for headings
const playfairDisplay = Playfair_Display({
	subsets: ["latin"],
	variable: "--font-playfair",
	display: "swap",
});

// Classic serif
const ptSerif = PT_Serif({
	weight: ["400", "700"],
	subsets: ["latin"],
	variable: "--font-pt-serif",
	display: "swap",
});

// Combined font variables for the body class
export const fontVariables = [
	inter.variable,
	roboto.variable,
	openSans.variable,
	lato.variable,
	montserrat.variable,
	playfairDisplay.variable,
	ptSerif.variable,
].join(" ");

// Default font className
export const defaultFont = inter.className;
