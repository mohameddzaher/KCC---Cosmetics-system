import { randomBytes } from 'node:crypto';
import CrmAccount from '@/models/CrmAccount';
import CrmActivity from '@/models/CrmActivity';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';
import { matchKeysFor, primaryKey } from '@/lib/crmMatch';
import { canonicalCity } from '@/lib/crmVocab';
import { statusMeta } from '@/lib/orderWorkflow';

/**
 * Where the CRM and the order cycle meet.
 *
 * A sales rep should not have to go and find out what happened to the sample
 * they sold. Everything an order goes through is written onto its account, so
 * the account's history is the client's whole story, and the follow-ups a rep
 * owes appear on their list without anyone setting them.
 *
 * All of this is called best-effort: a CRM write must never stop an order.
 */

type OrderLike = { _id: unknown; orderNumber?: string; userId?: unknown };
type Actor = { id?: string; name?: string; role?: string };

const DAY = 86400000;
/** How long after each move a rep owes the client a call. */
const FOLLOW_UP_DAYS: Record<string, { days: number; en: (n: string) => string }> = {
  'Quotation Sent': { days: 3, en: (n) => `Follow up on the quotation for ${n}` },
  Delivered: { days: 7, en: (n) => `Ask how ${n} landed, and whether they want to reorder` },
};
/** A move that makes an earlier follow-up pointless. */
const SETTLES_FOLLOW_UP = new Set(['Awaiting Payment', 'Payment Received', 'Cancelled', 'Rejected', 'Closed']);

export async function accountOfOrder(orderId: unknown) {
  return CrmAccount.findOne({ orderIds: orderId });
}

/** The rep who owns the account looks after the order, unless someone is already named. */
export async function ownerForNewOrder(orderId: unknown): Promise<unknown> {
  const account = await accountOfOrder(orderId);
  return account?.ownerId;
}

async function log(account: { _id: unknown }, order: OrderLike, actor: Actor | null, body: string, meta: Record<string, unknown>) {
  await CrmActivity.create({
    accountId: account._id,
    type: 'order_update',
    body,
    orderId: order._id,
    byId: actor?.id,
    byName: actor?.name || 'System',
    byRole: actor?.role,
    meta: { orderNumber: order.orderNumber, automatic: true, ...meta },
  });
  await CrmAccount.updateOne({ _id: account._id }, { $set: { lastActionAt: new Date() } });
}

/** An order moved. Tell its account, and work out what the rep owes the client now. */
export async function recordOrderMove(order: OrderLike, from: string, to: string, actor: Actor, note?: string) {
  const account = await accountOfOrder(order._id);
  if (!account) return;

  await log(account, order, actor, `Order ${order.orderNumber}: ${statusMeta(to).labelEn}${note ? ` (${note})` : ''}`, { from, to });

  if (to === 'Quotation Sent' && !account.steps?.commercial) {
    await CrmAccount.updateOne({ _id: account._id }, { $set: { 'steps.commercial': new Date() } });
  }

  // Paying is what turns a target into a client.
  if (to === 'Payment Received' && !['won', 'lost'].includes(account.stage)) {
    await CrmAccount.updateOne({ _id: account._id }, { $set: { stage: 'won' } });
    await CrmActivity.create({
      accountId: account._id,
      type: 'stage_change',
      body: `Stage moved from "${account.stage}" to "won": order ${order.orderNumber} was paid`,
      orderId: order._id,
      byName: 'System',
      meta: { from: account.stage, to: 'won', automatic: true },
    });
  }

  if (SETTLES_FOLLOW_UP.has(to)) {
    await CrmActivity.updateMany(
      { orderId: order._id, type: 'task', done: { $ne: true }, 'meta.automatic': true },
      { $set: { done: true, outcome: `Settled: the order moved to ${statusMeta(to).labelEn}` } }
    );
  }

  const followUp = FOLLOW_UP_DAYS[to];
  if (followUp) {
    await CrmActivity.create({
      accountId: account._id,
      type: 'task',
      body: followUp.en(String(order.orderNumber)),
      dueDate: new Date(Date.now() + followUp.days * DAY),
      orderId: order._id,
      byId: account.ownerId,
      byName: account.ownerName || 'System',
      meta: { automatic: true, orderNumber: order.orderNumber },
    });
  }
}

export async function recordMoney(order: OrderLike, text: string, actor: Actor | null) {
  const account = await accountOfOrder(order._id);
  if (account) await log(account, order, actor, text, { money: true });
}

/** What a client said about an order is what the sales team most needs to hear. */
export async function recordFeedback(order: OrderLike, rating: number, comment: string | undefined, actor: Actor) {
  const account = await accountOfOrder(order._id);
  if (!account) return;
  const unhappy = rating <= 2;
  await CrmActivity.create({
    accountId: account._id,
    // A bad rating lands on the complaints screen, where someone must close it.
    type: unhappy ? 'complaint' : 'feedback',
    body: `${rating}/5 on order ${order.orderNumber}${comment ? `: ${comment}` : ''}`,
    orderId: order._id,
    interest: rating >= 4 ? 'interested' : rating === 3 ? 'moderate' : 'not_interested',
    done: false,
    byId: actor.id,
    byName: actor.name,
    byRole: actor.role,
    meta: { automatic: true, rating, orderNumber: order.orderNumber },
  });
  await CrmAccount.updateOne({ _id: account._id }, { $set: { lastActionAt: new Date() } });
}

/** A customer added by hand joins the CRM too, on their existing account if they have one. */
export async function linkCustomerToCrm(customer: {
  _id: unknown; name?: string; company?: string; email?: string; phone?: string; city?: string;
}) {
  const company = (customer.company || customer.name || '').trim();
  const keys = matchKeysFor({ name: company, brands: [] });
  if (keys.length === 0) return null;

  const existing = await CrmAccount.findOne({ matchKeys: { $in: keys } });
  if (existing) {
    if (!existing.customerId) await CrmAccount.updateOne({ _id: existing._id }, { $set: { customerId: customer._id } });
    return existing;
  }
  return CrmAccount.create({
    name: company,
    city: canonicalCity(customer.city),
    source: 'customer added by staff',
    stage: 'upcoming',
    keyPerson: { name: customer.name, phone: customer.phone, email: customer.email },
    steps: {},
    nameKey: primaryKey({ name: company }),
    matchKeys: keys,
    customerId: customer._id,
  });
}

export class ConvertError extends Error {}

/**
 * A target becomes a client with a record of their own. The login stays closed
 * until an admin sets its password, so nothing here hands anyone access.
 */
export async function convertAccount(accountId: unknown, input: { email?: string; name?: string }) {
  const account = await CrmAccount.findById(accountId);
  if (!account) throw new ConvertError('Account not found');
  if (account.customerId) throw new ConvertError('This account is already a client.');

  const email = (input.email || account.keyPerson?.email || '').trim().toLowerCase();
  if (!email) throw new ConvertError('An email is needed to create the client.');
  if (await User.exists({ email })) throw new ConvertError('Someone already uses that email.');

  const customer = await User.create({
    name: input.name || account.keyPerson?.name || account.name,
    email,
    company: account.name,
    phone: account.keyPerson?.phone,
    role: 'CUSTOMER',
    password: await hashPassword(randomBytes(24).toString('hex')),
  });
  account.customerId = customer._id;
  await account.save();
  return customer;
}
