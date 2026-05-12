/**
 * Sample Quiz state types — the shape of customer answers across all 5 phases.
 *
 * Backend POSTs to existing /api/orders endpoint with surveyData containing
 * these fields plus a quizVersion: 'v2' flag and a few derived legacy fields
 * for backward compat with admin views.
 */

import type { SpecCategoryKey } from '@/models/SpecOptionMaster';

export interface HeroIngredientAnswer {
  enabled: boolean;             // Q10 yes/no
  ingredients: string[];        // up to 2
  needsRDHelp: boolean;
  excludedIngredients: string;
}

export interface SpecAnswer {
  selected: string[];
  note?: string;
}

export interface FragranceAnswer {
  family: string;               // primary family value
  notes: string[];              // sub-notes (multi-select)
  intensity: 'light' | 'medium' | 'strong' | 'long-lasting' | '';
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

  // Phase 2 — keyed by questionKey, value depends on widget:
  //   single-select / yes-no   → string
  //   multi-select             → string[]
  //   hero-ingredient          → HeroIngredientAnswer
  //   text / textarea          → string
  briefAnswers: Record<string, string | string[] | HeroIngredientAnswer>;
  questionNotes: Record<string, string>;

  // Phase 3
  category: Partial<QuizCategory>;

  // Phase 4
  specs: Partial<Record<SpecCategoryKey, SpecAnswer>>;
  fragrance: FragranceAnswer;

  // Phase 5
  email: string;
  promoCode: string;
  promoApplied: { code: string; discount: number } | null;

  // submission
  submitted: { orderNumber: string; id: string } | null;
}

export const INITIAL_STATE: QuizState = {
  phase: 'personalization',
  customerName: '',
  briefAnswers: {},
  questionNotes: {},
  category: {},
  specs: {},
  fragrance: { family: '', notes: [], intensity: '' },
  email: '',
  promoCode: '',
  promoApplied: null,
  submitted: null,
};

export type QuizAction =
  | { type: 'SET_PHASE'; phase: QuizPhase }
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_BRIEF'; key: string; value: string | string[] | HeroIngredientAnswer }
  | { type: 'SET_NOTE'; key: string; note: string }
  | { type: 'SET_CATEGORY'; payload: Partial<QuizCategory> }
  | { type: 'SET_SPEC'; key: SpecCategoryKey; value: SpecAnswer }
  | { type: 'SET_FRAGRANCE'; patch: Partial<FragranceAnswer> }
  | { type: 'SET_EMAIL'; email: string }
  | { type: 'SET_PROMO_CODE'; code: string }
  | { type: 'SET_PROMO_APPLIED'; payload: { code: string; discount: number } | null }
  | { type: 'SET_SUBMITTED'; payload: { orderNumber: string; id: string } }
  | { type: 'RESET' };
