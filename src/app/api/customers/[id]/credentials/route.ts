import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import User from '@/models/User';
import CustomerActivity from '@/models/CustomerActivity';
import { getSession, hashPassword } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

// PUT /api/customers/[id]/credentials
// Super-admin / admin sets the customer's login email (username) + password so
// the customer can sign in and place requests. The customer stays role=CUSTOMER.
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session || !ADMIN_ROLES.includes(session.role)) {
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
      return NextResponse.json({ error: 'This endpoint only manages customer logins' }, { status: 400 });
    }

    const body = await req.json();
    const update: Record<string, unknown> = {};

    if (body.email !== undefined) {
      const email = String(body.email).toLowerCase().trim();
      if (!email) return NextResponse.json({ error: 'Email cannot be empty' }, { status: 400 });
      const clash = await User.findOne({ email, _id: { $ne: id } });
      if (clash) return NextResponse.json({ error: 'That email is already in use' }, { status: 409 });
      update.email = email;
    }

    if (body.password) {
      if (String(body.password).length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      update.password = await hashPassword(String(body.password));
    }

    if (body.isActive !== undefined) update.isActive = !!body.isActive;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    await User.findByIdAndUpdate(id, update, { runValidators: true });

    await CustomerActivity.create({
      customerId: id,
      type: 'system',
      body: body.password ? 'Login credentials set/updated by admin' : 'Login account updated by admin',
      authorId: session.id,
      authorName: session.name,
    });

    return NextResponse.json({ message: 'Login credentials updated' });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'That email is already in use' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update credentials' }, { status: 500 });
  }
}
