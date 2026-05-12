import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import Invoice from '@/models/Invoice';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const payments = await Payment.find()
      .populate('invoiceId', 'invoiceNumber total status')
      .populate('userId', 'name email company')
      .sort({ createdAt: -1 });

    return NextResponse.json(payments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    const { invoiceId, userId, amount, method, reference, status, notes } = body;

    if (!invoiceId || !userId || !amount || !method) {
      return NextResponse.json({ error: 'invoiceId, userId, amount, and method are required' }, { status: 400 });
    }

    const payment = await Payment.create({
      invoiceId,
      userId,
      amount,
      method,
      reference,
      status: status || 'pending',
      paidAt: status === 'completed' ? new Date() : undefined,
      notes,
    });

    if (status === 'completed') {
      await Invoice.findByIdAndUpdate(invoiceId, {
        status: 'paid',
        paidAt: new Date(),
      });
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to record payment' }, { status: 500 });
  }
}
