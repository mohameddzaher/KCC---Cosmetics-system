import type { Metadata } from 'next';
import { getPageMetadata } from '@/lib/seoData';

export async function generateMetadata(): Promise<Metadata> {
  return getPageMetadata('order', {
    title: 'Request a Sample',
    description:
      'Start your cosmetics product with KCC — request a custom sample or place a bulk manufacturing order online.',
    path: '/order',
  });
}

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
