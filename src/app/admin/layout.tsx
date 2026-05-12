'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard, FileText, ShoppingCart, Users, Package,
  DollarSign, Search as SearchIcon, Tag, Share2, Brain, Settings,
  Menu, X, ChevronLeft, Globe, LogOut, Bell, Sparkles
} from 'lucide-react';

const sidebarItems = [
  { key: 'dashboard', href: '/admin', icon: LayoutDashboard },
  { key: 'cms', href: '/admin/cms', icon: FileText },
  { key: 'orders', href: '/admin/orders', icon: ShoppingCart },
  { key: 'customers', href: '/admin/customers', icon: Users },
  { key: 'inventory', href: '/admin/inventory', icon: Package },
  { key: 'accounting', href: '/admin/accounting', icon: DollarSign },
  { key: 'seo', href: '/admin/seo', icon: SearchIcon },
  { key: 'promos', href: '/admin/promos', icon: Tag },
  { key: 'referrals', href: '/admin/referrals', icon: Share2 },
  { key: 'knowledge', href: '/admin/knowledge', icon: Brain },
  { key: 'sampleQuiz', href: '/admin/sample-quiz', icon: Sparkles },
  { key: 'settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(user.role))) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Auto-close mobile sidebar when navigating to a new page
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kcc-green"></div>
      </div>
    );
  }

  if (!user || !['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(user.role)) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen bg-dark-950">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 start-0 z-50 flex flex-col bg-dark-900 border-e border-dark-800 transition-all duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${collapsed ? 'w-16' : 'w-64'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-dark-800">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-xl font-black">
                <span className="text-kcc-green">K</span>CC
              </span>
              <span className="text-xs text-dark-400">Admin</span>
            </Link>
          )}
          <button
            type="button"
            aria-label={sidebarOpen ? 'Close sidebar' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarOpen ? 'Close' : collapsed ? 'Expand' : 'Collapse'}
            onClick={() => { if (window.innerWidth >= 1024) setCollapsed(!collapsed); else setSidebarOpen(false); }}
            className="p-1.5 text-dark-400 hover:text-dark-50 rounded-lg hover:bg-dark-800"
          >
            {sidebarOpen ? <X size={18} /> : <ChevronLeft size={18} className={collapsed ? 'rotate-180' : ''} />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? 'bg-kcc-green/10 text-kcc-green'
                    : 'text-dark-400 hover:text-dark-50 hover:bg-dark-800'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? t(`admin.${item.key}`) : undefined}
              >
                <Icon size={18} />
                {!collapsed && <span>{t(`admin.${item.key}`)}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-dark-800">
          <button
            type="button"
            onClick={logout}
            aria-label={t('nav.logout')}
            title={t('nav.logout')}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-dark-800 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={18} />
            {!collapsed && <span>{t('nav.logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-6 bg-dark-950/80 border-b border-dark-800" style={{ WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              title="Menu"
              className="lg:hidden p-2 text-dark-400 hover:text-dark-50"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-dark-50">
              {sidebarItems.find(i => isActive(i.href))?.key ? t(`admin.${sidebarItems.find(i => isActive(i.href))?.key}`) : t('admin.dashboard')}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Notifications"
              title="Notifications"
              className="relative p-2 text-dark-400 hover:text-dark-50"
            >
              <Bell size={18} />
              <span className="absolute top-1 end-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true"></span>
            </button>
            <button
              type="button"
              onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
              aria-label="Toggle language"
              title="Toggle language"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-dark-400 border border-dark-700 rounded-lg hover:text-dark-50"
            >
              <Globe size={14} />
              {locale === 'en' ? 'AR' : 'EN'}
            </button>
            <div className="flex items-center gap-2 ps-3 border-s border-dark-700">
              <div className="w-8 h-8 rounded-full bg-kcc-green/20 flex items-center justify-center text-kcc-green text-sm font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-dark-50">{user.name}</p>
                <p className="text-xs text-dark-500">{user.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
