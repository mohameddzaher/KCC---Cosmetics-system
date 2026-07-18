import type { Metadata } from 'next';
import { getPageMetadata } from '@/lib/seoData';

export async function generateMetadata(): Promise<Metadata> {
  return getPageMetadata('production', {
    title: 'Production Capabilities',
    description:
      "KCC's cosmetics production capabilities: formulation, mixing, filling, packaging and quality control across skincare, haircare and more.",
    path: '/production',
  });
}

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
