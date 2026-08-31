'use client';

import { Suspense } from 'react';
import { QuizProvider } from '@/lib/sample-quiz/QuizContext';
import QuizOrchestrator from '@/components/order/sample-quiz/QuizOrchestrator';
import ReopenOrder from '@/components/order/sample-quiz/ReopenOrder';
import RequireAuth from '@/components/auth/RequireAuth';

/**
 * Sample Order — Function-of-Beauty-style single-page quiz.
 *
 * State lives in QuizContext (useReducer).
 * QuizOrchestrator owns navigation between phases and renders progress bar.
 *
 * Submit hits POST /api/orders with backward-compatible payload (Order.surveyData
 * is Mongoose Mixed — new v2 fields stored alongside legacy mirrors).
 *
 * `?from=<orderId>` reopens a past order's answers for editing — see ReopenOrder.
 */
export default function SamplePage() {
  return (
    <RequireAuth>
      <QuizProvider>
        <Suspense fallback={null}>
          <ReopenOrder>
            <QuizOrchestrator />
          </ReopenOrder>
        </Suspense>
      </QuizProvider>
    </RequireAuth>
  );
}
