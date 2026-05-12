import type { QuizState, HeroIngredientAnswer } from './types';

/**
 * Builds the surveyData payload to POST to /api/orders.
 *
 * Backward-compatible: the existing Order schema's `surveyData` is a
 * Mongoose Mixed type so we can attach any keys we want. We:
 *   - Stamp the new shape under `quizVersion: 'v2'`.
 *   - Mirror a few fields into the legacy keys the old admin UI reads
 *     (productType, primaryGoal, texturePreference) so old views still work.
 */
export function buildOrderPayload(state: QuizState, customerInfo: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}) {
  const hero = state.briefAnswers.heroIngredient as HeroIngredientAnswer | undefined;

  const surveyData: Record<string, unknown> = {
    // ── New v2 fields ──
    quizVersion: 'v2',
    customerName: state.customerName,
    brief: state.briefAnswers,
    questionNotes: state.questionNotes,
    category: state.category,
    specs: state.specs,
    fragrance: state.fragrance,

    // ── Legacy mirrors (for backward-compat with old admin views) ──
    productType: state.category.subName?.toLowerCase() || 'other',
    productItem: state.category.itemName,
    primaryGoal:
      Array.isArray(state.briefAnswers.mainConcerns) && state.briefAnswers.mainConcerns.length > 0
        ? (state.briefAnswers.mainConcerns as string[])[0]
        : undefined,
    texturePreference: state.briefAnswers.preferredTexture,
    skinType: state.briefAnswers.scalpCondition || 'all',
    parabenFree: Array.isArray(state.briefAnswers.marketingClaims)
      ? (state.briefAnswers.marketingClaims as string[]).includes('paraben-free')
      : false,
    sulfateFree: Array.isArray(state.briefAnswers.marketingClaims)
      ? (state.briefAnswers.marketingClaims as string[]).includes('sulfate-free')
      : false,
    siliconeFree: Array.isArray(state.briefAnswers.marketingClaims)
      ? (state.briefAnswers.marketingClaims as string[]).includes('silicone-free')
      : false,
    vegan: Array.isArray(state.briefAnswers.marketingClaims)
      ? (state.briefAnswers.marketingClaims as string[]).includes('vegan')
      : false,
    naturalOrganic: Array.isArray(state.briefAnswers.marketingClaims)
      ? (state.briefAnswers.marketingClaims as string[]).includes('natural')
      : false,
    mustHaveIngredients: hero?.ingredients || [],
    mustAvoidIngredients: hero?.excludedIngredients
      ? hero.excludedIngredients.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
  };

  return {
    type: 'sample' as const,
    surveyData,
    customerInfo: {
      personName: customerInfo.name || state.customerName,
      email: customerInfo.email || state.email,
      phone: customerInfo.phone,
      companyName: customerInfo.company,
    },
    promoCode: state.promoCode || undefined,
  };
}
