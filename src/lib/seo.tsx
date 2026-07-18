import type { Metadata } from 'next';

/**
 * Central SEO configuration.
 * Set NEXT_PUBLIC_APP_URL (or NEXT_PUBLIC_SITE_URL) to the production domain on
 * the host — every canonical URL, OG tag, sitemap entry and JSON-LD node
 * derives from it, so switching domains is a one-variable change.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000'
).replace(/\/$/, '');

export const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'KCC';

export const COMPANY = {
  legalName: 'KCC — Saudi Company for Cosmetics',
  shortName: 'KCC',
  descriptionEn:
    'KCC is a Saudi cosmetics contract manufacturer offering private label, custom formulation, filling and packaging — ISO 22716 & GMP certified, serving beauty brands across Saudi Arabia and the GCC.',
  descriptionAr:
    'KCC شركة سعودية لتصنيع مستحضرات التجميل بالعقود، تقدم خدمات العلامة الخاصة والتركيبات المخصصة والتعبئة والتغليف — معتمدة ISO 22716 و GMP، وتخدم العلامات التجارية في السعودية والخليج.',
  city: 'Riyadh',
  country: 'SA',
  countryName: 'Saudi Arabia',
  email: 'info@kcc.sa',
  phone: '+966 11 000 0000',
  foundingYear: '2010',
} as const;

export const DEFAULT_OG_IMAGE = '/images/og-default.jpg';

const KEYWORDS = [
  'cosmetics manufacturing',
  'private label cosmetics',
  'contract manufacturer',
  'custom formulation',
  'skincare manufacturer',
  'haircare manufacturer',
  'GMP certified',
  'ISO 22716',
  'Saudi Arabia',
  'Riyadh',
  'GCC',
  'OEM cosmetics',
  'تصنيع مستحضرات التجميل',
  'العلامة الخاصة',
  'تصنيع مستحضرات تجميل السعودية',
];

interface PageSeoInput {
  title: string;
  description: string;
  path?: string;
  image?: string;
  keywords?: string[];
  noIndex?: boolean;
  type?: 'website' | 'article';
  publishedTime?: string;
}

/** Build a complete, consistent Metadata object for a page. */
export function buildMetadata({
  title,
  description,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  keywords,
  noIndex = false,
  type = 'website',
  publishedTime,
}: PageSeoInput): Metadata {
  const url = `${SITE_URL}${path === '/' ? '' : path}`;
  const ogImage = image.startsWith('http') ? image : `${SITE_URL}${image}`;

  return {
    title,
    description,
    keywords: keywords?.length ? keywords : KEYWORDS,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: {
      type,
      url,
      siteName: COMPANY.legalName,
      title,
      description,
      locale: 'en_US',
      alternateLocale: ['ar_SA'],
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

/** schema.org Organization — identifies the company to Google. */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: COMPANY.legalName,
    alternateName: COMPANY.shortName,
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/images/logo.png` },
    description: COMPANY.descriptionEn,
    foundingDate: COMPANY.foundingYear,
    email: COMPANY.email,
    telephone: COMPANY.phone,
    address: {
      '@type': 'PostalAddress',
      addressLocality: COMPANY.city,
      addressCountry: COMPANY.country,
    },
    areaServed: ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG'],
    knowsAbout: [
      'Cosmetics manufacturing',
      'Private label cosmetics',
      'Custom cosmetic formulation',
      'Skincare production',
      'Haircare production',
      'GMP compliant manufacturing',
    ],
  };
}

/** schema.org WebSite — enables sitelinks search box and site identity. */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: COMPANY.legalName,
    description: COMPANY.descriptionEn,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: ['en', 'ar'],
  };
}

/** schema.org BreadcrumbList for inner pages. */
export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path === '/' ? '' : item.path}`,
    })),
  };
}

/** Renders one or more JSON-LD blocks. */
export function JsonLd({ data }: { data: object | object[] }) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  );
}
