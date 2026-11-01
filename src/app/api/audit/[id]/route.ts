import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { withActor } from '@/lib/audit/query';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** One row in full, with whatever else the same request did. */
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!can(user.role, 'audit.view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await connectDB();

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const row = await AuditLog.findById(id).populate('userId', 'name email role').lean();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { requestId } = row as { requestId?: string };
    const related = requestId
      ? await AuditLog.find({ requestId, _id: { $ne: id } })
        .select('action entity entityId entityLabel createdAt')
        .sort({ _id: 1 })
        .lean()
      : [];

    return NextResponse.json({ ...withActor(row as Record<string, unknown>), related });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
