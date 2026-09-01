import './globals.css';
import type { Metadata, Viewport } from 'next';
import Providers from './providers';
import {
  SITE_URL, COMPANY, buildMetadata, JsonLd,
  organizationJsonLd, websiteJsonLd,
} from '@/lib/seo';
import { THEME_BOOT_SCRIPT } from '@/contexts/ThemeContext';
import { cookies } from 'next/headers';

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
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F1ED' },
    { media: '(prefers-color-scheme: dark)', color: '#1B1B24' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The language the reader last chose, so the markup leaves the server in it.
  const cookieLocale = (await cookies()).get('kcc-locale')?.value;
  const locale = cookieLocale === 'ar' ? 'ar' : 'en';

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        {/* Stamps data-theme + lang/dir before first paint — no theme or RTL flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      </head>
      <body className="antialiased min-h-screen bg-bg text-fg">
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
