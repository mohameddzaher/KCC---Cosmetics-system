import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Order from '@/models/Order';
import Referral from '@/models/Referral';
import { getSession } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const customer = await User.findById(id).select('-password');
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Fetch customer's orders
    const orders = await Order.find({ userId: id })
      .sort({ createdAt: -1 })
      .select('orderNumber type status totals paymentStatus createdAt');

    // Fetch customer's referrals (as referrer)
    const referrals = await Referral.find({ referrerId: id })
      .populate('referredId', 'name email')
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      customer,
      orders,
      referrals,
    });
  } catch (error: any) {
    console.error('Customers GET [id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
