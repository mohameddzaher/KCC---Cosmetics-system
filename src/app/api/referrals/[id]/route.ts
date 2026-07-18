import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Referral from '@/models/Referral';
import User from '@/models/User';
import { getSession } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

const effectiveCredit = (status: string, amount: number) =>
  status === 'credited' ? (amount || 0) : 0;

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const ref = await Referral.findById(id);
    if (!ref) return NextResponse.json({ error: 'Referral not found' }, { status: 404 });

    const body = await req.json();
    const oldEffective = effectiveCredit(ref.status, ref.creditAmount);

    if (body.status !== undefined) ref.status = body.status;
    if (body.creditAmount !== undefined) ref.creditAmount = Number(body.creditAmount);
    if (ref.status === 'credited' && !ref.creditedAt) ref.creditedAt = new Date();

    const newEffective = effectiveCredit(ref.status, ref.creditAmount);
    const delta = newEffective - oldEffective;

    await ref.save();

    if (delta !== 0) {
      await User.findByIdAndUpdate(ref.referrerId, { $inc: { referralBalance: delta } });
    }

    const populated = await Referral.findById(id)
      .populate('referrerId', 'name email referralCode')
      .populate('referredId', 'name email')
      .populate('orderId', 'orderNumber');

    return NextResponse.json(populated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const ref = await Referral.findById(id);
    if (!ref) return NextResponse.json({ error: 'Referral not found' }, { status: 404 });

    // Reverse any credit that was applied to the referrer's balance
    const applied = effectiveCredit(ref.status, ref.creditAmount);
    if (applied > 0) {
      await User.findByIdAndUpdate(ref.referrerId, { $inc: { referralBalance: -applied } });
    }

    await Referral.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Referral deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
