import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { sendEventEmail, adminUrl } from '@/lib/mailer';
import { audited } from '@/lib/audit';
import { AccountingError, recordPayment } from '@/lib/accounting';
import { formatCurrency } from '@/lib/money';

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
    for (const key of ['status', 'method']) {
      const v = p.get(key);
      if (v && v !== 'all') filter[key] = v;
    }
    const from = p.get('from');
    const to = p.get('to');
    if (from || to) {
      filter.createdAt = {
        ...(from ? { $gte: new Date(`${from}T00:00:00`) } : {}),
        ...(to ? { $lte: new Date(`${to}T23:59:59.999`) } : {}),
      };
    }

    const payments = await Payment.find(filter)
      .populate('invoiceId', 'invoiceNumber total status')
      .populate('userId', 'name email company')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    return NextResponse.json(payments);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch payments';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const POST = audited(async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, 'accounting.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    if (!mongoose.Types.ObjectId.isValid(body.invoiceId) || !body.method) {
      return NextResponse.json({ error: 'Choose the invoice and how it was paid.' }, { status: 400 });
    }

    const { payment } = await recordPayment(body.invoiceId, {
      amount: Number(body.amount),
      method: String(body.method),
      reference: typeof body.reference === 'string' ? body.reference.trim() : undefined,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
      status: typeof body.status === 'string' ? body.status : 'completed',
      paidAt: body.paidAt ? new Date(body.paidAt) : undefined,
    });

    if (payment.status === 'completed') {
      try {
        await sendEventEmail('emailPaymentReceived', {
          subject: `Payment recorded — ${formatCurrency(payment.amount)}`,
          heading: 'A payment was recorded',
          rows: [
            ['Amount', formatCurrency(payment.amount)],
            ['Method', String(payment.method)],
            ['Reference', payment.reference || '—'],
            ['Recorded by', user.name],
          ],
          actionUrl: adminUrl(`/admin/accounting/invoices/${payment.invoiceId}`),
          actionLabel: 'Open the invoice',
        });
      } catch { /* the payment stands regardless */ }
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (error instanceof AccountingError) return NextResponse.json({ error: error.message }, { status: error.status });
    const msg = error instanceof Error ? error.message : 'Failed to record payment';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
