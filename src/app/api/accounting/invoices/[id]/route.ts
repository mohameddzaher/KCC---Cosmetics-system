import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import SiteSettings from '@/models/SiteSettings';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { audited } from '@/lib/audit';
import { AccountingError, priceItems, sellerDetails, syncOrderPayment } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };
const READ_PERM = 'accounting.view' as const;
const WRITE_PERM = 'accounting.manage' as const;

/** The invoice, what has been paid against it, and who it is from, for printing. */
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, READ_PERM)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const [invoice, payments, settings] = await Promise.all([
      Invoice.findById(id)
        .populate('userId', 'name email company phone city country address')
        .populate('orderId', 'orderNumber status type customerInfo')
        .lean(),
      Payment.find({ invoiceId: id }).sort({ createdAt: -1 }).lean(),
      SiteSettings.findOne({ key: 'main' }).lean(),
    ]);
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    return NextResponse.json({ invoice, payments, ...(await sellerDetails(invoice as never, settings)) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Issue, cancel, or correct a draft. `paid` is not accepted: an invoice becomes
 * paid by money arriving, and letting someone select it is how a screen ends up
 * disagreeing with the bank.
 */
export const PUT = audited(async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, WRITE_PERM)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const invoice = await Invoice.findById(id);
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const body = await req.json();

    if (Array.isArray(body.items) || body.discount !== undefined) {
      if (invoice.status !== 'draft') throw new AccountingError('Only a draft can be edited. Cancel this invoice and raise a new one.');
      const priced = priceItems(body.items || invoice.items, Number(body.discount ?? invoice.discount) || 0);
      if (!(priced.total > 0)) throw new AccountingError('Add at least one line with a price.');
      Object.assign(invoice, priced);
    }

    if (body.status === 'sent') {
      if (invoice.status !== 'draft') throw new AccountingError('Only a draft can be issued.');
      invoice.status = 'sent';
      invoice.issuedAt = new Date();
    } else if (body.status === 'cancelled') {
      if (invoice.amountPaid > 0) throw new AccountingError('Money has been received on this invoice. Refund the payments first.');
      invoice.status = 'cancelled';
    } else if (body.status !== undefined) {
      throw new AccountingError('An invoice is marked paid by recording its payments.');
    }

    if (body.dueDate !== undefined) invoice.dueDate = body.dueDate ? new Date(body.dueDate) : (undefined as unknown as Date);
    if (typeof body.notes === 'string') invoice.notes = body.notes;

    await invoice.save();
    await syncOrderPayment(invoice.orderId);
    return NextResponse.json(invoice);
  } catch (error) {
    if (error instanceof AccountingError) return NextResponse.json({ error: error.message }, { status: error.status });
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

/** A draft that was never issued can go. Anything else is cancelled, so its number stays accounted for. */
export const DELETE = audited(async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, WRITE_PERM)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const invoice = await Invoice.findById(id);
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    if (invoice.status !== 'draft' || (await Payment.exists({ invoiceId: id }))) {
      return NextResponse.json({ error: 'Only an unused draft can be deleted. Cancel this invoice instead.' }, { status: 409 });
    }
    await invoice.deleteOne();
    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
