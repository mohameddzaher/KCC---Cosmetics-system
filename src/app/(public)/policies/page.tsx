'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHero from '@/components/public/PageHero';
import type { PolicyDoc } from '@/i18n/public';

type TabKey = 'privacy' | 'terms';

/**
 * Privacy policy and terms of service.
 *
 * The text itself lives in the dictionary (src/i18n/public.ts) in both
 * languages, so switching to Arabic translates the whole document — not just
 * the tab labels.
 */
export default function PoliciesPage() {
  const { t, dict } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>('privacy');

  const legal = (dict as unknown as { legal: { privacy: PolicyDoc; terms: PolicyDoc } }).legal;
  const doc = legal[activeTab];

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'privacy', label: t('legal.tabPrivacy') },
    { key: 'terms', label: t('legal.tabTerms') },
  ];

  return (
    <div className="min-h-screen bg-cream-100">
      <PageHero
        title={t('legal.pageTitle')}
        subtitle={t('legal.pageSubtitle')}
        image="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=80"
      />

      <section className="px-4 py-12 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-4xl">
          <div
            role="tablist"
            aria-label={t('legal.pageTitle')}
            className="mb-8 flex flex-wrap gap-2 border-b border-cream-300 pb-4"
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? 'bg-brand text-brand-fg shadow-lg shadow-brand/20'
                      : 'text-cream-700 hover:bg-blush-50 hover:text-ink-700'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-cream-300 bg-surface p-5 shadow-soft sm:p-8"
          >
            <h2 className="text-2xl font-bold text-ink-700">{doc.title}</h2>
            <p className="mt-1 text-sm text-cream-700">
              {t('policies.lastUpdated')}: {t('policies.lastUpdatedDate')}
            </p>

            <div className="mt-6 space-y-7 text-sm leading-relaxed text-cream-800">
              {doc.sections.map((section) => (
                <section key={section.heading} className="space-y-3">
                  <h3 className="text-lg font-semibold text-ink-700">{section.heading}</h3>
                  {section.paragraphs.map((para) => (
                    <p key={para}>{para}</p>
                  ))}
                  {section.bullets && (
                    <ul className="ms-1 space-y-2">
                      {section.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-kcc-green" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
