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

import { CRM_STEPS, type CrmStep } from '@/models/CrmAccount';

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
