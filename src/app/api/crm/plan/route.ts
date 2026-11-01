import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CrmVisitPlan from '@/models/CrmVisitPlan';
import CrmActivity from '@/models/CrmActivity';
import User from '@/models/User';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { seesEveryAccount, visibleOwnerIds } from '@/lib/crmScope';
import { audited } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * Journey plans, and whether they were kept.
 *
 * Adherence is computed, never stored: for each planned account the history is
 * asked whether that rep logged a visit or a meeting on that day. A plan that
 * stored its own "done" flag would be a second version of the truth, and the
 * one a rep could tick without leaving his desk.
 */

function midnight(input: string | Date): Date {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Sunday, the start of the working week here. */
function weekStart(d: Date): Date {
  const s = midnight(d);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

/**
 * The week's plans and how well they were kept.
 *
 * Exported so the spreadsheet runs the same computation as the screen instead
 * of a second copy of the adherence rule.
 */
export async function computePlans(
  user: { id?: string; role?: string } | null,
  p: URLSearchParams
) {
  {
    const from = p.get('from') ? midnight(p.get('from') as string) : weekStart(new Date());
    const to = p.get('to') ? midnight(p.get('to') as string) : new Date(from.getTime() + 6 * 86400000);
    to.setHours(23, 59, 59, 999);

    const all = seesEveryAccount(user);
    const branch = await visibleOwnerIds(user);

    const filter: Record<string, unknown> = { date: { $gte: from, $lte: to } };
    const owner = p.get('owner');
    if (owner && owner !== 'all') {
      // A manager may read anyone in his branch; a rep only himself.
      if (!all && !branch.includes(owner)) {
        return { error: 'That rep is not in your team.' } as never;
      }
      filter.ownerId = owner;
    } else if (!all) {
      filter.ownerId = { $in: branch };
    }

    const plans = await CrmVisitPlan.find(filter)
      .populate('ownerId', 'name region')
      .populate('items.accountId', 'name nameAr category city stage ownerName')
      .sort({ date: 1 })
      .lean();

    /* ---- what actually happened in the window, to score the plans ---- */
    const ownerIds = [...new Set(plans.map((pl: Record<string, unknown>) => String((pl.ownerId as { _id?: unknown })?._id || pl.ownerId)))];
    const done = await CrmActivity.find({
      backfilled: { $ne: true },
      type: { $in: ['visit', 'meeting'] },
      at: { $gte: from, $lte: to },
      ...(ownerIds.length ? { byId: { $in: ownerIds } } : {}),
    })
      .select('accountId byId at')
      .lean();

    /** rep + account + day → it happened. */
    const didVisit = new Set(
      done.map(
        (a: Record<string, unknown>) =>
          `${String(a.byId)}|${String(a.accountId)}|${midnight(a.at as Date).toISOString().slice(0, 10)}`
      )
    );

    // Scored in one pass, collecting the planned keys as it goes — the same
    // keys are then what identifies a visit nobody planned.
    const plannedKeys = new Set<string>();
    const scored = plans.map((pl: Record<string, unknown>) => {
      const ownerId = String((pl.ownerId as { _id?: unknown })?._id || pl.ownerId);
      const day = midnight(pl.date as Date).toISOString().slice(0, 10);
      const items = ((pl.items as Array<Record<string, unknown>>) || []).map((it) => {
        const accountId = String((it.accountId as { _id?: unknown })?._id || it.accountId);
        const key = `${ownerId}|${accountId}|${day}`;
        plannedKeys.add(key);
        return { ...it, visited: didVisit.has(key) };
      });
      const kept = items.filter((i) => i.visited).length;
      return {
        ...pl,
        items,
        planned: items.length,
        kept,
        adherencePct: items.length ? Math.round((kept / items.length) * 100) : null,
      };
    });

    // The other half of the question: calls made that were never planned.
    const unplanned = done.filter(
      (a: Record<string, unknown>) =>
        !plannedKeys.has(
          `${String(a.byId)}|${String(a.accountId)}|${midnight(a.at as Date).toISOString().slice(0, 10)}`
        )
    ).length;

    const reps = all
      ? await User.find({ role: { $in: ['SALES', 'ACCOUNT_MANAGER'] }, isActive: { $ne: false } })
          .select('name region')
          .lean()
      : await User.find({ _id: { $in: branch } }).select('name region').lean();

    const plannedTotal = scored.reduce((n: number, pl) => n + pl.planned, 0);
    const keptTotal = scored.reduce((n: number, pl) => n + pl.kept, 0);

    return {
      ...{
        from,
        to,
        plans: scored,
        reps,
        canPlanForOthers: all,
        summary: {
          planned: plannedTotal,
          kept: keptTotal,
          adherencePct: plannedTotal ? Math.round((keptTotal / plannedTotal) * 100) : null,
          unplannedVisits: unplanned,
        },
      },
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!can(user?.role, 'crm.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const data = await computePlans(user, req.nextUrl.searchParams);
    if ('error' in data) return NextResponse.json(data, { status: 403 });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Set (or clear) one rep's plan for one day. */
export const PUT = audited(async function PUT(req: NextRequest) {
  try {
    const user = await getSession();
    if (!can(user?.role, 'crm.edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    if (!body.date || isNaN(Date.parse(body.date))) {
      return NextResponse.json({ error: 'A plan needs a date' }, { status: 400 });
    }

    const all = seesEveryAccount(user);
    const branch = await visibleOwnerIds(user);
    const ownerId = String(body.ownerId || user?.id || '');
    if (!ownerId) return NextResponse.json({ error: 'No rep given' }, { status: 400 });

    // A rep plans his own day; a manager plans for his team.
    if (ownerId !== String(user?.id) && !all && !branch.includes(ownerId)) {
      return NextResponse.json({ error: 'That rep is not in your team.' }, { status: 403 });
    }

    const items = (Array.isArray(body.items) ? body.items : [])
      .map((i: Record<string, unknown>) => ({
        accountId: String(i.accountId || ''),
        note: typeof i.note === 'string' ? i.note.trim().slice(0, 500) : undefined,
      }))
      .filter((i: { accountId: string }) => i.accountId)
      .slice(0, 40);

    const rep = await User.findById(ownerId).select('name').lean();

    const plan = await CrmVisitPlan.findOneAndUpdate(
      { ownerId, date: midnight(body.date) },
      {
        $set: {
          items,
          ownerName: (rep as { name?: string } | null)?.name,
          notes: typeof body.notes === 'string' ? body.notes.trim() : undefined,
          createdByName: ownerId === String(user?.id) ? undefined : user?.name,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(plan);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
