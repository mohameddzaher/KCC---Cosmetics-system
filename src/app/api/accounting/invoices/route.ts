import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Invoice from '@/models/Invoice';
import { getSession } from '@/lib/auth';
import { generateInvoiceNumber } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    let filter: any = {};
    if (status) filter.status = status;
    if (userId) filter.userId = userId;

    const invoices = await Invoice.find(filter)
      .populate('userId', 'name email company')
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 });

    return NextResponse.json(invoices);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch invoices' }, { status: 500 });
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
    const { orderId, userId, items, subtotal, tax, discount, total, dueDate, notes } = body;

    if (!orderId || !userId || !items || !total) {
      return NextResponse.json({ error: 'orderId, userId, items, and total are required' }, { status: 400 });
    }

    const invoiceNumber = generateInvoiceNumber();

    const invoice = await Invoice.create({
      invoiceNumber,
      orderId,
      userId,
      items,
      subtotal: subtotal || 0,
      tax: tax || 0,
      discount: discount || 0,
      total,
      dueDate,
      notes,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create invoice' }, { status: 500 });
  }
}
