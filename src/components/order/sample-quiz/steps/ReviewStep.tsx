'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, Mail, Pencil, Phone } from 'lucide-react';
import QuizShell from '../QuizShell';
import StepFooter from '../StepFooter';
import PackageThumb from '../widgets/packaging/PackageThumb';
import { useQuiz } from '@/lib/sample-quiz/QuizContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildOrderPayload } from '@/lib/sample-quiz/payload';
import { PACKAGING_PART_KEYS } from '@/lib/sample-quiz/flow';
import type { QuestionDoc, SpecMasterDoc, Step } from '@/lib/sample-quiz/flow';
import type {
  AnswerValue, CheckListAnswer, HeroIngredientAnswer, UploadAnswer,
} from '@/lib/sample-quiz/types';
import {
  findBottle, findCap, findColor, findFinish, findLabel,
} from '../widgets/packaging/shapes';

interface Row {
  key: string;
  title: string;
  display: string;
  note?: string;
  stepId?: string;
}

/**
 * Final review.
 *
 * Two structural fixes over the old screen:
 *   • the summary is a multi-column card grid, so it uses the width of the
 *     display instead of one endless vertical ribbon;
 *   • every single row has its own Edit link that jumps to exactly that step
 *     and returns straight here — no walking the rest of the survey again.
 */
export default function ReviewStep({
  steps,
  onEditStep,
  onBack,
}: {
  steps: Step[];
  onEditStep: (stepId: string) => void;
  onBack: () => void;
}) {
  const { state, dispatch } = useQuiz();
  const { user } = useAuth();
  const { t, pick } = useLanguage();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [emailLocal, setEmailLocal] = useState(user?.email || '');
  const [masters, setMasters] = useState<SpecMasterDoc[]>([]);

  useEffect(() => {
    if (user?.email) setEmailLocal(user.email);
  }, [user?.email]);

  useEffect(() => {
    fetch('/api/sample-quiz/spec-options', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setMasters(Array.isArray(d.categories) ? d.categories : []))
      .catch(() => setMasters([]));
  }, []);

  /** Render any answer value into a human string, using the question's own labels. */
  const describe = useMemo(
    () =>
      (q: QuestionDoc, ans: AnswerValue | undefined): string => {
        if (ans == null) return '';
        const labelOf = (v: string) => {
          const o = q.options.find((x) => x.value === v);
          return o ? pick(o.labelEn, o.labelAr) : v;
        };

        if (typeof ans === 'string') return ans ? labelOf(ans) : '';
        if (Array.isArray(ans)) return ans.map(labelOf).join('، ');

        if ('enabled' in ans) {
          const h = ans as HeroIngredientAnswer;
          if (!h.enabled) return t('quiz.hero.no');
          const parts = [h.ingredients.join('، ')];
          if (h.needsRDHelp) parts.push(t('quiz.hero.needHelp'));
          if (h.excludedIngredients) parts.push(`${t('quiz.hero.excludeLabel')} ${h.excludedIngredients}`);
          return parts.filter(Boolean).join(' · ');
        }

        if ('selected' in ans) {
          const c = ans as CheckListAnswer;
          return c.selected
            .map((v) => (c.notes[v] ? `${labelOf(v)} (${c.notes[v]})` : labelOf(v)))
            .join('، ');
        }

        // upload
        const files = ans as UploadAnswer;
        return Object.entries(files)
          .filter(([, list]) => list?.length)
          .map(([slot, list]) => `${labelOf(slot)}: ${list.length}`)
          .join('، ');
      },
    [pick, t]
  );

  const questionSteps = useMemo(
    () => steps.filter((s): s is Extract<Step, { kind: 'question' }> => s.kind === 'question'),
    [steps]
  );

  const briefRows: Row[] = useMemo(
    () =>
      questionSteps
        .filter((s) => s.question.scope === 'general')
        .map((s) => {
          const q = s.question;
          const display = describe(q, state.briefAnswers[q.questionKey]);
          if (!display) return null;
          return {
            key: q.questionKey,
            title: pick(q.titleEn, q.titleAr),
            display,
            note: state.questionNotes[q.questionKey],
            stepId: s.id,
          };
        })
        .filter(Boolean) as Row[],
    [questionSteps, state.briefAnswers, state.questionNotes, describe, pick]
  );

  const categoryRows: Row[] = useMemo(
    () =>
      questionSteps
        .filter((s) => s.question.scope !== 'general')
        .map((s) => {
          const q = s.question;
          const answerKey = `${q.scope}:${q.questionKey}`;
          const display = describe(q, state.categoryAnswers[answerKey]);
          if (!display) return null;
          return {
            key: answerKey,
            title: pick(q.titleEn, q.titleAr),
            display,
            note: state.questionNotes[answerKey],
            stepId: s.id,
          };
        })
        .filter(Boolean) as Row[],
    [questionSteps, state.categoryAnswers, state.questionNotes, describe, pick]
  );

  const specRows: Row[] = useMemo(() => {
    const rows: Row[] = [];
    for (const [key, val] of Object.entries(state.specs)) {
      if (!val || val.selected.length === 0) continue;
      // The whole pack — bottle, cap, label, finish, colour — gets its own card.
      if (key === 'product-packaging' || PACKAGING_PART_KEYS[key]) continue;
      const master = masters.find((m) => m.categoryKey === key);
      const labels = val.selected.map(
        (sv) => {
          const o = master?.options.find((x) => x.value === sv);
          return o ? pick(o.labelEn, o.labelAr) : sv;
        }
      );
      rows.push({
        key,
        title: master ? pick(master.defaultTitleEn, master.defaultTitleAr) : key,
        display: labels.join('، '),
        note: state.questionNotes[`spec_${key}`],
        stepId: `spec:${key}`,
      });
    }
    return rows;
  }, [state.specs, state.questionNotes, masters, pick]);

  const fragranceRow: Row | null = useMemo(() => {
    if (!state.fragrance.family) return null;
    const fragMaster = masters.find((m) => m.categoryKey === 'fragrances');
    const fam = fragMaster?.options.find((o) => o.value === state.fragrance.family);
    const meta = fam?.meta as { subNotes?: Array<{ value: string; labelEn: string; labelAr?: string }> } | undefined;
    const noteLabels = state.fragrance.notes.map((n) => {
      const s = meta?.subNotes?.find((x) => x.value === n);
      return s ? pick(s.labelEn, s.labelAr) : n;
    });
    return {
      key: 'fragrance',
      title: t('quiz.reviewFragrance'),
      display: [fam ? pick(fam.labelEn, fam.labelAr) : state.fragrance.family, noteLabels.join('، '), state.fragrance.intensity]
        .filter(Boolean)
        .join(' · '),
      stepId: 'spec:fragrances',
    };
  }, [state.fragrance, masters, pick, t]);

  const packagingRows: Row[] = useMemo(() => {
    if (!state.packaging.bottle) return [];
    const p = state.packaging;
    return [
      { key: 'bottle', title: t('quiz.packaging.bottle'), display: pick(findBottle(p.bottle).labelEn, findBottle(p.bottle).labelAr), stepId: 'spec:product-packaging' },
      { key: 'cap', title: t('quiz.packaging.cap'), display: pick(findCap(p.cap).labelEn, findCap(p.cap).labelAr), stepId: 'spec:product-packaging' },
      { key: 'label', title: t('quiz.packaging.label'), display: pick(findLabel(p.label).labelEn, findLabel(p.label).labelAr), stepId: 'spec:product-packaging' },
      { key: 'finish', title: t('quiz.packaging.finish'), display: pick(findFinish(p.finish).labelEn, findFinish(p.finish).labelAr), stepId: 'spec:product-packaging' },
      { key: 'color', title: t('quiz.packaging.color'), display: pick(findColor(p.color).labelEn, findColor(p.color).labelAr), stepId: 'spec:product-packaging' },
    ];
  }, [state.packaging, t, pick]);

  async function handleSubmit() {
    if (!emailLocal && !user) {
      setError(t('quiz.emailRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = buildOrderPayload(state, {
        name: state.customerName,
        email: emailLocal || user?.email || '',
        phone,
        company,
      });
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('quiz.submitFailed'));
      dispatch({ type: 'SET_SUBMITTED', payload: { orderNumber: data.orderNumber, id: data.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('quiz.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  const categoryLine = [state.category.mainName, state.category.subName, state.category.itemName]
    .filter(Boolean)
    .join(' → ');

  return (
    <QuizShell
      stepKey="review"
      eyebrow={t('quiz.reviewEyebrow')}
      title={t('quiz.reviewTitle', { name: state.customerName || '' })}
      subtitle={t('quiz.reviewSubtitle')}
      width="full"
      footer={
        <StepFooter
          nextLabel={submitting ? t('quiz.submitting') : t('quiz.submit')}
          nextDisabled={submitting}
          onNext={handleSubmit}
          onBack={onBack}
        />
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] xl:gap-8">
        {/* ---------------- Sticky preview ---------------- */}
        <aside className="xl:sticky xl:top-44 xl:self-start">
          <div className="rounded-3xl border border-cream-300 bg-cream-100 p-5 shadow-soft">
            <PackageThumb
              value={state.packaging}
              name={state.customerName}
              alt=""
              className="mx-auto h-56 w-auto object-contain"
            />
          </div>
          <button
            type="button"
            onClick={() => onEditStep('personalization')}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-xs uppercase tracking-[0.18em] text-cream-700 hover:text-kcc-rose-dark"
          >
            <Pencil size={12} />
            {t('quiz.editName')}
          </button>

          <div className="mt-5 rounded-2xl border border-cream-300 bg-surface p-4 shadow-soft">
            <SectionLabel>{t('quiz.reviewCategory')}</SectionLabel>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-800">{categoryLine || '—'}</p>
            <EditLink onClick={() => onEditStep('cat:1')} label={t('quiz.edit')} />
          </div>
        </aside>

        {/* ---------------- Multi-column summary ---------------- */}
        <div
          className="grid items-start gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(22rem, 100%), 1fr))' }}
        >
          <SummaryCard title={t('quiz.reviewBrief')} rows={briefRows} onEditStep={onEditStep} />

          {categoryRows.length > 0 && (
            <SummaryCard
              title={t('quiz.reviewCategoryQuestions')}
              rows={categoryRows}
              onEditStep={onEditStep}
            />
          )}

          {(specRows.length > 0 || fragranceRow) && (
            <SummaryCard
              title={t('quiz.reviewSpecs')}
              rows={fragranceRow ? [...specRows, fragranceRow] : specRows}
              onEditStep={onEditStep}
            />
          )}

          {packagingRows.length > 0 && (
            <SummaryCard title={t('quiz.reviewPackaging')} rows={packagingRows} onEditStep={onEditStep} />
          )}

          <div className="rounded-2xl border border-cream-300 bg-surface p-5 shadow-soft">
            <SectionLabel>{t('quiz.reviewDetails')}</SectionLabel>
            <div className="mt-4 grid gap-2.5">
              {!user && (
                <Field icon={Mail} type="email" value={emailLocal} onChange={setEmailLocal} placeholder={`${t('quiz.emailPlaceholder')} *`} />
              )}
              <Field icon={Phone} type="tel" value={phone} onChange={setPhone} placeholder={t('quiz.phonePlaceholder')} />
              <Field icon={Building2} type="text" value={company} onChange={setCompany} placeholder={t('quiz.companyPlaceholder')} />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-blush-300 bg-blush-50 px-4 py-3 text-sm text-blush-800">
              {error}
            </div>
          )}

          {submitting && (
            <div className="flex items-center gap-2 text-cream-700">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-sm">{t('quiz.sending')}</span>
            </div>
          )}
        </div>
      </div>
    </QuizShell>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kcc-rose-dark">
      {children}
    </h3>
  );
}

function EditLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-cream-700 transition-colors hover:text-ink-800"
    >
      <Pencil size={10} />
      {label}
    </button>
  );
}

function SummaryCard({
  title,
  rows,
  onEditStep,
}: {
  title: string;
  rows: Row[];
  onEditStep: (id: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <section className="rounded-2xl border border-cream-300 bg-surface p-5 shadow-soft">
      <SectionLabel>{title}</SectionLabel>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-cream-700">{t('quiz.reviewEmpty')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-cream-300">
          {rows.map((r) => (
            <li key={r.key} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-cream-700">{r.title}</p>
                <p className="mt-0.5 text-sm leading-snug text-ink-800">{r.display}</p>
                {r.note && (
                  <p className="mt-1 text-xs italic text-cream-700">
                    {t('quiz.note')}: {r.note}
                  </p>
                )}
              </div>
              {r.stepId && (
                <button
                  type="button"
                  onClick={() => onEditStep(r.stepId!)}
                  aria-label={`${t('quiz.edit')} — ${r.title}`}
                  title={t('quiz.edit')}
                  className="mt-0.5 shrink-0 rounded-lg p-1.5 text-cream-600 transition-colors hover:bg-cream-100 hover:text-ink-800"
                >
                  <Pencil size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Field({
  icon: Icon, type, value, onChange, placeholder,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block">
      <span className="absolute start-4 top-1/2 -translate-y-1/2 text-cream-700">
        <Icon size={14} />
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-cream-300 bg-surface py-3 pe-4 ps-11 text-sm text-ink-800 transition-colors placeholder:text-cream-700 focus:border-ink-700 focus:outline-none"
      />
    </label>
  );
}
