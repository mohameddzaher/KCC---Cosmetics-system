import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Expense from '@/models/Expense';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { audited } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, 'accounting.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filter: any = {};
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(`${endDate}T23:59:59.999`);
    }

    const expenses = await Expense.find(filter)
      .populate('createdBy', 'name email')
      .populate('orderId', 'orderNumber')
      .sort({ date: -1 })
      .limit(1000);

    return NextResponse.json(expenses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch expenses' }, { status: 500 });
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
    // Explicit allowlist — never spread raw request body into create().
    if (!body.category || !(Number(body.amount) > 0)) {
      return NextResponse.json({ error: 'A category and an amount above zero are required.' }, { status: 400 });
    }
    const expense = await Expense.create({
      category: body.category,
      description: body.description,
      amount: Number(body.amount) || 0,
      date: body.date ? new Date(body.date) : new Date(),
      vendor: body.vendor,
      reference: body.reference,
      vatAmount: Math.max(0, Number(body.vatAmount) || 0),
      orderId: body.orderId || undefined,
      notes: body.notes,
      createdBy: user.id,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create expense' }, { status: 500 });
  }
});
