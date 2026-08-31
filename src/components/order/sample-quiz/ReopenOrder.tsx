'use client';

/**
 * "Order this again, but let me change something."
 *
 * A customer who liked a sample almost never wants an identical repeat — they
 * want the same brief with one thing different. So instead of a one-click
 * duplicate, `/order/sample?from=<orderId>` loads that order's answers back
 * into the quiz and drops them on the review screen, where every answer already
 * has an Edit link. Change what you want, leave the rest, submit.
 *
 * Only v2 orders carry the full answer set. An older order cannot be reopened
 * this way, and says so rather than silently starting a blank quiz.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useQuiz } from '@/lib/sample-quiz/QuizContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { QuizState } from '@/lib/sample-quiz/types';

/** The step id the flow persists, so the quiz opens on the review screen. */
const NAV_KEY = 'kcc-quiz-step-v3';

interface SurveyV2 {
  quizVersion?: string;
  customerName?: string;
  brief?: QuizState['briefAnswers'];
  categoryAnswers?: QuizState['categoryAnswers'];
  questionNotes?: QuizState['questionNotes'];
  category?: QuizState['category'];
  specs?: QuizState['specs'];
  fragrance?: QuizState['fragrance'];
  packaging?: QuizState['packaging'];
}

export default function ReopenOrder({ children }: { children: React.ReactNode }) {
  const params = useSearchParams();
  const from = params.get('from');
  const { dispatch } = useQuiz();
  const { tx } = useLanguage();

  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>(from ? 'loading' : 'idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!from) return;
    let alive = true;

    (async () => {
      try {
        const res = await fetch(`/api/orders/${from}`, { cache: 'no-store' });
        const order = await res.json();
        if (!res.ok) throw new Error(order.error || 'Could not load that order');

        const sd = (order.surveyData || {}) as SurveyV2;
        if (sd.quizVersion !== 'v2') {
          throw new Error(
            'That order was placed before the current brief, so it cannot be reopened. Please start a new request.'
          );
        }
        if (!alive) return;

        dispatch({
          type: 'HYDRATE',
          state: {
            customerName: sd.customerName || '',
            briefAnswers: sd.brief || {},
            categoryAnswers: sd.categoryAnswers || {},
            questionNotes: sd.questionNotes || {},
            category: sd.category || {},
            specs: sd.specs || {},
            ...(sd.fragrance ? { fragrance: sd.fragrance } : {}),
            ...(sd.packaging ? { packaging: sd.packaging } : {}),
          },
        });

        // Land on the review screen — the one place every answer is editable.
        try {
          window.localStorage.setItem(NAV_KEY, 'review');
        } catch {
          /* private mode — the quiz just opens at the start instead */
        }
        setState('done');
      } catch (e) {
        if (!alive) return;
        setMessage(e instanceof Error ? e.message : 'Could not load that order');
        setState('error');
      }
    })();

    return () => {
      alive = false;
    };
  }, [from, dispatch]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="animate-spin text-brand" size={26} />
        <p className="text-sm text-fg-muted">{tx('Loading your previous brief…')}</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-fg">{message}</p>
        <a href="/order/sample" className="btn btn-primary btn-sm">
          {tx('Start a new request')}
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
