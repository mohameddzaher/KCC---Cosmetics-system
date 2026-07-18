import type { Metadata } from 'next';
import { getPageMetadata } from '@/lib/seoData';

export async function generateMetadata(): Promise<Metadata> {
  return getPageMetadata('about', {
    title: 'About KCC',
    description:
      'KCC is a Saudi cosmetics contract manufacturer — private label, custom formulation and GMP-certified production in Riyadh, serving beauty brands across the GCC.',
    path: '/about',
  });
}

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
