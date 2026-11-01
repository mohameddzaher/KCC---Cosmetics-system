/**
 * What logging an action does to an account.
 *
 * This is the rule the whole CRM turns on: the upcoming list is supposed to
 * empty itself as the team works, so recording a visit — from the account's own
 * page, from the upcoming list, or automatically when the customer requests a
 * sample — is what moves an account to `current`. Nobody drags it there, and
 * nobody has to remember to.
 *
 * Pure and shared, because three callers apply it and they must agree.
 */

/**
 * The stages an account moves through, and the six steps of the process.
 *
 * Defined here rather than on the model because the screens need them too, and
 * a constant imported from a Mongoose model drags the whole database driver
 * into the browser bundle. The model re-exports these, so there is still one
 * definition.
 */
export const CRM_STAGES = ['upcoming', 'current', 'hold', 'won', 'lost'] as const;
export type CrmStage = (typeof CRM_STAGES)[number];

/**
 * The call structure a company starts with, before the commercial manager
 * edits it.
 *
 * Defined here, used by the model as its default AND by the read that fills it
 * in for a targets document created before the field existed — a Mongoose
 * default only applies at insert, so without that backfill an existing
 * installation would show a rep no checklist at all.
 */
export const DEFAULT_VISIT_CHECKLIST = [
  { key: 'introduce', order: 1, labelEn: 'Introduce yourself', labelAr: 'تقديم نفسك', required: true },
  { key: 'company', order: 2, labelEn: 'Talk about KCC', labelAr: 'التعريف بالشركة', required: true },
  { key: 'products', order: 3, labelEn: 'Present our products', labelAr: 'عرض منتجاتنا', required: true },
  { key: 'card-give', order: 4, labelEn: 'Give your business card', labelAr: 'تسليم كرت العمل', required: false },
  { key: 'card-take', order: 5, labelEn: 'Take their card and details', labelAr: 'أخذ كرت العميل وبياناته', required: false },
];

export const CRM_STEPS = [
  'scheduled',    // 1 — a meeting is booked
  'introduced',   // 2 — KCC introduced: profile, what we provide, history
  'accountInfo',  // 3 — volume, rank, best sellers, umbrella brands, prices
  'keyPerson',    // 4 — name, position, department, phone
  'feedback',     // 5 — interested / moderate / not, and why
  'commercial',   // 6 — prices, quantities, payment method
] as const;
export type CrmStep = (typeof CRM_STEPS)[number];

/**
 * Actions that count as working the account.
 *
 * A note or an internal task does not: writing "call them next week" on a
 * target is not contact, and an upcoming list that empties on a note would
 * flatter the team instead of describing it.
 */
export const ENGAGEMENT_TYPES = [
  'visit', 'meeting', 'call', 'whatsapp', 'email',
  'intro', 'account_info', 'key_person', 'feedback', 'commercial',
  'sample_request', 'pricing_request',
  // A complaint is contact, and an account that complains is being worked.
  'complaint', 'suggestion',
] as const;

const ENGAGEMENT = new Set<string>(ENGAGEMENT_TYPES);

export function isEngagement(type: string): boolean {
  return ENGAGEMENT.has(type);
}

/** Which of the six steps this action satisfies, if any. */
export function stepForActivity(type: string): CrmStep | null {
  switch (type) {
    case 'visit':
    case 'meeting':
      return 'scheduled';
    case 'intro':
      return 'introduced';
    case 'account_info':
      return 'accountInfo';
    case 'key_person':
      return 'keyPerson';
    case 'feedback':
      return 'feedback';
    case 'commercial':
    case 'pricing_request':
      return 'commercial';
    default:
      return null;
  }
}

/**
 * The stage an account belongs in once this action is recorded.
 *
 * `won` and `lost` are left alone: an account closed out is not reopened by
 * someone adding a late note, and only a person should decide to work it again.
 */
export function stageAfterActivity(stage: string, type: string): string {
  if (!isEngagement(type)) return stage;
  if (stage === 'upcoming' || stage === 'hold') return 'current';
  return stage;
}

/** How this action moves the account's counters. */
export function countersForActivity(type: string): Record<string, number> {
  const inc: Record<string, number> = { activityCount: 1 };
  if (type === 'visit') inc.visitCount = 1;
  if (type === 'meeting') inc.meetingCount = 1;
  return inc;
}

/** Every step, in the order the process runs, for a progress bar. */
export const STEP_ORDER: readonly CrmStep[] = CRM_STEPS;

/** How far through the six steps an account has got. */
export function stepsDone(steps: Record<string, unknown> | undefined): number {
  if (!steps) return 0;
  return STEP_ORDER.filter((k) => !!steps[k]).length;
}
