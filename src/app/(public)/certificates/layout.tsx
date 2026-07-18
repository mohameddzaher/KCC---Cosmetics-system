import type { Metadata } from 'next';
import { getPageMetadata } from '@/lib/seoData';

export async function generateMetadata(): Promise<Metadata> {
  return getPageMetadata('certificates', {
    title: 'Certifications',
    description:
      "KCC's quality and compliance certifications — ISO 9001, ISO 22716 (GMP), ISO 14001 and ISO 45001 — for trusted cosmetics manufacturing.",
    path: '/certificates',
  });
}

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
