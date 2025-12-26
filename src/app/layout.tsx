import type { Metadata } from "next";
import { 
  Inter, 
  Roboto, 
  Open_Sans, 
  Lato, 
  Montserrat, 
  Playfair_Display,
  PT_Serif
} from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// Load all fonts
const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
});

const roboto = Roboto({ 
  weight: ['300', '400', '500', '700'],
  subsets: ["latin"],
  variable: '--font-roboto',
  display: 'swap',
});

const openSans = Open_Sans({ 
  subsets: ["latin"],
  variable: '--font-open-sans',
  display: 'swap',
});

const lato = Lato({ 
  weight: ['300', '400', '700'],
  subsets: ["latin"],
  variable: '--font-lato',
  display: 'swap',
});

const montserrat = Montserrat({ 
  subsets: ["latin"],
  variable: '--font-montserrat',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({ 
  subsets: ["latin"],
  variable: '--font-playfair',
  display: 'swap',
});

const ptSerif = PT_Serif({ 
  weight: ['400', '700'],
  subsets: ["latin"],
  variable: '--font-pt-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Better Resume - Professional Resume Builder",
  description: "Create professional, customizable resumes with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${roboto.variable} ${openSans.variable} ${lato.variable} ${montserrat.variable} ${playfairDisplay.variable} ${ptSerif.variable} ${inter.className}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
