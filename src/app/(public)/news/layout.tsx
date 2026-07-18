import type { Metadata } from 'next';
import { getPageMetadata } from '@/lib/seoData';

export async function generateMetadata(): Promise<Metadata> {
  return getPageMetadata('news', {
    title: 'News & Updates',
    description:
      "Latest news, certifications and innovations from KCC — Saudi Arabia's cosmetics contract manufacturer.",
    path: '/news',
  });
}

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
