import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Order from '@/models/Order';
import Referral from '@/models/Referral';
import CustomerActivity from '@/models/CustomerActivity';
import { getSession } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'STAFF'];

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user || !STAFF_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const customer = await User.findById(id)
      .select('-password')
      .populate('accountManagerId', 'name email');
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const orders = await Order.find({ userId: id })
      .sort({ createdAt: -1 })
      .select('orderNumber type status totals paymentStatus createdAt');

    const referrals = await Referral.find({ referrerId: id })
      .populate('referredId', 'name email')
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 });

    const activities = await CustomerActivity.find({ customerId: id }).sort({ createdAt: -1 });

    // Team list for account-manager assignment
    const managers = await User.find({ role: { $in: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] } })
      .select('name email role')
      .sort({ name: 1 });

    return NextResponse.json({ customer, orders, referrals, activities, managers });
  } catch (error: any) {
    console.error('Customers GET [id] error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/customers/[id] -> update CRM fields for a customer
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user || !STAFF_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const before = await User.findById(id);
    if (!before) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const body = await req.json();
    const update: Record<string, unknown> = {};
    const fields = [
      'name', 'email', 'company', 'phone', 'whatsapp', 'website',
      'country', 'city', 'address', 'isActive',
      'stage', 'tags', 'source', 'accountManagerId', 'lastContactedAt',
    ];
    for (const f of fields) {
      if (body[f] !== undefined) update[f] = body[f];
    }
    if (typeof update.email === 'string') update.email = update.email.toLowerCase();
    if (update.accountManagerId === '') update.accountManagerId = null;

    const updated = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .select('-password')
      .populate('accountManagerId', 'name email');

    // Auto-log meaningful CRM changes to the activity timeline
    if (body.stage && body.stage !== before.stage) {
      await CustomerActivity.create({
        customerId: id, type: 'stage_change',
        body: `Stage changed from "${before.stage}" to "${body.stage}"`,
        authorId: user.id, authorName: user.name,
        meta: { from: before.stage, to: body.stage },
      });
    }
    if (body.accountManagerId !== undefined && String(body.accountManagerId || '') !== String(before.accountManagerId || '')) {
      await CustomerActivity.create({
        customerId: id, type: 'assignment',
        body: body.accountManagerId ? 'Account manager assigned' : 'Account manager unassigned',
        authorId: user.id, authorName: user.name,
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/customers/[id] -> remove a contact and its activity log
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const target = await User.findById(id);
    if (!target) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    if (target.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Only customer contacts can be deleted here' }, { status: 400 });
    }
    await User.findByIdAndDelete(id);
    await CustomerActivity.deleteMany({ customerId: id });
    return NextResponse.json({ message: 'Contact deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
