'use client';

import QuizShell from '../QuizShell';
import StepFooter from '../StepFooter';
import ChipSingle from '../widgets/ChipSingle';
import ChipMulti from '../widgets/ChipMulti';
import CardGrid from '../widgets/CardGrid';
import CheckList from '../widgets/CheckList';
import UploadSlots from '../widgets/UploadSlots';
import HeroIngredientWidget from '../widgets/HeroIngredientWidget';
import AddNoteToggle from '../widgets/AddNoteToggle';
import { useQuiz } from '@/lib/sample-quiz/QuizContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isAnswered, type QuestionDoc } from '@/lib/sample-quiz/flow';
import type {
  AnswerValue, CheckListAnswer, HeroIngredientAnswer, UploadAnswer,
} from '@/lib/sample-quiz/types';

const EMPTY_HERO: HeroIngredientAnswer = {
  enabled: false,
  ingredients: [],
  needsRDHelp: false,
  excludedIngredients: '',
};

const EMPTY_CHECKLIST: CheckListAnswer = { selected: [], notes: {} };

/**
 * Renders ONE admin-authored question, whatever its scope or widget.
 *
 * The same component serves the general brief and every category-scoped
 * question set, which is why a category question behaves exactly like a brief
 * question — same widgets, same note box, same navigation.
 */
export default function QuestionStep({
  question,
  indexInGroup,
  groupSize,
  onNext,
  onBack,
  isLastOfGroup,
  editingFromReview,
}: {
  question: QuestionDoc;
  indexInGroup: number;
  groupSize: number;
  onNext: () => void;
  onBack: () => void;
  isLastOfGroup: boolean;
  editingFromReview: boolean;
}) {
  const { state, dispatch } = useQuiz();
  const { t, pick } = useLanguage();

  const isGeneral = question.scope === 'general';
  const answerKey = isGeneral ? question.questionKey : `${question.scope}:${question.questionKey}`;
  const answer: AnswerValue | undefined = isGeneral
    ? state.briefAnswers[question.questionKey]
    : state.categoryAnswers[answerKey];

  function setAnswer(value: AnswerValue) {
    if (isGeneral) dispatch({ type: 'SET_BRIEF', key: question.questionKey, value });
    else dispatch({ type: 'SET_CATEGORY_ANSWER', key: answerKey, value });
  }

  const note = state.questionNotes[answerKey] || '';
  const answered = isAnswered(question, answer);

  const options = question.options.map((o) => ({
    value: o.value,
    label: pick(o.labelEn, o.labelAr),
    description: pick(o.description, o.descriptionAr),
    imageUrl: o.imageUrl,
    allowNote: o.allowNote,
    noteLabel: pick(o.noteLabelEn, o.noteLabelAr),
    required: o.slotRequired,
  }));

  let widget: React.ReactNode = null;
  switch (question.widget) {
    case 'cards':
      widget = (
        <CardGrid
          options={options}
          value={typeof answer === 'string' ? answer : ''}
          onChange={setAnswer}
        />
      );
      break;
    case 'image-cards':
      widget = (
        <CardGrid
          variant="image-cards"
          options={options}
          value={typeof answer === 'string' ? answer : ''}
          onChange={setAnswer}
        />
      );
      break;
    case 'chips-single':
    case 'yes-no':
      widget = (
        <ChipSingle
          options={options}
          value={typeof answer === 'string' ? answer : ''}
          onChange={setAnswer}
        />
      );
      break;
    case 'chips-multi':
      widget = (
        <ChipMulti
          options={options}
          selected={Array.isArray(answer) ? answer : []}
          onChange={setAnswer}
          maxSelect={question.maxSelect}
        />
      );
      break;
    case 'checkbox-list':
      widget = (
        <CheckList
          options={options}
          value={
            answer && typeof answer === 'object' && 'selected' in answer
              ? (answer as CheckListAnswer)
              : EMPTY_CHECKLIST
          }
          onChange={setAnswer}
          maxSelect={question.maxSelect}
        />
      );
      break;
    case 'upload':
      widget = (
        <UploadSlots
          slots={options}
          accept={question.accept}
          value={
            answer && typeof answer === 'object' && !Array.isArray(answer) && !('selected' in answer)
              ? (answer as UploadAnswer)
              : {}
          }
          onChange={setAnswer}
        />
      );
      break;
    case 'hero-ingredient':
      widget = (
        <HeroIngredientWidget
          value={
            answer && typeof answer === 'object' && 'enabled' in answer
              ? (answer as HeroIngredientAnswer)
              : EMPTY_HERO
          }
          onChange={setAnswer}
        />
      );
      break;
    case 'text':
      widget = (
        <input
          type="text"
          value={typeof answer === 'string' ? answer : ''}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={t('quiz.typeAnswer')}
          data-focus-self
          className="w-full max-w-2xl border-0 border-b-2 border-cream-400 bg-transparent px-0 py-3 font-serif text-2xl text-ink-800 outline-none transition-colors placeholder:text-cream-600 focus:border-accent"
        />
      );
      break;
    case 'textarea':
      widget = (
        <textarea
          rows={5}
          value={typeof answer === 'string' ? answer : ''}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={t('quiz.tellUsMore')}
          className="w-full max-w-3xl resize-none rounded-2xl border border-cream-300 bg-surface px-5 py-4 text-ink-800 placeholder:text-cream-700 focus:border-ink-800 focus:outline-none"
        />
      );
      break;
    default:
      widget = null;
  }

  // Wide canvases only where a grid actually benefits; a long option list gets
  // the whole screen so it spreads sideways instead of running down the page.
  const width =
    question.widget === 'text' || question.widget === 'textarea' || question.widget === 'hero-ingredient'
      ? 'narrow'
      : options.length > 12
      ? 'full'
      : 'wide';

  const nextLabel = editingFromReview
    ? t('quiz.saveAndReturn')
    : isLastOfGroup
    ? t('quiz.continue')
    : t('quiz.next');

  return (
    <QuizShell
      stepKey={`q-${question.scope}-${question.questionKey}`}
      eyebrow={t('quiz.questionOf', { current: indexInGroup + 1, total: groupSize })}
      title={pick(question.titleEn, question.titleAr)}
      subtitle={pick(question.subtitleEn, question.subtitleAr)}
      helper={pick(question.helperEn, question.helperAr)}
      width={width}
      footer={
        <StepFooter
          nextLabel={nextLabel}
          onNext={onNext}
          nextDisabled={!answered}
          onBack={onBack}
          onSkip={!question.required && !editingFromReview ? onNext : undefined}
        />
      }
    >
      {widget}

      {question.allowNote && (
        <AddNoteToggle
          value={note}
          onChange={(v) => dispatch({ type: 'SET_NOTE', key: answerKey, note: v })}
        />
      )}
    </QuizShell>
  );
}
