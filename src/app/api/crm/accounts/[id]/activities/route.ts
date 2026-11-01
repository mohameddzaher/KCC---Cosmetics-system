import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import CrmAccount from '@/models/CrmAccount';
import CrmActivity from '@/models/CrmActivity';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { CRM_ACTIVITY_TYPES, CRM_INTEREST } from '@/models/CrmActivity';
import { mayOpenAccount } from '@/lib/crmScope';
import {
  countersForActivity, isEngagement, stageAfterActivity, stepForActivity,
} from '@/lib/crmProgress';
import { audited } from '@/lib/audit';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Logging what happened — and the one write that makes the CRM move.
 *
 * Recording a visit against an account in the upcoming list moves it to
 * current, ticks the step it satisfies, advances the counters and leaves a row
 * in the history. All of that is this endpoint, so a visit logged from the
 * upcoming list, from the account's page, or by a customer requesting a sample
 * has exactly the same effect.
 */

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!can(user?.role, 'crm.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const account = await CrmAccount.findById(id).select('ownerId').lean();
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    if (!(await mayOpenAccount(user, account as { ownerId?: unknown }))) {
      return NextResponse.json({ error: 'This account belongs to another rep.' }, { status: 403 });
    }

    const activities = await CrmActivity.find({ accountId: id })
      .sort({ at: -1, createdAt: -1 })
      .limit(500)
      .lean();

    return NextResponse.json(activities, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const POST = audited(async function POST(req: NextRequest, context: RouteContext) {
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

    const account = await CrmAccount.findById(id);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    if (!(await mayOpenAccount(user, account))) {
      return NextResponse.json({ error: 'This account belongs to another rep.' }, { status: 403 });
    }

    const body = await req.json();
    const type = String(body.type || 'note');
    if (!(CRM_ACTIVITY_TYPES as readonly string[]).includes(type)) {
      return NextResponse.json({ error: `Unknown activity type "${type}"` }, { status: 400 });
    }
    if (body.interest && !(CRM_INTEREST as readonly string[]).includes(String(body.interest))) {
      return NextResponse.json({ error: 'Unknown interest value' }, { status: 400 });
    }

    // A visit can be entered the day after it happened, but not in the future:
    // a KPI is a record of work done, not of work planned.
    let at = body.at ? new Date(body.at) : new Date();
    if (isNaN(at.getTime())) at = new Date();
    if (at.getTime() > Date.now() + 60_000) {
      return NextResponse.json(
        { error: 'An action cannot be logged with a future date. Use a task for something planned.' },
        { status: 400 }
      );
    }

    const activity = await CrmActivity.create({
      accountId: account._id,
      type,
      body: typeof body.body === 'string' ? body.body.trim().slice(0, 4000) : undefined,
      at,
      meetingIndex:
        type === 'meeting' ? (account.meetingCount || 0) + 1 : undefined,
      // What the rep actually covered on the call, from the checklist the
      // commercial manager set. Keys, so renaming an item later does not
      // rewrite what was done.
      checklist: Array.isArray(body.checklist)
        ? body.checklist.map(String).filter(Boolean).slice(0, 50)
        : undefined,
      interest: body.interest || undefined,
      outcome: typeof body.outcome === 'string' ? body.outcome.trim() : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      done: type === 'task' ? false : undefined,
      orderId: body.orderId || undefined,
      byId: user?.id,
      byName: user?.name,
      byRole: user?.role,
      meta: body.meta && typeof body.meta === 'object' ? body.meta : undefined,
    });

    /* ---- what this action does to the account ---- */
    const nextStage = stageAfterActivity(account.stage, type);
    const inc = countersForActivity(type);
    const step = stepForActivity(type);

    const set: Record<string, unknown> = {};
    if (nextStage !== account.stage) set.stage = nextStage;
    if (isEngagement(type)) {
      set.lastActionAt = at;
      if (!account.firstActionAt) set.firstActionAt = at;
    }
    if (step && !(account.steps as Record<string, unknown>)?.[step]) {
      set[`steps.${step}`] = at;
    }
    // The rep who does the work owns the account, unless someone already does.
    if (!account.ownerId && user?.id && isEngagement(type)) {
      set.ownerId = user.id;
      set.ownerName = user.name;
    }
    // Interest recorded on a visit is the account's current feedback.
    if (body.interest) set.feedback = String(body.interest);

    const updated = await CrmAccount.findByIdAndUpdate(
      account._id,
      { $inc: inc, ...(Object.keys(set).length ? { $set: set } : {}) },
      { new: true }
    );

    if (nextStage !== account.stage) {
      // Why it moved, in the history, rather than a silent jump between lists.
      await CrmActivity.create({
        accountId: account._id,
        type: 'stage_change',
        at,
        body: `Moved from "${account.stage}" to "${nextStage}" — ${type} logged`,
        byId: user?.id,
        byName: user?.name,
        byRole: user?.role,
        meta: { from: account.stage, to: nextStage, because: type },
      });
    }

    return NextResponse.json(
      { activity, account: updated, movedTo: nextStage !== account.stage ? nextStage : null },
      { status: 201 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
