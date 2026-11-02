import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Expense from '@/models/Expense';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { audited } from '@/lib/audit';

type RouteContext = { params: Promise<{ id: string }> };
const READ_PERM = 'accounting.view' as const;
const WRITE_PERM = 'accounting.manage' as const;

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
    const body = await req.json();
    const set: Record<string, unknown> = {};
    for (const key of ['category', 'description', 'vendor', 'reference', 'notes'] as const) {
      if (body[key] !== undefined) set[key] = body[key];
    }
    if (body.amount !== undefined) set.amount = Number(body.amount) || 0;
    if (body.vatAmount !== undefined) set.vatAmount = Math.max(0, Number(body.vatAmount) || 0);
    if (body.date) set.date = new Date(body.date);
    if (body.orderId !== undefined) set.orderId = body.orderId || null;
    const expense = await Expense.findByIdAndUpdate(id, { $set: set }, { new: true, runValidators: true });
    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    return NextResponse.json(expense);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = audited(async function DELETE(req: NextRequest, context: RouteContext) {
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
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
});
