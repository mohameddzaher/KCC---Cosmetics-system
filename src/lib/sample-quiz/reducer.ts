import type { QuizState, QuizAction } from './types';
import { INITIAL_STATE, EMPTY_PACKAGING } from './types';

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'SET_NAME':
      return { ...state, customerName: action.name };
    case 'SET_BRIEF':
      return { ...state, briefAnswers: { ...state.briefAnswers, [action.key]: action.value } };
    case 'SET_CATEGORY_ANSWER':
      return { ...state, categoryAnswers: { ...state.categoryAnswers, [action.key]: action.value } };
    case 'SET_NOTE':
      return { ...state, questionNotes: { ...state.questionNotes, [action.key]: action.note } };
    case 'SET_CATEGORY':
      return { ...state, category: { ...state.category, ...action.payload } };
    case 'RESET_CATEGORY_ANSWERS':
      // Switching category invalidates answers collected for the previous one.
      return { ...state, categoryAnswers: {}, specs: {}, packaging: EMPTY_PACKAGING };
    case 'SET_SPEC':
      return { ...state, specs: { ...state.specs, [action.key]: action.value } };
    case 'SET_FRAGRANCE':
      return { ...state, fragrance: { ...state.fragrance, ...action.patch } };
    case 'SET_PACKAGING':
      return { ...state, packaging: { ...state.packaging, ...action.patch } };
    case 'SET_EMAIL':
      return { ...state, email: action.email };
    case 'SET_PROMO_CODE':
      return { ...state, promoCode: action.code };
    case 'SET_PROMO_APPLIED':
      return { ...state, promoApplied: action.payload };
    case 'SET_SUBMITTED':
      return { ...state, submitted: action.payload, phase: 'thankyou' };
    case 'HYDRATE':
      // Re-opening a past order: everything is replaced at once, because a
      // half-applied brief would be worse than none at all.
      return { ...INITIAL_STATE, ...action.state };
    case 'RESET':
      return INITIAL_STATE;
    default:
      return state;
  }
}
