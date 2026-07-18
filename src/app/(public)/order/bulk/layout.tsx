import type { Metadata } from 'next';
import { getPageMetadata } from '@/lib/seoData';

export async function generateMetadata(): Promise<Metadata> {
  return getPageMetadata('order-bulk', {
    title: 'Bulk Manufacturing Order',
    description:
      'Place a bulk cosmetics manufacturing order with KCC — competitive MOQs, GMP-certified production and full regulatory support.',
    path: '/order/bulk',
  });
}

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
