import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import CustomerActivity from '@/models/CustomerActivity';
import User from '@/models/User';
import { getSession } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'STAFF'];
const ACTIVITY_TYPES = ['note', 'call', 'email', 'whatsapp', 'meeting', 'task'];

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
    const activities = await CustomerActivity.find({ customerId: id }).sort({ createdAt: -1 });
    return NextResponse.json(activities);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST -> add a note / log a call / create a follow-up task
export async function POST(req: NextRequest, context: RouteContext) {
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

    const body = await req.json();
    const type = ACTIVITY_TYPES.includes(body.type) ? body.type : 'note';
    if (!body.body || !String(body.body).trim()) {
      return NextResponse.json({ error: 'Activity body is required' }, { status: 400 });
    }

    const activity = await CustomerActivity.create({
      customerId: id,
      type,
      body: String(body.body).trim(),
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      done: false,
      authorId: user.id,
      authorName: user.name,
    });

    // Logging a contact interaction updates lastContactedAt
    if (['call', 'email', 'whatsapp', 'meeting'].includes(type)) {
      await User.findByIdAndUpdate(id, { lastContactedAt: new Date() });
    }

    return NextResponse.json(activity, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
