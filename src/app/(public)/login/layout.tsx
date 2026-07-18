import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Sign In',
  description: 'Sign in to your KCC account to track your samples, orders and referrals.',
  path: '/login',
  noIndex: true,
});

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
