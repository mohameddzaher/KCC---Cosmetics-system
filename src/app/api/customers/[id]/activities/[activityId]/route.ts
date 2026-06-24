import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import CustomerActivity from '@/models/CustomerActivity';
import { getSession } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string; activityId: string }> };

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'STAFF'];

// PATCH -> toggle task done / edit body
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user || !STAFF_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { activityId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(activityId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const body = await req.json();
    const update: Record<string, unknown> = {};
    if (body.done !== undefined) update.done = body.done;
    if (body.body !== undefined) update.body = String(body.body).trim();
    if (body.dueDate !== undefined) update.dueDate = body.dueDate ? new Date(body.dueDate) : null;

    const activity = await CustomerActivity.findByIdAndUpdate(activityId, update, { new: true });
    if (!activity) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    return NextResponse.json(activity);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user || !STAFF_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { activityId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(activityId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const deleted = await CustomerActivity.findByIdAndDelete(activityId);
    if (!deleted) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    return NextResponse.json({ message: 'Activity deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
