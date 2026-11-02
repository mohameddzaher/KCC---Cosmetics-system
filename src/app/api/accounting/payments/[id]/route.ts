import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import Invoice from '@/models/Invoice';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { audited } from '@/lib/audit';
import { settleInvoice } from '@/lib/accounting';
import { money2 } from '@/lib/invoiceStatus';

type RouteContext = { params: Promise<{ id: string }> };
const WRITE_PERM = 'accounting.manage' as const;
const STATUSES = ['pending', 'completed', 'failed', 'refunded'];

/** Confirm, refund or correct a payment. Its invoice and order follow. */
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
    const payment = await Payment.findById(id);
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const body = await req.json();
    if (body.status !== undefined && !STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Unknown payment status' }, { status: 400 });
    }
    const status = body.status ?? payment.status;
    const amount = body.amount !== undefined ? money2(body.amount) : payment.amount;
    if (!(amount > 0)) return NextResponse.json({ error: 'Enter an amount above zero.' }, { status: 400 });

    if (status === 'completed') {
      const invoice = await Invoice.findById(payment.invoiceId).select('total amountPaid').lean() as { total: number; amountPaid: number } | null;
      const others = (invoice?.amountPaid || 0) - (payment.status === 'completed' ? payment.amount : 0);
      if (invoice && amount + others > invoice.total + 0.005) {
        return NextResponse.json({ error: `That is more than the ${money2(invoice.total - others).toFixed(2)} still owed on this invoice.` }, { status: 400 });
      }
      if (!payment.paidAt) payment.paidAt = new Date();
    }

    payment.status = status;
    payment.amount = amount;
    if (typeof body.method === 'string') payment.method = body.method as never;
    if (typeof body.reference === 'string') payment.reference = body.reference.trim();
    if (typeof body.notes === 'string') payment.notes = body.notes;
    if (body.paidAt) payment.paidAt = new Date(body.paidAt);
    await payment.save();

    await settleInvoice(payment.invoiceId);
    return NextResponse.json(payment);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

/** Money received is refunded, not erased. Only a payment that never landed can go. */
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
    const payment = await Payment.findById(id);
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.status === 'completed' || payment.status === 'refunded') {
      return NextResponse.json({ error: 'Received money cannot be deleted. Mark the payment refunded instead.' }, { status: 409 });
    }
    await payment.deleteOne();
    await settleInvoice(payment.invoiceId);
    return NextResponse.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
