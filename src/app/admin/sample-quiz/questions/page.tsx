'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layers, ListChecks } from 'lucide-react';
import QuestionManager from '@/components/admin/quiz/QuestionManager';
import type { AdminBriefQuestion, BriefScope } from '@/components/admin/quiz/types';
import { AutoGrid, Card, PageHeader, Select, Spinner } from '@/components/admin/ui';
import { useLanguage } from '@/contexts/LanguageContext';

interface SubCat { name: string; slug: string; items: string[] }
interface MainCat { name: string; slug: string; subcategories: SubCat[] }

/**
 * One screen for every question set in the quiz.
 *
 *   ?scope=general                          → the shared brief
 *   ?scope=main&key=body-care               → asked after that category is picked
 *   ?scope=sub&key=hair-care__shampoo       → asked after the sub-category is picked
 *
 * The scope lives in the URL so a set is linkable and the browser Back button
 * behaves. General-brief questions are always offered as condition sources, so
 * a category question can branch on an answer given earlier in the brief.
 */
function QuestionsPageInner() {
  const { t, pick } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();

  const scope = (params.get('scope') || 'general') as BriefScope;
  const scopeKey = scope === 'general' ? '' : params.get('key') || '';

  const [cats, setCats] = useState<MainCat[]>([]);
  const [general, setGeneral] = useState<AdminBriefQuestion[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/sample-quiz/categories', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => (Array.isArray(d.categories) ? d.categories : []))
        .catch(() => []),
      fetch('/api/sample-quiz/brief-questions?includeInactive=true&scope=general', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]).then(([c, g]) => {
      setCats(c);
      setGeneral(Array.isArray(g) ? g : []);
      setReady(true);
    });
  }, []);

  const currentLabel = useMemo(() => {
    if (scope === 'general') return t('admin.briefQuestions');
    if (scope === 'main') return cats.find((c) => c.slug === scopeKey)?.name || scopeKey;
    if (scope === 'sub') {
      const [m, s] = scopeKey.split('__');
      const main = cats.find((c) => c.slug === m);
      const sub = main?.subcategories.find((x) => x.slug === s);
      return sub ? `${main?.name} → ${sub.name}` : scopeKey;
    }
    return scopeKey;
  }, [scope, scopeKey, cats, t]);

  function goto(value: string) {
    if (value === 'general') {
      router.push('/admin/sample-quiz/questions');
      return;
    }
    const [s, ...rest] = value.split(':');
    router.push(`/admin/sample-quiz/questions?scope=${s}&key=${encodeURIComponent(rest.join(':'))}`);
  }

  const selectValue = scope === 'general' ? 'general' : `${scope}:${scopeKey}`;

  // General-brief answers are always available to branch on. When editing the
  // general brief itself, the manager already supplies its own siblings.
  const extraSources = scope === 'general' ? [] : general;

  const isGeneral = scope === 'general';
  const invalidScope = !isGeneral && !scopeKey;

  return (
    <div>
      <PageHeader
        title={
          isGeneral
            ? t('admin.briefQuestions')
            : currentLabel
              ? `${t('admin.categoryQuestions')} — ${currentLabel}`
              : t('admin.categoryQuestions')
        }
        subtitle={isGeneral ? t('admin.briefQuestionsDesc') : t('admin.categoryQuestionsDesc')}
        backHref="/admin/sample-quiz"
        backLabel={t('admin.quizTitle')}
      />

      <Card className="mb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="scope-select" className="field-label">
              <span className="inline-flex items-center gap-1.5">
                <Layers size={13} />
                {t('admin.filterBy')}
              </span>
            </label>
            <Select id="scope-select" value={selectValue} onChange={(e) => goto(e.target.value)}>
              <option value="general">{t('admin.briefQuestions')}</option>
              {cats.map((c) => (
                <optgroup key={c.slug} label={c.name}>
                  <option value={`main:${c.slug}`}>
                    {c.name} — {t('admin.categoryQuestions')}
                  </option>
                  {c.subcategories.map((s) => (
                    <option key={s.slug} value={`sub:${c.slug}__${s.slug}`}>
                      {c.name} → {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>
          <p className="max-w-md text-xs leading-snug text-fg-muted sm:pb-2.5">
            {isGeneral ? t('admin.briefQuestionsDesc') : t('admin.categoryQuestionsDesc')}
          </p>
        </div>
      </Card>

      {!ready ? (
        <Spinner />
      ) : invalidScope ? (
        // scope=main with no key yet → let the admin pick which category to author.
        <AutoGrid min="15rem" gap="0.75rem">
          {cats.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => goto(`main:${c.slug}`)}
              className="group rounded-xl border border-line bg-surface p-4 text-start transition-colors hover:border-brand"
            >
              <p className="text-sm font-semibold text-fg">{c.name}</p>
              <p className="mt-0.5 text-xs text-fg-muted">
                {c.subcategories.length} · {t('admin.categories')}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand transition-all group-hover:gap-2.5">
                {t('admin.addQuestion')} <Layers size={12} />
              </span>
            </button>
          ))}
        </AutoGrid>
      ) : (
        <Card>
          <QuestionManager
            key={`${scope}:${scopeKey}`}
            scope={scope}
            scopeKey={scopeKey}
            title={isGeneral ? t('admin.briefQuestions') : currentLabel}
            hint={isGeneral ? t('admin.briefQuestionsDesc') : t('admin.categoryQuestionsDesc')}
            extraConditionSources={extraSources}
          />
        </Card>
      )}

      {!isGeneral && general.length > 0 && (
        <p className="mt-4 flex items-start gap-2 text-xs text-fg-muted">
          <ListChecks size={14} className="mt-0.5 shrink-0" />
          {pick(
            'These questions are asked only after the customer picks this category, right before the technical specs. They can branch on any answer from the general brief.',
            'تُطرح هذه الأسئلة فقط بعد اختيار العميل لهذا القسم، وقبل المواصفات التقنية مباشرة. ويمكن ربطها بأي إجابة من الأسئلة العامة.'
          )}
        </p>
      )}
    </div>
  );
}

export default function BriefQuestionsAdminPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <QuestionsPageInner />
    </Suspense>
  );
}
