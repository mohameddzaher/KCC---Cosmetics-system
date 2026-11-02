import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Invoice from '@/models/Invoice';
import Order from '@/models/Order';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { audited } from '@/lib/audit';
import { escapeRegex } from '@/lib/api-helpers';
import { AccountingError, activeInvoiceOf, defaultDueDate, ensureInvoice, nextInvoiceNumber, priceItems } from '@/lib/accounting';
import { OPEN_INVOICE_STATUSES } from '@/lib/invoiceStatus';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, 'accounting.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const p = req.nextUrl.searchParams;
    const filter: Record<string, unknown> = {};
    const status = p.get('status');
    if (status === 'overdue') {
      filter.status = { $in: OPEN_INVOICE_STATUSES };
      filter.dueDate = { $lt: new Date(new Date().setHours(0, 0, 0, 0)) };
    } else if (status === 'open') {
      filter.status = { $in: OPEN_INVOICE_STATUSES };
    } else if (status && status !== 'all') {
      filter.status = status;
    }
    for (const key of ['userId', 'orderId']) {
      const v = p.get(key);
      if (v && mongoose.Types.ObjectId.isValid(v)) filter[key] = v;
    }
    const from = p.get('from');
    const to = p.get('to');
    if (from || to) {
      filter.createdAt = {
        ...(from ? { $gte: new Date(`${from}T00:00:00`) } : {}),
        ...(to ? { $lte: new Date(`${to}T23:59:59.999`) } : {}),
      };
    }
    const q = (p.get('q') || '').trim();
    if (q) filter.invoiceNumber = new RegExp(escapeRegex(q), 'i');

    const invoices = await Invoice.find(filter)
      .populate('userId', 'name email company')
      .populate('orderId', 'orderNumber status')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    return NextResponse.json(invoices);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch invoices';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** An invoice is always for an order. The figures come from the order, or from the lines sent here. */
export const POST = audited(async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, 'accounting.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    if (!body.orderId || !mongoose.Types.ObjectId.isValid(body.orderId)) {
      return NextResponse.json({ error: 'Choose the order this invoice is for.' }, { status: 400 });
    }
    const order = await Order.findById(body.orderId);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    if (await activeInvoiceOf(order._id)) {
      return NextResponse.json({ error: 'This order already has an invoice.' }, { status: 409 });
    }

    const issue = body.status === 'sent';
    const dueDate = body.dueDate ? new Date(body.dueDate) : undefined;

    if (Array.isArray(body.items) && body.items.length > 0) {
      const priced = priceItems(body.items, Number(body.discount) || 0);
      if (!(priced.total > 0)) throw new AccountingError('Add at least one line with a price.');
      const invoice = await Invoice.create({
        ...priced,
        invoiceNumber: await nextInvoiceNumber(),
        orderId: order._id,
        userId: order.userId,
        status: issue ? 'sent' : 'draft',
        issuedAt: issue ? new Date() : undefined,
        dueDate: dueDate || (await defaultDueDate()),
        notes: typeof body.notes === 'string' ? body.notes : undefined,
      });
      return NextResponse.json(invoice, { status: 201 });
    }

    const invoice = await ensureInvoice(order, { issue, dueDate });
    if (!invoice) throw new AccountingError('This order has no price yet, so there is nothing to invoice.');
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    if (error instanceof AccountingError) return NextResponse.json({ error: error.message }, { status: error.status });
    const msg = error instanceof Error ? error.message : 'Failed to create invoice';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
