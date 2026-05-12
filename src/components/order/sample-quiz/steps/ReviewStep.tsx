'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Loader2, Mail, Phone, Building2 } from 'lucide-react';
import StepShell from '../StepShell';
import CTAButton from '../CTAButton';
import BottlePreview from '../BottlePreview';
import { useQuiz } from '@/lib/sample-quiz/QuizContext';
import { useAuth } from '@/contexts/AuthContext';
import { buildOrderPayload } from '@/lib/sample-quiz/payload';
import type { HeroIngredientAnswer } from '@/lib/sample-quiz/types';

interface SpecMaster {
  categoryKey: string;
  defaultTitleEn: string;
  options: Array<{ value: string; labelEn: string }>;
}
interface BriefQ {
  questionKey: string;
  titleEn: string;
  options?: Array<{ value: string; labelEn: string }>;
}

interface Props {
  onEditPersonalization: () => void;
  onEditBrief: () => void;
  onEditCategory: () => void;
  onEditSpecs: () => void;
  onBack: () => void;
}

export default function ReviewStep({ onEditPersonalization, onEditBrief, onEditCategory, onEditSpecs, onBack }: Props) {
  const { state, dispatch } = useQuiz();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [emailLocal, setEmailLocal] = useState(user?.email || '');
  const [briefQs, setBriefQs] = useState<BriefQ[]>([]);
  const [masters, setMasters] = useState<SpecMaster[]>([]);

  useEffect(() => {
    fetch('/api/sample-quiz/brief-questions', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setBriefQs(Array.isArray(d) ? d : []));
    fetch('/api/sample-quiz/spec-options', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setMasters(Array.isArray(d.categories) ? d.categories : []));
  }, []);

  const briefSummary = useMemo(() => {
    return briefQs
      .map((q) => {
        const ans = state.briefAnswers[q.questionKey];
        if (!ans || (Array.isArray(ans) && ans.length === 0)) return null;
        let display = '';
        if (typeof ans === 'string') {
          display = q.options?.find((o) => o.value === ans)?.labelEn || ans;
        } else if (Array.isArray(ans)) {
          display = ans.map((v) => q.options?.find((o) => o.value === v)?.labelEn || v).join(', ');
        } else {
          // hero-ingredient
          const h = ans as HeroIngredientAnswer;
          if (!h.enabled) display = 'No (let R&D suggest)';
          else display = `${h.ingredients.join(', ')}${h.needsRDHelp ? ' • R&D help requested' : ''}${h.excludedIngredients ? ` • avoid: ${h.excludedIngredients}` : ''}`;
        }
        return { key: q.questionKey, title: q.titleEn, display, note: state.questionNotes[q.questionKey] };
      })
      .filter(Boolean) as Array<{ key: string; title: string; display: string; note?: string }>;
  }, [briefQs, state.briefAnswers, state.questionNotes]);

  const specsSummary = useMemo(() => {
    return Object.entries(state.specs)
      .filter(([, v]) => v && v.selected.length > 0)
      .map(([key, val]) => {
        const master = masters.find((m) => m.categoryKey === key);
        const labels = val!.selected.map((sv) => master?.options.find((o) => o.value === sv)?.labelEn || sv);
        return {
          key,
          title: master?.defaultTitleEn || key,
          display: labels.join(', '),
          note: state.questionNotes[`spec_${key}`],
        };
      });
  }, [state.specs, state.questionNotes, masters]);

  const fragranceSummary = useMemo(() => {
    if (!state.fragrance.family) return null;
    const fragMaster = masters.find((m) => m.categoryKey === 'fragrances');
    const fam = fragMaster?.options.find((o) => o.value === state.fragrance.family);
    const famMeta = (fam as unknown as { meta?: { subNotes?: Array<{ value: string; labelEn: string }> } } | undefined)?.meta;
    const subNotes = famMeta?.subNotes || [];
    const noteLabels = state.fragrance.notes.map((n) => subNotes.find((s) => s.value === n)?.labelEn || n);
    return {
      family: fam?.labelEn || state.fragrance.family,
      notes: noteLabels.join(', '),
      intensity: state.fragrance.intensity,
    };
  }, [state.fragrance, masters]);

  async function handleSubmit() {
    if (!emailLocal && !user) {
      setError('Please enter your email so we can send confirmation.');
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
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit your sample request.');
      }
      dispatch({ type: 'SET_SUBMITTED', payload: { orderNumber: data.orderNumber, id: data.id } });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StepShell
      stepKey="review"
      eyebrow="One last look"
      title={`${state.customerName}, your custom sample brief is ready.`}
      subtitle="Review every detail. Edit anything that needs a tweak — submit when it feels right."
      footer={
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CTAButton
            label={submitting ? 'Submitting…' : 'Submit Sample Request'}
            onClick={handleSubmit}
            disabled={submitting}
          />
          <button
            type="button"
            onClick={onBack}
            className="text-xs uppercase tracking-[0.22em] text-cream-700 hover:text-ink-700"
          >
            Back
          </button>
        </div>
      }
    >
      <div className="grid lg:grid-cols-[1fr_2fr] gap-10">
        {/* Bottle preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="lg:sticky lg:top-24 self-start"
        >
          <BottlePreview name={state.customerName} size="md" />
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onEditPersonalization}
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-cream-700 hover:text-kcc-rose-dark"
            >
              <Pencil size={12} />
              <span>Edit name</span>
            </button>
          </div>
        </motion.div>

        {/* Summary */}
        <div className="space-y-8">
          <ReviewBlock title="Category" onEdit={onEditCategory}>
            <p className="text-ink-800">
              {state.category.mainName}
              {state.category.subName && <span className="text-cream-700"> → </span>}
              <span>{state.category.subName}</span>
              {state.category.itemName && (
                <>
                  <span className="text-cream-700"> → </span>
                  <span className="font-serif italic">{state.category.itemName}</span>
                </>
              )}
            </p>
          </ReviewBlock>

          <ReviewBlock title="Brief" onEdit={onEditBrief}>
            <ul className="space-y-3">
              {briefSummary.map((item) => (
                <li key={item.key} className="border-b border-cream-300 pb-3 last:border-0">
                  <p className="text-xs uppercase tracking-wider text-cream-700 mb-0.5">{item.title}</p>
                  <p className="text-sm text-ink-800">{item.display}</p>
                  {item.note && (
                    <p className="text-xs text-cream-700 italic mt-1">Note: {item.note}</p>
                  )}
                </li>
              ))}
              {briefSummary.length === 0 && (
                <li className="text-sm text-cream-700">No brief answers captured yet.</li>
              )}
            </ul>
          </ReviewBlock>

          <ReviewBlock title="Specs" onEdit={onEditSpecs}>
            <ul className="space-y-3">
              {specsSummary.map((s) => (
                <li key={s.key} className="border-b border-cream-300 pb-3 last:border-0">
                  <p className="text-xs uppercase tracking-wider text-cream-700 mb-0.5">{s.title}</p>
                  <p className="text-sm text-ink-800">{s.display}</p>
                  {s.note && (
                    <p className="text-xs text-cream-700 italic mt-1">Note: {s.note}</p>
                  )}
                </li>
              ))}
              {fragranceSummary && (
                <li className="border-b border-cream-300 pb-3 last:border-0">
                  <p className="text-xs uppercase tracking-wider text-cream-700 mb-0.5">Fragrance</p>
                  <p className="text-sm text-ink-800">
                    {fragranceSummary.family}
                    {fragranceSummary.notes && <span className="text-cream-700"> · {fragranceSummary.notes}</span>}
                    {fragranceSummary.intensity && <span className="text-cream-700"> · {fragranceSummary.intensity}</span>}
                  </p>
                </li>
              )}
              {specsSummary.length === 0 && !fragranceSummary && (
                <li className="text-sm text-cream-700">No specs configured for this product.</li>
              )}
            </ul>
          </ReviewBlock>

          <ReviewBlock title="Your Details">
            <div className="grid sm:grid-cols-2 gap-3">
              {!user && (
                <Field
                  icon={Mail}
                  type="email"
                  value={emailLocal}
                  onChange={setEmailLocal}
                  placeholder="Email address *"
                />
              )}
              <Field
                icon={Phone}
                type="tel"
                value={phone}
                onChange={setPhone}
                placeholder="Phone (optional)"
              />
              <Field
                icon={Building2}
                type="text"
                value={company}
                onChange={setCompany}
                placeholder="Company / Brand (optional)"
              />
            </div>
          </ReviewBlock>

          {error && (
            <div className="rounded-2xl border border-blush-300 bg-blush-50 px-4 py-3 text-sm text-blush-800">
              {error}
            </div>
          )}

          {submitting && (
            <div className="flex items-center gap-2 text-cream-700">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-sm">Sending your brief to KCC…</span>
            </div>
          )}
        </div>
      </div>
    </StepShell>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-cream-300 p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-kcc-rose-dark">{title}</h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-cream-700 hover:text-ink-700 transition-colors"
          >
            <Pencil size={11} />
            Edit
          </button>
        )}
      </div>
      {children}
    </div>
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
        className="w-full ps-11 pe-4 py-3 bg-white border border-cream-300 rounded-2xl text-sm text-ink-800 placeholder:text-cream-700 focus:outline-none focus:border-ink-700 transition-colors"
      />
    </label>
  );
}
