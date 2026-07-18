import type { Metadata } from 'next';
import { getPageMetadata } from '@/lib/seoData';

export async function generateMetadata(): Promise<Metadata> {
  return getPageMetadata('policies', {
    title: 'Policies',
    description: "KCC's privacy policy, terms of service and manufacturing policies.",
    path: '/policies',
  });
}

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
