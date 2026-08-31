'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Boxes, ExternalLink, Layers, ListChecks } from 'lucide-react';
import { AutoGrid, Card, PageHeader } from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SampleQuizAdminLanding() {
  const { t, pick } = useLanguage();
  const [counts, setCounts] = useState({ general: 0, scoped: 0, products: 0 });

  useEffect(() => {
    Promise.all([
      fetch('/api/sample-quiz/brief-questions?includeInactive=true&all=true', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch('/api/sample-quiz/product-config', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : { configs: [] }))
        .catch(() => ({ configs: [] })),
    ]).then(([qs, pc]) => {
      const all: Array<{ scope?: string }> = Array.isArray(qs) ? qs : [];
      setCounts({
        general: all.filter((q) => (q.scope || 'general') === 'general').length,
        scoped: all.filter((q) => (q.scope || 'general') !== 'general').length,
        products: Array.isArray(pc.configs) ? pc.configs.length : 0,
      });
    });
  }, []);

  const cards = [
    {
      key: 'general',
      title: t('admin.briefQuestions'),
      desc: t('admin.briefQuestionsDesc'),
      href: '/admin/sample-quiz/questions',
      Icon: ListChecks,
      stat: counts.general,
    },
    {
      key: 'category',
      title: t('admin.categoryQuestions'),
      desc: t('admin.categoryQuestionsDesc'),
      href: '/admin/sample-quiz/questions?scope=main&key=',
      Icon: Layers,
      stat: counts.scoped,
    },
    {
      key: 'products',
      title: t('admin.productConfigs'),
      desc: t('admin.productConfigsDesc'),
      href: '/admin/sample-quiz/products',
      Icon: Boxes,
      stat: counts.products,
    },
  ];

  return (
    <div>
      <PageHeader title={t('admin.quizTitle')} subtitle={t('admin.quizSubtitle')} />

      <AutoGrid min="19rem" gap="1rem">
        {cards.map((c) => {
          const Icon = c.Icon;
          return (
            <Link
              key={c.key}
              href={c.href}
              className="group flex flex-col rounded-xl border border-line bg-surface p-5 transition-colors hover:border-brand"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-fg">
                  <Icon size={20} />
                </span>
                <span className="font-mono text-xs text-fg-subtle">{c.stat}</span>
              </div>
              <h2 className="mb-1.5 text-base font-semibold text-fg">{c.title}</h2>
              <p className="mb-5 flex-1 text-sm leading-relaxed text-fg-muted">{c.desc}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand transition-all group-hover:gap-2.5">
                {t('ui.open')} <ArrowRight size={14} className="rtl-flip" />
              </span>
            </Link>
          );
        })}
      </AutoGrid>

      <Card className="mt-5">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
          {t('ui.preview')}
        </p>
        <p className="text-sm text-fg-muted">
          {pick(
            'Open the customer quiz in a new tab. Every admin change is live immediately — no cache to clear.',
            'افتح استبيان العميل في تبويب جديد. كل تعديل من لوحة الإدارة يظهر فورًا — لا يوجد تخزين مؤقت.'
          )}
        </p>
        <Link
          href="/order/sample"
          target="_blank"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
        >
          /order/sample <ExternalLink size={13} />
        </Link>
      </Card>
    </div>
  );
}
