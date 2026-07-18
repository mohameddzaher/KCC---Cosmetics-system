import type { Metadata } from 'next';
import { getPageMetadata } from '@/lib/seoData';

export async function generateMetadata(): Promise<Metadata> {
  return getPageMetadata('contact', {
    title: 'Contact KCC',
    description:
      'Get in touch with KCC for cosmetics manufacturing quotes, private label inquiries and partnership opportunities in Saudi Arabia and the GCC.',
    path: '/contact',
  });
}

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
