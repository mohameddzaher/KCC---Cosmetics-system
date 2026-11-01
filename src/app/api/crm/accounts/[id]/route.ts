import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import CrmAccount from '@/models/CrmAccount';
import CrmActivity from '@/models/CrmActivity';
import Order from '@/models/Order';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { matchKeysFor } from '@/lib/crmMatch';
import { canonicalCategory, canonicalCity } from '@/lib/crmVocab';
import { mayOpenAccount } from '@/lib/crmScope';
import { audited } from '@/lib/audit';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** One account, with the history that explains how it got where it is. */
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

    const account = await CrmAccount.findById(id)
      .populate('ownerId', 'name email role')
      .populate('customerId', 'name email company')
      .lean();
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    if (!(await mayOpenAccount(user, account as { ownerId?: unknown }))) {
      return NextResponse.json(
        { error: 'This account belongs to another rep.' },
        { status: 403 }
      );
    }

    const [activities, orders] = await Promise.all([
      CrmActivity.find({ accountId: id })
        .populate('orderId', 'orderNumber type status totals')
        .sort({ at: -1, createdAt: -1 })
        .limit(500)
        .lean(),
      Order.find({ _id: { $in: (account as { orderIds?: unknown[] }).orderIds || [] } })
        .select('orderNumber type status totals createdAt')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return NextResponse.json(
      { account, activities, orders },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Edit the account's own details.
 *
 * `stage` may be set here only to close an account out or park it. Moving one
 * to `current` is the business of logging an action, not of a dropdown — the
 * whole point is that the stage follows the work.
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

    const account = await CrmAccount.findById(id);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    if (!(await mayOpenAccount(user, account))) {
      return NextResponse.json({ error: 'This account belongs to another rep.' }, { status: 403 });
    }

    const body = await req.json();
    const before = { stage: account.stage, ownerName: account.ownerName };

    if (typeof body.name === 'string' && body.name.trim()) account.name = body.name.trim();
    if (typeof body.nameAr === 'string') account.nameAr = body.nameAr.trim() || undefined;
    if (body.category !== undefined) account.category = canonicalCategory(body.category);
    if (body.city !== undefined) account.city = canonicalCity(body.city);
    if (typeof body.segment === 'string') account.segment = body.segment.trim() || undefined;
    if (typeof body.source === 'string') account.source = body.source.trim() || undefined;
    if (Array.isArray(body.brands)) account.brands = body.brands.map(String).filter(Boolean);
    if (Array.isArray(body.links)) account.links = body.links.map(String).filter(Boolean);
    if (body.keyPerson && typeof body.keyPerson === 'object') {
      account.keyPerson = { ...(account.keyPerson || {}), ...body.keyPerson };
    }
    for (const field of ['feedback', 'finalStatus', 'requirement', 'nextStep', 'notes'] as const) {
      if (typeof body[field] === 'string') account[field] = body[field];
    }

    if (typeof body.ownerId === 'string' || body.ownerId === null) {
      account.ownerId = body.ownerId || undefined;
      account.ownerName = body.ownerName || undefined;
    }

    if (typeof body.stage === 'string' && body.stage !== account.stage) {
      const manual = ['hold', 'won', 'lost', 'upcoming'];
      if (!manual.includes(body.stage)) {
        return NextResponse.json(
          { error: 'An account reaches "current" by having an action logged against it.' },
          { status: 400 }
        );
      }
      account.stage = body.stage;
    }

    // Names and brands can change, so what the account can be recognised by
    // has to change with them — otherwise an order would stop matching it.
    account.matchKeys = [
      ...new Set([
        ...(account.matchKeys || []),
        ...matchKeysFor({ name: account.name, nameAr: account.nameAr, brands: account.brands }),
      ]),
    ];

    await account.save();

    /* ---- anything a person would want explained later, explained ---- */
    if (before.stage !== account.stage) {
      await CrmActivity.create({
        accountId: account._id,
        type: 'stage_change',
        body: `Stage moved from "${before.stage}" to "${account.stage}"`,
        byId: user?.id,
        byName: user?.name,
        byRole: user?.role,
        meta: { from: before.stage, to: account.stage },
      });
    }
    if (body.ownerId !== undefined && before.ownerName !== account.ownerName) {
      await CrmActivity.create({
        accountId: account._id,
        type: 'assignment',
        body: account.ownerName ? `Assigned to ${account.ownerName}` : 'Owner cleared',
        byId: user?.id,
        byName: user?.name,
        byRole: user?.role,
      });
    }

    return NextResponse.json(account);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

/** Archived, not erased: the history is the record of work done. */
export const DELETE = audited(async function DELETE(_req: NextRequest, context: RouteContext) {
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

    const existing = await CrmAccount.findById(id).select('ownerId').lean();
    if (!existing) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    if (!(await mayOpenAccount(user, existing as { ownerId?: unknown }))) {
      return NextResponse.json({ error: 'This account belongs to another rep.' }, { status: 403 });
    }

    const account = await CrmAccount.findByIdAndUpdate(id, { $set: { active: false } }, { new: true });
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    await CrmActivity.create({
      accountId: account._id,
      type: 'system',
      body: 'Account archived',
      byId: user?.id,
      byName: user?.name,
      byRole: user?.role,
    });

    return NextResponse.json({ archived: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
