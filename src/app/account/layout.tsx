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
        <div className="flex items-center justify-center min-h-screen bg-dark-950">
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
      <div className="min-h-screen bg-dark-950 pt-20 lg:pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <aside className="lg:w-64 shrink-0">
              <nav className="bg-dark-900/50 border border-dark-800 rounded-2xl p-3 space-y-1 lg:sticky lg:top-24">
                {sidebarLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.key}
                      href={link.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive(link.href)
                          ? 'bg-kcc-green/10 text-kcc-green'
                          : 'text-dark-400 hover:text-dark-50 hover:bg-dark-800'
                      }`}
                    >
                      <Icon size={18} />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              {children}
            </main>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
