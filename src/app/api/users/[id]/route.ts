import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getSession, hashPassword } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

const MANAGE_ROLES = ['SUPER_ADMIN', 'ADMIN'];
const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CUSTOMER'];
const PRIVILEGED_ROLES = ['SUPER_ADMIN', 'ADMIN'];

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session || !MANAGE_ROLES.includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const user = await User.findById(id).select('-password').populate('accountManagerId', 'name email');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session || !MANAGE_ROLES.includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const target = await User.findById(id);
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const update: Record<string, unknown> = {};
    const editableFields = [
      'name', 'email', 'company', 'phone', 'whatsapp', 'website',
      'country', 'city', 'address', 'isActive', 'languagePref',
      'stage', 'tags', 'source', 'accountManagerId',
    ];
    for (const f of editableFields) {
      if (body[f] !== undefined) update[f] = body[f];
    }
    if (update.email && typeof update.email === 'string') {
      update.email = update.email.toLowerCase();
    }
    if (update.accountManagerId === '') update.accountManagerId = null;

    // Role changes — guarded
    if (body.role !== undefined && body.role !== target.role) {
      if (!ALL_ROLES.includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      // Only SUPER_ADMIN can grant/revoke privileged roles or change a privileged user
      const touchingPrivileged =
        PRIVILEGED_ROLES.includes(body.role) || PRIVILEGED_ROLES.includes(target.role);
      if (touchingPrivileged && session.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Only a Super Admin can change Admin roles' }, { status: 403 });
      }
      // Prevent demoting the last SUPER_ADMIN
      if (target.role === 'SUPER_ADMIN' && body.role !== 'SUPER_ADMIN') {
        const count = await User.countDocuments({ role: 'SUPER_ADMIN' });
        if (count <= 1) {
          return NextResponse.json({ error: 'Cannot demote the last Super Admin' }, { status: 400 });
        }
      }
      update.role = body.role;
    }

    // Password reset (optional)
    if (body.password) {
      update.password = await hashPassword(body.password);
    }

    // Non-super-admins cannot edit a privileged account at all
    if (PRIVILEGED_ROLES.includes(target.role) && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only a Super Admin can edit Admin accounts' }, { status: 403 });
    }

    const updated = await User.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).select('-password');

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session || !MANAGE_ROLES.includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    if (id === session.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const target = await User.findById(id);
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (PRIVILEGED_ROLES.includes(target.role) && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only a Super Admin can delete Admin accounts' }, { status: 403 });
    }
    if (target.role === 'SUPER_ADMIN') {
      const count = await User.countDocuments({ role: 'SUPER_ADMIN' });
      if (count <= 1) {
        return NextResponse.json({ error: 'Cannot delete the last Super Admin' }, { status: 400 });
      }
    }

    await User.findByIdAndDelete(id);
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
