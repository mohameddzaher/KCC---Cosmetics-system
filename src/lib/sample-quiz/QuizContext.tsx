'use client';

import { createContext, useContext, useReducer, useEffect, useMemo, ReactNode } from 'react';
import { quizReducer } from './reducer';
import { INITIAL_STATE, type QuizState, type QuizAction } from './types';

interface QuizContextValue {
  state: QuizState;
  dispatch: React.Dispatch<QuizAction>;
}

const QuizContext = createContext<QuizContextValue | null>(null);

const STORAGE_KEY = 'kcc-quiz-state-v2';

/**
 * Restore state from localStorage on first render.
 * - Skips restore if storage missing or parse fails.
 * - Skips if the saved state is in `submitted` — that screen is one-time.
 */
function init(initial: QuizState): QuizState {
  if (typeof window === 'undefined') return initial;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as QuizState;
    if (parsed?.submitted) return initial; // user already finished — start fresh
    return { ...initial, ...parsed };
  } catch {
    return initial;
  }
}

export function QuizProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(quizReducer, INITIAL_STATE, init);

  // Persist on every change. Drop entry when the user submits or resets.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (state.submitted) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch {
      // Quota or private mode — silently ignore
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz() {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error('useQuiz must be used within QuizProvider');
  return ctx;
}
