import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import CrmActivity from '@/models/CrmActivity';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import CrmAccount from '@/models/CrmAccount';
import { mayOpenAccount } from '@/lib/crmScope';
import { audited } from '@/lib/audit';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Marking a complaint, a suggestion or a task as dealt with.
 *
 * The outcome is written beside it rather than replacing what was said: the
 * complaint stays on the record, with what was done about it underneath.
 */
export const PUT = audited(async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!can(user?.role, 'crm.edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const activity = await CrmActivity.findById(id).select('accountId').lean();
    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const account = await CrmAccount.findById((activity as { accountId?: unknown }).accountId).select('ownerId').lean();
    if (!(await mayOpenAccount(user, account as { ownerId?: unknown } | null))) {
      return NextResponse.json({ error: 'This account belongs to another rep.' }, { status: 403 });
    }

    const body = await req.json();
    const set: Record<string, unknown> = {};

    if (typeof body.done === 'boolean') {
      set.done = body.done;
      set['meta.handledBy'] = body.done ? user?.name : undefined;
      set['meta.handledAt'] = body.done ? new Date() : undefined;
    }
    if (typeof body.outcome === 'string') set.outcome = body.outcome.trim().slice(0, 2000);

    if (Object.keys(set).length === 0) {
      return NextResponse.json({ error: 'Nothing to change' }, { status: 400 });
    }

    const updated = await CrmActivity.findByIdAndUpdate(id, { $set: set }, { new: true });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
