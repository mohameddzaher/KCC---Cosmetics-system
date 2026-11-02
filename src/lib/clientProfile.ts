import { Types } from 'mongoose';
import ContactMessage from '@/models/ContactMessage';
import CrmAccount from '@/models/CrmAccount';
import CrmActivity from '@/models/CrmActivity';
import CustomerActivity from '@/models/CustomerActivity';
import Invoice from '@/models/Invoice';
import Order from '@/models/Order';
import OrderFeedback from '@/models/OrderFeedback';
import Payment from '@/models/Payment';
import User from '@/models/User';
import { balanceOf, money2 } from '@/lib/invoiceStatus';
import { statusMeta } from '@/lib/orderWorkflow';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * One client, everything: sales, requests, orders, follow-ups, meetings, money.
 *
 * A client exists in up to two records, a CRM account and a customer login, and
 * this is what makes them read as one company. It is built from the records
 * themselves rather than a copy, so it cannot drift from any of them.
 */

export type EventKind = 'contact' | 'meeting' | 'order' | 'money' | 'followup' | 'complaint' | 'request' | 'note';

export interface ClientEvent {
  id: string;
  kind: EventKind;
  type: string;
  at: Date;
  text: string;
  by?: string;
  href?: string;
  done?: boolean;
  dueDate?: Date;
  amount?: number;
  /** Written by the system, as opposed to a person. */
  automatic?: boolean;
}

const KIND_OF_ACTIVITY: Record<string, EventKind> = {
  visit: 'meeting', meeting: 'meeting',
  call: 'contact', whatsapp: 'contact', email: 'contact', intro: 'contact',
  account_info: 'contact', key_person: 'contact', commercial: 'contact', feedback: 'complaint',
  sample_request: 'request', pricing_request: 'request',
  complaint: 'complaint', suggestion: 'complaint',
  note: 'note', task: 'followup', order_update: 'order',
};

/** The road a client travels, from a name on a list to a repeat order. */
export const CLIENT_STAGES = ['target', 'contacted', 'met', 'requested', 'quoted', 'paid', 'delivered', 'repeat'] as const;

function reached(account: any, orders: any[], invoices: any[], meetings: number, contacts: number) {
  const seen = (...s: string[]) => orders.some((o) => o.timeline?.some((t: any) => s.includes(t.to)));
  const done: string[] = ['target'];
  if (contacts + meetings > 0 || (account?.activityCount || 0) > 0) done.push('contacted');
  if (meetings > 0) done.push('met');
  if (orders.length > 0) done.push('requested');
  if (seen('Quotation Sent')) done.push('quoted');
  if (invoices.some((i) => i.amountPaid > 0) || seen('Payment Received')) done.push('paid');
  if (seen('Delivered', 'Closed')) done.push('delivered');
  if (orders.filter((o) => o.timeline?.some((t: any) => t.to === 'Delivered')).length > 1) done.push('repeat');
  return done;
}

export async function loadClient(ids: { customerId?: string; accountId?: string }) {
  let account: any = ids.accountId
    ? await CrmAccount.findById(ids.accountId).populate('ownerId', 'name role').lean()
    : await CrmAccount.findOne({ customerId: ids.customerId }).populate('ownerId', 'name role').lean();

  const customerId = ids.customerId || account?.customerId;
  const customer: any = customerId
    ? await User.findById(customerId).select('name email company phone whatsapp stage role accountManagerId').lean()
    : null;

  // A customer's orders can reach an account the customer link never touched.
  const orderFilter: any[] = [];
  if (customerId) orderFilter.push({ userId: customerId });
  if (account?.orderIds?.length) orderFilter.push({ _id: { $in: account.orderIds } });
  const orders: any[] = orderFilter.length
    ? await Order.find({ $or: orderFilter })
      .select('orderNumber type status totals paymentStatus createdAt timeline')
      .sort({ createdAt: -1 })
      .lean()
    : [];

  if (!account && orders.length) {
    account = await CrmAccount.findOne({ orderIds: { $in: orders.map((o) => o._id) } }).populate('ownerId', 'name role').lean();
  }
  return { account, customer, orders };
}

export async function clientProfile(
  ids: { customerId?: string; accountId?: string },
  options: { money: boolean }
) {
  const { account, customer, orders } = await loadClient(ids);
  if (!account && !customer) return null;

  const orderIds = orders.map((o) => o._id as Types.ObjectId);
  const [activities, notes, invoices, feedback, messages] = await Promise.all([
    account ? CrmActivity.find({ accountId: account._id, type: { $ne: 'stage_change' } }).sort({ at: -1 }).limit(500).lean() : [],
    customer ? CustomerActivity.find({ customerId: customer._id }).sort({ createdAt: -1 }).limit(300).lean() : [],
    Invoice.find({ orderId: { $in: orderIds }, status: { $ne: 'cancelled' } }).lean(),
    OrderFeedback.find({ orderId: { $in: orderIds } }).lean(),
    customer?.email ? ContactMessage.find({ email: customer.email }).sort({ createdAt: -1 }).limit(50).lean() : [],
  ]) as any[][];

  const payments: any[] = options.money
    ? await Payment.find({ invoiceId: { $in: invoices.map((i) => i._id) } }).populate('invoiceId', 'invoiceNumber').sort({ createdAt: -1 }).lean()
    : [];

  const orderLink = (id: unknown) => `/admin/orders/${id}`;
  const events: ClientEvent[] = [];

  for (const a of activities) {
    // Payments are listed from the payments themselves, for those who may see them.
    if (a.meta?.money) continue;
    events.push({
      id: `crm-${a._id}`, kind: KIND_OF_ACTIVITY[a.type] || 'note', type: a.type, at: a.at,
      text: a.body || a.type, by: a.byName, done: a.done, dueDate: a.dueDate,
      href: a.orderId ? orderLink(a.orderId) : undefined, automatic: !!a.meta?.automatic,
    });
  }
  for (const n of notes) {
    events.push({
      id: `note-${n._id}`, kind: n.type === 'task' ? 'followup' : n.type === 'meeting' ? 'meeting' : ['call', 'email', 'whatsapp'].includes(n.type) ? 'contact' : 'note',
      type: n.type, at: n.createdAt, text: n.body, by: n.authorName, done: n.done, dueDate: n.dueDate,
    });
  }
  // Orders on an account already told their story through order_update. These
  // only cover what no account saw: the moment one was placed.
  for (const o of orders) {
    events.push({
      id: `order-${o._id}`, kind: 'order', type: 'order_placed', at: o.createdAt,
      text: `${o.type === 'bulk' ? 'Bulk order' : 'Sample request'} ${o.orderNumber}`, href: orderLink(o._id), automatic: true,
    });
    if (!account) {
      for (const t of (o.timeline || []).slice(1)) {
        events.push({
          id: `move-${o._id}-${t.at}`, kind: 'order', type: 'order_update', at: t.at,
          text: `Order ${o.orderNumber}: ${statusMeta(t.to).labelEn}`, by: t.byName, href: orderLink(o._id), automatic: true,
        });
      }
    }
  }
  if (options.money) {
    for (const i of invoices) {
      if (!i.issuedAt) continue;
      events.push({
        id: `inv-${i._id}`, kind: 'money', type: 'invoice', at: i.issuedAt, text: `Invoice ${i.invoiceNumber} issued`,
        amount: i.total, href: `/admin/accounting/invoices/${i._id}`, automatic: true,
      });
    }
    for (const p of payments) {
      events.push({
        id: `pay-${p._id}`, kind: 'money', type: 'payment', at: p.paidAt || p.createdAt,
        text: `Payment ${p.status} on ${p.invoiceId?.invoiceNumber || 'invoice'}`, amount: p.amount,
        href: p.invoiceId ? `/admin/accounting/invoices/${p.invoiceId._id}` : undefined, automatic: true,
      });
    }
  }
  for (const f of feedback) {
    if (account) continue; // already on the account as feedback or a complaint
    events.push({ id: `fb-${f._id}`, kind: 'complaint', type: 'feedback', at: f.createdAt, text: `Rated ${f.rating}/5${f.comment ? `: ${f.comment}` : ''}`, href: orderLink(f.orderId) });
  }
  for (const m of messages) {
    events.push({ id: `msg-${m._id}`, kind: 'request', type: 'message', at: m.createdAt, text: m.subject || m.message?.slice(0, 160), by: m.name, href: '/admin/inbox' });
  }
  events.sort((a, b) => +new Date(b.at) - +new Date(a.at));

  const meetings = activities.filter((a) => (a.type === 'visit' || a.type === 'meeting') && !a.backfilled).length
    + activities.filter((a) => (a.type === 'visit' || a.type === 'meeting') && a.backfilled).length
    + notes.filter((n) => n.type === 'meeting').length;
  const contacts = activities.filter((a) => ['call', 'whatsapp', 'email', 'intro'].includes(a.type)).length
    + notes.filter((n) => ['call', 'email', 'whatsapp'].includes(n.type)).length;
  const openTasks = events.filter((e) => e.kind === 'followup' && !e.done);
  const openComplaints = activities.filter((a) => a.type === 'complaint' && !a.done).length;
  const person = activities.find((a) => !a.meta?.automatic && a.type !== 'task');

  return {
    account: account && {
      _id: account._id, name: account.name, nameAr: account.nameAr, stage: account.stage,
      owner: account.ownerId?.name || account.ownerName, city: account.city, category: account.category,
    },
    customer: customer && {
      _id: customer._id, name: customer.name, email: customer.email, company: customer.company,
      phone: customer.phone, whatsapp: customer.whatsapp,
    },
    stages: reached(account, orders, invoices, meetings, contacts),
    stats: {
      orders: orders.length,
      openOrders: orders.filter((o) => !['Closed', 'Cancelled', 'Rejected', 'Delivered'].includes(o.status)).length,
      meetings,
      contacts,
      openTasks: openTasks.length,
      overdueTasks: openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date()).length,
      openComplaints,
      lastContact: person?.at,
    },
    money: options.money ? {
      invoiced: money2(invoices.reduce((n, i) => n + i.total, 0)),
      paid: money2(invoices.reduce((n, i) => n + (i.amountPaid || 0), 0)),
      balance: money2(invoices.reduce((n, i) => n + balanceOf(i), 0)),
    } : null,
    orders: orders.map((o) => ({ _id: o._id, orderNumber: o.orderNumber, type: o.type, status: o.status, total: o.totals?.total, createdAt: o.createdAt })),
    events: events.slice(0, 400),
  };
}
