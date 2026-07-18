'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, Globe, ChevronDown, User, LogOut,
  LayoutDashboard, Package, ShoppingBag, Bot
} from 'lucide-react';

const navLinks = [
  { key: 'home', href: '/' },
  { key: 'about', href: '/about' },
  { key: 'certificates', href: '/certificates' },
  { key: 'portfolio', href: '/portfolio' },
  { key: 'contact', href: '/contact' },
];

export default function Navbar() {
  const { t, locale, setLocale } = useLanguage();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 10);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    setIsOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = () => setUserMenuOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [userMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const isAdminUser = user && ['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(user.role);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out will-change-transform ${
          scrolled
            ? 'bg-cream-100/85 shadow-soft border-b border-cream-300'
            : 'bg-white/90'
        }`}
        style={{
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          backdropFilter: 'blur(20px) saturate(160%)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <span className="text-2xl font-black tracking-tight">
                <span className="text-kcc-green">K</span>
                <span className="text-ink-700">CC</span>
              </span>
              <div className="hidden sm:block">
                <span className="text-[9px] uppercase tracking-[0.22em] text-cream-700 leading-tight block font-medium">
                  {locale === 'ar' ? 'الشركة السعودية' : 'Saudi Company'}
                </span>
                <span className="text-[9px] uppercase tracking-[0.22em] text-cream-700 leading-tight block font-medium">
                  {locale === 'ar' ? 'لمستحضرات التجميل' : 'for Cosmetics'}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className={`px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
                    isActive(link.href)
                      ? 'text-kcc-green bg-kcc-green/8 shadow-inner-soft'
                      : 'text-ink-600 hover:text-kcc-green hover:bg-blush-50'
                  }`}
                >
                  {t(`nav.${link.key}`)}
                </Link>
              ))}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* AI Assistant - desktop only */}
              <Link
                href="/ai-assistant"
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] text-cream-700 hover:text-kcc-rose-dark transition-colors rounded-lg hover:bg-blush-100/60"
                title={t('nav.aiAssistant')}
              >
                <Bot size={15} />
              </Link>

              {/* Language Toggle */}
              <button
                type="button"
                onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-ink-600 hover:text-kcc-rose-dark border border-cream-400 rounded-lg hover:border-kcc-rose-dark/60 hover:bg-cream-50 transition-all"
              >
                <Globe size={13} />
                <span>{locale === 'en' ? 'AR' : 'EN'}</span>
              </button>

              {/* Order CTA */}
              <Link
                href="/order"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 btn-luxe text-[13px] font-semibold rounded-lg"
              >
                <ShoppingBag size={14} />
                <span>{t('nav.order')}</span>
              </Link>

              {/* Auth / User Menu */}
              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] text-ink-600 hover:text-ink-800 border border-cream-400 rounded-lg hover:border-kcc-rose-dark/60 hover:bg-cream-50 transition-all"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-kcc-rose-light to-kcc-beige-light flex items-center justify-center text-ink-700 text-xs font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <span className="hidden md:inline max-w-[80px] truncate">{user.name}</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute end-0 mt-2 w-52 bg-white border border-cream-300 rounded-xl shadow-soft-lg overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-4 py-3 border-b border-cream-200 bg-gradient-to-r from-cream-50 to-blush-50">
                          <p className="text-sm font-semibold text-ink-700 truncate">{user.name}</p>
                          <p className="text-xs text-cream-700 truncate">{user.email}</p>
                        </div>
                        <div className="py-1">
                          {isAdminUser && (
                            <Link href="/admin" className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-600 hover:text-kcc-green hover:bg-blush-50 transition-colors">
                              <LayoutDashboard size={15} />
                              {t('nav.admin')}
                            </Link>
                          )}
                          <Link href="/account" className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-600 hover:text-kcc-green hover:bg-blush-50 transition-colors">
                            <User size={15} />
                            {t('nav.account')}
                          </Link>
                          <Link href="/account/my-samples" className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-600 hover:text-kcc-green hover:bg-blush-50 transition-colors">
                            <Package size={15} />
                            {t('nav.mySamples')}
                          </Link>
                          <Link href="/account/my-orders" className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-600 hover:text-kcc-green hover:bg-blush-50 transition-colors">
                            <ShoppingBag size={15} />
                            {t('nav.myOrders')}
                          </Link>
                          <button
                            type="button"
                            onClick={logout}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-blush-700 hover:text-blush-800 hover:bg-blush-50 transition-colors border-t border-cream-200"
                          >
                            <LogOut size={15} />
                            {t('nav.logout')}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-[13px] text-ink-600 hover:text-kcc-green transition-colors"
                >
                  <User size={14} />
                  <span>{t('nav.login')}</span>
                </Link>
              )}

              {/* Mobile menu button */}
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden p-2 text-ink-600 hover:text-kcc-green transition-colors"
                aria-label="Toggle menu"
              >
                {isOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Full screen overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-espresso-900/40 backdrop-blur-sm lg:hidden"
              onClick={() => setIsOpen(false)}
            />
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 end-0 z-50 w-72 bg-cream-50 border-s border-cream-300 lg:hidden overflow-y-auto shadow-soft-lg"
            >
              <div className="flex items-center justify-between p-4 border-b border-cream-200 bg-gradient-to-r from-cream-50 to-blush-50">
                <span className="text-lg font-bold">
                  <span className="text-kcc-green">K</span>
                  <span className="text-ink-700">CC</span>
                </span>
                <button type="button" onClick={() => setIsOpen(false)} className="p-1.5 text-ink-600 hover:text-kcc-green" aria-label="Close menu">
                  <X size={20} />
                </button>
              </div>
              <div className="px-3 py-4 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    className={`block px-4 py-2.5 text-sm rounded-lg transition-all ${
                      isActive(link.href)
                        ? 'text-kcc-green bg-kcc-green/8 font-semibold'
                        : 'text-ink-600 hover:text-kcc-green hover:bg-blush-50'
                    }`}
                  >
                    {t(`nav.${link.key}`)}
                  </Link>
                ))}
                <Link
                  href="/ai-assistant"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-600 hover:text-kcc-rose-dark hover:bg-blush-50 rounded-lg transition-colors"
                >
                  <Bot size={16} />
                  {t('nav.aiAssistant')}
                </Link>
                <Link
                  href="/order"
                  className="block px-4 py-2.5 text-sm font-semibold text-cream-50 btn-luxe rounded-lg mt-2"
                >
                  {t('nav.order')}
                </Link>
                {!user && (
                  <>
                    <Link href="/login" className="block px-4 py-2.5 text-sm text-ink-600 hover:text-kcc-green hover:bg-blush-50 rounded-lg transition-colors">
                      {t('nav.login')}
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </>
  );
}
