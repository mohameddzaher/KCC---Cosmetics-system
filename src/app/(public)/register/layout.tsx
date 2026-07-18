import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Create an Account',
  description: 'Create a KCC account to request samples, place bulk orders and manage your cosmetics projects.',
  path: '/register',
  noIndex: true,
});

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
