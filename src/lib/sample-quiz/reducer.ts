import type { QuizState, QuizAction } from './types';
import { INITIAL_STATE } from './types';

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'SET_NAME':
      return { ...state, customerName: action.name };
    case 'SET_BRIEF':
      return { ...state, briefAnswers: { ...state.briefAnswers, [action.key]: action.value } };
    case 'SET_NOTE':
      return { ...state, questionNotes: { ...state.questionNotes, [action.key]: action.note } };
    case 'SET_CATEGORY':
      return { ...state, category: { ...state.category, ...action.payload } };
    case 'SET_SPEC':
      return { ...state, specs: { ...state.specs, [action.key]: action.value } };
    case 'SET_FRAGRANCE':
      return { ...state, fragrance: { ...state.fragrance, ...action.patch } };
    case 'SET_EMAIL':
      return { ...state, email: action.email };
    case 'SET_PROMO_CODE':
      return { ...state, promoCode: action.code };
    case 'SET_PROMO_APPLIED':
      return { ...state, promoApplied: action.payload };
    case 'SET_SUBMITTED':
      return { ...state, submitted: action.payload, phase: 'thankyou' };
    case 'RESET':
      return INITIAL_STATE;
    default:
      return state;
  }
}
