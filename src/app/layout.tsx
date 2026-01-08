import type { Metadata } from 'next';
import { fontVariables, defaultFont } from '@/lib/fonts';
import { Providers } from '@/components/root-providers';
import { DevBadge } from '@/components/ui/dev-badge';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Betta Resume - Professional Resume Builder',
  description: 'Create professional, customizable resumes with ease',
  keywords: ['resume', 'cv', 'resume builder', 'professional resume'],
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
