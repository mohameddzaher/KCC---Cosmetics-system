'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Beaker, Check, Truck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import RequireAuth from '@/components/auth/RequireAuth';

export default function OrderPage() {
  return (
    <RequireAuth>
      <OrderPageContent />
    </RequireAuth>
  );
}

/**
 * Start your order.
 *
 * The two routes are not alternatives — they are a sequence, and the page now
 * says so. Sample first, and only once that is approved does bulk make sense.
 * So the sample card is the one that carries weight (solid button, brand rule,
 * a touch more presence) and the bulk card is deliberately quieter, with a
 * "then" marker between the two on wide screens.
 *
 * The previous version gave both cards identical weight, set the headline in
 * the UI sans while every other page uses the serif, and let the step label
 * collide with the icon.
 */
function OrderPageContent() {
  const { t, tArr } = useLanguage();
  const reduce = useReducedMotion();

  const rise = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay },
  });

  const cards = [
    {
      key: 'sample',
      featured: true,
      icon: Beaker,
      step: t('orderExtra.sampleStep'),
      badge: t('orderExtra.sampleBadge'),
      title: t('order.sampleTitle'),
      description: t('orderExtra.sampleDescription'),
      points: tArr('orderExtra.samplePoints'),
      href: '/order/sample',
      cta: t('hero.requestSample'),
    },
    {
      key: 'bulk',
      featured: false,
      icon: Truck,
      step: t('orderExtra.bulkStep'),
      badge: t('orderExtra.bulkBadge'),
      title: t('order.bulkTitle'),
      description: t('orderExtra.bulkDescription'),
      points: tArr('orderExtra.bulkPoints'),
      href: '/order/bulk',
      cta: t('hero.placeBulkOrder'),
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg px-4 pb-24 pt-16 sm:px-6 lg:pt-24">
      {/* Two very soft warm fields, nothing with an edge. */}
      <div className="pointer-events-none absolute -top-24 start-1/4 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-kcc-rose-light/35 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-32 end-0 h-[380px] w-[380px] rounded-full bg-kcc-beige-light/40 blur-[130px]" />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <motion.header {...rise()} className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-kcc-rose-dark">
            {t('orderExtra.eyebrow')}
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.08] text-fg sm:text-5xl">
            {t('order.title')}
          </h1>
          <div className="mx-auto mt-6 h-px w-14 bg-gradient-to-r from-transparent via-kcc-rose-dark/50 to-transparent" />
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-fg-muted">
            {t('orderExtra.lede')}
          </p>
        </motion.header>

        {/* items-stretch so the two cards always end level, whatever the copy. */}
        <div className="mt-12 grid items-stretch gap-5 lg:mt-16 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
          <motion.div {...rise(0.1)} className="min-w-0">
            <OrderCard {...cards[0]} />
          </motion.div>

          {/* The sequence marker. Decorative, so it is hidden from readers. */}
          <div
            aria-hidden
            className="hidden flex-col items-center justify-center gap-3 lg:flex"
          >
            <span className="h-16 w-px bg-line" />
            <span className="text-[10px] uppercase tracking-[0.24em] text-fg-subtle">
              {t('orderExtra.then')}
            </span>
            <span className="h-16 w-px bg-line" />
          </div>

          <motion.div {...rise(0.2)} className="min-w-0">
            <OrderCard {...cards[1]} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  featured,
  icon: Icon,
  step,
  badge,
  title,
  description,
  points,
  href,
  cta,
}: {
  featured: boolean;
  icon: React.ElementType;
  step: string;
  badge: string;
  title: string;
  description: string;
  points: string[];
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex h-full flex-col rounded-3xl border p-7 transition-all duration-300 sm:p-9 ${
        featured
          ? 'border-kcc-rose-dark/30 bg-surface shadow-soft-lg hover:border-kcc-rose-dark/55 hover:shadow-2xl'
          : 'border-line bg-surface/70 hover:border-line-strong hover:bg-surface'
      }`}
    >
      {/* Icon and step label on their own line — they used to overlap. */}
      <div className="mb-6 flex items-center gap-3.5">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${
            featured ? 'bg-kcc-rose-light/45 text-kcc-rose-dark' : 'bg-surface-2 text-fg-muted'
          }`}
        >
          <Icon size={22} />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-fg-subtle">
            {step}
          </span>
          <span className={`block text-sm font-medium ${featured ? 'text-kcc-rose-dark' : 'text-fg-muted'}`}>
            {badge}
          </span>
        </span>
      </div>

      <h2 className="font-serif text-2xl leading-tight text-fg sm:text-3xl">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">{description}</p>

      <ul className="mt-6 space-y-2.5">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2.5 text-sm text-fg-muted">
            <Check
              size={15}
              className={`mt-0.5 shrink-0 ${featured ? 'text-kcc-rose-dark' : 'text-fg-subtle'}`}
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      {/* mt-auto keeps both buttons on the same line even when the copy differs. */}
      <span className="mt-auto pt-8">
        <span
          className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-colors ${
            featured
              ? 'bg-brand text-brand-fg group-hover:bg-brand-hover'
              : 'border border-line text-fg group-hover:bg-surface-2'
          }`}
        >
          {cta}
          <ArrowRight
            size={16}
            className="rtl-flip transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </span>
      </span>
    </Link>
  );
}
