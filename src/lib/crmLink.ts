import CrmAccount from '@/models/CrmAccount';
import CrmActivity from '@/models/CrmActivity';
import { matchKeysFor, primaryKey } from '@/lib/crmMatch';
import { canonicalCity } from '@/lib/crmVocab';
import { countersForActivity, stageAfterActivity, stepForActivity } from '@/lib/crmProgress';

/**
 * An order arriving puts itself on the CRM.
 *
 * A customer who fills in the sample quiz is a company the sales team either
 * already has on its list or should have. Either way the order has to land on
 * an account, or the team finds out about it by accident and the CRM says the
 * company was never contacted.
 *
 * Matching is the same rule the import used — names and brands, folded for
 * Arabic spelling — so the company the sheet called "Aenan" and the customer
 * typed as "شركة عينان" is one account, not two.
 *
 * Best-effort by design: it is called inside a try/catch at the call site,
 * because an order must be accepted whether or not the CRM write succeeds.
 */
export async function linkOrderToCrm(params: {
  orderId: unknown;
  orderNumber: string;
  type: 'sample' | 'bulk';
  company?: string;
  personName?: string;
  city?: string;
  phone?: string;
  email?: string;
  userId?: unknown;
}): Promise<{ accountId: unknown; created: boolean } | null> {
  const company = (params.company || '').trim();
  // With no company name there is nothing to match on, and inventing an
  // account per individual would fill the CRM with noise.
  if (!company) return null;

  const keys = matchKeysFor({ name: company, brands: [] });
  if (keys.length === 0) return null;

  let account = await CrmAccount.findOne({ matchKeys: { $in: keys } });
  let created = false;

  if (!account) {
    account = await CrmAccount.create({
      name: company,
      city: canonicalCity(params.city),
      // Said plainly, so nobody wonders how it got here.
      source: params.type === 'sample' ? 'sample request' : 'bulk request',
      stage: 'upcoming',
      keyPerson: {
        name: params.personName || undefined,
        phone: params.phone || undefined,
        email: params.email || undefined,
      },
      steps: {},
      nameKey: primaryKey({ name: company }),
      matchKeys: keys,
      customerId: params.userId || undefined,
    });
    created = true;
  }

  const at = new Date();
  await CrmActivity.create({
    accountId: account._id,
    type: 'sample_request',
    at,
    body:
      params.type === 'sample'
        ? `Sample requested through the website — order ${params.orderNumber}`
        : `Bulk order placed through the website — order ${params.orderNumber}`,
    orderId: params.orderId,
    byName: 'Website',
    meta: { orderNumber: params.orderNumber, orderType: params.type, automatic: true },
  });

  /* The same consequences as a rep logging it by hand, so the two cannot
     disagree: the account moves, the step ticks, the counters advance. */
  const nextStage = stageAfterActivity(account.stage, 'sample_request');
  const step = stepForActivity('sample_request');
  const set: Record<string, unknown> = { lastActionAt: at };
  if (nextStage !== account.stage) set.stage = nextStage;
  if (!account.firstActionAt) set.firstActionAt = at;
  if (step && !(account.steps as Record<string, unknown>)?.[step]) set[`steps.${step}`] = at;
  if (params.userId && !account.customerId) set.customerId = params.userId;

  await CrmAccount.findByIdAndUpdate(account._id, {
    $inc: countersForActivity('sample_request'),
    $set: set,
    $addToSet: { orderIds: params.orderId },
  });

  if (nextStage !== account.stage) {
    await CrmActivity.create({
      accountId: account._id,
      type: 'stage_change',
      at,
      body: `Moved from "${account.stage}" to "${nextStage}" — they requested a sample themselves`,
      byName: 'Website',
      meta: { from: account.stage, to: nextStage, because: 'sample_request' },
    });
  }

  return { accountId: account._id, created };
}
