'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth, usePermission } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import NotificationBell from '@/components/admin/NotificationBell';
import ThemeToggle from '@/components/common/ThemeToggle';
import { can, isStaffRole, roleLabel, type Permission } from '@/lib/roles';
import {
  LayoutDashboard, FileText, ShoppingCart, Users, Package,
  DollarSign, Search as SearchIcon, Tag, Share2, Brain, Settings,
  Menu, X, PanelLeftClose, PanelLeftOpen, Globe, LogOut, Sparkles,
  ShieldCheck, Contact, Layers, Inbox, Factory, Truck, CheckSquare,
} from 'lucide-react';

type NavItem = {
  key: string;          // i18n key under `admin.`
  href: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
};
type NavGroup = { key: string; items: NavItem[] };

/**
 * Navigation is permission-driven, never role-list-driven: add a role to
 * src/lib/roles.ts and its menu appears automatically.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    key: 'overview',
    items: [{ key: 'dashboard', href: '/admin', icon: LayoutDashboard, permission: 'dashboard.view' }],
  },
  {
    key: 'salesCrm',
    items: [
      { key: 'crm', href: '/admin/crm', icon: Contact, permission: 'crm.view' },
      { key: 'tasks', href: '/admin/crm/tasks', icon: CheckSquare, permission: 'crm.view' },
      { key: 'customers', href: '/admin/customers', icon: Users, permission: 'customers.view' },
      { key: 'orders', href: '/admin/orders', icon: ShoppingCart, permission: 'orders.view' },
      { key: 'inbox', href: '/admin/inbox', icon: Inbox, permission: 'inbox.view' },
    ],
  },
  {
    key: 'operations',
    items: [
      { key: 'production', href: '/admin/production', icon: Factory, permission: 'production.view' },
      { key: 'logistics', href: '/admin/logistics', icon: Truck, permission: 'logistics.view' },
    ],
  },
  {
    key: 'catalog',
    items: [
      { key: 'categories', href: '/admin/categories', icon: Layers, permission: 'categories.manage' },
      { key: 'sampleQuiz', href: '/admin/sample-quiz', icon: Sparkles, permission: 'sampleQuiz.manage' },
      { key: 'inventory', href: '/admin/inventory', icon: Package, permission: 'inventory.view' },
    ],
  },
  {
    key: 'marketing',
    items: [
      { key: 'promos', href: '/admin/promos', icon: Tag, permission: 'promos.manage' },
      { key: 'referrals', href: '/admin/referrals', icon: Share2, permission: 'referrals.manage' },
    ],
  },
  {
    key: 'finance',
    items: [{ key: 'accounting', href: '/admin/accounting', icon: DollarSign, permission: 'accounting.view' }],
  },
  {
    key: 'content',
    items: [
      { key: 'cms', href: '/admin/cms', icon: FileText, permission: 'cms.manage' },
      { key: 'knowledge', href: '/admin/knowledge', icon: Brain, permission: 'knowledge.manage' },
      { key: 'seo', href: '/admin/seo', icon: SearchIcon, permission: 'seo.manage' },
    ],
  },
  {
    key: 'system',
    items: [
      { key: 'users', href: '/admin/users', icon: ShieldCheck, permission: 'users.view' },
      { key: 'settings', href: '/admin/settings', icon: Settings, permission: 'settings.manage' },
    ],
  },
];

const COLLAPSE_KEY = 'kcc-admin-sidebar-collapsed';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { can: canDo } = usePermission();
  const { t, locale, setLocale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });
  }, []);

  useEffect(() => {
    if (!loading && (!user || !isStaffRole(user.role))) router.push('/login');
  }, [user, loading, router]);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // Esc closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const isActive = useCallback(
    (href: string) => {
      if (href === '/admin') return pathname === '/admin';
      // /admin/crm must not light up while on /admin/crm/tasks
      if (href === '/admin/crm') return pathname === '/admin/crm';
      return pathname === href || pathname.startsWith(href + '/');
    },
    [pathname]
  );

  const visibleGroups = useMemo(() => {
    if (!user) return [];
    return NAV_GROUPS
      // `can` from the auth context, not the compiled-in defaults: a Super
      // Admin can change what a role reaches, and the sidebar has to follow
      // the same list the server will actually enforce.
      .map((g) => ({ ...g, items: g.items.filter((i) => canDo(i.permission)) }))
      .filter((g) => g.items.length > 0);
  }, [user]);

  const currentTitle = useMemo(() => {
    const flat = visibleGroups.flatMap((g) => g.items);
    // Longest matching href wins so nested routes resolve to their own entry.
    const match = flat
      .filter((i) => isActive(i.href))
      .sort((a, b) => b.href.length - a.href.length)[0];
    return match ? t(`admin.${match.key}`) : t('admin.adminPanel');
  }, [visibleGroups, isActive, t]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-brand" />
      </div>
    );
  }

  if (!user || !isStaffRole(user.role)) return null;

  const sidebarWidth = collapsed ? '4.75rem' : '17rem';

  const sidebarInner = (
    <>
      {/* Brand — pinned, never scrolls */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-line px-3">
        <Link
          href="/admin"
          className={`flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 ${collapsed ? 'lg:justify-center' : ''}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-black text-brand-fg">
            K
          </span>
          {!collapsed && (
            <span className="min-w-0 truncate">
              <span className="block text-sm font-bold leading-tight text-fg">KCC</span>
              <span className="block text-[10px] leading-tight text-fg-muted">{t('admin.adminPanel')}</span>
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? t('admin.expandSidebar') : t('admin.collapseSidebar')}
          title={collapsed ? t('admin.expandSidebar') : t('admin.collapseSidebar')}
          className="ms-auto hidden h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg lg:flex"
        >
          {collapsed ? <PanelLeftOpen size={17} className="rtl-flip" /> : <PanelLeftClose size={17} className="rtl-flip" />}
        </button>

        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label={t('admin.closeMenu')}
          className="ms-auto flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav — the ONLY scrolling region of the sidebar */}
      <nav className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {visibleGroups.map((grp) => (
          <div key={grp.key} className="mb-2">
            {!collapsed ? (
              <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
                {t(`admin.nav.${grp.key}`)}
              </p>
            ) : (
              <div className="mx-3 my-3 border-t border-line" />
            )}
            <ul className="space-y-0.5">
              {grp.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      title={collapsed ? t(`admin.${item.key}`) : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-brand-soft text-brand-soft-fg'
                          : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
                      } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
                    >
                      <Icon size={18} className="shrink-0" />
                      {!collapsed && <span className="truncate">{t(`admin.${item.key}`)}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — pinned to the bottom of the viewport, never scrolls away */}
      <div className="shrink-0 border-t border-line p-2">
        <button
          type="button"
          onClick={logout}
          aria-label={t('nav.logout')}
          title={t('nav.logout')}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger-soft ${
            collapsed ? 'lg:justify-center lg:px-0' : ''
          }`}
        >
          <LogOut size={18} className="shrink-0 rtl-flip" />
          {!collapsed && <span>{t('nav.logout')}</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-bg" style={{ ['--sidebar-w' as string]: sidebarWidth }}>
      {/* ---------- Desktop sidebar: fixed to the viewport, full height ---------- */}
      <aside
        className="fixed inset-y-0 start-0 z-40 hidden w-[var(--sidebar-w)] flex-col border-e border-line bg-surface transition-[width] duration-200 lg:flex"
        aria-label={t('admin.adminPanel')}
      >
        {sidebarInner}
      </aside>

      {/* ---------- Mobile drawer ---------- */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'var(--overlay)' }}
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}
      {drawerOpen && (
        <aside
          className="drawer-panel fixed inset-y-0 start-0 z-50 flex w-[min(17rem,85vw)] flex-col border-e border-line bg-surface lg:hidden"
          aria-label={t('admin.adminPanel')}
        >
          {sidebarInner}
        </aside>
      )}

      {/* ---------- Main column ---------- */}
      <div className="flex min-h-screen min-w-0 flex-col lg:ps-[var(--sidebar-w)]">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-2 px-3 sm:px-4 xl:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t('admin.openMenu')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg lg:hidden"
            >
              <Menu size={20} />
            </button>

            <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-fg sm:text-lg">
              {currentTitle}
            </h1>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <NotificationBell locale={locale} />
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
                aria-label={t('admin.language')}
                title={t('admin.language')}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                <Globe size={14} />
                {locale === 'en' ? 'AR' : 'EN'}
              </button>

              <Link
                href="/account"
                title={t('admin.myProfile')}
                className="flex items-center gap-2 rounded-lg border-s border-line ps-2 transition-opacity hover:opacity-80 sm:ps-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-soft-fg">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden min-w-0 md:block">
                  <span className="block max-w-[10rem] truncate text-sm font-medium leading-tight text-fg">
                    {user.name}
                  </span>
                  <span className="block truncate text-[11px] leading-tight text-fg-muted">
                    {roleLabel(user.role, locale)}
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </header>

        {/* Content takes the full remaining width at every breakpoint. */}
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-4 sm:py-6 xl:px-6 2xl:px-8">
          <div className="mx-auto w-full max-w-[140rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
