import { Types } from 'mongoose';
import Counter from '@/models/Counter';
import Invoice from '@/models/Invoice';
import Order from '@/models/Order';
import Payment from '@/models/Payment';
import { computeTotals } from '@/lib/orderTotals';
import { ACTIVE_INVOICE_STATUSES, money2, statusFromPayments } from '@/lib/invoiceStatus';

/**
 * The one place an order, its invoice and its payments are kept in agreement.
 *
 * Money moves in one direction only: payments are the record, an invoice's
 * balance and status are worked out from them, and an order's payment status is
 * worked out from its invoice. Nothing else writes those figures, so a screen
 * cannot show a paid invoice with no money behind it, which the old code did
 * the moment a payment was deleted.
 */

/** Days a customer has to pay when nothing says otherwise. */
const DEFAULT_TERMS_DAYS = 14;

export class AccountingError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'AccountingError';
  }
}

type Id = string | Types.ObjectId;

export async function nextInvoiceNumber(now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `invoice-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  ).lean() as { seq: number };
  return `INV-${year}-${String(counter.seq).padStart(5, '0')}`;
}

export interface LineItem { description: string; quantity: number; unitPrice: number; total?: number }

/** Line totals and the invoice's figures, always from the server's own arithmetic. */
export function priceItems(items: LineItem[], discount = 0) {
  const lines = items
    .filter((i) => String(i.description || '').trim())
    .map((i) => {
      const quantity = Number(i.quantity) || 0;
      const unitPrice = Number(i.unitPrice) || 0;
      return { description: String(i.description).trim(), quantity, unitPrice, total: money2(quantity * unitPrice) };
    });
  const subtotal = money2(lines.reduce((n, l) => n + l.total, 0));
  return { items: lines, ...computeTotals(subtotal, discount) };
}

function orderLine(order: { type?: string; orderNumber?: string; totals?: { subtotal?: number } }) {
  const what = order.type === 'bulk' ? 'Bulk order' : 'Sample order';
  const subtotal = order.totals?.subtotal || 0;
  return [{ description: `${what} ${order.orderNumber}`, quantity: 1, unitPrice: subtotal, total: subtotal }];
}

export async function activeInvoiceOf(orderId: Id) {
  return Invoice.findOne({ orderId, status: { $in: ACTIVE_INVOICE_STATUSES } });
}

/**
 * The order's invoice, created if it has none.
 *
 * An order with no price has nothing to bill, so this returns null rather than
 * raising a zero invoice: samples are often free, and most orders today are.
 */
export async function ensureInvoice(
  order: Parameters<typeof orderLine>[0] & {
    _id: Id; userId: Id; totals?: { subtotal?: number; tax?: number; discount?: number; total?: number };
    quote?: { validUntil?: Date };
  },
  options: { issue: boolean; dueDate?: Date }
) {
  if (!((order.totals?.total || 0) > 0)) return null;

  const existing = await activeInvoiceOf(order._id);
  if (existing) {
    if (options.issue && existing.status === 'draft') {
      existing.status = 'sent';
      existing.issuedAt = new Date();
      await existing.save();
    }
    return existing;
  }

  const issuedAt = options.issue ? new Date() : undefined;
  try {
    return await Invoice.create({
      invoiceNumber: await nextInvoiceNumber(),
      orderId: order._id,
      userId: order.userId,
      items: orderLine(order),
      subtotal: order.totals?.subtotal || 0,
      tax: order.totals?.tax || 0,
      discount: order.totals?.discount || 0,
      total: order.totals?.total || 0,
      status: options.issue ? 'sent' : 'draft',
      issuedAt,
      dueDate: options.dueDate || order.quote?.validUntil || new Date(Date.now() + DEFAULT_TERMS_DAYS * 86400000),
    });
  } catch (e) {
    // Lost the race to a request doing the same thing; its invoice is the invoice.
    if ((e as { code?: number }).code === 11000) return activeInvoiceOf(order._id);
    throw e;
  }
}

/**
 * Follow the order when its price changes (a promo code, a late discount).
 * Money already received fixes the invoice: it is left alone rather than
 * rewritten underneath a payment.
 */
export async function syncInvoiceToOrder(order: {
  _id: Id; type?: string; orderNumber?: string;
  totals?: { subtotal?: number; tax?: number; discount?: number; total?: number };
}) {
  const invoice = await activeInvoiceOf(order._id);
  if (!invoice || (invoice.amountPaid || 0) > 0) return;
  invoice.items = orderLine(order) as never;
  invoice.subtotal = order.totals?.subtotal || 0;
  invoice.tax = order.totals?.tax || 0;
  invoice.discount = order.totals?.discount || 0;
  invoice.total = order.totals?.total || 0;
  await invoice.save();
}

/** Recompute an invoice from its payments, then its order from it. Safe to call any time. */
export async function settleInvoice(invoiceId: Id) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return null;

  const received = await Payment.find({ invoiceId, status: 'completed' }).select('amount paidAt').lean() as unknown as Array<{ amount: number; paidAt?: Date }>;
  const paid = money2(received.reduce((n, p) => n + (p.amount || 0), 0));
  const status = statusFromPayments(invoice.status, invoice.total, paid);

  invoice.amountPaid = paid;
  invoice.status = status;
  if (status !== 'draft' && status !== 'cancelled' && !invoice.issuedAt) invoice.issuedAt = new Date();
  const last = received.map((p) => p.paidAt).filter(Boolean).sort((a, b) => +new Date(b as Date) - +new Date(a as Date))[0];
  invoice.paidAt = (status === 'paid' ? last || new Date() : undefined) as Date;
  await invoice.save();

  await syncOrderPayment(invoice.orderId);
  return invoice;
}

/** An order's payment status is a reading of its invoice. */
export async function syncOrderPayment(orderId: Id) {
  const invoice = await activeInvoiceOf(orderId);
  if (!invoice) return;
  const refunded = invoice.status !== 'paid' && (await Payment.exists({ invoiceId: invoice._id, status: 'refunded' }));
  const paymentStatus = invoice.status === 'paid' ? 'paid' : refunded ? 'refunded' : 'pending';
  await Order.updateOne({ _id: orderId, paymentStatus: { $ne: paymentStatus } }, { $set: { paymentStatus } });
}

export interface PaymentInput {
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
  status?: string;
  paidAt?: Date;
}

/** The only way money is recorded, from the invoices page or from an order. */
export async function recordPayment(invoiceId: Id, input: PaymentInput) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new AccountingError('Invoice not found', 404);
  if (invoice.status === 'cancelled') throw new AccountingError('This invoice is cancelled.');

  const amount = money2(input.amount);
  if (!(amount > 0)) throw new AccountingError('Enter an amount above zero.');
  const balance = money2(invoice.total - (invoice.amountPaid || 0));
  const status = input.status || 'completed';
  if (status === 'completed' && amount > balance + 0.005) {
    throw new AccountingError(`That is more than the ${balance.toFixed(2)} still owed on this invoice.`);
  }

  const payment = await Payment.create({
    invoiceId,
    userId: invoice.userId,
    amount,
    method: input.method,
    reference: input.reference,
    notes: input.notes,
    status,
    paidAt: status === 'completed' ? input.paidAt || new Date() : undefined,
  });
  return { payment, invoice: await settleInvoice(invoiceId) };
}

/**
 * What an order's status change means for the books. Called by the transition
 * route after the move is saved. The order's status is never moved from here:
 * that stays the job of the workflow.
 */
export async function applyOrderMove(
  order: Parameters<typeof ensureInvoice>[0] & { paymentMethod?: string },
  to: string,
  by: string
) {
  if (to === 'Awaiting Payment') {
    await ensureInvoice(order, { issue: true });
  } else if (to === 'Payment Received') {
    const invoice = await ensureInvoice(order, { issue: true });
    if (!invoice) return;
    const owed = money2(invoice.total - (invoice.amountPaid || 0));
    if (owed > 0) {
      await recordPayment(invoice._id, {
        amount: owed,
        method: order.paymentMethod || 'bank_transfer',
        notes: `Confirmed on the order by ${by}`,
      });
    }
  } else if (to === 'Cancelled') {
    const invoice = await activeInvoiceOf(order._id);
    // Money already taken has to be refunded by a person, not cancelled away.
    if (invoice && !(invoice.amountPaid > 0)) {
      invoice.status = 'cancelled';
      await invoice.save();
    }
  }
}
