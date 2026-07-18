import type { Metadata } from 'next';
import { getPageMetadata } from '@/lib/seoData';

export async function generateMetadata(): Promise<Metadata> {
  return getPageMetadata('portfolio', {
    title: 'Portfolio',
    description:
      'Explore cosmetics brands and products manufactured by KCC — skincare, haircare, makeup and more, produced in our GMP-certified Saudi facility.',
    path: '/portfolio',
  });
}

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
