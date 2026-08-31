/**
 * Sample Quiz state types — the shape of customer answers across every phase.
 *
 * The backend POSTs to /api/orders with `surveyData` containing these fields
 * plus `quizVersion: 'v2'` and a few derived legacy fields for admin views.
 */

import type { SpecCategoryKey } from '@/models/SpecOptionMaster';

export interface HeroIngredientAnswer {
  enabled: boolean;             // Q10 yes/no
  ingredients: string[];        // up to 2
  needsRDHelp: boolean;
  excludedIngredients: string;
}

/** `upload` widget — one entry per upload slot (option value). */
export type UploadAnswer = Record<string, Array<{ name: string; url: string }>>;

/** `checkbox-list` widget — selections plus an optional note per selection. */
export interface CheckListAnswer {
  selected: string[];
  notes: Record<string, string>;
}

export type AnswerValue =
  | string
  | string[]
  | HeroIngredientAnswer
  | UploadAnswer
  | CheckListAnswer;

export interface SpecAnswer {
  selected: string[];
  note?: string;
}

export interface FragranceAnswer {
  family: string;               // primary family value
  notes: string[];              // sub-notes (multi-select)
  intensity: 'light' | 'medium' | 'strong' | 'long-lasting' | '';
}

/** Packaging configurator selections (bottle / cap / label / finish). */
export interface PackagingAnswer {
  bottle: string;
  cap: string;
  label: string;
  finish: string;
  color: string;
}

export type QuizPhase =
  | 'personalization'
  | 'brief'
  | 'category'
  | 'specs'
  | 'review'
  | 'thankyou';

export interface QuizCategory {
  mainSlug: string;
  mainName: string;
  subSlug: string;
  subName: string;
  itemName: string;
  productKey: string;
}

export interface QuizState {
  phase: QuizPhase;
  // Phase 1
  customerName: string;

  // Phase 2 — general brief, keyed by questionKey
  briefAnswers: Record<string, AnswerValue>;

  /**
   * Phase 3.5 — category-scoped questions, keyed by `<scope>:<questionKey>`.
   * Scoping by `scope` alone is enough: only one main category, one
   * sub-category and one product are ever active for a single request.
   */
  categoryAnswers: Record<string, AnswerValue>;

  questionNotes: Record<string, string>;

  // Phase 3
  category: Partial<QuizCategory>;

  // Phase 4
  specs: Partial<Record<SpecCategoryKey, SpecAnswer>>;
  fragrance: FragranceAnswer;
  packaging: PackagingAnswer;

  // Phase 5
  email: string;
  promoCode: string;
  promoApplied: { code: string; discount: number } | null;

  // submission
  submitted: { orderNumber: string; id: string } | null;
}

export const EMPTY_PACKAGING: PackagingAnswer = {
  bottle: '',
  cap: '',
  label: '',
  finish: '',
  color: '',
};

export const INITIAL_STATE: QuizState = {
  phase: 'personalization',
  customerName: '',
  briefAnswers: {},
  categoryAnswers: {},
  questionNotes: {},
  category: {},
  specs: {},
  fragrance: { family: '', notes: [], intensity: '' },
  packaging: EMPTY_PACKAGING,
  email: '',
  promoCode: '',
  promoApplied: null,
  submitted: null,
};

export type QuizAction =
  | { type: 'SET_PHASE'; phase: QuizPhase }
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_BRIEF'; key: string; value: AnswerValue }
  | { type: 'SET_CATEGORY_ANSWER'; key: string; value: AnswerValue }
  | { type: 'SET_NOTE'; key: string; note: string }
  | { type: 'SET_CATEGORY'; payload: Partial<QuizCategory> }
  | { type: 'RESET_CATEGORY_ANSWERS' }
  | { type: 'SET_SPEC'; key: SpecCategoryKey; value: SpecAnswer }
  | { type: 'SET_FRAGRANCE'; patch: Partial<FragranceAnswer> }
  | { type: 'SET_PACKAGING'; patch: Partial<PackagingAnswer> }
  | { type: 'SET_EMAIL'; email: string }
  | { type: 'SET_PROMO_CODE'; code: string }
  | { type: 'SET_PROMO_APPLIED'; payload: { code: string; discount: number } | null }
  | { type: 'SET_SUBMITTED'; payload: { orderNumber: string; id: string } }
  | { type: 'HYDRATE'; state: Partial<QuizState> }
  | { type: 'RESET' };
