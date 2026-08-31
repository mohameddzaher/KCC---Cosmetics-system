import type { BriefQuestionWidget, BriefScope } from '@/models/BriefQuestion';

export type { BriefQuestionWidget, BriefScope };

export interface AdminBriefOption {
  value: string;
  labelEn: string;
  labelAr?: string;
  description?: string;
  descriptionAr?: string;
  imageUrl?: string;
  allowNote?: boolean;
  noteLabelEn?: string;
  noteLabelAr?: string;
  slotRequired?: boolean;
}

export interface AdminBriefCondition {
  questionKey: string;
  value: string | string[];
}

export interface AdminBriefQuestion {
  _id?: string;
  questionKey: string;
  scope: BriefScope;
  scopeKey: string;
  order: number;
  widget: BriefQuestionWidget;
  titleEn: string;
  titleAr?: string;
  subtitleEn?: string;
  subtitleAr?: string;
  helperEn?: string;
  helperAr?: string;
  options: AdminBriefOption[];
  maxSelect?: number;
  accept?: string;
  required: boolean;
  active: boolean;
  allowNote: boolean;
  conditions?: AdminBriefCondition[];
}

/** Widgets that render a list of choices the admin has to author. */
export const WIDGETS_WITH_OPTIONS: BriefQuestionWidget[] = [
  'cards', 'image-cards', 'chips-single', 'chips-multi', 'yes-no', 'checkbox-list', 'upload',
];

export const WIDGET_ORDER: BriefQuestionWidget[] = [
  'chips-single',
  'chips-multi',
  'cards',
  'image-cards',
  'yes-no',
  'checkbox-list',
  'text',
  'textarea',
  'upload',
  'hero-ingredient',
];

export function emptyQuestion(scope: BriefScope, scopeKey: string, order: number): AdminBriefQuestion {
  return {
    questionKey: '',
    scope,
    scopeKey,
    order,
    widget: 'chips-single',
    titleEn: '',
    titleAr: '',
    options: [],
    required: true,
    active: true,
    allowNote: true,
    conditions: [],
  };
}

/** camelCase a title into a stable internal key, de-duplicated within its scope. */
export function autoKey(title: string, existingKeys: string[]): string {
  const camel = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join('');
  if (!camel) return 'question';
  if (!existingKeys.includes(camel)) return camel;
  let i = 2;
  while (existingKeys.includes(`${camel}${i}`)) i++;
  return `${camel}${i}`;
}

/** kebab-case an option label into a stable stored value. */
export function autoOptionValue(label: string, existingValues: string[]): string {
  const slug = (label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const base = slug || `option-${existingValues.length + 1}`;
  if (!existingValues.includes(base)) return base;
  let i = 2;
  while (existingValues.includes(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
