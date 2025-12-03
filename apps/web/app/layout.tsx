import type { Metadata } from 'next';

import { RootProviders } from '~/components/root-providers';
import { sans, heading } from '~/lib/fonts';
import { generateRootMetadata } from '~/lib/root-metdata';

import '../styles/globals.css';

export const generateMetadata = generateRootMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${heading.variable}`} suppressHydrationWarning>
      <body>
        <RootProviders lang="en">{children}</RootProviders>
      </body>
    </html>
  );
}