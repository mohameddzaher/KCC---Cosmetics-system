import type { Metadata } from 'next';
import { getPageMetadata } from '@/lib/seoData';

export async function generateMetadata(): Promise<Metadata> {
  return getPageMetadata('order-sample', {
    title: 'Request a Custom Sample',
    description:
      'Design your custom cosmetic sample step by step — pick a category, ingredients, packaging and more. KCC turns your brief into a real formula.',
    path: '/order/sample',
  });
}

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
