'use client';

/**
 * Quiz flow builder.
 *
 * The quiz used to be a hand-rolled stage machine with one index per phase,
 * which is why "next" could land you mid-page and why an "Edit" link from the
 * review screen forced you to walk the rest of the survey again.
 *
 * Instead this compiles the whole survey — including admin-authored,
 * conditionally-visible and category-scoped questions — into ONE flat list of
 * steps. Everything else (progress, back/next, scroll-to-top, jump-to-step,
 * return-to-review) becomes list arithmetic.
 *
 * The list is recomputed whenever answers change, because a question may
 * appear or disappear based on an earlier answer. Navigation is therefore by
 * step *id*, never by index.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AnswerValue, QuizState } from './types';

export type Scope = 'general' | 'main' | 'sub' | 'product';

export interface QuestionDoc {
  _id: string;
  questionKey: string;
  scope: Scope;
  scopeKey: string;
  order: number;
  widget: string;
  titleEn: string;
  titleAr?: string;
  subtitleEn?: string;
  subtitleAr?: string;
  helperEn?: string;
  helperAr?: string;
  options: Array<{
    value: string;
    labelEn: string;
    labelAr?: string;
    description?: string;
    descriptionAr?: string;
    imageUrl?: string;
    allowNote?: boolean;
    noteLabelEn?: string;
    noteLabelAr?: string;
    slotRequired?: boolean;
  }>;
  maxSelect?: number;
  accept?: string;
  required: boolean;
  active: boolean;
  allowNote: boolean;
  conditions?: Array<{ questionKey: string; value: string | string[] }>;
}

export interface SpecMasterDoc {
  categoryKey: string;
  defaultTitleEn: string;
  defaultTitleAr?: string;
  defaultSubtitleEn?: string;
  defaultSubtitleAr?: string;
  widget: string;
  options: Array<{ value: string; labelEn: string; labelAr?: string; meta?: Record<string, unknown> }>;
}

export interface ProductSpecDoc {
  specKey: string;
  enabled: boolean;
  titleEn?: string;
  titleAr?: string;
  subtitleEn?: string;
  subtitleAr?: string;
  maxSelect: number;
  isRequired: boolean;
  sortOrder: number;
  allowedOptions: string[];
}

/**
 * A packaging part the admin configured — the allowed values plus the master's
 * labels, handed to the studio so each tab shows exactly what the business
 * enabled for this product.
 */
export interface PackagingPart {
  allowed: string[];
  options: SpecMasterDoc['options'];
  title?: string;
  titleAr?: string;
}

export type PackagingParts = Partial<Record<'cap' | 'label' | 'finish' | 'color', PackagingPart>>;

/**
 * Specs that configure the packaging studio rather than asking their own
 * question. The admin edits them exactly like any other spec; the customer
 * sees them as tabs on the one visual packaging step, because picking a cap
 * without seeing it on the bottle is a worse question.
 */
export const PACKAGING_PART_KEYS: Record<string, keyof PackagingParts> = {
  'package-cap': 'cap',
  'package-label': 'label',
  'package-finish': 'finish',
  'package-color': 'color',
};

export type Step =
  | { id: 'personalization'; kind: 'personalization'; section: 'you' }
  | { id: string; kind: 'intro'; section: Section; intro: 'brief' | 'category' | 'specs' }
  | { id: string; kind: 'category'; section: 'category'; level: 1 | 2 | 3 }
  | { id: string; kind: 'question'; section: Section; question: QuestionDoc; indexInGroup: number; groupSize: number }
  | { id: string; kind: 'spec'; section: 'specs'; spec: ProductSpecDoc; master: SpecMasterDoc; indexInGroup: number; groupSize: number; parts?: PackagingParts }
  | { id: 'review'; kind: 'review'; section: 'review' };

export type Section = 'you' | 'brief' | 'category' | 'specs' | 'review';

export const SECTIONS: Section[] = ['you', 'brief', 'category', 'specs', 'review'];

/* ------------------------------------------------------------------ */
/* Condition evaluation                                                */
/* ------------------------------------------------------------------ */

function answerMatches(answer: AnswerValue | undefined, targets: string[]): boolean {
  if (answer == null) return false;
  if (typeof answer === 'string') return targets.includes(answer);
  if (Array.isArray(answer)) return answer.some((a) => targets.includes(a));
  if (typeof answer === 'object' && 'selected' in answer) {
    // checkbox-list answer — { selected: string[], notes }
    const sel = (answer as { selected?: unknown }).selected;
    if (Array.isArray(sel)) return sel.some((a) => typeof a === 'string' && targets.includes(a));
  }
  return false;
}

/**
 * A question is visible when every one of its conditions matches.
 * Conditions may reference the general brief or any earlier scoped answer;
 * `_categoryMain` is a reserved key meaning "the chosen main category".
 */
export function isVisible(q: QuestionDoc, state: QuizState): boolean {
  if (!q.active) return false;
  if (!q.conditions || q.conditions.length === 0) return true;

  return q.conditions.every((c) => {
    const targets = Array.isArray(c.value) ? c.value : [c.value];
    if (targets.length === 0 || targets.every((t) => !t)) return true;

    if (c.questionKey === '_categoryMain') {
      // Legacy gate. Category questions now live in their own scope, but a
      // question may still reference this. Unknown category → hide, the same
      // way any other unanswered dependency hides its dependants.
      const picked = state.category.mainSlug || (state.briefAnswers.productCategory as string | undefined);
      return !!picked && targets.includes(picked);
    }

    const fromBrief = state.briefAnswers[c.questionKey];
    if (fromBrief !== undefined) return answerMatches(fromBrief, targets);

    for (const scope of ['main', 'sub', 'product'] as const) {
      const v = state.categoryAnswers[`${scope}:${c.questionKey}`];
      if (v !== undefined) return answerMatches(v, targets);
    }
    return false;
  });
}

/* ------------------------------------------------------------------ */
/* Answered-ness                                                       */
/* ------------------------------------------------------------------ */

export function isAnswered(q: QuestionDoc, answer: AnswerValue | undefined): boolean {
  if (!q.required) return true;
  switch (q.widget) {
    case 'hero-ingredient':
      return true; // optional sub-flow, always passable
    case 'chips-multi':
      return Array.isArray(answer) && answer.length > 0;
    case 'checkbox-list': {
      if (!answer || typeof answer !== 'object' || !('selected' in answer)) return false;
      const sel = (answer as { selected?: unknown }).selected;
      return Array.isArray(sel) && sel.length > 0;
    }
    case 'upload': {
      if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return false;
      const files = answer as Record<string, unknown[]>;
      const requiredSlots = q.options.filter((o) => o.slotRequired);
      const slots = requiredSlots.length > 0 ? requiredSlots : q.options.slice(0, 1);
      return slots.every((o) => Array.isArray(files[o.value]) && files[o.value].length > 0);
    }
    default:
      return typeof answer === 'string' && answer.trim().length > 0;
  }
}

/* ------------------------------------------------------------------ */
/* Data loading                                                        */
/* ------------------------------------------------------------------ */

interface QuizData {
  general: QuestionDoc[];
  /** Questions attached to the chosen main category. */
  scopedMain: QuestionDoc[];
  /** Questions attached to the chosen sub-family. */
  scopedSub: QuestionDoc[];
  /** Questions attached to the exact product. */
  scopedProduct: QuestionDoc[];
  specs: ProductSpecDoc[];
  masters: SpecMasterDoc[];
  loadingGeneral: boolean;
  loadingScoped: boolean;
  loadingSpecs: boolean;
}

async function getJSON<T>(url: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return fallback;
    return (await r.json()) as T;
  } catch {
    return fallback;
  }
}

export function useQuizData(state: QuizState): QuizData {
  const [general, setGeneral] = useState<QuestionDoc[]>([]);
  const [scopedMain, setScopedMain] = useState<QuestionDoc[]>([]);
  const [scopedSub, setScopedSub] = useState<QuestionDoc[]>([]);
  const [scopedProduct, setScopedProduct] = useState<QuestionDoc[]>([]);
  const [specs, setSpecs] = useState<ProductSpecDoc[]>([]);
  const [masters, setMasters] = useState<SpecMasterDoc[]>([]);
  const [loadingGeneral, setLoadingGeneral] = useState(true);
  const [loadingScoped, setLoadingScoped] = useState(false);
  const [loadingSpecs, setLoadingSpecs] = useState(false);

  const { mainSlug, subSlug, productKey } = state.category;

  useEffect(() => {
    let cancelled = false;
    setLoadingGeneral(true);
    Promise.all([
      getJSON<QuestionDoc[]>('/api/sample-quiz/brief-questions?scope=general', []),
      getJSON<{ categories: SpecMasterDoc[] }>('/api/sample-quiz/spec-options', { categories: [] }),
    ]).then(([g, m]) => {
      if (cancelled) return;
      setGeneral(Array.isArray(g) ? g : []);
      setMasters(Array.isArray(m.categories) ? m.categories : []);
      setLoadingGeneral(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Each level is fetched independently so choosing a main category does not
  // discard (and re-request) the sub-family and product sets.
  useEffect(() => {
    if (!mainSlug) {
      setScopedMain([]);
      return;
    }
    let cancelled = false;
    setLoadingScoped(true);
    getJSON<QuestionDoc[]>(
      `/api/sample-quiz/brief-questions?scope=main&scopeKey=${encodeURIComponent(mainSlug)}`,
      []
    ).then((qs) => {
      if (cancelled) return;
      setScopedMain(Array.isArray(qs) ? qs : []);
      setLoadingScoped(false);
    });
    return () => {
      cancelled = true;
    };
  }, [mainSlug]);

  useEffect(() => {
    if (!mainSlug || !subSlug) {
      setScopedSub([]);
      return;
    }
    let cancelled = false;
    getJSON<QuestionDoc[]>(
      `/api/sample-quiz/brief-questions?scope=sub&scopeKey=${encodeURIComponent(`${mainSlug}__${subSlug}`)}`,
      []
    ).then((qs) => {
      if (!cancelled) setScopedSub(Array.isArray(qs) ? qs : []);
    });
    return () => {
      cancelled = true;
    };
  }, [mainSlug, subSlug]);

  useEffect(() => {
    if (!productKey) {
      setScopedProduct([]);
      return;
    }
    let cancelled = false;
    getJSON<QuestionDoc[]>(
      `/api/sample-quiz/brief-questions?scope=product&scopeKey=${encodeURIComponent(productKey)}`,
      []
    ).then((qs) => {
      if (!cancelled) setScopedProduct(Array.isArray(qs) ? qs : []);
    });
    return () => {
      cancelled = true;
    };
  }, [productKey]);

  useEffect(() => {
    if (!productKey) {
      setSpecs([]);
      return;
    }
    let cancelled = false;
    setLoadingSpecs(true);
    getJSON<{ specs?: ProductSpecDoc[] }>(
      `/api/sample-quiz/product-config/${encodeURIComponent(productKey)}`,
      {}
    ).then((cfg) => {
      if (cancelled) return;
      setSpecs(Array.isArray(cfg.specs) ? cfg.specs : []);
      setLoadingSpecs(false);
    });
    return () => {
      cancelled = true;
    };
  }, [productKey]);

  // Memoised: a fresh object here would invalidate `buildSteps` on every
  // render, re-creating every navigation callback and re-rendering the whole
  // option grid on each keystroke.
  return useMemo(
    () => ({ general, scopedMain, scopedSub, scopedProduct, specs, masters, loadingGeneral, loadingScoped, loadingSpecs }),
    [general, scopedMain, scopedSub, scopedProduct, specs, masters, loadingGeneral, loadingScoped, loadingSpecs]
  );
}

/* ------------------------------------------------------------------ */
/* Step list                                                           */
/* ------------------------------------------------------------------ */

export function buildSteps(state: QuizState, data: QuizData): Step[] {
  const steps: Step[] = [{ id: 'personalization', kind: 'personalization', section: 'you' }];

  // --- Section: the brief ---
  const briefVisible = data.general.filter((q) => isVisible(q, state)).sort((a, b) => a.order - b.order);
  steps.push({ id: 'intro:brief', kind: 'intro', section: 'brief', intro: 'brief' });
  briefVisible.forEach((q, i) =>
    steps.push({
      id: `q:general:${q.questionKey}`,
      kind: 'question',
      section: 'brief',
      question: q,
      indexInGroup: i,
      groupSize: briefVisible.length,
    })
  );

  // --- Section: the product ---
  //
  // Each level's own questions are asked IMMEDIATELY after that level is
  // picked: choose "Body Care" and you are asked about body care before you
  // are asked which sub-family — which is how the business briefs a customer.
  steps.push({ id: 'intro:category', kind: 'intro', section: 'category', intro: 'category' });

  const visibleIn = (set: QuestionDoc[]) =>
    set.filter((q) => isVisible(q, state)).sort((a, b) => a.order - b.order);

  const mainQs = visibleIn(data.scopedMain);
  const subQs = visibleIn(data.scopedSub);
  const productQs = visibleIn(data.scopedProduct);

  // One running counter across all three sets so the customer reads
  // "Question 3 of 7", not "Question 1 of 2" three times over.
  const scopedTotal = mainQs.length + subQs.length + productQs.length;
  let scopedSeen = 0;
  const pushScoped = (list: QuestionDoc[]) => {
    for (const q of list) {
      steps.push({
        id: `q:${q.scope}:${q.questionKey}`,
        kind: 'question',
        section: 'category',
        question: q,
        indexInGroup: scopedSeen++,
        groupSize: scopedTotal,
      });
    }
  };

  steps.push({ id: 'cat:1', kind: 'category', section: 'category', level: 1 });
  if (state.category.mainSlug) {
    pushScoped(mainQs);
    steps.push({ id: 'cat:2', kind: 'category', section: 'category', level: 2 });
  }
  if (state.category.subSlug) {
    pushScoped(subQs);
    steps.push({ id: 'cat:3', kind: 'category', section: 'category', level: 3 });
  }
  if (state.category.productKey) {
    pushScoped(productQs);
  }

  // --- Section: technical specs ---
  const withMaster = data.specs
    .filter((s) => s.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => ({ spec: s, master: data.masters.find((m) => m.categoryKey === s.specKey) }))
    .filter((x): x is { spec: ProductSpecDoc; master: SpecMasterDoc } => !!x.master);

  // The packaging parts fold into the packaging step's tabs, so they never
  // become steps of their own — but a part the admin disabled must not appear
  // as a tab either, which is why only the enabled ones are collected here.
  const parts: PackagingParts = {};
  for (const { spec, master } of withMaster) {
    const part = PACKAGING_PART_KEYS[spec.specKey];
    if (!part) continue;
    parts[part] = {
      allowed: spec.allowedOptions,
      options: master.options,
      title: spec.titleEn || master.defaultTitleEn,
      titleAr: spec.titleAr || master.defaultTitleAr,
    };
  }

  const enabledSpecs = withMaster.filter(({ spec }) => !PACKAGING_PART_KEYS[spec.specKey]);

  if (state.category.productKey && enabledSpecs.length > 0) {
    steps.push({ id: 'intro:specs', kind: 'intro', section: 'specs', intro: 'specs' });
    enabledSpecs.forEach(({ spec, master }, i) =>
      steps.push({
        id: `spec:${spec.specKey}`,
        kind: 'spec',
        section: 'specs',
        spec,
        master,
        indexInGroup: i,
        groupSize: enabledSpecs.length,
        ...(spec.specKey === 'product-packaging' ? { parts } : {}),
      })
    );
  }

  steps.push({ id: 'review', kind: 'review', section: 'review' });
  return steps;
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

const NAV_KEY = 'kcc-quiz-step-v3';

export function useQuizFlow(state: QuizState) {
  const data = useQuizData(state);
  const steps = useMemo(() => buildSteps(state, data), [state, data]);

  const [currentId, setCurrentId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'personalization';
    try {
      return window.localStorage.getItem(NAV_KEY) || 'personalization';
    } catch {
      return 'personalization';
    }
  });

  /** When set, finishing the edited step jumps straight back to the review. */
  const [returnTo, setReturnTo] = useState<string | null>(null);

  // A conditional question can disappear under the cursor (the answer it
  // depended on changed). Remember the last valid position so we land next to
  // where the customer was rather than at step 0.
  const rawIndex = useMemo(() => steps.findIndex((s) => s.id === currentId), [steps, currentId]);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  useEffect(() => {
    if (rawIndex >= 0) setFallbackIndex(rawIndex);
  }, [rawIndex]);

  const index = rawIndex >= 0 ? rawIndex : Math.min(fallbackIndex, Math.max(0, steps.length - 1));

  const current = steps[index] ?? steps[0];

  // A saved position can point at a step that has not been built yet — the
  // spec steps only exist once the product config has arrived. Until the data
  // for the chosen category has settled, leave the stored id alone; otherwise
  // a returning customer is silently thrown back to step one.
  const settled =
    !data.loadingGeneral &&
    (!state.category.mainSlug || !data.loadingScoped) &&
    (!state.category.productKey || !data.loadingSpecs);

  useEffect(() => {
    if (!settled) return;
    if (current && current.id !== currentId) setCurrentId(current.id);
  }, [settled, current, currentId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (state.submitted) window.localStorage.removeItem(NAV_KEY);
      else window.localStorage.setItem(NAV_KEY, currentId);
    } catch {
      /* private mode */
    }
  }, [currentId, state.submitted]);

  const goTo = useCallback((id: string) => setCurrentId(id), []);

  const goNext = useCallback(() => {
    if (returnTo) {
      const target = returnTo;
      setReturnTo(null);
      setCurrentId(target);
      return;
    }
    setCurrentId((cur) => {
      const i = steps.findIndex((s) => s.id === cur);
      const at = i >= 0 ? i : fallbackIndex;
      return steps[Math.min(at + 1, steps.length - 1)]?.id ?? cur;
    });
  }, [steps, returnTo, fallbackIndex]);

  const goBack = useCallback(() => {
    if (returnTo) {
      const target = returnTo;
      setReturnTo(null);
      setCurrentId(target);
      return;
    }
    setCurrentId((cur) => {
      const i = steps.findIndex((s) => s.id === cur);
      const at = i >= 0 ? i : fallbackIndex;
      return steps[Math.max(at - 1, 0)]?.id ?? cur;
    });
  }, [steps, returnTo, fallbackIndex]);

  /**
   * Edit one answer from the review screen and come straight back —
   * no walking the rest of the survey again.
   */
  const editFromReview = useCallback((stepId: string) => {
    setReturnTo('review');
    setCurrentId(stepId);
  }, []);

  const reset = useCallback(() => {
    setReturnTo(null);
    setCurrentId('personalization');
  }, []);

  const percent = steps.length > 1 ? Math.round((index / (steps.length - 1)) * 100) : 0;
  const sectionIndex = Math.max(0, SECTIONS.indexOf(current?.section ?? 'you'));

  return {
    data,
    steps,
    step: current,
    index,
    percent,
    sectionIndex,
    isEditingFromReview: returnTo !== null,
    goTo,
    goNext,
    goBack,
    editFromReview,
    reset,
    canGoBack: index > 0,
  };
}
