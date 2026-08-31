'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { User, Package, ShoppingBag } from 'lucide-react';

const sidebarLinks = [
  { key: 'account', href: '/account', icon: User, label: 'My Account' },
  { key: 'my-samples', href: '/account/my-samples', icon: Package, label: 'My Samples' },
  { key: 'my-orders', href: '/account/my-orders', icon: ShoppingBag, label: 'My Orders' },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen bg-bg">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kcc-green" />
        </div>
      </>
    );
  }

  if (!user) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/account') return pathname === '/account';
    return pathname.startsWith(href);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-bg pt-20 lg:pt-24">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
          {/*
            The three account sections used to sit in a card down the left,
            which cost a fixed column of width on every page and pushed the
            content — grids of orders and samples — into a narrow strip. They
            are a set of three, so they read better as a row across the top,
            leaving the whole width to what the page is actually for.
          */}
          <nav
            aria-label={t('account.title')}
            className="tab-bar scroll-thin mb-7"
          >
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors sm:gap-2 sm:px-4 sm:text-sm ${
                    active
                      ? 'bg-kcc-green/10 text-kcc-green'
                      : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
                  }`}
                >
                  <Icon size={17} className="hidden sm:block" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
      <Footer />
    </>
  );
}
