'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowUpRight, Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter, Youtube,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PublicSettings {
  contactEmail?: string;
  contactPhone?: string;
  emails?: { info?: string };
  phones?: { primary?: string; secondary?: string };
  contactAddress?: { en?: string; ar?: string };
  socialMedia?: Record<string, string | undefined>;
}

/**
 * Site footer.
 *
 * Restrained rather than decorative: one warm dark ground, a single hairline
 * champagne rule, and type doing the work. The brand block gets a serif
 * wordmark and room to breathe; the three link columns are quiet; the
 * certification line sits at the base as a trust signal rather than a badge
 * wall. Accent colour is used once per column, never mixed inside a line.
 */
export default function Footer() {
  const { t, locale } = useLanguage();
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings/public', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setSettings(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const g = settings || {};
  const email = g.contactEmail || g.emails?.info || 'info@kcc-bv.com';
  const phone1 = g.contactPhone || g.phones?.primary || '+966 53 848 6109';
  const phone2 = g.phones?.secondary || '';
  const address = g.contactAddress?.[locale] || g.contactAddress?.en || t('footer.address');
  const social = g.socialMedia || {};

  const socialLinks = [
    { Icon: Instagram, label: 'Instagram', href: social.instagram },
    { Icon: Linkedin, label: 'LinkedIn', href: social.linkedin },
    { Icon: Facebook, label: 'Facebook', href: social.facebook },
    { Icon: Twitter, label: 'X', href: social.twitter },
    { Icon: Youtube, label: 'YouTube', href: social.youtube },
  ].filter((x) => x.href);

  const columns = [
    {
      title: t('footer.quickLinks'),
      links: [
        { label: t('nav.about'), href: '/about' },
        { label: t('nav.certificates'), href: '/certificates' },
        { label: t('nav.portfolio'), href: '/portfolio' },
        { label: t('nav.production'), href: '/production' },
        { label: t('nav.factories'), href: '/factories' },
        { label: t('nav.news'), href: '/news' },
      ],
    },
    {
      title: t('sections.services'),
      links: [
        { label: t('order.sampleTitle'), href: '/order/sample' },
        { label: t('order.bulkTitle'), href: '/order/bulk' },
        { label: t('nav.aiAssistant'), href: '/ai-assistant' },
        { label: t('nav.contact'), href: '/contact' },
      ],
    },
  ];

  return (
    <footer className="relative overflow-hidden bg-espresso-900">
      {/* One hairline of champagne — the only ornament at the top edge. */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-kcc-beige/45 to-transparent" />

      {/* A single, very soft warm glow. No competing colour fields. */}
      <div className="pointer-events-none absolute -top-24 start-1/4 h-[380px] w-[380px] rounded-full bg-kcc-rose-dark/10 blur-[150px]" />

      <div className="page-shell relative z-10 py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr] lg:gap-12">
          {/* ---------------- Brand ---------------- */}
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-baseline gap-1.5">
              <span className="font-serif text-3xl leading-none tracking-tight text-on-dark">
                <span className="text-kcc-green-light">K</span>CC
              </span>
            </Link>
            <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-kcc-beige">
              {t('hero.subtitle')}
            </p>
            <p className="mt-5 text-sm leading-relaxed text-on-dark-soft">{t('hero.description')}</p>

            {socialLinks.length > 0 && (
              <div className="mt-6 flex items-center gap-2">
                {socialLinks.map(({ Icon, label, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="rounded-full border border-white/12 p-2.5 text-on-dark-muted transition-colors hover:border-kcc-beige/50 hover:text-kcc-beige"
                  >
                    <Icon size={15} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* ---------------- Link columns ---------------- */}
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-dark-muted">
                {col.title}
              </h3>
              <ul className="mt-5 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-1 text-sm text-on-dark-soft transition-colors hover:text-on-dark"
                    >
                      {link.label}
                      <ArrowUpRight
                        size={12}
                        className="rtl-flip opacity-0 transition-opacity group-hover:opacity-60"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* ---------------- Contact ---------------- */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-dark-muted">
              {t('footer.contactInfo')}
            </h3>
            <ul className="mt-5 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={15} className="mt-0.5 shrink-0 text-kcc-beige" />
                <span className="text-on-dark-soft">{address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={15} className="shrink-0 text-kcc-beige" />
                <a
                  href={`tel:${phone1.replace(/\s+/g, '')}`}
                  dir="ltr"
                  className="text-on-dark-soft transition-colors hover:text-on-dark"
                >
                  {phone1}
                </a>
              </li>
              {phone2 && (
                <li className="flex items-center gap-3">
                  <Phone size={15} className="shrink-0 text-kcc-beige" />
                  <a
                    href={`tel:${phone2.replace(/\s+/g, '')}`}
                    dir="ltr"
                    className="text-on-dark-soft transition-colors hover:text-on-dark"
                  >
                    {phone2}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-3">
                <Mail size={15} className="shrink-0 text-kcc-beige" />
                <a
                  href={`mailto:${email}`}
                  className="text-on-dark-soft transition-colors hover:text-on-dark"
                >
                  {email}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ---------------- Base bar ---------------- */}
      <div className="relative z-10 border-t border-white/10">
        <div className="page-shell flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
          <p className="text-xs text-on-dark-faint">{t('footer.rights')}</p>

          <div className="flex items-center gap-5">
            <Link
              href="/policies"
              className="text-xs text-on-dark-faint transition-colors hover:text-on-dark-soft"
            >
              {t('footer.privacy')}
            </Link>
            <Link
              href="/policies"
              className="text-xs text-on-dark-faint transition-colors hover:text-on-dark-soft"
            >
              {t('footer.terms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
