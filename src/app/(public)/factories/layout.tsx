import type { Metadata } from 'next';
import { getPageMetadata } from '@/lib/seoData';

export async function generateMetadata(): Promise<Metadata> {
  return getPageMetadata('factories', {
    title: 'Our Facilities',
    description:
      "Inside KCC's state-of-the-art, ISO 22716 & GMP-certified cosmetics manufacturing facilities in Saudi Arabia.",
    path: '/factories',
  });
}

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
