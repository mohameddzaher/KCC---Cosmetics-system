'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Sparkles } from 'lucide-react';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="relative bg-espresso-radial border-t border-espresso-700/50 overflow-hidden">
      {/* Decorative glows */}
      <div className="absolute top-0 start-0 w-[420px] h-[420px] rounded-full bg-kcc-rose-dark/20 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 end-0 w-[360px] h-[360px] rounded-full bg-kcc-beige-dark/22 blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 dot-pattern-dark opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl font-black tracking-tight">
                <span className="text-kcc-green">K</span>
                <span className="text-cream-50">CC</span>
              </span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={12} className="text-kcc-rose" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-kcc-rose-light/90">
                Saudi Cosmetics House
              </span>
            </div>
            <p className="text-cream-100 text-sm leading-relaxed mb-6">
              {t('hero.description')}
            </p>
            <div className="flex items-center gap-3">
              {[
                { Icon: Facebook, label: 'Facebook' },
                { Icon: Twitter, label: 'Twitter' },
                { Icon: Linkedin, label: 'LinkedIn' },
                { Icon: Instagram, label: 'Instagram' },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  title={label}
                  className="p-2 rounded-xl bg-espresso-700/60 border border-cream-300/10 text-cream-200 hover:text-kcc-rose hover:border-kcc-rose/40 hover:bg-espresso-600/60 transition-all"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-cream-50 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-kcc-rose" />
              {t('footer.quickLinks')}
            </h3>
            <ul className="space-y-3">
              {[
                { label: t('nav.about'), href: '/about' },
                { label: t('nav.certificates'), href: '/certificates' },
                { label: t('nav.portfolio'), href: '/portfolio' },
                { label: t('nav.production'), href: '/production' },
                { label: t('nav.factories'), href: '/factories' },
                { label: t('nav.news'), href: '/news' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-cream-100/85 hover:text-kcc-rose-light transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-cream-50 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-kcc-beige" />
              {t('sections.services')}
            </h3>
            <ul className="space-y-3">
              {[
                { label: t('order.sampleTitle'), href: '/order/sample' },
                { label: t('order.bulkTitle'), href: '/order/bulk' },
                { label: t('nav.aiAssistant'), href: '/ai-assistant' },
                { label: t('nav.contact'), href: '/contact' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-cream-100/85 hover:text-kcc-beige-light transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-cream-50 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-kcc-gold" />
              {t('footer.contactInfo')}
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-kcc-rose mt-0.5 shrink-0" />
                <span className="text-sm text-cream-100">{t('footer.address')}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-kcc-rose shrink-0" />
                <span className="text-sm text-cream-100">+966 53 848 6109</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-kcc-rose shrink-0" />
                <span className="text-sm text-cream-100">+966 53 848 7021</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-kcc-rose shrink-0" />
                <span className="text-sm text-cream-100">info@kcc.sa</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 border-t border-espresso-700/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-cream-200/60">{t('footer.rights')}</p>
          <div className="flex items-center gap-6">
            <Link href="/policies" className="text-xs text-cream-200/60 hover:text-kcc-rose-light transition-colors">
              {t('footer.privacy')}
            </Link>
            <Link href="/policies" className="text-xs text-cream-200/60 hover:text-kcc-rose-light transition-colors">
              {t('footer.terms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
