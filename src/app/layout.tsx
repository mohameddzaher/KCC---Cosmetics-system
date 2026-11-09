import './globals.css';
import type { Metadata, Viewport } from 'next';
import Providers from './providers';
import {
  SITE_URL, COMPANY, buildMetadata, JsonLd,
  organizationJsonLd, websiteJsonLd,
} from '@/lib/seo';
import { THEME_BOOT_SCRIPT } from '@/contexts/ThemeContext';
import { cookies } from 'next/headers';
import { Cormorant_Garamond, Inter, Noto_Sans_Arabic } from 'next/font/google';

/*
 * Served from this site and preloaded, instead of a CSS @import from Google
 * that blocked the first paint behind two extra round trips. Same families
 * and weights as before; globals.css reads them through these variables.
 */
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const cormorant = Cormorant_Garamond({
  subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-cormorant', display: 'swap',
  // Not in the first paint (the serif lines wait for the CMS): fetched when used.
  preload: false,
});
// Fetched when Arabic text is on the page, so English pages do not pay for it.
const notoArabic = Noto_Sans_Arabic({ subsets: ['arabic'], variable: '--font-noto-arabic', display: 'swap', preload: false });

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
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`${inter.variable} ${cormorant.variable} ${notoArabic.variable}`}
      suppressHydrationWarning
    >
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
