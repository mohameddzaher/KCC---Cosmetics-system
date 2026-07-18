import './globals.css';
import type { Metadata, Viewport } from 'next';
import Providers from './providers';
import {
  SITE_URL, COMPANY, buildMetadata, JsonLd,
  organizationJsonLd, websiteJsonLd,
} from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${COMPANY.legalName} — Cosmetics Contract Manufacturing`,
    template: `%s | ${COMPANY.shortName}`,
  },
  applicationName: COMPANY.shortName,
  icons: { icon: '/favicon.ico' },
  ...buildMetadata({
    title: `${COMPANY.legalName} — Cosmetics Contract Manufacturing`,
    description: COMPANY.descriptionEn,
    path: '/',
  }),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      </head>
      <body className="antialiased min-h-screen bg-cream-100 text-ink-700">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
