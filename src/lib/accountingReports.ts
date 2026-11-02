import Expense from '@/models/Expense';
import Invoice from '@/models/Invoice';
import Order from '@/models/Order';
import Payment from '@/models/Payment';
import { AGING_BUCKETS, agingBucket, balanceOf, money2, OPEN_INVOICE_STATUSES, type AgingBucket } from '@/lib/invoiceStatus';

/**
 * Every figure the accounts screens and workbooks show, from one computation,
 * so the overview, the reports and an export cannot disagree.
 *
 * Two views of profit, because they answer different questions:
 *   earned  — invoiced this period, before VAT, less costs before VAT
 *   cash    — money actually received, less money actually spent
 * VAT is not the company's money in either: it is collected for the authority.
 */

interface Row { _id: string | null; total: number; n?: number }
const monthKey = (field: string) => ({ $dateToString: { format: '%Y-%m', date: field } });

export async function computeSummary(from: Date, to: Date) {
  const issued = { status: { $nin: ['draft', 'cancelled'] }, issuedAt: { $gte: from, $lte: to } };
  const yearAgo = new Date(to.getFullYear(), to.getMonth() - 11, 1);

  const [sales, cash, costs, byCategory, salesMonths, cashMonths, costMonths] = await Promise.all([
    Invoice.aggregate([
      { $match: issued },
      {
        $group: {
          _id: null,
          net: { $sum: { $subtract: ['$subtotal', '$discount'] } },
          vat: { $sum: '$tax' }, gross: { $sum: '$total' }, n: { $sum: 1 },
        },
      },
    ]),
    Payment.aggregate([
      { $match: { status: 'completed', paidAt: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: '$amount' }, n: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: '$amount' }, vat: { $sum: '$vatAmount' }, n: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, n: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Invoice.aggregate([
      { $match: { status: { $nin: ['draft', 'cancelled'] }, issuedAt: { $gte: yearAgo } } },
      { $group: { _id: monthKey('$issuedAt'), total: { $sum: { $subtract: ['$subtotal', '$discount'] } } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'completed', paidAt: { $gte: yearAgo } } },
      { $group: { _id: monthKey('$paidAt'), total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: yearAgo } } },
      { $group: { _id: monthKey('$date'), total: { $sum: { $subtract: ['$amount', { $ifNull: ['$vatAmount', 0] }] } } } },
    ]),
  ]);

  const s = sales[0] || { net: 0, vat: 0, gross: 0, n: 0 };
  const c = costs[0] || { total: 0, vat: 0, n: 0 };
  const received = cash[0]?.total || 0;
  const netCosts = money2(c.total - c.vat);

  const series = (rows: Row[]) => new Map(rows.map((r) => [r._id, r.total]));
  const earned = series(salesMonths);
  const collected = series(cashMonths);
  const spent = series(costMonths);
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(to.getFullYear(), to.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const sales = money2(earned.get(key) || 0);
    const expenses = money2(spent.get(key) || 0);
    return { key, sales, collected: money2(collected.get(key) || 0), expenses, profit: money2(sales - expenses) };
  });

  return {
    from, to,
    sales: { net: money2(s.net), vat: money2(s.vat), gross: money2(s.gross), invoices: s.n },
    collected: { total: money2(received), payments: cash[0]?.n || 0 },
    expenses: { gross: money2(c.total), vat: money2(c.vat), net: netCosts, count: c.n },
    profit: { earned: money2(s.net - netCosts), cash: money2(received - c.total) },
    vat: { output: money2(s.vat), input: money2(c.vat), due: money2(s.vat - c.vat) },
    byCategory: (byCategory as Row[]).map((r) => ({ key: r._id || 'other', total: money2(r.total), count: r.n || 0 })),
    months,
  };
}

export async function computeReceivables() {
  const open = await Invoice.find({ status: { $in: OPEN_INVOICE_STATUSES } })
    .populate('userId', 'name email company phone')
    .populate('orderId', 'orderNumber')
    .sort({ dueDate: 1 })
    .lean() as unknown as Array<Record<string, any>>;

  const now = new Date();
  const totals = Object.fromEntries(AGING_BUCKETS.map((b) => [b, 0])) as Record<AgingBucket, number>;
  const customers = new Map<string, {
    id: string; name: string; company?: string; phone?: string; balance: number; invoices: number;
    buckets: Record<AgingBucket, number>;
  }>();

  const invoices = open.map((inv) => {
    const balance = balanceOf(inv);
    const bucket = agingBucket(inv.dueDate, now);
    totals[bucket] = money2(totals[bucket] + balance);

    const id = String(inv.userId?._id || inv.userId);
    const row = customers.get(id) || {
      id,
      name: inv.userId?.name || inv.userId?.email || '—',
      company: inv.userId?.company,
      phone: inv.userId?.phone,
      balance: 0,
      invoices: 0,
      buckets: Object.fromEntries(AGING_BUCKETS.map((b) => [b, 0])) as Record<AgingBucket, number>,
    };
    row.balance = money2(row.balance + balance);
    row.invoices += 1;
    row.buckets[bucket] = money2(row.buckets[bucket] + balance);
    customers.set(id, row);

    return {
      _id: inv._id, invoiceNumber: inv.invoiceNumber, status: inv.status, dueDate: inv.dueDate,
      total: inv.total, amountPaid: inv.amountPaid, balance, bucket,
      orderNumber: inv.orderId?.orderNumber, orderId: inv.orderId?._id,
      customer: inv.userId?.name, customerId: id,
    };
  });

  return {
    total: money2(Object.values(totals).reduce((a, b) => a + b, 0)),
    buckets: totals,
    customers: [...customers.values()].sort((a, b) => b.balance - a.balance),
    invoices,
  };
}

/** Priced orders with no invoice yet: money the accounts have not asked for. */
export async function unbilledOrders() {
  const invoiced = await Invoice.distinct('orderId', { status: { $ne: 'cancelled' } });
  return Order.find({
    _id: { $nin: invoiced },
    'totals.total': { $gt: 0 },
    status: { $nin: ['Cancelled', 'Rejected'] },
  })
    .select('orderNumber status totals customerInfo userId createdAt')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
}
