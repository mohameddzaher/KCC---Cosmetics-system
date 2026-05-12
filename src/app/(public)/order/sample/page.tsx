'use client';

import { QuizProvider } from '@/lib/sample-quiz/QuizContext';
import QuizOrchestrator from '@/components/order/sample-quiz/QuizOrchestrator';

/**
 * Sample Order — Function-of-Beauty-style single-page quiz.
 *
 * State lives in QuizContext (useReducer).
 * QuizOrchestrator owns navigation between phases and renders progress bar.
 *
 * Submit hits POST /api/orders with backward-compatible payload (Order.surveyData
 * is Mongoose Mixed — new v2 fields stored alongside legacy mirrors).
 */
export default function SamplePage() {
  return (
    <QuizProvider>
      <QuizOrchestrator />
    </QuizProvider>
  );
}
